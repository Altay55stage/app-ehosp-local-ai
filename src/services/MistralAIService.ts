export class MistralAIService {
  private static formatMessages(messages: any[]): any[] {
    return messages.map(msg => {
      if (typeof msg.content === 'object' && msg.content.imageBase64) {
        return {
          role: msg.role,
          content: [
            { type: "text", text: msg.content.text || "Analysez cette image." },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${msg.content.imageBase64}` } }
          ]
        };
      }
      return msg;
    });
  }

  private static getApiKey(): string | undefined {
    return process.env.EXPO_PUBLIC_MISTRAL_API_KEY || process.env.MISTRAL_API_KEY;
  }

  /**
   * Envoi classique (une seule réponse JSON complète)
   */
  static async sendMessage(messages: any[], systemPrompt: string): Promise<string> {
    const key = this.getApiKey();
    const hasImage = messages.some(msg => typeof msg.content === 'object' && msg.content.imageBase64);
    const model = hasImage
      ? process.env.EXPO_PUBLIC_MISTRAL_VISION_MODEL || process.env.MISTRAL_VISION_MODEL || 'pixtral-large-latest'
      : process.env.EXPO_PUBLIC_MISTRAL_MODEL || process.env.MISTRAL_MODEL || 'mistral-large-latest';

    try {
      if (!key) throw new Error('Mistral API key missing.');
      const formattedMessages = this.formatMessages(messages);

      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          messages: [{ role: 'system', content: systemPrompt }, ...formattedMessages],
          model,
          temperature: 0.7,
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) throw new Error(`Mistral API error: ${response.status}`);
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (e) {
      console.warn("Using fallback AI response due to error:", e);
      return JSON.stringify({
        reponse: "Je suis l'IA eHosp (mode hors-ligne). Vérifiez votre connexion et votre configuration Mistral.",
        raisonnement: "L'API Mistral n'est pas joignable.",
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
    const key = this.getApiKey();
    const hasImage = messages.some(msg => typeof msg.content === 'object' && msg.content.imageBase64);
    const model = hasImage
      ? process.env.EXPO_PUBLIC_MISTRAL_VISION_MODEL || process.env.MISTRAL_VISION_MODEL || 'pixtral-large-latest'
      : process.env.EXPO_PUBLIC_MISTRAL_MODEL || process.env.MISTRAL_MODEL || 'mistral-large-latest';

    try {
      if (!key) throw new Error('Mistral API key missing.');
      const formattedMessages = this.formatMessages(messages);

      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          messages: [{ role: 'system', content: systemPrompt }, ...formattedMessages],
          model,
          temperature: 0.7,
          stream: true,
          // Note: JSON mode incompatible avec stream, on parse manuellement
        }),
      });

      if (!response.ok) throw new Error(`Mistral Streaming API error: ${response.status}`);
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
      console.warn("Streaming fallback:", e);
      // Fallback: simulate streaming via sendMessage
      const result = await this.sendMessage(messages, systemPrompt);
      onToken(result);
      return result;
    }
  }
}
