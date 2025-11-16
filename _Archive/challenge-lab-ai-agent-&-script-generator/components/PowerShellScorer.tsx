// PowerShellScorer.tsx - Updated to support multiple AI providers
import React, { useState, useCallback, useRef, ChangeEvent } from 'react';
import {
  TerminalIcon,
  ArrowUturnLeftIcon,
  StopIcon,
  SparklesIcon,
  InformationCircleIcon,
  CloudArrowUpIcon,
  CodeBracketSquareIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XCircleIcon,
  ClipboardDocumentIcon,
  LightBulbIcon,
  SpinnerIcon,
} from './Icons';
import { Editor } from './Editor';
import { AIService, AIConfig } from '../services/aiService';
import { ProviderSettings } from './ProviderSettings';
import { POWERSHELL_GENERATOR_PROMPT, POWERSHELL_SCORING_ASSISTANT_PROMPT } from '../constants';
import type { Part } from '@google/genai';
import type { GeneratedRequirement } from '../types';

interface PowerShellGeneratorProps {
  navigateToGenerator: () => void;
}

interface ImageFile {
  name: string;
  type: string;
  data: string;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = error => reject(error);
  });

const FormLabel: React.FC<{ htmlFor: string; tooltip: string; children: React.ReactNode, className?: string; }> = ({ htmlFor, tooltip, children, className = '' }) => (
    <label htmlFor={htmlFor} className={`flex items-center gap-2 text-sm font-bold text-dark-text-secondary uppercase tracking-wider ${className}`}>
        {children}
        <span title={tooltip}>
            <InformationCircleIcon className="w-4 h-4 text-gray-400" />
        </span>
    </label>
);

const FormTextArea: React.FC<{id: string; value: string; onChange: (e: ChangeEvent<HTMLTextAreaElement>)=>void; placeholder: string; rows: number, disabled: boolean}> = 
    ({id, value, onChange, placeholder, rows, disabled}) => (
    <textarea
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className="w-full mt-2 p-2 bg-dark-bg text-dark-text rounded-md border border-dark-border focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-50"
    />
);

