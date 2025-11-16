// components/ProviderSettings.tsx
import React, { useState } from 'react';
import { AIProvider, AIConfig } from '../services/aiService';
import { ChevronDownIcon, ChevronUpIcon } from './Icons';

interface ProviderSettingsProps {
  config: AIConfig;
  onChange: (config: AIConfig) => void;
  isDisabled?: boolean;
}

export const ProviderSettings: React.FC<ProviderSettingsProps> = ({ config, onChange, isDisabled }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const providers: { value: AIProvider; label: string; defaultModel: string }[] = [
    { value: 'gemini', label: 'Google Gemini', defaultModel: 'gemini-2.0-flash-exp' },
    { value: 'openai', label: 'OpenAI', defaultModel: 'gpt-4o' },
    { value: 'ollama', label: 'Ollama (Local)', defaultModel: 'llama2' }
  ];

  const handleProviderChange = (provider: AIProvider) => {
    const defaultModel = providers.find(p => p.value === provider)?.defaultModel || '';
    onChange({ ...config, provider, model: defaultModel });
  };

  const handleApiKeyChange = (apiKey: string) => {
    onChange({ ...config, apiKey });
  };

  const handleModelChange = (model: string) => {
    onChange({ ...config, model });
  };

  const handleBaseUrlChange = (baseUrl: string) => {
    onChange({ ...config, baseUrl });
  };

  return (
    <div className="bg-dark-bg border border-dark-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={isDisabled}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="text-sm font-semibold">AI Provider Settings</span>
        {isExpanded ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
      </button>

      {isExpanded && (
        <div className="p-3 space-y-3 border-t border-dark-border">
          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-semibold text-dark-text-secondary mb-2">
              AI Provider
            </label>
            <div className="grid grid-cols-3 gap-2">
              {providers.map(provider => (
                <button
                  key={provider.value}
                  onClick={() => handleProviderChange(provider.value)}
                  disabled={isDisabled}
                  className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    config.provider === provider.value
                      ? 'bg-brand-primary text-white'
                      : 'bg-gray-700 text-dark-text hover:bg-gray-600'
                  }`}
                >
                  {provider.label}
                </button>
              ))}
            </div>
          </div>

          {/* API Key (for Gemini and OpenAI) */}
          {(config.provider === 'gemini' || config.provider === 'openai') && (
            <div>
              <label htmlFor="api-key" className="block text-xs font-semibold text-dark-text-secondary mb-2">
                API Key
              </label>
              <input
                id="api-key"
                type="password"
                value={config.apiKey || ''}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                disabled={isDisabled}
                placeholder={`Enter your ${config.provider === 'gemini' ? 'Gemini' : 'OpenAI'} API key`}
                className="w-full px-3 py-2 bg-dark-bg text-dark-text text-sm rounded-md border border-dark-border focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-50"
              />
            </div>
          )}

          {/* Base URL (for Ollama) */}
          {config.provider === 'ollama' && (
            <div>
              <label htmlFor="base-url" className="block text-xs font-semibold text-dark-text-secondary mb-2">
                Base URL
              </label>
              <input
                id="base-url"
                type="text"
                value={config.baseUrl || 'http://localhost:11434'}
                onChange={(e) => handleBaseUrlChange(e.target.value)}
                disabled={isDisabled}
                placeholder="http://localhost:11434"
                className="w-full px-3 py-2 bg-dark-bg text-dark-text text-sm rounded-md border border-dark-border focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-50"
              />
            </div>
          )}

          {/* Model Selection */}
          <div>
            <label htmlFor="model" className="block text-xs font-semibold text-dark-text-secondary mb-2">
              Model
            </label>
            <input
              id="model"
              type="text"
              value={config.model || ''}
              onChange={(e) => handleModelChange(e.target.value)}
              disabled={isDisabled}
              placeholder={`Enter model name (e.g., ${providers.find(p => p.value === config.provider)?.defaultModel})`}
              className="w-full px-3 py-2 bg-dark-bg text-dark-text text-sm rounded-md border border-dark-border focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-dark-text-secondary">
              {config.provider === 'gemini' && 'Examples: gemini-2.0-flash-exp, gemini-2.5-pro'}
              {config.provider === 'openai' && 'Examples: gpt-4o, gpt-4-turbo, gpt-3.5-turbo'}
              {config.provider === 'ollama' && 'Examples: llama2, mistral, codellama'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};