import { OllamaCommand } from "model/OllamaCommand";
import { ProviderConfig, DEFAULT_PROVIDER_CONFIG } from "../providers/ProviderManager";

export interface OllamaSettings {
  // Legacy settings (kept for backward compatibility)
  ollamaUrl: string;
  defaultModel: string;
  commands: OllamaCommand[];
  
  // New multi-provider settings
  providers: ProviderConfig;
  activeProvider: string;
  
  // Chat settings
  chatSystemPrompt: string;
  chatTemperature: number;
  chatMaxTokens: number;
  saveHistory: boolean;
}
