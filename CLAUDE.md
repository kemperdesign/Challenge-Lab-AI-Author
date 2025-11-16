# Challenge Labs AI Author - Change Log

## Application Overview

**Challenge Labs AI Author** is a powerful web application that transforms instructional content into structured Challenge Lab documents and generates PowerShell validation scripts using AI. It supports three AI providers: Google Gemini, OpenAI, and local Ollama models.

## Recent Changes

### 1. Changed Minimum Requirements (COMPLETED)
- **File Modified**: `constants.tsx` (Line 18)
- **Change**: Updated minimum requirements per lab from 3 to 4
- **Old**: `Requirements per Lab: no less than 3 and no more than 5`
- **New**: `Requirements per Lab: no less than 4 and no more than 5`
- **Reason**: Better lab structure and more comprehensive content coverage

### 2. Contextual Blocks Distribution (COMPLETED)
- **File Modified**: `constants.tsx` (Lines 299-372)
- **Change**: Contextual blocks (note, help, alert) are now spread evenly across tasks instead of grouped at the end of requirements
- **Distribution Strategy**:
  - For 4 tasks: note after task 1, help after task 2, alert after task 4
  - For 5 tasks: note after task 1, help after task 3, alert after task 5
- **Benefit**: More balanced content flow, contextual help appears where it's most relevant

### 3. Overview Structure (COMPLETED)
- **File**: `constants.tsx` (Lines 176, 422)
- **Structure**: Maintained the proper overview format:
  ```
  >[overview]: You are a @lab.Variable(GlobalDeveloper) at @lab.Variable(GlobalCompany), a company that needs to... First, you will [REQUIREMENT 1]. Next, you will [REQUIREMENT 2], and then you will [REQUIREMENT 3]. Finally, you will [REQUIREMENT 4].
  ```
- **Note**: Overview now scans tasks within each requirement and incorporates shortened summaries

### 4. Fixed OpenAI content2 Error (COMPLETED)
- **File Modified**: `services/openaiProvider.ts` (Line 63)
- **Issue**: Variable name collision - `content` was used both as a function parameter and as a variable name
- **Fix**: Renamed response content variable to `responseContent`
- **Old Code**: `const content = response.choices[0]?.message?.content || '';`
- **New Code**: `const responseContent = response.choices[0]?.message?.content || '';`

### 5. Application Name Change (COMPLETED)
- **File Modified**: `index.html` (Line 8)
- **Old**: `<title>AI Agent Workflow</title>`
- **New**: `<title>Challenge Labs AI Author</title>`

## Enhanced Features Already in Place

### Multi-Provider AI Support
- **Google Gemini**: Best for complex lab generation, generous free tier
- **OpenAI**: Most reliable output quality
- **Ollama**: Local, free, no API costs

### Output Normalization
- **File**: `services/outputNormalizer.ts`
- Ensures consistent formatting across all AI providers
- Fixes:
  - Double `> >-` patterns → `> -`
  - Double blank lines in guided hints → single blank line
  - Extracts and relocates alert blocks
  - Normalizes line endings and spacing

### Certification Alignment
- If topic contains certification exams, uses official exam objectives as basis
- Examples: AWS Certified Solutions Architect, Microsoft Azure Administrator, CompTIA Security+

### Cost & Accessibility
- Always uses FREE/no-cost solutions
- No multiple options - selects ONE specific free option
- Avoids paid tools, subscriptions, trial versions

### Task Enhancement
- Scans steps within guided hints
- Incorporates critical details into task bullets
- Makes tasks completable without viewing hints

## Pending Tasks

### 1. API Key Save/Load Feature (NOT STARTED)
- **Target File**: `components/Settings.tsx`
- **Requirements**:
  - Add buttons to save API keys to a file
  - Add button to load API keys from a file
  - File format: JSON with provider, model, apiKey, ollamaBaseUrl
  - Use browser File API for download/upload
  - Encryption consideration for security

**Implementation Notes**:
```typescript
// Example structure:
{
  "provider": "gemini",
  "model": "gemini-2.0-flash-exp",
  "apiKey": "YOUR_API_KEY_HERE",
  "ollamaBaseUrl": "http://localhost:11434"
}

// Save function:
const handleSaveToFile = () => {
  const dataStr = JSON.stringify(settings, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ai-settings.json';
  link.click();
};

// Load function:
const handleLoadFromFile = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const loadedSettings = JSON.parse(content);
      setSettings(loadedSettings);
    };
    reader.readAsText(file);
  }
};
```

### 2. Markdown Preview Feature (NOT STARTED)
- **Target Files**: `components/LabGenerator.tsx`, `components/TabbedEditor.tsx`
- **Requirements**:
  - Add preview icon/button for each lab frame after formatting
  - Render markdown as HTML in modal/preview pane
  - Use markdown library (e.g., `react-markdown` or `marked`)
  - Support Skillable-specific syntax (:::ShowGuided, :::ShowAdvanced, etc.)

**Implementation Notes**:
```typescript
// Install: npm install react-markdown
import ReactMarkdown from 'react-markdown';

// Add to TabbedEditor.tsx:
const [showPreview, setShowPreview] = useState(false);

// Preview component:
<div className="preview-modal">
  <ReactMarkdown>{labContent}</ReactMarkdown>
</div>
```

