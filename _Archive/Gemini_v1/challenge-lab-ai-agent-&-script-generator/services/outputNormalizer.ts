/**
 * OutputNormalizer - Ensures consistent formatting across all AI providers
 *
 * Different AI models interpret prompts slightly differently, leading to
 * formatting inconsistencies. This utility normalizes outputs to match
 * the expected template format.
 */

export class OutputNormalizer {
  /**
   * Normalizes AI output to ensure consistent formatting across providers
   */
  static normalize(content: string, provider: string): string {
    let normalized = content;

    // Fix 1: Ensure consistent line endings (normalize to \n)
    normalized = normalized.replace(/\r\n/g, '\n');

    // Fix 2: Remove trailing whitespace on lines
    normalized = normalized.split('\n')
      .map(line => line.trimEnd())
      .join('\n');

    // Fix 3: Fix double `> >-` pattern (should be `> -`)
    normalized = this.fixDoubleGreaterThan(normalized);

    // Fix 4: Normalize guided hint block spacing
    // Gemini tends to add extra blank lines between steps
    normalized = this.fixGuidedHintSpacing(normalized);

    // Fix 5: Extract alert/note/help blocks from guided hints and relocate them
    normalized = this.extractAndRelocateAlertBlocks(normalized);

    // Fix 6: Ensure consistent spacing in alert/hint blocks
    normalized = this.normalizeAlertBlocks(normalized);

    return normalized;
  }

