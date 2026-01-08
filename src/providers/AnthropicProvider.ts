/**
 * Anthropic Provider - For Claude models
 * Requires API key from https://console.anthropic.com
 */

import { 
  AIProvider, 
  AIMessage, 
  AIStreamCallbacks, 
  GenerateOptions 
} from '../model/AIProvider';

export class AnthropicProvider implements AIProvider {
  name = 'Anthropic';
  id = 'anthropic';
  
  private apiKey: string;
  private defaultModel: string;
  private baseUrl: string;
  
  constructor(
    apiKey: string = '', 
    defaultModel: string = 'claude-3-haiku-20240307'
  ) {
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
    this.baseUrl = 'https://api.anthropic.com/v1';
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
    // Anthropic doesn't have a models endpoint, return known models
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229', 
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0',
      'claude-instant-1.2',
    ];
  }
  
  async generate(
    prompt: string,
    model?: string,
    options?: GenerateOptions
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || this.defaultModel,
        max_tokens: options?.maxTokens || 4096,
        system: options?.systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.content?.[0]?.text || '';
  }
  
  generateStream(
    prompt: string,
    model: string,
    callbacks: AIStreamCallbacks,
    options?: GenerateOptions
  ): AbortController {
    const messages: AIMessage[] = [{ role: 'user', content: prompt }];
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
    
    // Convert messages to Anthropic format (no system role in messages)
    const systemPrompt = options?.systemPrompt || 
      messages.find(m => m.role === 'system')?.content;
    
    const anthropicMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }));
    
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model || this.defaultModel,
          max_tokens: options?.maxTokens || 4096,
          system: systemPrompt,
          messages: anthropicMessages,
          stream: true,
        }),
        signal: abortController.signal,
      });
      
      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');
      
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          
          const data = line.replace('data: ', '').trim();
          if (!data || data === '[DONE]') continue;
          
          try {
            const json = JSON.parse(data);
            
            if (json.type === 'content_block_delta' && json.delta?.text) {
              const token = json.delta.text;
              fullResponse += token;
              callbacks.onToken(token);
            }
            
            if (json.type === 'message_stop') {
              callbacks.onComplete(fullResponse);
              return;
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
