# Provider-Specific Workflows

The application now supports **3 independent workflows** - one for each AI provider. This allows you to customize prompts for each provider without breaking the working OpenAI configuration.

## How It Works

### 1. Provider-Specific Prompt Files

Each provider has its own prompt file in the `prompts/` directory:

- **`prompts/openai-prompts.ts`** - Working OpenAI prompts (DO NOT MODIFY - this is your baseline)
- **`prompts/gemini-prompts.ts`** - Gemini-specific prompts (customize as needed)
- **`prompts/ollama-prompts.ts`** - Ollama-specific prompts (customize as needed)

### 2. Automatic Prompt Selection

The application automatically selects the correct prompts based on your current provider setting:

```typescript
// In LabGenerator.tsx
const getPromptForAgent = (agentId: number, labCreationMode) => {
  const currentProvider = SettingsManager.getSettings().provider;
  const prompts = getPromptsForProvider(currentProvider);

  switch (agentId) {
    case 1: return labCreationMode === 'single'
            ? prompts.AGENT_1_SINGLE_PROMPT
            : prompts.AGENT_1_SERIES_COMBINED_PROMPT;
    case 2: return prompts.AGENT_RESTRUCTURE_PROMPT;
    case 3: return prompts.COMBINED_AGENT_PROMPT;
  }
};
```

### 3. Current State

**All 3 prompt files currently contain identical prompts** - your working OpenAI configuration. This means:

- ✅ OpenAI workflow works perfectly (as before)
- ✅ Gemini workflow uses the same prompts (should work)
- ✅ Ollama workflow uses the same prompts (should work)

## Customizing Prompts for Gemini or Ollama

To customize prompts for a specific provider:

1. Open the provider's prompt file (e.g., `prompts/gemini-prompts.ts`)
2. Modify the prompts as needed
3. Save the file
4. Switch to that provider in Settings
5. Test the workflow

**The OpenAI prompts remain untouched**, so you always have a working baseline.

## Example: Customizing Gemini Prompts

```typescript
// prompts/gemini-prompts.ts
export const COMBINED_AGENT_PROMPT = `You are an expert AI technical writer...

**GEMINI-SPECIFIC RULE:**
- Always ensure exactly ONE blank line between guided hint steps
- Do NOT use triple blank lines

... rest of prompt ...
`;
```

## Files Modified

1. **Created:**
   - `prompts/index.ts` - Prompt selector
   - `prompts/openai-prompts.ts` - OpenAI prompts
   - `prompts/gemini-prompts.ts` - Gemini prompts
   - `prompts/ollama-prompts.ts` - Ollama prompts

2. **Modified:**
   - `components/LabGenerator.tsx` - Uses provider-specific prompts
   - Added `getPromptForAgent()` helper function

## Benefits

✅ **Isolated Changes** - Modify Gemini/Ollama prompts without affecting OpenAI
✅ **Easy Testing** - Switch providers in Settings to test different workflows
✅ **Safe Baseline** - OpenAI prompts are preserved as a working reference
✅ **Maintainable** - Each provider has its own clearly documented prompt file

## Next Steps

1. Test that OpenAI still works perfectly
2. Customize Gemini prompts to fix formatting issues
3. Test Gemini workflow
4. Repeat for Ollama if needed
