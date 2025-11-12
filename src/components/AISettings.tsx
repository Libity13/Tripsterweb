import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAIConfig } from '@/config/aiConfig';
import { AIProvider, AI_MODELS } from '@/services/aiProviderService';

export function AISettings() {
  const {
    config,
    updateProvider,
    updateModel,
    updateTemperature,
    updateMaxTokens,
    updateSystemPrompt,
    updateApiKey,
    getAvailableModels,
    getModelInfo
  } = useAIConfig();

  const [isExpanded, setIsExpanded] = useState(false);

  const availableModels = getAvailableModels();
  const currentModelInfo = getModelInfo(config.currentModel);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              AI Settings
              <Badge variant={config.isConfigured ? "default" : "secondary"}>
                {config.isConfigured ? "Configured" : "Not Configured"}
              </Badge>
            </CardTitle>
            <CardDescription>
              Configure AI provider and model settings
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Collapse" : "Expand"}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label htmlFor="provider">AI Provider</Label>
            <Select
              value={config.currentProvider}
              onValueChange={(value: AIProvider) => updateProvider(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select AI Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="gemini">Google Gemini</SelectItem>
                <SelectItem value="claude">Anthropic Claude</SelectItem>
                <SelectItem value="mock">Mock AI (Development)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select
              value={config.currentModel}
              onValueChange={updateModel}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Model" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex flex-col">
                      <span>{model.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {model.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentModelInfo && (
              <div className="text-sm text-muted-foreground">
                Max Tokens: {currentModelInfo.maxTokens.toLocaleString()} | 
                Cost: ${currentModelInfo.costPerToken.toFixed(6)}/token
              </div>
            )}
          </div>

          <Separator />

          {/* API Key Configuration */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">API Keys</h4>
            
            {config.currentProvider !== 'mock' && (
              <div className="space-y-2">
                <Label htmlFor="api-key">
                  {config.currentProvider === 'openai' && 'OpenAI API Key'}
                  {config.currentProvider === 'gemini' && 'Google AI API Key'}
                  {config.currentProvider === 'claude' && 'Anthropic API Key'}
                </Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder={`Enter your ${config.currentProvider} API key`}
                  value={config.apiKeys[config.currentProvider]}
                  onChange={(e) => updateApiKey(config.currentProvider, e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Your API key is stored locally and never shared.
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Model Parameters */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Model Parameters</h4>
            
            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="temperature">Temperature</Label>
                <span className="text-sm text-muted-foreground">{config.temperature}</span>
              </div>
              <Slider
                id="temperature"
                min={0}
                max={2}
                step={0.1}
                value={[config.temperature]}
                onValueChange={([value]) => updateTemperature(value)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Higher values make responses more creative and random.
              </p>
            </div>

            {/* Max Tokens */}
            <div className="space-y-2">
              <Label htmlFor="max-tokens">Max Tokens</Label>
              <Input
                id="max-tokens"
                type="number"
                min={1}
                max={currentModelInfo?.maxTokens || 100000}
                value={config.maxTokens}
                onChange={(e) => updateMaxTokens(parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of tokens to generate.
              </p>
            </div>
          </div>

          <Separator />

          {/* System Prompt */}
          <div className="space-y-2">
            <Label htmlFor="system-prompt">System Prompt</Label>
            <Textarea
              id="system-prompt"
              placeholder="Enter system prompt..."
              value={config.systemPrompt}
              onChange={(e) => updateSystemPrompt(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Instructions for how the AI should behave.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                // Test current configuration
                console.log('Testing AI configuration...');
              }}
              disabled={!config.isConfigured}
            >
              Test Configuration
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                // Reset to default
                if (confirm('Are you sure you want to reset all settings?')) {
                  // Reset logic here
                }
              }}
            >
              Reset to Default
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default AISettings;
