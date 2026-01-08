import { AIProvider, AIMessage, AIStreamCallbacks, GenerateOptions } from "model/AIProvider";

export class GeminiProvider implements AIProvider {
  name = 'Google Gemini';
  id = 'gemini';
  private apiKey: string = "";

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async getModels(): Promise<string[]> {
    return [
      "gemini-pro",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
    ];
  }

  async generate(
    prompt: string,
    model: string,
    options?: GenerateOptions
  ): Promise<string> {
    if (!this.apiKey) throw new Error("Gemini API key not configured");

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: options?.temperature ?? 0.7,
              maxOutputTokens: options?.maxTokens ?? 2048,
            },
            safetySettings: [
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_NONE",
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_NONE",
              },
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_NONE",
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_NONE",
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = await response.json() as any;
      const text =
        data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
      return text;
    } catch (error) {
      throw new Error(
        `Gemini generation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  generateStream(
    prompt: string,
    model: string,
    callbacks: AIStreamCallbacks,
    options?: GenerateOptions
  ): AbortController {
    const abortController = new AbortController();
    
    (async () => {
      if (!this.apiKey) {
        callbacks.onError(new Error("Gemini API key not configured"));
        return;
      }

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${this.apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: prompt }],
                },
              ],
              generationConfig: {
                temperature: options?.temperature ?? 0.7,
                maxOutputTokens: options?.maxTokens ?? 2048,
              },
              safetySettings: [
                {
                  category: "HARM_CATEGORY_HARASSMENT",
                  threshold: "BLOCK_NONE",
                },
                {
                  category: "HARM_CATEGORY_HATE_SPEECH",
                  threshold: "BLOCK_NONE",
                },
                {
                  category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                  threshold: "BLOCK_NONE",
                },
                {
                  category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                  threshold: "BLOCK_NONE",
                },
              ],
            }),
          }
        );

        if (!response.ok) {
          callbacks.onError(new Error(`Gemini API error: ${response.statusText}`));
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          callbacks.onError(new Error("No response body"));
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");

            buffer = lines[lines.length - 1];

            for (let i = 0; i < lines.length - 1; i++) {
              const line = lines[i].trim();
              if (line.startsWith("data: ")) {
                try {
                  const json = JSON.parse(line.slice(6));
                  const text =
                    json.candidates?.[0]?.content?.parts?.[0]?.text || "";
                  if (text) {
                    callbacks.onToken(text);
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        callbacks.onComplete("");
      } catch (error) {
        callbacks.onError(
          new Error(
            `Gemini stream failed: ${error instanceof Error ? error.message : String(error)}`
          )
        );
      }
    })();
    
    return abortController;
  }

  chat(
    messages: Array<{ role: "user" | "assistant"; content: string }>,
    model: string,
    callbacks: AIStreamCallbacks,
    options?: GenerateOptions
  ): AbortController {
    const abortController = new AbortController();
    
    (async () => {
      if (!this.apiKey) {
        callbacks.onError(new Error("Gemini API key not configured"));
        return;
      }

      const contents = messages.map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${this.apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents,
              generationConfig: {
                temperature: options?.temperature ?? 0.7,
                maxOutputTokens: options?.maxTokens ?? 2048,
              },
              safetySettings: [
                {
                  category: "HARM_CATEGORY_HARASSMENT",
                  threshold: "BLOCK_NONE",
                },
                {
                  category: "HARM_CATEGORY_HATE_SPEECH",
                  threshold: "BLOCK_NONE",
                },
                {
                  category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                  threshold: "BLOCK_NONE",
                },
                {
                  category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                  threshold: "BLOCK_NONE",
                },
              ],
            }),
          }
        );

        if (!response.ok) {
          callbacks.onError(new Error(`Gemini API error: ${response.statusText}`));
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          callbacks.onError(new Error("No response body"));
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");

            buffer = lines[lines.length - 1];

            for (let i = 0; i < lines.length - 1; i++) {
              const line = lines[i].trim();
              if (line.startsWith("data: ")) {
                try {
                  const json = JSON.parse(line.slice(6));
                  const text =
                    json.candidates?.[0]?.content?.parts?.[0]?.text || "";
                  if (text) {
                    callbacks.onToken(text);
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        callbacks.onComplete("");
      } catch (error) {
        callbacks.onError(
          new Error(
            `Gemini chat failed: ${error instanceof Error ? error.message : String(error)}`
          )
        );
      }
    })();
    
    return abortController;
  }
}