### 3. Restructure Agent Updates (NOT STARTED)
- **Target File**: `constants.tsx` - `AGENT_RESTRUCTURE_PROMPT` and `COMBINED_AGENT_PROMPT`
- **Requirements**:
  1. Scan uploaded document content only
  2. DO NOT ADD ANY NEW CONTENT
  3. USE ONLY WHAT IS PROVIDED in the document
  4. IF SAMPLE COMMANDS OR SCRIPTS ARE REFERENCED, THEY MUST BE USED
  5. Format and finalize the Lab but do NOT add additional Requirements or Tasks
  6. Still generate steps needed to complete each task
  7. Still generate Advanced hints
  8. DO NOT generate Notes, Alerts, or Help blocks
  9. This agent ONLY restructures existing content, does not create new content

**Current Issue**: Restructure agent adds new requirements/tasks instead of using only what's in the uploaded document

**Fix Location**: Around line 138-196 in `constants.tsx`

**Proposed Changes**:
```
### CRITICAL RULES FOR DOCUMENT MODE:
1. **NO NEW CONTENT**: Do NOT create any new requirements, tasks, or procedures that are not explicitly mentioned in the source document.
2. **USE PROVIDED CONTENT ONLY**: If the document mentions sample commands, scripts, or code snippets, you MUST include them verbatim.
3. **PRESERVE STRUCTURE**: Maintain the document's original intent and scope. Do not expand beyond what is provided.
4. **NO CONTEXTUAL BLOCKS**: Do NOT generate [!note], [!help], or [+alert] blocks. These are only for topic-based generation.
5. **RESTRUCTURE, DON'T CREATE**: Your job is to format existing content into Challenge Lab structure, not to invent new content.
```

### 4. Token Usage Optimization (NOT ANALYZED)
- **Goal**: Reduce API token usage for formatting-only operations
- **Analysis Needed**:
  - Identify which operations are pure formatting (can be done locally)
  - Identify which operations require AI understanding (must use API)
  - Possible local operations:
    - Line ending normalization
    - Whitespace trimming
    - Pattern replacements (e.g., `> >-` → `> -`)
    - Block structure formatting
  - Operations requiring AI:
    - Content generation
    - Task breakdown
    - Step creation
    - Hint generation
    - Overview writing

**Recommendation**: Create a local pre-processor that handles all regex-based formatting before sending to API, and a post-processor that handles final cleanup.

## Testing Checklist

### Completed Features to Test:
- [ ] Series generation creates 4-5 requirements per lab (not 3-5)
- [ ] Contextual blocks are spread evenly across tasks
- [ ] Overview follows correct structure with requirement summaries
- [ ] OpenAI Agent 2 works without content2 error
- [ ] Browser tab shows "Challenge Labs AI Author" title

### Features to Implement and Test:
- [ ] API key save to file functionality
- [ ] API key load from file functionality
- [ ] Markdown preview displays correctly
- [ ] Preview supports Skillable-specific syntax
- [ ] Restructure agent uses ONLY document content
- [ ] Restructure agent doesn't create new requirements
- [ ] Restructure agent preserves sample commands/scripts

## Architecture Notes

### File Structure:
```
challenge-lab-ai-agent-&-script-generator/
├── components/
│   ├── LabGenerator.tsx      # Lab generation module
│   ├── PowerShellScorer.tsx  # PowerShell script generator
│   ├── Settings.tsx           # AI provider configuration UI
│   ├── TabbedEditor.tsx       # Multi-file editor
│   └── ...
├── services/
│   ├── aiServiceTypes.ts      # Unified types
│   ├── aiServiceFactory.ts    # Provider factory
│   ├── geminiProvider.ts      # Google Gemini integration
│   ├── openaiProvider.ts      # OpenAI integration
│   ├── ollamaProvider.ts      # Ollama integration
│   ├── outputNormalizer.ts    # Output formatting
│   └── settingsManager.ts     # Settings persistence
├── hooks/
│   └── useAIService.ts        # AI service hook
├── constants.tsx              # AI prompts and configurations
├── types.ts                   # TypeScript types
├── App.tsx                    # Main application
└── index.html                 # Entry point
```

### Output Normalization Pipeline:
1. Normalize line endings (CRLF → LF)
2. Remove trailing whitespace
3. Fix double `> >-` patterns
4. Fix double blank lines in guided hints
5. Extract and relocate alert blocks
6. Normalize alert block spacing

### Provider Integration:
- All providers implement `IAIService` interface
- Factory pattern creates appropriate provider instance
- Settings stored in localStorage
- Retry logic with exponential backoff
- Streaming support for real-time output

## Known Issues

1. **OpenAI Model Selection**: Only shows 2 requirements instead of expected number
   - **Status**: Reported but not yet investigated
   - **Potential Cause**: Prompt interpretation or context window limitations

## Next Steps for Development

1. Implement API key save/load feature (highest priority for user convenience)
2. Add markdown preview functionality (improves user experience)
3. Fix restructure agent to prevent content creation (critical for accuracy)
4. Analyze token usage optimization opportunities (cost reduction)
5. Investigate OpenAI requirement display issue

## Contact & Support

For issues, questions, or feature requests, create an issue in the repository.

---

*Last Updated: [Current Date]*
*Version: 2.0*
*Maintainer: Claude AI Assistant*
