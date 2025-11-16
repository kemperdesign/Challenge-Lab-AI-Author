import React, { useState, useEffect } from 'react';
import { AIProvider } from '../services/aiServiceTypes';
import { SettingsManager, ProviderSettings } from '../services/settingsManager';
import { DEFAULT_MODELS } from '../services/aiServiceFactory';

interface SettingsProps {
  onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const [settings, setSettings] = useState<ProviderSettings>(SettingsManager.getSettings());
  const [saved, setSaved] = useState(false);

  const handleProviderChange = (provider: AIProvider) => {
    setSettings({
      ...settings,
      provider,
      model: DEFAULT_MODELS[provider]
    });
  };

  const handleSave = () => {
    SettingsManager.saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClose = () => {
    onClose();
  };

  const handleExportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'challenge-lab-ai-settings.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportSettings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const importedSettings = JSON.parse(event.target?.result as string);
            setSettings(importedSettings);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          } catch (error) {
            alert('Failed to import settings. Please ensure the file is a valid JSON file.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">AI Provider Settings</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            &times;
          </button>
        </div>

        <div className="space-y-6">
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              AI Provider
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['gemini', 'openai', 'ollama'] as AIProvider[]).map((provider) => (
                <button
                  key={provider}
                  onClick={() => handleProviderChange(provider)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    settings.provider === provider
                      ? 'border-blue-500 bg-blue-900 bg-opacity-20'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-lg font-semibold text-white capitalize">
                      {provider}
                    </div>
                    {provider === 'ollama' && (
                      <div className="text-xs text-gray-400 mt-1">Local</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* API Key (not needed for Ollama) */}
          {settings.provider !== 'ollama' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={settings.apiKey}
                onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                placeholder={`Enter your ${settings.provider} API key`}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
              <p className="mt-2 text-xs text-gray-400">
                {settings.provider === 'gemini' && (
                  <>Get your API key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google AI Studio</a></>
                )}
                {settings.provider === 'openai' && (
                  <>Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">OpenAI Platform</a></>
                )}
              </p>
            </div>
          )}

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Model
            </label>

            {/* Ollama: Dropdown with popular models */}
            {settings.provider === 'ollama' ? (
              <select
                value={settings.model}
                onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="llama3.2">llama3.2 (Recommended)</option>
                <option value="llama3.2:8b">llama3.2:8b (Smaller, faster)</option>
                <option value="mistral">mistral</option>
                <option value="codellama">codellama</option>
                <option value="qwen2.5">qwen2.5</option>
                <option value="gemma2">gemma2</option>
                <option value="llama3.1">llama3.1</option>
                <option value="phi3">phi3</option>
              </select>
            ) : (
              /* Gemini & OpenAI: Text input */
              <input
                type="text"
                value={settings.model}
                onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                placeholder="Model name"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            )}

            <p className="mt-2 text-xs text-gray-400">
              {settings.provider === 'gemini' && (
                <>Recommended: gemini-2.0-flash-exp, gemini-1.5-pro</>
              )}
              {settings.provider === 'openai' && (
                <>Recommended: gpt-4o, gpt-4-turbo, gpt-3.5-turbo</>
              )}
              {settings.provider === 'ollama' && (
                <>Select a model from the dropdown. Make sure it's installed with <code className="text-blue-400">ollama pull &lt;model&gt;</code></>
              )}
            </p>
          </div>

          {/* Ollama Base URL */}
          {settings.provider === 'ollama' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ollama Base URL
              </label>
              <input
                type="text"
                value={settings.ollamaBaseUrl}
                onChange={(e) => setSettings({ ...settings, ollamaBaseUrl: e.target.value })}
                placeholder="http://localhost:11434"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
              <p className="mt-2 text-xs text-gray-400">
                Make sure Ollama is running locally. Install from <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">ollama.ai</a>
              </p>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-300 mb-2">Provider Information</h3>
            <div className="text-xs text-gray-300 space-y-1">
              {settings.provider === 'gemini' && (
                <>
                  <p>• Google's Gemini models offer excellent performance for document processing</p>
                  <p>• Free tier available with generous limits</p>
                  <p>• Best for complex lab generation tasks</p>
                </>
              )}
              {settings.provider === 'openai' && (
                <>
                  <p>• OpenAI's GPT models are highly capable and reliable</p>
                  <p>• Pay-as-you-go pricing</p>
                  <p>• Great for general-purpose AI tasks</p>
                </>
              )}
              {settings.provider === 'ollama' && (
                <>
                  <p>• Run AI models locally on your own hardware</p>
                  <p>• No API costs or rate limits</p>
                  <p>• Requires Ollama to be installed and running</p>
                  <p>• Model performance depends on your hardware</p>
                </>
              )}
            </div>
          </div>

          {/* Import/Export Buttons */}
          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Backup & Restore</h3>
            <div className="flex gap-3">
              <button
                onClick={handleExportSettings}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
              >
                Export Settings
              </button>
              <button
                onClick={handleImportSettings}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
              >
                Import Settings
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Export your settings to a JSON file for backup, or import previously saved settings.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {saved ? 'Saved!' : 'Save Settings'}
            </button>
            <button
              onClick={handleClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
