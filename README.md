# Challenge Lab AI Agent & Script Generator

A powerful web application that transforms instructional content into structured Challenge Lab documents and generates PowerShell validation scripts using AI. Now supports **multiple AI providers**: Google Gemini, OpenAI, and local Ollama models.

## Features

### Lab Generator Module
- **Topic Mode**: Generate complete 10-lab series from a topic description
- **Document Mode**: Restructure existing documents into Challenge Lab format
- Sequential AI agents that progressively refine content
- Automatic markdown file downloads
- Support for both lab series and single lab creation

### PowerShell Scorer Module
- Generate PowerShell validation scripts for lab scoring
- Analyze lab instructions with optional environment details
- Support for screenshot uploads for visual reference
- Generate structured PowerShell Pester tests with JSON configuration
- "Scoring Assistant" for AI-powered validation suggestions

### Multi-Provider AI Support
- **Google Gemini**: Fast, powerful, and generous free tier
- **OpenAI**: Industry-leading GPT models (GPT-4, GPT-3.5)
- **Ollama**: Run AI models locally on your hardware (free, no API costs)

## Installation

### Prerequisites

- **Node.js** (version 16 or higher)
- **npm** (comes with Node.js)
- Depending on your chosen AI provider:
  - **Gemini**: API key from [Google AI Studio](https://aistudio.google.com/apikey)
  - **OpenAI**: API key from [OpenAI Platform](https://platform.openai.com/api-keys)
  - **Ollama**: Install from [ollama.ai](https://ollama.ai)

### Setup Instructions

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Choose your AI provider and configure it**

   You have three options:

   #### Option 1: Google Gemini (Recommended for beginners)
   - Sign up at [Google AI Studio](https://aistudio.google.com/apikey)
   - Create a free API key
   - Launch the app and click "Settings"
   - Select "Gemini" as provider
   - Enter your API key
   - Recommended model: `gemini-2.0-flash-exp` or `gemini-1.5-pro`

   #### Option 2: OpenAI
   - Sign up at [OpenAI Platform](https://platform.openai.com/)
   - Create an API key
   - Launch the app and click "Settings"
   - Select "OpenAI" as provider
   - Enter your API key
   - Recommended model: `gpt-4o`, `gpt-4-turbo`, or `gpt-3.5-turbo`

   #### Option 3: Ollama (Local, Free)
   - Install Ollama from [ollama.ai](https://ollama.ai)
   - Download a model: `ollama pull llama3.2` (or `mistral`, `codellama`, `qwen2.5`)
   - Make sure Ollama is running: `ollama serve`
   - Launch the app and click "Settings"
   - Select "Ollama" as provider
   - Enter the model name (e.g., `llama3.2`)
   - Set base URL (default: `http://localhost:11434`)

## Running the Application

### Development Mode

Start the development server:

```bash
npm run dev
```

The application will open in your browser at `http://localhost:5173`

### Production Build

Build the application for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Usage Guide

### Getting Started

1. **Launch the application** using `npm run dev`

2. **Configure AI Provider**
   - Click the "Settings" button (gear icon)
   - Choose your preferred AI provider
   - Enter your API key (for Gemini/OpenAI) or configure Ollama
   - Save settings

3. **Choose a Module**
   - **Lab Generator**: Create structured lab documentation
   - **PowerShell Scorer**: Generate validation scripts

### Lab Generator Workflow

#### Topic Mode (Create New Lab Series)
1. Select "Topic" mode
2. Choose "Series" (10 labs) or "Single" (1 lab)
3. Enter your topic/description
4. Click an agent to start processing
5. Download generated markdown files

#### Document Mode (Restructure Existing Content)
1. Select "Document" mode
2. Upload a markdown or text file
3. Click Agent 2 to restructure
4. Click Agent 3 to format
5. Download the finished lab

### PowerShell Scorer Workflow

1. Paste lab instructions (markdown format)
2. Optionally add:
   - VM details
   - Network configuration
   - Credentials
   - Domain information
   - Screenshots
3. Click "Generate PowerShell Script"
4. Review and copy generated:
   - Activity Group JSON
   - Automated Activity JSON
   - Script Config JSON
   - PowerShell script

### Tips for Best Results

- **Gemini**: Best for complex lab generation, generous free tier
- **OpenAI**: Most reliable for consistent output quality
- **Ollama**: Great for privacy, no API costs, but requires good hardware
  - Recommended: 16GB+ RAM for larger models
  - Use smaller models like `llama3.2:8b` for faster responses

## Project Structure

```
challenge-lab-ai-agent-&-script-generator/
├── components/           # React UI components
│   ├── LabGenerator.tsx # Lab generation module
│   ├── PowerShellScorer.tsx # PowerShell script generator
│   ├── Settings.tsx     # AI provider configuration UI
│   └── ...
├── services/            # AI provider services
│   ├── aiServiceTypes.ts    # Unified types
│   ├── aiServiceFactory.ts  # Provider factory
│   ├── geminiProvider.ts    # Google Gemini integration
│   ├── openaiProvider.ts    # OpenAI integration
│   ├── ollamaProvider.ts    # Ollama integration
│   └── settingsManager.ts   # Settings persistence
├── hooks/               # React hooks
│   └── useAIService.ts  # AI service hook
├── constants.tsx        # AI prompts and configurations
├── types.ts            # TypeScript types
├── App.tsx             # Main application
└── package.json        # Dependencies
```

## Technologies Used

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **AI Providers**:
  - Google Gemini AI SDK (`@google/genai`)
  - OpenAI SDK (`openai`)
  - Ollama (REST API)

## Troubleshooting

### Gemini API Errors

**"API key is invalid"**
- Verify your API key at [Google AI Studio](https://aistudio.google.com/apikey)
- Make sure you've saved it in Settings

**"Quota exceeded"**
- Check your quota limits at Google AI Studio
- Consider upgrading to a paid plan or wait for quota reset

### OpenAI API Errors

**"Invalid API key"**
- Verify your API key at [OpenAI Platform](https://platform.openai.com/api-keys)
- Ensure the key has proper permissions

**"Rate limit exceeded"**
- You've hit your usage limits
- Upgrade your plan or wait for rate limit reset

### Ollama Connection Issues

**"Cannot connect to Ollama"**
- Make sure Ollama is installed and running
- Check that the base URL is correct (default: `http://localhost:11434`)
- Verify the model is downloaded: `ollama list`
- Pull a model if needed: `ollama pull llama3.2`

**Slow generation**
- Use smaller models (`llama3.2:8b` instead of `llama3.2:70b`)
- Close other applications to free up RAM
- Consider using cloud providers (Gemini/OpenAI) for faster results

### General Issues

**"Module not found" errors**
- Run `npm install` to install dependencies

**Application won't start**
- Check Node.js version: `node --version` (should be 16+)
- Delete `node_modules` folder and run `npm install` again

**Settings not saving**
- Check browser localStorage is enabled
- Try a different browser

## Development

### Adding a New AI Provider

1. Create a new provider service in `services/` implementing `IAIService`
2. Add provider type to `aiServiceTypes.ts`
3. Update `aiServiceFactory.ts` to include the new provider
4. Add default model to `DEFAULT_MODELS`
5. Update Settings UI to include new provider option

## License

This project is provided as-is for educational and development purposes.

## Support

For issues, questions, or feature requests, please create an issue in the repository.

## Acknowledgments

- Built with Google Gemini AI, OpenAI, and Ollama
- Designed for Skillable Challenge Lab platform
- Community-driven improvements welcome
