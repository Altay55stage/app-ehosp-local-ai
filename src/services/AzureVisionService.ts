export class AzureVisionService {
  static async analyzeImage(base64: string): Promise<string> {
    const endpoint = process.env.EXPO_PUBLIC_AZURE_COGNITIVE_ENDPOINT;
    const key = process.env.EXPO_PUBLIC_AZURE_COGNITIVE_KEY;

    if (!endpoint || !key) {
      throw new Error("Azure Cognitive Services configuration missing.");
    }

    // URL pour l'OCR (Optical Character Recognition)
    const url = `${endpoint.replace(/\/$/, '')}/vision/v3.2/ocr?language=unk&detectOrientation=true&model-version=latest`;

    try {
      // Conversion base64 en binary (blob) pour Azure
      const binary = atob(base64);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Ocp-Apim-Subscription-Key': key,
        },
        body: array,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Azure OCR Error:", errorData);
        throw new Error(`Azure OCR API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Extraction du texte brut
      let fullText = '';
      data.regions.forEach((region: any) => {
        region.lines.forEach((line: any) => {
          line.words.forEach((word: any) => {
            fullText += word.text + ' ';
          });
          fullText += '\n';
        });
      });

      return fullText.trim();
    } catch (e) {
      console.error("OCR Service Error:", e);
      throw e;
    }
  }

  /**
   * Analyse intelligente du texte OCR pour extraire le nom du médicament
   * Utilise GPT-4o (déjà configuré) pour plus de précision
   */
  static async extractMedicationInfo(ocrText: string): Promise<{ name: string; dosage: string }> {
    // On pourrait parser manuellement, mais utiliser notre IA est plus "Revolutionary"
    const prompt = `Voici le texte extrait d'une boîte de médicament via OCR :
    "${ocrText}"
    
    Identifiez UNIQUEMENT le nom du médicament et son dosage (ex: Paracétamol 500mg). 
    Répondez au format JSON : {"name": "...", "dosage": "..."}. Si inconnu, laissez vide.`;

    // Utilisation de AzureAIService (on assume qu'il existe et est exporté)
    const { AzureAIService } = require('./AzureAIService');
    const response = await AzureAIService.sendMessage([{ role: 'user', content: prompt }], "Vous êtes un expert en pharmacie.");
    
    try {
      return JSON.parse(response);
    } catch {
      return { name: "Inconnu", dosage: "" };
    }
  }
}
