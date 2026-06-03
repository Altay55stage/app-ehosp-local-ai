export class AzureAIService {
  private static buildUrl(endpoint: string): string {
    if (endpoint?.includes('/openai/v1')) {
      const baseUrl = endpoint.replace(/\/responses$/, '');
      return baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
    }
    return `${endpoint}/chat/completions?api-version=2024-08-01-preview`;
  }

  private static formatMessages(messages: any[]): any[] {
    return messages.map(msg => {
      if (Array.isArray(msg.content)) return msg;

      if (typeof msg.content === 'object' && msg.content !== null) {
        const content: any[] = [{ type: "text", text: msg.content.text || "Analyse de ces données médicales." }];
        
        // Gestion multi-images
        const images = msg.content.images || (msg.content.imageBase64 ? [msg.content.imageBase64] : []);
        images.forEach((img: string) => {
          content.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${img}` } });
        });

        return { role: msg.role, content };
      }
      
      return msg;
    });
  }

  /**
   * Envoi classique (une seule réponse JSON complète)
   */
  static async sendMessage(messages: any[], systemPrompt: string): Promise<string> {
    const endpoint = process.env.EXPO_PUBLIC_AZURE_AI_ENDPOINT;
    const key = process.env.EXPO_PUBLIC_AZURE_AI_KEY;
    const model = process.env.EXPO_PUBLIC_AZURE_AI_MODEL || 'gpt-4o';

    try {
      const url = this.buildUrl(endpoint!);
      const formattedMessages = this.formatMessages(messages);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': key! },
        body: JSON.stringify({
          messages: [{ role: 'system', content: systemPrompt }, ...formattedMessages],
          model,
          temperature: 0.7,
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) throw new Error(`Azure API error: ${response.status}`);
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (e) {
      console.warn("Using fallback AI response due to error:", e);
      return JSON.stringify({
        reponse: "Je suis l'IA eHosp (mode hors-ligne). Vérifiez votre connexion et votre configuration Azure.",
        raisonnement: "L'API Azure n'est pas joignable.",
        sources: "N/A",
        specialiste_recommande: ""
      });
    }
  }

  /**
   * Envoi avec streaming SSE — appelle onToken(text) à chaque token reçu
   * Retourne la réponse complète en fin de stream
   */
  static async sendMessageStreaming(
    messages: any[],
    systemPrompt: string,
    onToken: (partialText: string) => void
  ): Promise<string> {
    const endpoint = process.env.EXPO_PUBLIC_AZURE_AI_ENDPOINT;
    const key = process.env.EXPO_PUBLIC_AZURE_AI_KEY;
    const model = process.env.EXPO_PUBLIC_AZURE_AI_MODEL || 'gpt-4o';

    try {
      const url = this.buildUrl(endpoint!);
      const formattedMessages = this.formatMessages(messages);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': key! },
        body: JSON.stringify({
          messages: [{ role: 'system', content: systemPrompt }, ...formattedMessages],
          model,
          temperature: 0.7,
          stream: true,
          // Note: JSON mode incompatible avec stream, on parse manuellement
        }),
      });

      if (!response.ok) throw new Error(`Azure Streaming API error: ${response.status}`);
      if (!response.body) throw new Error('No response body for streaming');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const token = parsed.choices?.[0]?.delta?.content || '';
            if (token) {
              fullText += token;
              onToken(fullText);
            }
          } catch {
            // Ignore malformed SSE lines
          }
        }
      }

      return fullText;
    } catch (e) {
      // Mode fallback silencieux pour les environnements ne supportant pas le streaming body (ex: certains simulateurs Expo)
      const result = await this.sendMessage(messages, systemPrompt);
      onToken(result);
      return result;
    }
  }
}

