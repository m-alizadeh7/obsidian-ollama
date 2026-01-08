/**
 * AI Provider Interface - Allows multiple AI backends
 * Phase 3 will add OpenAI, Anthropic, Groq support
 */

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

export interface AIStreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullResponse: string) => void;
  onError: (error: Error) => void;
}

export interface AIProvider {
  name: string;
  id: string;
  
  // Check if provider is available/configured
  isAvailable(): Promise<boolean>;
  
  // Get list of available models
  getModels(): Promise<string[]>;
  
  // Generate response (non-streaming)
  generate(prompt: string, model: string, options?: GenerateOptions): Promise<string>;
  
  // Generate response with streaming
  generateStream(
    prompt: string, 
    model: string, 
    callbacks: AIStreamCallbacks,
    options?: GenerateOptions
  ): AbortController;
  
  // Chat with conversation history
  chat(
    messages: AIMessage[], 
    model: string, 
    callbacks: AIStreamCallbacks,
    options?: GenerateOptions
  ): AbortController;
}

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface ChatMessage extends AIMessage {
  id: string;
  attachedNote?: {
    path: string;
    content: string;
  };
  isStreaming?: boolean;
  error?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  model: string;
  provider: string;
  createdAt: number;
  updatedAt: number;
}
