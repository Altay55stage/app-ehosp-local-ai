import * as FileSystem from 'expo-file-system/legacy';

export class PDFService {
  /**
   * Utilise Azure Cognitive Services pour extraire le texte de manière professionnelle (OCR).
   */
  static async extractText(uri: string): Promise<string> {
    const rawEndpoint = process.env.EXPO_PUBLIC_AZURE_COGNITIVE_ENDPOINT || "";
    const key = process.env.EXPO_PUBLIC_AZURE_COGNITIVE_KEY;
    const endpoint = rawEndpoint.endsWith('/') ? rawEndpoint.slice(0, -1) : rawEndpoint;

    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });

      // 1. TENTATIVE VIA AZURE (Méthode Pro)
      const azureUrl = `${endpoint}/vision/v3.2/read/analyze`;
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

      const response = await fetch(azureUrl, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': key!,
          'Content-Type': 'application/octet-stream',
        },
        body: bytes,
      });

      if (response.ok) {
        const operationLocation = response.headers.get('Operation-Location');
        if (operationLocation) {
          let result = null;
          for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 1500));
            const res = await fetch(operationLocation, { headers: { 'Ocp-Apim-Subscription-Key': key! } });
            result = await res.json();
            if (result.status === 'succeeded') break;
          }
          if (result && result.status === 'succeeded') {
            return result.analyzeResult.readResults.flatMap((p: any) => p.lines.map((l: any) => l.text)).join('\n');
          }
        }
      }

      // 2. FALLBACK SI AZURE ÉCHOUE (Fichier protégé ou erreur 400)
      console.log("Azure a échoué (PDF protégé ?), basculement sur l'extraction brute...");
      return this.extractTextBruteForce(binaryString);

    } catch (e) {
      console.error("Erreur PDFService globale:", e);
      return "Impossible de lire ce document. Il est peut-être trop protégé ou corrompu.";
    }
  }

  /**
   * Extraction binaire "Brute" pour les fichiers protégés par mot de passe.
   * On cherche les chaînes de caractères lisibles directement dans le flux.
   */
  private static extractTextBruteForce(raw: string): string {
    const matches = raw.match(/\((.*?)\)|\[(.*?)\]/g);
    if (matches) {
      let fullText = matches
        .map(m => m.slice(1, -1))
        .filter(t => t.length > 3 && !t.includes('obj') && !t.includes('endobj') && !t.match(/^[0-9\s]+$/))
        .join(' ');
      
      fullText = fullText.replace(/\\|\/|\(|\)/g, ' ').replace(/\s+/g, ' ').trim();
      return fullText || "Aucun texte lisible trouvé dans le fichier protégé.";
    }
    return "Échec de l'extraction brute.";
  }
}
