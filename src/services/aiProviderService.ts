// Multi-AI Provider Service
export type AIProvider = 'openai' | 'gemini' | 'claude' | 'mock';

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  description: string;
  maxTokens: number;
  costPerToken: number;
}

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
}

export interface AIResponse {
  success: boolean;
  response: string;
  provider: AIProvider;
  model: string;
  tokensUsed?: number;
  cost?: number;
  error?: string;
}

// Available AI Models
export const AI_MODELS: AIModel[] = [
  // OpenAI Models
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Most capable model for complex tasks',
    maxTokens: 128000,
    costPerToken: 0.00003
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Fast and cost-effective',
    maxTokens: 128000,
    costPerToken: 0.000015
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    description: 'Fast and efficient',
    maxTokens: 16385,
    costPerToken: 0.000002
  },
  
  // Gemini Models
  {
    id: 'gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash',
    provider: 'gemini',
    description: 'Latest Gemini model with multimodal capabilities',
    maxTokens: 1000000,
    costPerToken: 0.000001
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'gemini',
    description: 'Advanced reasoning and code generation',
    maxTokens: 2000000,
    costPerToken: 0.0000035
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'gemini',
    description: 'Fast and efficient',
    maxTokens: 1000000,
    costPerToken: 0.00000075
  },
  
  // Claude Models
  {
    id: 'claude-sonnet-4-5-20250929',
    name: 'Claude Sonnet 4.5',
    provider: 'claude',
    description: 'ใหม่ที่สุด, แรงที่สุด',
    maxTokens: 200000,
    costPerToken: 0.000003
  },
  {
    id: 'claude-3-5-sonnet-20240620',
    name: 'Claude 3.5 Sonnet',
    provider: 'claude',
    description: 'เสถียร, แนะนำใช้',
    maxTokens: 200000,
    costPerToken: 0.000003
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'claude',
    description: 'Claude 3 รุ่นใหญ่',
    maxTokens: 200000,
    costPerToken: 0.000015
  },
  {
    id: 'claude-3-sonnet-20240229',
    name: 'Claude 3 Sonnet',
    provider: 'claude',
    description: 'Claude 3 รุ่นกลาง',
    maxTokens: 200000,
    costPerToken: 0.000003
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    provider: 'claude',
    description: 'Claude 3 รุ่นเล็ก, เร็ว',
    maxTokens: 200000,
    costPerToken: 0.00000025
  },
  
  // Mock Model
  {
    id: 'mock-ai',
    name: 'Mock AI',
    provider: 'mock',
    description: 'Development and testing',
    maxTokens: 1000,
    costPerToken: 0
  }
];

export class AIProviderService {
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  async sendMessage(message: string, context?: any): Promise<AIResponse> {
    switch (this.config.provider) {
      case 'openai':
        return await this.callOpenAI(message, context);
      case 'gemini':
        return await this.callGemini(message, context);
      case 'claude':
        return await this.callClaude(message, context);
      case 'mock':
        return await this.callMock(message, context);
      default:
        throw new Error(`Unsupported AI provider: ${this.config.provider}`);
    }
  }

  private async callOpenAI(message: string, context?: any): Promise<AIResponse> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: this.config.systemPrompt || 'You are a helpful travel planning assistant.'
            },
            {
              role: 'user',
              content: message
            }
          ],
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API Error: ${response.status} ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      const tokensUsed = data.usage?.total_tokens || 0;
      const cost = tokensUsed * this.getModelCost();

      return {
        success: true,
        response: data.choices[0].message.content,
        provider: 'openai',
        model: this.config.model,
        tokensUsed,
        cost
      };
    } catch (error) {
      return {
        success: false,
        response: 'ขออภัย เกิดข้อผิดพลาดในการเรียก OpenAI API',
        provider: 'openai',
        model: this.config.model,
        error: error.message
      };
    }
  }

  private async callGemini(message: string, context?: any): Promise<AIResponse> {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: message
            }]
          }],
          generationConfig: {
            temperature: this.config.temperature,
            maxOutputTokens: this.config.maxTokens
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Gemini API Error: ${response.status} ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      const tokensUsed = data.usageMetadata?.totalTokenCount || 0;
      const cost = tokensUsed * this.getModelCost();

      return {
        success: true,
        response: data.candidates[0].content.parts[0].text,
        provider: 'gemini',
        model: this.config.model,
        tokensUsed,
        cost
      };
    } catch (error) {
      return {
        success: false,
        response: 'ขออภัย เกิดข้อผิดพลาดในการเรียก Gemini API',
        provider: 'gemini',
        model: this.config.model,
        error: error.message
      };
    }
  }

  private async callClaude(message: string, context?: any): Promise<AIResponse> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          messages: [{
            role: 'user',
            content: message
          }]
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Claude API Error: ${response.status} ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      const tokensUsed = data.usage?.input_tokens + data.usage?.output_tokens || 0;
      const cost = tokensUsed * this.getModelCost();

      return {
        success: true,
        response: data.content[0].text,
        provider: 'claude',
        model: this.config.model,
        tokensUsed,
        cost
      };
    } catch (error) {
      return {
        success: false,
        response: 'ขออภัย เกิดข้อผิดพลาดในการเรียก Claude API',
        provider: 'claude',
        model: this.config.model,
        error: error.message
      };
    }
  }

  private async callMock(message: string, context?: any): Promise<AIResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const mockResponses = [
      'สวัสดีครับ! ผมคือ Tripster ผู้ช่วยวางแผนทริป',
      'เยี่ยมเลย! ผมสามารถช่วยวางแผนการเดินทางให้คุณได้',
      'ลองบอกผมว่าคุณอยากไปที่ไหนครับ?',
      'คุณอยากไปกี่วันครับ?',
      'มีงบประมาณเท่าไหร่ครับ?'
    ];

    const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];

    return {
      success: true,
      response: randomResponse,
      provider: 'mock',
      model: 'mock-ai',
      tokensUsed: 0,
      cost: 0
    };
  }

  private getModelCost(): number {
    const model = AI_MODELS.find(m => m.id === this.config.model);
    return model?.costPerToken || 0;
  }

  // Update configuration
  updateConfig(newConfig: Partial<AIProviderConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current configuration
  getConfig(): AIProviderConfig {
    return { ...this.config };
  }
}

// Factory function to create AI provider
export function createAIProvider(config: AIProviderConfig): AIProviderService {
  return new AIProviderService(config);
}

// Get available models for a provider
export function getModelsForProvider(provider: AIProvider): AIModel[] {
  return AI_MODELS.filter(model => model.provider === provider);
}

// Get model by ID
export function getModelById(id: string): AIModel | undefined {
  return AI_MODELS.find(model => model.id === id);
}
