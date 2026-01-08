/**
 * OpenAI Provider - For GPT models
 * Requires API key from https://platform.openai.com
 */

import { 
  AIProvider, 
  AIMessage, 
  AIStreamCallbacks, 
  GenerateOptions 
} from '../model/AIProvider';

export class OpenAIProvider implements AIProvider {
  name = 'OpenAI';
  id = 'openai';
  
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;
  
  constructor(
    apiKey: string = '', 
    defaultModel: string = 'gpt-3.5-turbo',
    baseUrl: string = 'https://api.openai.com/v1'
  ) {
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
    this.baseUrl = baseUrl;
  }
  
  setApiKey(key: string) {
    this.apiKey = key;
  }
  
  setDefaultModel(model: string) {
    this.defaultModel = model;
  }
  
  setBaseUrl(url: string) {
    this.baseUrl = url;
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
      return data.data
        ?.filter((m: any) => m.id.includes('gpt'))
        ?.map((m: any) => m.id) || [this.defaultModel];
    } catch {
      return [this.defaultModel];
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
        max_tokens: options?.maxTokens,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
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
    
    // Add system prompt if provided and not already present
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
          max_tokens: options?.maxTokens,
          stream: true,
        }),
        signal: abortController.signal,
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
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
