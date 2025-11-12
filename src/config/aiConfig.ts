// AI Configuration Management
import { useState } from 'react';
import { AIProvider, AIProviderConfig, AI_MODELS, getModelsForProvider } from '@/services/aiProviderService';

export interface AIConfigState {
  currentProvider: AIProvider;
  currentModel: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  apiKeys: Record<AIProvider, string>;
  isConfigured: boolean;
}

export const DEFAULT_AI_CONFIG: AIConfigState = {
  currentProvider: 'openai', // ใช้ OpenAI เป็น default
  currentModel: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 1000,
  systemPrompt: 'You are Tripster AI, a helpful travel planning assistant. Respond in Thai language.',
  apiKeys: {
    openai: '',
    gemini: '',
    claude: '',
    mock: ''
  },
  isConfigured: false
};

export class AIConfigManager {
  private config: AIConfigState;

  constructor() {
    this.config = this.loadConfig();
  }

  // Load configuration from localStorage
  private loadConfig(): AIConfigState {
    try {
      const saved = localStorage.getItem('ai-config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_AI_CONFIG, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load AI config:', error);
    }
    return DEFAULT_AI_CONFIG;
  }

  // Save configuration to localStorage
  private saveConfig(): void {
    try {
      localStorage.setItem('ai-config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save AI config:', error);
    }
  }

  // Get current configuration
  getConfig(): AIConfigState {
    return { ...this.config };
  }

  // Update provider
  updateProvider(provider: AIProvider): void {
    this.config.currentProvider = provider;
    const models = getModelsForProvider(provider);
    if (models.length > 0) {
      this.config.currentModel = models[0].id;
    }
    this.saveConfig();
  }

  // Update model
  updateModel(modelId: string): void {
    this.config.currentModel = modelId;
    this.saveConfig();
  }

  // Update temperature
  updateTemperature(temperature: number): void {
    this.config.temperature = Math.max(0, Math.min(2, temperature));
    this.saveConfig();
  }

  // Update max tokens
  updateMaxTokens(maxTokens: number): void {
    this.config.maxTokens = Math.max(1, Math.min(100000, maxTokens));
    this.saveConfig();
  }

  // Update system prompt
  updateSystemPrompt(prompt: string): void {
    this.config.systemPrompt = prompt;
    this.saveConfig();
  }

  // Update API key
  updateApiKey(provider: AIProvider, apiKey: string): void {
    this.config.apiKeys[provider] = apiKey;
    this.config.isConfigured = this.checkConfiguration();
    this.saveConfig();
  }

  // Get current AI provider configuration
  getCurrentProviderConfig(): AIProviderConfig {
    return {
      provider: this.config.currentProvider,
      apiKey: this.config.apiKeys[this.config.currentProvider],
      model: this.config.currentModel,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      systemPrompt: this.config.systemPrompt
    };
  }

  // Check if configuration is complete
  private checkConfiguration(): boolean {
    const provider = this.config.currentProvider;
    const apiKey = this.config.apiKeys[provider];
    
    if (provider === 'mock') {
      return true; // Mock doesn't need API key
    }
    
    return !!apiKey && apiKey.length > 0;
  }

  // Get available models for current provider
  getAvailableModels() {
    return getModelsForProvider(this.config.currentProvider);
  }

  // Get model information
  getModelInfo(modelId: string) {
    return AI_MODELS.find(model => model.id === modelId);
  }

  // Reset to default configuration
  resetConfig(): void {
    this.config = { ...DEFAULT_AI_CONFIG };
    this.saveConfig();
  }

  // Export configuration
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  // Import configuration
  importConfig(configJson: string): boolean {
    try {
      const imported = JSON.parse(configJson);
      this.config = { ...DEFAULT_AI_CONFIG, ...imported };
      this.saveConfig();
      return true;
    } catch (error) {
      console.error('Failed to import AI config:', error);
      return false;
    }
  }
}

// Global AI configuration manager instance
export const aiConfigManager = new AIConfigManager();

// React hook for AI configuration
export function useAIConfig() {
  const [config, setConfig] = useState<AIConfigState>(aiConfigManager.getConfig());

  const updateProvider = (provider: AIProvider) => {
    aiConfigManager.updateProvider(provider);
    setConfig(aiConfigManager.getConfig());
  };

  const updateModel = (modelId: string) => {
    aiConfigManager.updateModel(modelId);
    setConfig(aiConfigManager.getConfig());
  };

  const updateTemperature = (temperature: number) => {
    aiConfigManager.updateTemperature(temperature);
    setConfig(aiConfigManager.getConfig());
  };

  const updateMaxTokens = (maxTokens: number) => {
    aiConfigManager.updateMaxTokens(maxTokens);
    setConfig(aiConfigManager.getConfig());
  };

  const updateSystemPrompt = (prompt: string) => {
    aiConfigManager.updateSystemPrompt(prompt);
    setConfig(aiConfigManager.getConfig());
  };

  const updateApiKey = (provider: AIProvider, apiKey: string) => {
    aiConfigManager.updateApiKey(provider, apiKey);
    setConfig(aiConfigManager.getConfig());
  };

  const resetConfig = () => {
    aiConfigManager.resetConfig();
    setConfig(aiConfigManager.getConfig());
  };

  return {
    config,
    updateProvider,
    updateModel,
    updateTemperature,
    updateMaxTokens,
    updateSystemPrompt,
    updateApiKey,
    resetConfig,
    getAvailableModels: () => aiConfigManager.getAvailableModels(),
    getModelInfo: (modelId: string) => aiConfigManager.getModelInfo(modelId),
    getCurrentProviderConfig: () => aiConfigManager.getCurrentProviderConfig()
  };
}
