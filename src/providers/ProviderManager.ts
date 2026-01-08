/**
 * Provider Manager - Manages all AI providers
 */

import { AIProvider } from '../model/AIProvider';
import { OllamaProvider } from './OllamaProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { AnthropicProvider } from './AnthropicProvider';
import { GroqProvider } from './GroqProvider';
import { GeminiProvider } from './GeminiProvider';

export interface ProviderConfig {
  ollama: {
    enabled: boolean;
    url: string;
    defaultModel: string;
  };
  openai: {
    enabled: boolean;
    apiKey: string;
    defaultModel: string;
    baseUrl?: string;
  };
  anthropic: {
    enabled: boolean;
    apiKey: string;
    defaultModel: string;
  };
  groq: {
    enabled: boolean;
    apiKey: string;
    defaultModel: string;
  };
  gemini: {
    enabled: boolean;
    apiKey: string;
    defaultModel: string;
  };
}

export const DEFAULT_PROVIDER_CONFIG: ProviderConfig = {
  ollama: {
    enabled: true,
    url: 'http://localhost:11434',
    defaultModel: 'llama2',
  },
  openai: {
    enabled: false,
    apiKey: '',
    defaultModel: 'gpt-3.5-turbo',
  },
  anthropic: {
    enabled: false,
    apiKey: '',
    defaultModel: 'claude-3-haiku-20240307',
  },
  groq: {
    enabled: false,
    apiKey: '',
    defaultModel: 'llama2-70b-4096',
  },
  gemini: {
    enabled: false,
    apiKey: '',
    defaultModel: 'gemini-1.5-pro',
  },
};

export class ProviderManager {
  private providers: Map<string, AIProvider> = new Map();
  private config: ProviderConfig;
  private activeProviderId: string = 'ollama';
  
  constructor(config: ProviderConfig = DEFAULT_PROVIDER_CONFIG) {
    this.config = config;
    this.initializeProviders();
  }
  
  private initializeProviders() {
    // Always initialize Ollama
    const ollamaProvider = new OllamaProvider(
      this.config.ollama.url,
      this.config.ollama.defaultModel
    );
    this.providers.set('ollama', ollamaProvider);
    
    // Initialize OpenAI if configured
    if (this.config.openai.apiKey) {
      const openaiProvider = new OpenAIProvider(
        this.config.openai.apiKey,
        this.config.openai.defaultModel,
        this.config.openai.baseUrl
      );
      this.providers.set('openai', openaiProvider);
    }
    
    // Initialize Anthropic if configured
    if (this.config.anthropic.apiKey) {
      const anthropicProvider = new AnthropicProvider(
        this.config.anthropic.apiKey,
        this.config.anthropic.defaultModel
      );
      this.providers.set('anthropic', anthropicProvider);
    }
    
    // Initialize Groq if configured
    if (this.config.groq.apiKey) {
      const groqProvider = new GroqProvider(
        this.config.groq.apiKey,
        this.config.groq.defaultModel
      );
      this.providers.set('groq', groqProvider);
    }
    
    // Initialize Gemini if configured
    if (this.config.gemini.apiKey) {
      const geminiProvider = new GeminiProvider();
      geminiProvider.setApiKey(this.config.gemini.apiKey);
      this.providers.set('gemini', geminiProvider);
    }
  }
  
  updateConfig(config: ProviderConfig) {
    this.config = config;
    this.providers.clear();
    this.initializeProviders();
  }
  
  getProvider(id: string): AIProvider | undefined {
    return this.providers.get(id);
  }
  
  getActiveProvider(): AIProvider {
    return this.providers.get(this.activeProviderId) || 
           this.providers.get('ollama')!;
  }
  
  setActiveProvider(id: string) {
    if (this.providers.has(id)) {
      this.activeProviderId = id;
    }
  }
  
  getActiveProviderId(): string {
    return this.activeProviderId;
  }
  
  getAllProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }
  
  getAvailableProviderIds(): string[] {
    return Array.from(this.providers.keys());
  }
  
  async getAvailableProviders(): Promise<AIProvider[]> {
    const available: AIProvider[] = [];
    
    for (const provider of this.providers.values()) {
      if (await provider.isAvailable()) {
        available.push(provider);
      }
    }
    
    return available;
  }
  
  getProviderInfo(): { id: string; name: string; available: boolean }[] {
    return [
      { 
        id: 'ollama', 
        name: '🦙 Ollama (Local)', 
        available: this.config.ollama.enabled 
      },
      { 
        id: 'openai', 
        name: '🤖 OpenAI (GPT)', 
        available: this.config.openai.enabled && !!this.config.openai.apiKey 
      },
      { 
        id: 'anthropic', 
        name: '🧠 Anthropic (Claude)', 
        available: this.config.anthropic.enabled && !!this.config.anthropic.apiKey 
      },
      { 
        id: 'groq', 
        name: '⚡ Groq (Fast)', 
        available: this.config.groq.enabled && !!this.config.groq.apiKey 
      },
    ];
  }
}