  /**
   * Fixes double blank lines within ShowGuided hint blocks
   *
   * Problem: Gemini outputs extra blank lines between steps
   * Input:   >\n>\n>-
   * Output:  >\n>-
   */
  private static fixGuidedHintSpacing(content: string): string {
    // Match entire ShowGuided blocks
    const guidedBlockRegex = /(:::ShowGuided\(ShowGuided=Yes\)[\s\S]*?:::)/g;

    return content.replace(guidedBlockRegex, (match) => {
      // Within guided blocks, fix double blank lines between steps
      // Pattern: >\n>\n>- should become >\n>-
      // Also handles: >\n>\n>[+alert] or >\n>\n>[!note]
      return match.replace(/>\n>\n(>[-\[])/g, '>\n$1');
    });
  }

  /**
   * Fixes double `> >-` pattern (should be `> -`)
   *
   * Problem: AI sometimes outputs `> >-` instead of `> -`
   * Input:   > >- For *Volume Type*, select a type.
   * Output:  > - For *Volume Type*, select a type.
   */
  private static fixDoubleGreaterThan(content: string): string {
    return content.replace(/> >-/g, '> -');
  }

  /**
   * Extracts alert/note/help blocks from guided hints and relocates them
   * after advanced hint blocks
   *
   * Problem: Alert blocks should not be nested within guided hints
   * Solution: Extract them and place after the advanced hint block
   */
  private static extractAndRelocateAlertBlocks(content: string): string {
    const guidedBlockRegex = /(:::ShowGuided\(ShowGuided=Yes\)[\s\S]*?:::)/g;
    const advancedBlockRegex = /(:::ShowAdvanced\(ShowAdvanced=Yes\)[\s\S]*?:::)/g;

    let extractedBlocks: string[] = [];

    // Step 1: Extract alert blocks from guided hints
    let modifiedContent = content.replace(guidedBlockRegex, (guidedMatch) => {
      // Find alert, note, or help blocks within guided hints
      // Pattern: >[+alert] or >[!note] or >[!help]
      const alertBlockRegex = />\s*\[\+alert\][^\n]*\n((?:>[^\n]*\n)*)/g;
      const noteBlockRegex = />\s*\[!note\][^\n]*\n((?:>[^\n]*\n)*)/g;
      const helpBlockRegex = />\s*\[!help\][^\n]*\n((?:>[^\n]*\n)*)/g;

      let cleanedGuidedBlock = guidedMatch;

      // Extract alert blocks
      cleanedGuidedBlock = cleanedGuidedBlock.replace(alertBlockRegex, (alertMatch) => {
        extractedBlocks.push(alertMatch.trim());
        return ''; // Remove from guided block
      });

      // Extract note blocks
      cleanedGuidedBlock = cleanedGuidedBlock.replace(noteBlockRegex, (noteMatch) => {
        extractedBlocks.push(noteMatch.trim());
        return ''; // Remove from guided block
      });

      // Extract help blocks
      cleanedGuidedBlock = cleanedGuidedBlock.replace(helpBlockRegex, (helpMatch) => {
        extractedBlocks.push(helpMatch.trim());
        return ''; // Remove from guided block
      });

      // Clean up any extra blank lines left behind
      cleanedGuidedBlock = cleanedGuidedBlock.replace(/>\n>\n>\n/g, '>\n>\n');

      return cleanedGuidedBlock;
    });

    // Step 2: Insert extracted blocks after advanced hint blocks
    if (extractedBlocks.length > 0) {
      modifiedContent = modifiedContent.replace(advancedBlockRegex, (advancedMatch) => {
        // Add extracted blocks after the advanced block with proper spacing
        const blocksToAdd = extractedBlocks.join('\n>\n');
        return advancedMatch + '\n\n' + blocksToAdd;
      });
    }

    return modifiedContent;
  }

  /**
   * Normalizes spacing in alert and note blocks
   */
  private static normalizeAlertBlocks(content: string): string {
    // Ensure alert blocks have consistent formatting
    // Remove extra blank lines before/after alert blocks
    return content
      .replace(/\n\n\n+(\[[\+\!])/g, '\n\n$1')  // Max 2 newlines before alerts
      .replace(/(\])\n\n\n+/g, '$1\n\n');      // Max 2 newlines after alerts
  }

  /**
   * Provider-specific normalization for OpenAI
   */
  static normalizeOpenAI(content: string): string {
    let normalized = this.normalize(content, 'openai');

    // OpenAI sometimes adds extra markdown formatting
    // Remove any triple backticks that shouldn't be there (outside code blocks)
    // This is a placeholder for OpenAI-specific fixes

    return normalized;
  }

  /**
   * Provider-specific normalization for Gemini
   */
  static normalizeGemini(content: string): string {
    let normalized = this.normalize(content, 'gemini');

    // Gemini-specific fixes
    // Fix 1: Overview formatting - ensure single line (no line breaks in overview)
    normalized = this.fixOverviewFormatting(normalized);

    // Fix 2: Additional guided hint spacing issues specific to Gemini
    normalized = this.fixGeminiGuidedHintSpacing(normalized);

    // Fix 3: CRITICAL - Remove double blank lines before bullet points (user-reported issue)
    // This is a final safety net to catch any remaining instances of >\n>\n>-
    normalized = this.fixDoubleBlankLinesBeforeBullets(normalized);

    return normalized;
  }

  /**
   * Fixes Overview formatting issues in Gemini output
   * Gemini sometimes breaks the overview across multiple lines
   */
  private static fixOverviewFormatting(content: string): string {
    // Find the overview block and ensure it's on a single line
    const overviewRegex = />\[overview\]:([\s\S]*?)(?=\n\n|$)/;

    return content.replace(overviewRegex, (match, overviewContent) => {
      // Remove any line breaks within the overview content and join into single line
      const singleLine = overviewContent
        .replace(/\n>/g, ' ')  // Join lines that continue with >
        .replace(/\s+/g, ' ')   // Normalize multiple spaces
        .trim();

      return `>[overview]: ${singleLine}`;
    });
  }

  /**
   * Additional Gemini-specific guided hint spacing fixes
   */
  private static fixGeminiGuidedHintSpacing(content: string): string {
    // Gemini sometimes adds triple blank lines
    const guidedBlockRegex = /(:::ShowGuided\(ShowGuided=Yes\)[\s\S]*?:::)/g;

    return content.replace(guidedBlockRegex, (match) => {
      // Fix triple or more consecutive blank lines
      let fixed = match.replace(/>\n>\n>\n(>[-\[])/g, '>\n$1');
      // Ensure exactly one blank line between steps
      fixed = fixed.replace(/>\n(>[-\[])/g, '>\n>\n$1');
      return fixed;
    });
  }

  /**
   * Fixes double blank lines before bullet points in blockquotes
   *
   * User-reported issue: Gemini consistently outputs >\n>\n>- instead of >\n>-
   * This method performs a literal text replacement to fix this pattern.
   *
   * Pattern to find:    >\n>\n>-
   * Pattern to replace: >\n>-
   */
  private static fixDoubleBlankLinesBeforeBullets(content: string): string {
    // This is a comprehensive fix that catches ALL instances of the problematic pattern
    // We need to handle both Unix (\n) and Windows (\r\n) line endings

    // Normalize line endings first
    let fixed = content.replace(/\r\n/g, '\n');

    // Primary fix: Remove double blank lines in blockquotes
    // Pattern: line with only '>' followed by another line with only '>' followed by '>-' or '>['
    // We want to keep only ONE blank '>' line

    // Run multiple passes to catch nested patterns
    for (let i = 0; i < 3; i++) {
      // Fix double blank lines before bullet points (>-)
      fixed = fixed.replace(/^>\s*\n>\s*\n(>-)/gm, '>\n$1');

      // Fix double blank lines before any blockquote content starting with >[
      fixed = fixed.replace(/^>\s*\n>\s*\n(>\[)/gm, '>\n$1');

      // More aggressive: catch any sequence of 2+ consecutive lines with only '>'
      // Replace with single '>' when followed by content
      fixed = fixed.replace(/^(>\s*\n)+(?=>[-\[])/gm, '>\n');
    }

    return fixed;
  }

  /**
   * Provider-specific normalization for Ollama
   */
  static normalizeOllama(content: string): string {
    let normalized = this.normalize(content, 'ollama');

    // Ollama-specific fixes can be added here as needed
    // Different Ollama models may have different quirks

    return normalized;
  }
}
