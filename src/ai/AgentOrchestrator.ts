import { AzureAIService } from '../services/AzureAIService';
import { LocalLlamaService } from './LocalLlamaService';
import { db, ref, get, child, BACKEND_URL, IS_LOCAL_STORAGE } from '../services/FirebaseService';
import axios from 'axios';


export interface AgentResponse {
  text: string;
  agent: string;
  urgencyScore: number;
  xaiExplanation?: string;
  sources?: string;
  recommendedSpecialist?: string;
}

export class AgentOrchestrator {
  static async processMessageStreaming(
    userMessage: any, 
    history: any[], 
    profile: any, 
    forcedAgent: string | undefined,
    uid: string | undefined,
    activeProfileId: string | undefined,
    currentUrgencyScore: number,
    onToken: (text: string) => void
  ): Promise<AgentResponse> {
    const { systemPrompt, activeAgent, urgencyScore } = await this.prepareContext(userMessage, history, profile, forcedAgent, uid, activeProfileId, currentUrgencyScore);
    
    let msgText = typeof userMessage === 'string' ? userMessage : userMessage.text;
    let base64Images = typeof userMessage === 'object' ? (userMessage.images || [userMessage.imageBase64]).filter(Boolean) : [];
    
    let payloadContent: any = msgText;
    if (base64Images.length > 0) {
      payloadContent = { text: msgText, images: base64Images };
    }

    let rawResponse = "";

    if (IS_LOCAL_STORAGE) {
      try {
        console.log(`[AgentOrchestrator] Calling local Express backend API at ${BACKEND_URL}/api/chat`);
        const response = await axios.post(`${BACKEND_URL}/api/chat`, {
          messages: [...history, { role: 'user', content: payloadContent }],
          systemPrompt,
          activeAgent,
          uid,
          profileId: activeProfileId
        });
        rawResponse = response.data.rawResponse;
      } catch (err: any) {
        console.error("Local agent chat failed:", err);
        rawResponse = JSON.stringify({
          reponse: "Une erreur est survenue lors de la communication avec l'assistant local.",
          raisonnement: err.message,
          sources: "Système eHosp Local",
          score_urgence: 1
        });
      }
      
      // Simuler le streaming fluide token par token sur l'interface mobile pour la présentation
      let responseText = "";
      try {
        let cleanedJson = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedJson);
        responseText = parsed.reponse || "";
      } catch (e) {
        responseText = rawResponse;
      }
      
      const tokens = responseText.split(' ');
      let currentText = "";
      for (const token of tokens) {
        currentText += token + " ";
        onToken(currentText);
        await new Promise(resolve => setTimeout(resolve, 30)); // 33 tokens/sec (très réactif)
      }
    } else {
      // eHosp 5.0 - Appel à l'IA 100% Locale au lieu du Cloud Azure
      rawResponse = await LocalLlamaService.generateStreamingResponse(
        [...history, { role: 'user', content: payloadContent }], 
        systemPrompt,
        (fullText) => {
          let display = fullText.replace(/\{"reponse":\s*"/, '').split('","raisonnement"')[0];
          display = display.replace(/\\n/g, '\n').replace(/\\"/g, '"');
          onToken(display);
        }
      );
    }

    return this.parseAIResponse(rawResponse, activeAgent, urgencyScore);
  }

  private static async prepareContext(userMessage: any, history: any[], profile: any, forcedAgent: string | undefined, uid: string | undefined, activeProfileId: string | undefined, currentUrgencyScore: number) {
    let msgText = typeof userMessage === 'string' ? userMessage : userMessage.text;
    let base64Image = typeof userMessage === 'object' ? userMessage.imageBase64 : undefined;
    
    let profileContext = "";
    let questionnaireContext = "";
    let familyContext = "";
    let urgencyScore = currentUrgencyScore;

    if (profile) {
      const parts = [];
      if (profile.birthDate) parts.push(`Né(e) le ${profile.birthDate}`);
      if (profile.gender) parts.push(profile.gender);
      if (profile.weight) parts.push(`${profile.weight} kg`);
      if (profile.height) parts.push(`${profile.height} cm`);
      
      let profileStr = parts.length > 0 ? `Patient: ${parts.join(', ')}.` : "";
      if (profile.chronicConditions) profileStr += ` Antécédents: ${profile.chronicConditions}.`;
      if (profile.allergies) profileStr += ` Allergies: ${profile.allergies}.`;
      if (profile.medications) profileStr += ` Traitements actuels: ${profile.medications}.`;
      if (profile.birthCountry) profileStr += ` Pays de naissance: ${profile.birthCountry}.`;
      if (profile.currentCountry) profileStr += ` Pays de résidence: ${profile.currentCountry}.`;
      
      profileContext = `\n\n[CONTEXTE MÉDICAL DU PATIENT]\n${profileStr}`;
    }

    if (uid) {
      try {
        const dbRef = ref(db);
        const questPath = activeProfileId 
          ? `users/${uid}/profiles/${activeProfileId}/questionnaire` 
          : `users/${uid}/onboarding/questionnaire`;
        const questSnap = await get(child(dbRef, questPath));
        if (questSnap.exists()) {
          const quest = questSnap.val();
          const answers = quest.answers || quest;
          questionnaireContext = `\n\n[RÉPONSES AU QUESTIONNAIRE DE SANTÉ DU PATIENT (CALIBRATION DR. IA)]\n${JSON.stringify(answers)}\n(Prends en compte ces habitudes de vie, antécédents, tabagisme, alcool et sommeil dans tes diagnostics et conseils).`;
        }

        const allProfilesSnap = await get(child(dbRef, `users/${uid}/profiles`));
        if (allProfilesSnap.exists()) {
          const profiles = allProfilesSnap.val();
          const familyMembers: string[] = [];
          Object.keys(profiles).forEach(pid => {
            if (pid !== activeProfileId) {
              const p = profiles[pid];
              const medical = p.medicalRecord || {};
              familyMembers.push(`Membre: ${p.name || 'Anonyme'}. Antécédents: ${medical.chronicConditions || 'Inconnus'}.`);
            }
          });
          if (familyMembers.length > 0) {
            familyContext = `\n\n[ANTÉCÉDENTS FAMILIAUX (AUTRES PROFILS)]\n${familyMembers.join('\n')}\n(Utilise ces données pour détecter des risques héréditaires ou génétiques).`;
          }
        }
      } catch (e) { console.error(e); }
    }

    const currentTime = new Date().toLocaleString();
    const activeAgent = forcedAgent || "👨‍⚕️ Généraliste";
    const historyContext = history.length > 0 ? `\n\n[HISTORIQUE RÉCENT]\n${history.map(h => `${h.role === 'user' ? 'Patient' : 'IA'}: ${typeof h.content === 'string' ? h.content : (h.content.text || '[Image/Fichier]')}`).join('\n')}` : "";

    const formattingRule = `
IMPORTANT : Tu dois ABSOLUMENT répondre avec un UNIQUE objet JSON valide, sans balises markdown autour.
Format exact attendu :
{
  "reponse": "Ton message direct au patient (humain, 2-3 phrases)",
  "raisonnement": "Ton analyse médicale clinique détaillée incluant le contexte familial, le questionnaire et l'heure locale si pertinent",
  "sources": "Les sources médicales (ex: HAS, OMS)",
  "specialiste_recommande": "Nom du spécialiste (Optionnel, laisse vide si non nécessaire. Ex: 'Cardiologie')",
  "score_urgence": un nombre entre 1 et 10 selon la gravité immédiate détectée
}`;

    const coreInstructions = `
⚠️ PROTOCOLE DE RIGUEUR CLINIQUE ABSOLUE :
1. ANALYSE SYSTÉMATIQUE (OCR VISION) : Si une image ou un document est fourni, tu DOIS analyser CHAQUE ligne. Ton but est de découvrir TOUTES les pathologies ou anomalies possibles (diabète, thyroïde, carences, inflammations, risques cardiaques, etc.). Ne néglige aucun paramètre, même mineur.
2. DÉTECTION EXHAUSTIVE : Ne te limite pas à la demande du patient. Traque activement tout signal faible suggérant une maladie sous-jacente.
3. INTERDICTION DU LAXISME : Ne dis JAMAIS "Globalement rassurant" si une seule valeur est hors-norme ou en limite (ex: HbA1c > 5.7%, Glycémie > 1g/L, TSH anormale).
4. TABLEAU OBLIGATOIRE : Présente TOUJOURS les résultats extraits dans un tableau Markdown : | Paramètre | Valeur | Norme | Statut |.
5. CORRÉLATION : Croise les résultats avec le profil du patient, ses antécédents et ses symptômes.
`;

    const fullMedicalContext = `${profileContext}${questionnaireContext}${familyContext}\n[TEMPS RÉEL]\nDate et Heure actuelle : ${currentTime}\nScore d'urgence actuel : ${urgencyScore}/10`;

    let systemPrompt = "";
    if (activeAgent.includes("Généraliste")) {
      const imageInstruction = base64Image ? `
⚠️ ANALYSE D'IMAGE PRIORITAIRE :
1. IRM cerveau -> 'Neurologie'.
2. ECG/Radio thorax -> 'Cardiologie'.
3. Photo peau -> 'Dermatologie'.
4. Diabète/Pré-diabète (HbA1c > 5.7%) -> 'Endocrinologie'.
5. Microcytose/Indices bas -> 'Hématologie'.
Donne le nom exact (ex: 'Endocrinologie') dans "specialiste_recommande".` : '';

      systemPrompt = `Tu es "Dr. IA Expert Généraliste", une intelligence médicale de pointe.
${coreInstructions}
Tes missions :
1. OCR & VISION : Extraire et interpréter chaque chiffre.
2. TRIAGE : Rediriger vers le bon spécialiste.
${imageInstruction}
[DONNÉES DU PATIENT]
${fullMedicalContext}
${historyContext}
${formattingRule}`;
    } else {
      systemPrompt = `Tu es Dr. IA, agissant en tant qu'EXPERT en ${activeAgent}. 
${coreInstructions}
En tant que spécialiste, apporte une vision approfondie et technique.
[DONNÉES DU PATIENT]
${fullMedicalContext}
${historyContext}
${formattingRule}`;
    }

    return { systemPrompt, activeAgent, urgencyScore };
  }

  private static parseAIResponse(rawResponse: string, activeAgent: string, defaultUrgencyScore: number): AgentResponse {
    let text = "Erreur de formatage de l'IA.";
    let xaiExplanation = "Raisonnement non fourni par l'IA.";
    let sources = "Sources médicales générales (HAS, PubMed).";
    let recommendedSpecialist = undefined;
    let urgencyScore = defaultUrgencyScore;

    try {
      let cleanedJson = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanedJson);
      text = parsed.reponse || text;
      xaiExplanation = parsed.raisonnement || xaiExplanation;
      sources = parsed.sources || sources;
      if (parsed.score_urgence) urgencyScore = Number(parsed.score_urgence);
      if (parsed.specialiste_recommande?.trim()) recommendedSpecialist = parsed.specialiste_recommande.trim();
    } catch (e) {
      text = rawResponse;
    }

    return { text, agent: activeAgent, urgencyScore, xaiExplanation, sources, recommendedSpecialist };
  }

  static async processMessage(
    userMessage: any, 
    history: any[], 
    profile?: any, 
    forcedAgent?: string,
    uid?: string,
    activeProfileId?: string
  ): Promise<AgentResponse> {
    const { systemPrompt, activeAgent, urgencyScore } = await this.prepareContext(userMessage, history, profile, forcedAgent, uid, activeProfileId, 0);
    let msgText = typeof userMessage === 'string' ? userMessage : userMessage.text;
    let base64Image = typeof userMessage === 'object' ? userMessage.imageBase64 : undefined;
    const payloadContent: any = base64Image ? { text: msgText, imageBase64: base64Image } : msgText;
    
    let rawResponse = "";

    if (IS_LOCAL_STORAGE) {
      try {
        const response = await axios.post(`${BACKEND_URL}/api/chat`, {
          messages: [...history, { role: 'user', content: payloadContent }],
          systemPrompt,
          activeAgent,
          uid,
          profileId: activeProfileId
        });
        rawResponse = response.data.rawResponse;
      } catch (err: any) {
        console.error("Local agent chat non-streaming failed:", err);
        rawResponse = JSON.stringify({
          reponse: "Erreur de connexion avec l'IA locale.",
          raisonnement: err.message,
          sources: "N/A",
          score_urgence: 1
        });
      }
    } else {
      rawResponse = await AzureAIService.sendMessage([{ role: 'user', content: payloadContent }], systemPrompt);
    }

    return this.parseAIResponse(rawResponse, activeAgent, urgencyScore);
  }
}
