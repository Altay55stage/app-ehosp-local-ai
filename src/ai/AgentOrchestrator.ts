import { MistralAIService } from '../services/MistralAIService';
import { db, ref, get, child } from '../services/FirebaseService';

export interface AgentResponse {
  text: string;
  agent: string;
  urgencyScore: number;
  xaiExplanation?: string;
  sources?: string;
  recommendedSpecialist?: string;
}

export class AgentOrchestrator {
  static async processMessage(
    userMessage: any, 
    history: any[], 
    profile?: any, 
    forcedAgent?: string,
    uid?: string,
    activeProfileId?: string
  ): Promise<AgentResponse> {
    
    let msgText = typeof userMessage === 'string' ? userMessage : userMessage.text;
    let base64Image = typeof userMessage === 'object' ? userMessage.imageBase64 : undefined;
    
    let profileContext = "";
    if (profile) {
      const parts = [];
      if (profile.age) parts.push(`${profile.age} ans`);
      if (profile.gender) parts.push(profile.gender);
      if (profile.weight) parts.push(`${profile.weight} kg`);
      if (profile.height) parts.push(`${profile.height} cm`);
      
      let profileStr = parts.length > 0 ? `Patient: ${parts.join(', ')}.` : "";
      if (profile.chronicConditions) profileStr += ` Antécédents: ${profile.chronicConditions}.`;
      if (profile.allergies) profileStr += ` Allergies: ${profile.allergies}.`;
      if (profile.medications) profileStr += ` Traitements actuels: ${profile.medications}.`;
      if (profile.birthCountry) profileStr += ` Pays de naissance: ${profile.birthCountry}.`;
      if (profile.currentCountry) profileStr += ` Pays de résidence: ${profile.currentCountry}.`;
      
      if (profileStr) {
        profileContext = `\n\n[CONTEXTE MÉDICAL DU PATIENT]\n${profileStr}\nTu dois IMPÉRATIVEMENT adapter ton diagnostic et tes conseils à ce contexte (notamment l'âge, les allergies, et les risques de maladies tropicales/endémiques selon la géographie).`;
      }
    }

    // Récupération de l'historique global (personnel et familial)
    if (uid) {
      try {
        const dbRef = ref(db);
        
        // 1. Historique Personnel (Titres des anciennes sessions)
        if (activeProfileId) {
          const sessionsSnap = await get(child(dbRef, `users/${uid}/profiles/${activeProfileId}/sessions`));
          if (sessionsSnap.exists()) {
            const sessionsData = sessionsSnap.val();
            const sessionTitles = Object.values(sessionsData)
              .map((s: any) => s.metadata?.title)
              .filter(Boolean)
              .slice(0, 5) // Garder les 5 plus récentes pour ne pas surcharger le prompt
              .join(", ");
            if (sessionTitles) {
              profileContext += `\n[HISTORIQUE PERSONNEL] Le patient a déjà consulté pour : ${sessionTitles}. Prends en compte ces antécédents récents.`;
            }
          }
        }

        // 2. Historique Familial (Autres profils du même compte)
        const familySnap = await get(child(dbRef, `users/${uid}/profiles`));
        if (familySnap.exists()) {
          const familyData = familySnap.val();
          const familyHistoryParts: string[] = [];
          
          Object.keys(familyData).forEach(key => {
            if (key !== activeProfileId) {
              const member = familyData[key];
              const medical = member.medicalRecord;
              if (medical && (medical.chronicConditions || medical.allergies)) {
                let memberStr = `- ${member.name || "Membre"}: `;
                if (medical.chronicConditions) memberStr += `Antécédents (${medical.chronicConditions}). `;
                if (medical.allergies) memberStr += `Allergies (${medical.allergies}).`;
                familyHistoryParts.push(memberStr);
              }
            }
          });

          if (familyHistoryParts.length > 0) {
            profileContext += `\n[HISTORIQUE FAMILIAL ET GÉNÉTIQUE]\n${familyHistoryParts.join('\n')}\nAnalyse s'il y a un lien héréditaire, contagieux ou génétique possible avec les symptômes actuels du patient.`;
          }
        }
      } catch (err) {
        console.error("Erreur récupération contexte global", err);
      }
    }

    let activeAgent = forcedAgent || "👨‍⚕️ Généraliste";
    const formattingRule = `
IMPORTANT : Tu dois ABSOLUMENT répondre avec un UNIQUE objet JSON valide, sans balises markdown autour.
Format exact attendu :
{
  "reponse": "Ton message direct au patient (humain, 2-3 phrases)",
  "raisonnement": "Ton analyse médicale clinique détaillée",
  "sources": "Les sources médicales (ex: HAS, OMS)",
  "specialiste_recommande": "Nom du spécialiste (Optionnel, laisse vide si non nécessaire. Ex: '🫀 Cardiologie')"
}`;
    
    let systemPrompt = "";
    let urgencyScore = 1;

    // Si on est Généraliste (par défaut), on agit comme un Triage
    if (activeAgent === "👨‍⚕️ Généraliste") {
      const imageInstruction = base64Image 
        ? `\nUNE IMAGE T'A ÉTÉ ENVOYÉE. Commence par IDENTIFIER le type d'image (IRM, Scanner, Photo peau, Ordonnance, Blessure, Radiographie X, etc.) et redirige vers le bon spécialiste. Ne présume PAS que c'est de la dermatologie.`
        : '';
      systemPrompt = `Tu es "Dr. IA Généraliste", le Médecin Chef d'Orientation et de Triage.
Ton rôle n'est pas de soigner définitivement, mais d'évaluer la situation avec une PRÉCISION EXTRÊME.
Tu dois :
1. Estimer la gravité.
2. Poser un pré-diagnostic.
3. Remplir le champ JSON "specialiste_recommande" avec la spécialité adéquate si un suivi spécifique est requis.${imageInstruction}

Choisis parmi (INCLUS L'EMOJI STRICTEMENT) : "🫀 Cardiologie", "🧴 Dermatologie", "🧬 Généticien", "🧠 Psychiatrie", "👶 Pédiatrie", "🦴 Rhumatologie", "🦠 Infectiologie", "🌴 Médecine Tropicale", "👁️ Ophtalmologie", "🦷 Dentaire", "👂 ORL", "🤰 Gynécologie", "🩺 Pneumologie", "🩸 Hématologie", "⚕️ Oncologie", "🚑 Urgences", "🥗 Nutrition", "🧪 Endocrinologie", "💤 Médecine du Sommeil", "☢️ Radiologie".
${profileContext}${formattingRule}`;
    } else {
      systemPrompt = `Tu es Dr. IA, agissant en tant que ${activeAgent}. Tu dois être rassurant, très direct et le plus humain possible. Ne fais JAMAIS de listes à puces. Sois extrêmement concis. Sois précis et va droit au but.${profileContext}${formattingRule}`;
    }

    const lowerMsg = msgText.toLowerCase();

    // Only apply automatic agent routing if no agent was forced
    if (!forcedAgent) {
      if (lowerMsg.includes("coeur") || lowerMsg.includes("poitrine") || lowerMsg.includes("palpitation")) {
        activeAgent = "🫀 Cardiologie";
        systemPrompt = `Tu es Dr. IA Cardiologue. Sois direct et humain. Analyse ces symptômes cardiaques.${profileContext}${formattingRule}`;
        urgencyScore = 6;
      } else if (lowerMsg.includes("peau") || lowerMsg.includes("bouton") || lowerMsg.includes("rougeur")) {
        activeAgent = "🧴 Dermatologie";
        systemPrompt = `Tu es Dr. IA Dermatologue. Sois direct et humain. Analyse ce problème cutané.${profileContext}${formattingRule}`;
        urgencyScore = 2;
      }
      // Si une image est envoyée sans contexte texte particulier, le Généraliste la triage
      // Il décidera seul s'il s'agit d'une IRM (→ Radiologie), d'une peau (→ Dermatologie), etc.
    }

    if (lowerMsg.includes("urgence") || lowerMsg.includes("très mal") || lowerMsg.includes("respirer")) {
      urgencyScore = 9;
    }

    const payloadContent: any = base64Image ? { text: msgText, imageBase64: base64Image } : msgText;
    const rawResponse = await MistralAIService.sendMessage([{ role: 'user', content: payloadContent }], systemPrompt);
    
    let text = "Erreur de formatage de l'IA.";
    let xaiExplanation = "Raisonnement non fourni par l'IA.";
    let sources = "Sources médicales générales (HAS, PubMed).";
    let recommendedSpecialist = undefined;

    try {
      // Nettoyage au cas où l'IA mettrait des balises markdown autour du JSON
      let cleanedJson = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanedJson);
      
      text = parsed.reponse || text;
      xaiExplanation = parsed.raisonnement || xaiExplanation;
      sources = parsed.sources || sources;
      
      if (parsed.specialiste_recommande && parsed.specialiste_recommande.trim() !== "") {
        recommendedSpecialist = parsed.specialiste_recommande.trim();
      }
    } catch (e) {
      console.error("Erreur parsing JSON IA:", e, rawResponse);
      text = rawResponse; // Fallback raw text
    }

    return {
      text,
      agent: activeAgent,
      urgencyScore,
      xaiExplanation,
      sources,
      recommendedSpecialist
    };
  }
}
