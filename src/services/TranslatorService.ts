import { AzureAIService } from './AzureAIService';

export type LanguageCode = 'fr' | 'en' | 'es' | 'de' | 'it' | 'ar' | 'pt';

export class TranslatorService {
  private static translations: Record<LanguageCode, Record<string, string>> = {
    fr: {
      welcome: "Bienvenue sur eHosp",
      consultation: "Consultation Dr. IA",
      triage: "Triage d'Urgence",
      timeline: "Timeline Médicale",
      family: "Gestion Famille",
      profile: "Votre Profil",
      scan: "Scanner Médicament",
      heart_rate: "Fréquence Cardiaque",
    },
    en: {
      welcome: "Welcome to eHosp",
      consultation: "Dr. AI Consultation",
      triage: "Emergency Triage",
      timeline: "Medical Timeline",
      family: "Family Management",
      profile: "Your Profile",
      scan: "Medication Scanner",
      heart_rate: "Heart Rate",
    },
    // ... autres langues à compléter
  };

  /**
   * Traduction statique des labels UI
   */
  static t(key: string, lang: LanguageCode = 'fr'): string {
    return this.translations[lang]?.[key] || this.translations['fr'][key] || key;
  }

  /**
   * Traduction dynamique via Azure AI (GPT-4o) pour les rapports médicaux
   */
  static async translateText(text: string, targetLang: string): Promise<string> {
    const prompt = `Traduisez le texte médical suivant en ${targetLang}. 
    Conservez la terminologie médicale précise. 
    Texte : "${text}"`;

    try {
      // On utilise AzureAIService comme traducteur universel
      const response = await AzureAIService.sendMessage([{ role: 'user', content: prompt }], "Vous êtes un traducteur médical expert.");
      // Note: On assume que sendMessage retourne du JSON si on lui demande, mais ici on veut juste du texte
      // On va adapter AzureAIService pour supporter des réponses textuelles simples si besoin
      return response;
    } catch (e) {
      console.error("Translation error:", e);
      return text;
    }
  }
}
