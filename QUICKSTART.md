# Quick Start Guide

## Installation Complete!

All code changes have been successfully implemented. The application now supports **three AI providers**:
- Google Gemini
- OpenAI
- Ollama (local)

## How to Run

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open your browser** to the URL shown (typically `http://localhost:5173`)

3. **Configure your AI provider:**
   - Click the **Settings** button (gear icon) in the top navigation
   - Select your preferred provider (Gemini, OpenAI, or Ollama)
   - Enter your API key or configure Ollama
   - Click "Save Settings"

4. **Start using the app!**

## Quick Configuration Examples

### Using Google Gemini (Easiest)
1. Get free API key: https://aistudio.google.com/apikey
2. In Settings, select "Gemini"
3. Paste API key
4. Model: `gemini-2.0-flash-exp`
5. Save

### Using OpenAI
1. Get API key: https://platform.openai.com/api-keys
2. In Settings, select "OpenAI"
3. Paste API key
4. Model: `gpt-4o` or `gpt-3.5-turbo`
5. Save

### Using Ollama (Free, Local)
1. Install Ollama: https://ollama.ai
2. Run: `ollama pull llama3.2`
3. Start Ollama: `ollama serve`
4. In Settings, select "Ollama"
5. Model: `llama3.2`
6. Base URL: `http://localhost:11434`
7. Save

## What Changed?

### New Features
- **Settings UI** - Configure AI provider without editing code
- **Multi-provider support** - Switch between Gemini, OpenAI, or Ollama
- **Local storage** - Settings persist between sessions
- **Unified interface** - All providers work the same way

### New Files Created
- `services/aiServiceTypes.ts` - Common types for all providers
- `services/aiServiceFactory.ts` - Provider factory pattern
- `services/geminiProvider.ts` - Refactored Gemini service
- `services/openaiProvider.ts` - OpenAI integration
- `services/ollamaProvider.ts` - Ollama integration
- `services/settingsManager.ts` - Settings persistence
- `hooks/useAIService.ts` - React hook for AI service
- `components/Settings.tsx` - Settings modal UI

### Modified Files
- `App.tsx` - Added settings modal
- `components/LabGenerator.tsx` - Added settings button, uses new service
- `components/PowerShellScorer.tsx` - Added settings button, uses new service
- `package.json` - Added OpenAI SDK dependency
- `.env.local` - Updated with instructions
- `README.md` - Complete documentation

## Architecture

```
User clicks Settings → Settings Modal opens
                    ↓
User selects provider & enters API key
                    ↓
Settings saved to localStorage
                    ↓
AI Service Factory creates appropriate provider
                    ↓
Provider handles all API calls with retry logic
```

## Testing Checklist

- [ ] Settings modal opens and closes
- [ ] Can select each provider (Gemini, OpenAI, Ollama)
- [ ] Settings save and persist on page reload
- [ ] Lab Generator works with chosen provider
- [ ] PowerShell Scorer works with chosen provider
- [ ] Error messages are clear and helpful
- [ ] Streaming works for real-time output

## Troubleshooting

**Settings not saving?**
- Check browser console for errors
- Ensure localStorage is enabled in your browser

**API errors?**
- Verify API key is correct in Settings
- Check that you have credits/quota remaining
- For Ollama, ensure it's running (`ollama serve`)

**Can't build?**
- Directory path contains special characters
- Try moving project to simpler path like `C:\projects\lab-generator`

## Next Steps

The application is ready to use! Simply:
1. Run `npm run dev`
2. Configure your AI provider in Settings
3. Start generating labs

For full documentation, see [README.md](README.md)