const CopyableField: React.FC<{label: string; content: string | string[]; onCopy: (text: string) => void; isCode?: boolean}> = ({ label, content, onCopy, isCode }) => (
    <div className="bg-dark-bg border border-dark-border/50 rounded-md">
        <div className="flex justify-between items-center px-3 py-1.5 border-b border-dark-border/50">
            <h5 className="text-xs font-semibold text-dark-text-secondary uppercase">{label}</h5>
            <button 
                onClick={() => onCopy(Array.isArray(content) ? content.join('\n') : content)}
                className="text-dark-text-secondary hover:text-white transition-colors text-xs flex items-center gap-1"
                title={`Copy ${label}`}
            >
                <ClipboardDocumentIcon className="w-4 h-4" />
                Copy
            </button>
        </div>
        <div className="p-3">
            {isCode ? (
                 <pre className="text-sm text-dark-text whitespace-pre-wrap font-mono bg-transparent"><code>{content}</code></pre>
            ) : Array.isArray(content) ? (
                 <ul className="text-sm text-dark-text list-disc list-inside space-y-1">
                    {content.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
            ) : (
                <p className="text-sm text-dark-text whitespace-pre-wrap">{content}</p>
            )}
        </div>
    </div>
);

export const PowerShellScorer: React.FC<PowerShellGeneratorProps> = ({ navigateToGenerator }) => {
  const [labInstructions, setLabInstructions] = useState('');
  const [vmDetails, setVmDetails] = useState('');
  const [networkDetails, setNetworkDetails] = useState('');
  const [credentialDetails, setCredentialDetails] = useState('');
  const [domainDetails, setDomainDetails] = useState('');
  const [screenshots, setScreenshots] = useState<ImageFile[]>([]);
  
  const [generatedRequirements, setGeneratedRequirements] = useState<GeneratedRequirement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scoringAssistantOutput, setScoringAssistantOutput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [openRequirements, setOpenRequirements] = useState<Record<number, boolean>>({ 0: true });

  // AI Provider configuration
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    provider: 'gemini',
    apiKey: process.env.GEMINI_API_KEY || '',
    model: 'gemini-2.5-pro'
  });

  const isCancelledRef = useRef(false);
  const instructionFileRef = useRef<HTMLInputElement>(null);
  const screenshotFileRef = useRef<HTMLInputElement>(null);

  const handleInstructionFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'text/plain' || file.type === 'text/markdown') {
        const text = await file.text();
        setLabInstructions(text);
        setError(null);
      } else {
        setError('Please upload a valid .txt or .md file for instructions.');
      }
    }
  };

  const handleScreenshotFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setError(null);
      const imageFiles: Promise<ImageFile>[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          const promise = fileToBase64(file).then(data => ({
            name: file.name,
            type: file.type,
            data
          }));
          imageFiles.push(promise);
        }
      }
      const newScreenshots = await Promise.all(imageFiles);
      setScreenshots(prev => [...prev, ...newScreenshots].slice(0, 5));
    }
  };
  
  const removeScreenshot = (index: number) => {
    setScreenshots(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyzeInstructions = useCallback(async () => {
    if (!labInstructions.trim()) {
        setError("Lab Instructions cannot be empty to analyze.");
        return;
    }
    isCancelledRef.current = false;
    setIsAnalyzing(true);
    setError(null);
    setScoringAssistantOutput('');
    
    const aiService = new AIService(aiConfig);
    
    try {
        await aiService.processTextStream(
            POWERSHELL_SCORING_ASSISTANT_PROMPT,
            labInstructions,
            {
              onChunk: (chunk) => setScoringAssistantOutput(prev => prev + chunk),
              isCancelledRef
            }
        );
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred during analysis.';
        if (!isCancelledRef.current) setError(errorMessage);
    } finally {
        setIsAnalyzing(false);
    }
  }, [labInstructions, aiConfig]);

  const handleGenerateScript = useCallback(async () => {
    if (!labInstructions.trim()) {
      setError("Lab Instructions cannot be empty.");
      return;
    }
    
    // Check if using Gemini (required for multi-modal)
    if (aiConfig.provider !== 'gemini' && screenshots.length > 0) {
      setError("Screenshot analysis is only supported with Gemini provider. Please remove screenshots or switch to Gemini.");
      return;
    }
    
    isCancelledRef.current = false;
    setIsLoading(true);
    setError(null);
    setGeneratedRequirements([]);
    setOpenRequirements({ 0: true });

    const aiService = new AIService(aiConfig);
    
    // If not using Gemini or no screenshots, use text-only approach
    if (aiConfig.provider !== 'gemini' || screenshots.length === 0) {
      let textContent = `## LAB INSTRUCTIONS (MARKDOWN)\n\n${labInstructions}`;
      if (vmDetails.trim()) textContent += `\n\n## LAB ENVIRONMENT DETAILS\n\n### VM Details\n${vmDetails.trim()}`;
      if (networkDetails.trim()) textContent += `\n\n### Network Details\n${networkDetails.trim()}`;
      if (credentialDetails.trim()) textContent += `\n\n### Credential Details\n${credentialDetails.trim()}`;
      if (domainDetails.trim()) textContent += `\n\n### Domain Details\n${domainDetails.trim()}`;
      
      try {
        const fullResponse = await aiService.processText(
          POWERSHELL_GENERATOR_PROMPT,
          textContent,
          { isCancelledRef }
        );
        
        if (!isCancelledRef.current) {
          const cleanedResponse = fullResponse.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(cleanedResponse);
          setGeneratedRequirements(parsed);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
        if (!isCancelledRef.current) {
          setError(`Failed to generate script. Error: ${errorMessage}`);
        } else {
          setError("Generation stopped by user.");
        }
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Multi-modal approach with Gemini
    const parts: Part[] = [];
    
    let textContent = `## LAB INSTRUCTIONS (MARKDOWN)\n\n${labInstructions}`;
    if (vmDetails.trim()) textContent += `\n\n## LAB ENVIRONMENT DETAILS\n\n### VM Details\n${vmDetails.trim()}`;
    if (networkDetails.trim()) textContent += `\n\n### Network Details\n${networkDetails.trim()}`;
    if (credentialDetails.trim()) textContent += `\n\n### Credential Details\n${credentialDetails.trim()}`;
    if (domainDetails.trim()) textContent += `\n\n### Domain Details\n${domainDetails.trim()}`;
    parts.push({ text: textContent });

    for (const image of screenshots) {
      parts.push({ inlineData: { mimeType: image.type, data: image.data } });
    }

    let fullResponse = '';
    try {
      await aiService.generateScriptStream(
        POWERSHELL_GENERATOR_PROMPT,
        parts,
        {
          onChunk: (chunk) => fullResponse += chunk,
          isCancelledRef
        }
      );
      
      if (!isCancelledRef.current) {
        const cleanedResponse = fullResponse.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleanedResponse);
        setGeneratedRequirements(parsed);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
       if (!isCancelledRef.current) {
        setError(`Failed to generate script. Raw output might be invalid JSON. Error: ${errorMessage}`);
        console.error("Raw AI Response:", fullResponse);
      } else {
        setError("Generation stopped by user.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [labInstructions, vmDetails, networkDetails, credentialDetails, domainDetails, screenshots, aiConfig]);
  
  const handleStop = useCallback(() => {
    isCancelledRef.current = true;
    setIsLoading(false);
    setIsAnalyzing(false);
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch(err => console.error('Failed to copy text: ', err));
  };
  
  const toggleRequirement = (index: number) => {
    setOpenRequirements(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const isGenerateDisabled = isLoading || isAnalyzing || !labInstructions.trim();

  return (
    <div className="h-screen bg-dark-bg text-dark-text font-sans flex flex-col">
      <header className="bg-dark-card border-b border-dark-border p-4 shadow-md flex-shrink-0 relative">
        <h1 className="text-2xl font-bold text-center text-green-400 flex items-center justify-center gap-3">
          <TerminalIcon className="w-8 h-8" />
          <span>PowerShell Lab Scorer AI</span>
        </h1>
        <p className="text-center text-dark-text-secondary mt-1">Generate PowerShell validation scripts from lab instructions.</p>
        <button 
          onClick={navigateToGenerator}
          className="absolute top-1/2 -translate-y-1/2 left-4 px-3 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-all duration-200 ease-in-out flex items-center gap-2"
          title="Switch to Lab Generator"
          aria-label="Switch to Lab Generator"
        >
          <ArrowUturnLeftIcon className="w-5 h-5" />
        </button>
      </header>
      
      <main className="flex flex-row p-4 gap-4 flex-grow min-h-0">
        <div className="w-1/2 flex flex-col gap-4">
            <div className="bg-dark-card rounded-lg border border-dark-border p-4 flex-grow overflow-y-auto space-y-4">
                {/* AI Provider Settings */}
                <ProviderSettings 
                  config={aiConfig} 
                  onChange={setAiConfig} 
                  isDisabled={isLoading || isAnalyzing}
                />
                
                <section>
                    <div className="flex justify-between items-center">
                        <FormLabel htmlFor="lab-instructions" tooltip="Paste the full markdown for the lab, or upload a .md or .txt file.">
                            Lab Instructions (Markdown)
                        </FormLabel>
                        <button 
                            onClick={() => instructionFileRef.current?.click()}
                            className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 rounded-md transition-colors flex items-center gap-2"
                        >
                            <CloudArrowUpIcon className="w-4 h-4"/> Upload File
                        </button>
                        <input type="file" ref={instructionFileRef} onChange={handleInstructionFileChange} accept=".md,.txt" className="sr-only" />
                    </div>
                    <FormTextArea id="lab-instructions" value={labInstructions} onChange={(e) => setLabInstructions(e.target.value)} placeholder="Paste lab instructions, or upload a .md/.txt file. The AI will analyze this to understand the required tasks." rows={8} disabled={isLoading || isAnalyzing}/>
                </section>
                
                <section className="bg-dark-bg/50 border border-dark-border rounded-lg overflow-hidden">
                    <button onClick={() => {}} className="w-full flex items-center justify-between p-3 text-left bg-dark-bg border-b border-dark-border">
                        <div className="flex items-center gap-3">
                            <SparklesIcon className="w-5 h-5 text-yellow-400"/>
                            <span className="font-semibold">Scoring Assistant</span>
                        </div>
                    </button>
                    <div className="p-3 space-y-3">
                        <p className="text-sm text-dark-text-secondary">Get AI-powered suggestions for what to score in your lab based on the instructions provided.</p>
                         {scoringAssistantOutput && !isAnalyzing && (
                            <div className="p-3 bg-dark-bg border border-dark-border/50 rounded-md text-sm prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: scoringAssistantOutput.replace(/\n/g, '<br />') }} />
                        )}
                        {isAnalyzing && (
                             <div className="p-3 bg-dark-bg border border-dark-border/50 rounded-md text-sm">
                                <Editor title="" content={scoringAssistantOutput} isReadOnly={true} isLoading={true} showTitle={false} />
                            </div>
                        )}
                        <button 
                            onClick={handleAnalyzeInstructions}
                            disabled={isAnalyzing || isLoading || !labInstructions.trim()}
                            className="w-full px-4 py-2 bg-yellow-600/20 text-yellow-300 border border-yellow-500/30 font-semibold rounded-lg hover:bg-yellow-600/30 transition-all duration-200 ease-in-out flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isAnalyzing ? <><SpinnerIcon className="w-5 h-5 animate-spin" />Analyzing...</> : 'Analyze Instructions'}
                        </button>
                    </div>
                </section>

                <section>
                    <h3 className="text-md font-bold text-dark-text mb-2">Lab Environment Details (Optional)</h3>
                    <div className="space-y-3">
                        <div>
                           <FormLabel htmlFor="vm-details" tooltip="List all relevant VM names, one per line or comma-separated.">VM Details</FormLabel>
                           <FormTextArea id="vm-details" value={vmDetails} onChange={e => setVmDetails(e.target.value)} placeholder="e.g., Server01, Client01" rows={2} disabled={isLoading || isAnalyzing} />
                        </div>
                         <div>
                           <FormLabel htmlFor="network-details" tooltip="Provide IPs, subnets, or other network info.">Network Details</FormLabel>
                           <FormTextArea id="network-details" value={networkDetails} onChange={e => setNetworkDetails(e.target.value)} placeholder="e.g., 10.0.0.10, 192.168.1.0/24" rows={2} disabled={isLoading || isAnalyzing} />
                        </div>
                         <div>
                           <FormLabel htmlFor="credential-details" tooltip="List any usernames, passwords, or roles needed.">Credential Details</FormLabel>
                           <FormTextArea id="credential-details" value={credentialDetails} onChange={e => setCredentialDetails(e.target.value)} placeholder="e.g., Admin, User01" rows={2} disabled={isLoading || isAnalyzing} />
                        </div>
                         <div>
                           <FormLabel htmlFor="domain-details" tooltip="Specify the domain name if applicable.">Domain Details</FormLabel>
                           <FormTextArea id="domain-details" value={domainDetails} onChange={e => setDomainDetails(e.target.value)} placeholder="e.g., contoso.com" rows={1} disabled={isLoading || isAnalyzing} />
                        </div>
                    </div>
                </section>
                
                <section>
                    <FormLabel htmlFor="screenshots" tooltip="Upload up to 5 screenshots of the final state for visual reference. Only available with Gemini provider.">Screenshots (Optional - Gemini Only)</FormLabel>
                    <div className="mt-2">
                        <label htmlFor="screenshot-upload" className={`relative block w-full border-2 border-dashed border-dark-border rounded-lg p-6 text-center hover:border-brand-primary cursor-pointer ${aiConfig.provider !== 'gemini' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <CloudArrowUpIcon className="mx-auto h-10 w-10 text-dark-text-secondary"/>
                            <span className="mt-2 block text-sm font-semibold text-dark-text">
                              {aiConfig.provider !== 'gemini' ? 'Screenshots only available with Gemini' : 'Click to upload screenshots'}
                            </span>
                            <span className="block text-xs text-dark-text-secondary">PNG, JPG, GIF up to 10MB</span>
                            <input 
                              id="screenshot-upload" 
                              type="file" 
                              ref={screenshotFileRef} 
                              onChange={handleScreenshotFileChange} 
                              multiple 
                              accept="image/*" 
                              className="sr-only"
                              disabled={aiConfig.provider !== 'gemini'}
                            />
                        </label>
                    </div>
                    {screenshots.length > 0 && (
                        <div className="mt-2 space-y-1">
                            {screenshots.map((file, index) => (
                                <div key={index} className="flex items-center justify-between bg-dark-bg p-1 px-2 rounded-md text-xs">
                                    <span className="truncate">{file.name}</span>
                                    <button onClick={() => removeScreenshot(index)} className="p-1 text-dark-text-secondary hover:text-red-400">
                                        <XCircleIcon className="w-4 h-4"/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
            
             {isLoading || isAnalyzing ? (
             <button
                onClick={handleStop}
                className="w-full flex-shrink-0 px-4 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-all duration-200 ease-in-out flex items-center justify-center gap-2"
              >
                <StopIcon className="w-5 h-5" />
                <span>Stop</span>
              </button>
          ) : (
            <button
              onClick={handleGenerateScript}
              disabled={isGenerateDisabled}
              className="w-full flex-shrink-0 px-4 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all duration-200 ease-in-out flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SparklesIcon className="w-6 h-6" />
              <span>Generate PowerShell Script</span>
            </button>
          )}
        </div>
        <div className="w-1/2 flex flex-col gap-4">
           {generatedRequirements.length > 0 && !isLoading ? (
                <div className="bg-dark-card rounded-lg border border-dark-border p-4 flex-grow overflow-y-auto space-y-4">
                  <div className="flex items-center gap-3">
                    <CodeBracketSquareIcon className="w-8 h-8 text-dark-text-secondary"/>
                    <h2 className="text-xl font-bold">Generated Scripts ({generatedRequirements.length})</h2>
                  </div>
                  {generatedRequirements.map((req, index) => (
                    <div key={index} className="bg-dark-bg/50 border border-dark-border rounded-lg overflow-hidden">
                      <button onClick={() => toggleRequirement(index)} className="w-full flex items-center justify-between p-3 text-left bg-dark-bg">
                        <h3 className="font-semibold text-green-400">Requirement {index + 1}: {req.title}</h3>
                        {openRequirements[index] ? <ChevronUpIcon className="w-5 h-5"/> : <ChevronDownIcon className="w-5 h-5"/>}
                      </button>
                      {openRequirements[index] && (
                        <div className="p-3 space-y-3">
                            <p className="text-sm text-dark-text-secondary">Follow these steps to configure this requirement in the lab authoring platform.</p>
                            <div className="space-y-3 pl-4 border-l-2 border-dark-border">
                                <section>
                                    <h4 className="font-bold">Step 1: Create Activity Group</h4>
                                    <div className="mt-2 space-y-2">
                                        <CopyableField label="Name" content={req.activityGroup.name} onCopy={handleCopy}/>
                                        <CopyableField label="Replacement Token Alias" content={req.activityGroup.replacementTokenAlias} onCopy={handleCopy}/>
                                    </div>
                                </section>
                                <section>
                                    <h4 className="font-bold">Step 2: Create Automated Activity</h4>
                                    <div className="mt-2 space-y-2">
                                        <CopyableField label="Name" content={req.automatedActivity.name} onCopy={handleCopy}/>
                                        <CopyableField label="Configuration" content={req.automatedActivity.configuration} onCopy={handleCopy}/>
                                    </div>
                                </section>
                                <section>
                                    <h4 className="font-bold">Step 3: Configure Script</h4>
                                    <div className="mt-2 space-y-2">
                                        <CopyableField label="Target VM" content={req.scriptConfig.targetVM} onCopy={handleCopy}/>
                                        <CopyableField label="Task List Fields" content={req.scriptConfig.taskListFields} onCopy={handleCopy}/>
                                        <CopyableField label="Correct Feedback" content={req.scriptConfig.correctFeedback} onCopy={handleCopy}/>
                                        <CopyableField label="Incorrect Feedback" content={req.scriptConfig.incorrectFeedback} onCopy={handleCopy}/>
                                        <CopyableField label="PowerShell Script" content={req.scriptConfig.powershellScript} onCopy={handleCopy} isCode={true} />
                                    </div>
                                </section>
                            </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 flex gap-4 items-start">
                    <LightBulbIcon className="w-8 h-8 text-blue-400 flex-shrink-0 mt-1"/>
                    <div>
                        <h4 className="font-bold text-blue-300">How to see failure logs</h4>
                        <p className="text-sm text-blue-400 mt-1">All generated scripts include a debug mode. To see detailed failure logs in your lab environment:</p>
                        <ul className="text-sm text-blue-400 list-disc list-inside mt-2 space-y-1">
                            <li>Create a lab variable named <code className="bg-black/30 px-1 rounded">debug</code> and set its value to <code className="bg-black/30 px-1 rounded">True</code>.</li>
                            <li>Re-run the scoring script. The script output/logs will now show detailed messages.</li>
                        </ul>
                    </div>
                  </div>
                </div>
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-dark-card rounded-lg border-2 border-dashed border-dark-border text-dark-text-secondary">
                    {isLoading ? (
                        <>
                            <SpinnerIcon className="w-16 h-16 animate-spin text-brand-primary"/>
                            <h3 className="mt-4 text-xl font-semibold">Generating Script...</h3>
                            <p className="mt-1 text-sm">The AI is analyzing your instructions and building the script.</p>
                        </>
                    ) : (
                        <>
                            <CodeBracketSquareIcon className="w-16 h-16"/>
                            <h3 className="mt-4 text-xl font-semibold">Ready to generate</h3>
                            <p className="mt-1 text-sm">Your generated scoring scripts will appear here, grouped by requirement.</p>
                        </>
                    )}
                </div>
            )}
        </div>
      </main>
      {error && (
        <div className="p-3 bg-red-900/50 text-red-300 text-center text-sm font-medium flex justify-center items-center gap-2">
            <XCircleIcon className="w-5 h-5" />
            <p><strong>Error:</strong> {error}</p>
        </div>
      )}
    </div>
  );
};