/**
 * Ollama Provider - Local AI with Ollama
 */

import { requestUrl } from 'obsidian';
import { 
  AIProvider, 
  AIMessage, 
  AIStreamCallbacks, 
  GenerateOptions 
} from '../model/AIProvider';

export class OllamaProvider implements AIProvider {
  name = 'Ollama';
  id = 'ollama';
  
  private baseUrl: string;
  private defaultModel: string;
  
  constructor(baseUrl: string = 'http://localhost:11434', defaultModel: string = 'llama2') {
    this.baseUrl = baseUrl;
    this.defaultModel = defaultModel;
  }
  
  setBaseUrl(url: string) {
    this.baseUrl = url;
  }
  
  setDefaultModel(model: string) {
    this.defaultModel = model;
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      const response = await requestUrl({
        url: `${this.baseUrl}/api/tags`,
        method: 'GET',
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
  
  async getModels(): Promise<string[]> {
    try {
      const response = await requestUrl({
        url: `${this.baseUrl}/api/tags`,
        method: 'GET',
      });
      const data = JSON.parse(response.text);
      return data.models?.map((m: any) => m.name) || [];
    } catch {
      return [this.defaultModel];
    }
  }
  
  async generate(
    prompt: string, 
    model?: string, 
    options?: GenerateOptions
  ): Promise<string> {
    const response = await requestUrl({
      url: `${this.baseUrl}/api/generate`,
      method: 'POST',
      body: JSON.stringify({
        model: model || this.defaultModel,
        prompt: options?.systemPrompt 
          ? `${options.systemPrompt}\n\n${prompt}` 
          : prompt,
        stream: false,
        options: {
          temperature: options?.temperature || 0.7,
        },
      }),
    });
    
    const data = JSON.parse(response.text);
    return data.response;
  }
  
  generateStream(
    prompt: string,
    model: string,
    callbacks: AIStreamCallbacks,
    options?: GenerateOptions
  ): AbortController {
    const abortController = new AbortController();
    
    this.streamRequest(
      `${this.baseUrl}/api/generate`,
      {
        model: model || this.defaultModel,
        prompt: options?.systemPrompt 
          ? `${options.systemPrompt}\n\n${prompt}` 
          : prompt,
        stream: true,
        options: {
          temperature: options?.temperature || 0.7,
        },
      },
      callbacks,
      abortController
    );
    
    return abortController;
  }
  
  chat(
    messages: AIMessage[],
    model: string,
    callbacks: AIStreamCallbacks,
    options?: GenerateOptions
  ): AbortController {
    const abortController = new AbortController();
    
    // Convert messages to Ollama format
    const ollamaMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
    
    // Add system prompt if provided
    if (options?.systemPrompt) {
      ollamaMessages.unshift({
        role: 'system' as const,
        content: options.systemPrompt,
      });
    }
    
    this.streamRequest(
      `${this.baseUrl}/api/chat`,
      {
        model: model || this.defaultModel,
        messages: ollamaMessages,
        stream: true,
        options: {
          temperature: options?.temperature || 0.7,
        },
      },
      callbacks,
      abortController,
      true // isChat
    );
    
    return abortController;
  }
  
  private async streamRequest(
    url: string,
    body: any,
    callbacks: AIStreamCallbacks,
    abortController: AbortController,
    isChat: boolean = false
  ) {
    let fullResponse = '';
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: abortController.signal,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }
      
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            const token = isChat ? json.message?.content : json.response;
            
            if (token) {
              fullResponse += token;
              callbacks.onToken(token);
            }
            
            if (json.done) {
              callbacks.onComplete(fullResponse);
              return;
            }
          } catch (e) {
            // Skip invalid JSON lines
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
