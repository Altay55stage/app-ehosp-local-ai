import { MistralAIService } from './MistralAIService';

export class MistralVisionService {
  static async analyzeImage(base64: string): Promise<string> {
    const key = process.env.EXPO_PUBLIC_MISTRAL_API_KEY || process.env.MISTRAL_API_KEY;
    const model = process.env.EXPO_PUBLIC_MISTRAL_VISION_MODEL || process.env.MISTRAL_VISION_MODEL || 'pixtral-large-latest';

    if (!key) {
      throw new Error("Mistral configuration missing.");
    }

    try {
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: "Lis cette image de médicament et retourne uniquement le texte visible, sans commentaire.",
                },
                {
                  type: 'image_url',
                  image_url: { url: `data:image/jpeg;base64,${base64}` },
                },
              ],
            },
          ],
          temperature: 0,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Mistral Vision Error:", errorData);
        throw new Error(`Mistral vision API error: ${response.status}`);
      }

      const data = await response.json();
      return (data.choices?.[0]?.message?.content || '').trim();
    } catch (e) {
      console.error("OCR Service Error:", e);
      throw e;
    }
  }

  /**
   * Analyse intelligente du texte OCR pour extraire le nom du médicament
   * Utilise Mistral pour plus de précision
   */
  static async extractMedicationInfo(ocrText: string): Promise<{ name: string; dosage: string }> {
    const prompt = `Voici le texte extrait d'une boîte de médicament via OCR :
    "${ocrText}"
    
    Identifiez UNIQUEMENT le nom du médicament et son dosage (ex: Paracétamol 500mg). 
    Répondez au format JSON : {"name": "...", "dosage": "..."}. Si inconnu, laissez vide.`;

    const response = await MistralAIService.sendMessage([{ role: 'user', content: prompt }], "Vous êtes un expert en pharmacie.");
    
    try {
      return JSON.parse(response);
    } catch {
      return { name: "Inconnu", dosage: "" };
    }
  }
}
