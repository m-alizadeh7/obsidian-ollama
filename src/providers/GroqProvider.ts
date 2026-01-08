/**
 * Groq Provider - Ultra-fast inference
 * Requires API key from https://console.groq.com
 */

import { 
  AIProvider, 
  AIMessage, 
  AIStreamCallbacks, 
  GenerateOptions 
} from '../model/AIProvider';

export class GroqProvider implements AIProvider {
  name = 'Groq';
  id = 'groq';
  
  private apiKey: string;
  private defaultModel: string;
  private baseUrl: string;
  
  constructor(
    apiKey: string = '', 
    defaultModel: string = 'llama2-70b-4096'
  ) {
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
    this.baseUrl = 'https://api.groq.com/openai/v1';
  }
  
  setApiKey(key: string) {
    this.apiKey = key;
  }
  
  setDefaultModel(model: string) {
    this.defaultModel = model;
  }
  
  async isAvailable(): Promise<boolean> {
    return !!this.apiKey && this.apiKey.length > 0;
  }
  
  async getModels(): Promise<string[]> {
    if (!this.apiKey) return [];
    
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      
      if (!response.ok) return [this.defaultModel];
      
      const data = await response.json();
      return data.data?.map((m: any) => m.id) || [this.defaultModel];
    } catch {
      return [
        'llama2-70b-4096',
        'mixtral-8x7b-32768',
        'gemma-7b-it',
      ];
    }
  }
  
  async generate(
    prompt: string,
    model?: string,
    options?: GenerateOptions
  ): Promise<string> {
    const messages: AIMessage[] = [];
    
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: model || this.defaultModel,
        messages,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 4096,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }
  
  generateStream(
    prompt: string,
    model: string,
    callbacks: AIStreamCallbacks,
    options?: GenerateOptions
  ): AbortController {
    const messages: AIMessage[] = [];
    
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });
    
    return this.chat(messages, model, callbacks, options);
  }
  
  chat(
    messages: AIMessage[],
    model: string,
    callbacks: AIStreamCallbacks,
    options?: GenerateOptions
  ): AbortController {
    const abortController = new AbortController();
    
    this.streamChat(messages, model, callbacks, abortController, options);
    
    return abortController;
  }
  
  private async streamChat(
    messages: AIMessage[],
    model: string,
    callbacks: AIStreamCallbacks,
    abortController: AbortController,
    options?: GenerateOptions
  ) {
    let fullResponse = '';
    
    const chatMessages = [...messages];
    if (options?.systemPrompt && !chatMessages.some(m => m.role === 'system')) {
      chatMessages.unshift({ role: 'system', content: options.systemPrompt });
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: model || this.defaultModel,
          messages: chatMessages.map(m => ({ role: m.role, content: m.content })),
          temperature: options?.temperature || 0.7,
          max_tokens: options?.maxTokens || 4096,
          stream: true,
        }),
        signal: abortController.signal,
      });
      
      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');
      
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));
        
        for (const line of lines) {
          const data = line.replace('data: ', '').trim();
          
          if (data === '[DONE]') {
            callbacks.onComplete(fullResponse);
            return;
          }
          
          try {
            const json = JSON.parse(data);
            const token = json.choices?.[0]?.delta?.content || '';
            
            if (token) {
              fullResponse += token;
              callbacks.onToken(token);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
      
      callbacks.onComplete(fullResponse);
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        callbacks.onComplete(fullResponse);
      } else {
        callbacks.onError(error);
      }
    }
  }
}
