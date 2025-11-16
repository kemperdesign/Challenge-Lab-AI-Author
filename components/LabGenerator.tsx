
import React, { useState, useCallback, ChangeEvent, useEffect, useRef } from 'react';
import { AGENTS } from '../constants';
import { getPromptsForProvider } from '../prompts';
import { AgentCard } from './AgentCard';
import { Editor } from './Editor';
import { processText, processTextStream } from '../hooks/useAIService';
import type { Agent, AgentStatus, ParsedLab } from '../types';
import { StopIcon, UnicornIcon, ArrowPathIcon, TerminalIcon } from './Icons';
import { TabbedEditor } from './TabbedEditor';
import { ToggleSwitch } from './ToggleSwitch';
import { HistoryViewer } from './HistoryViewer';
import { SettingsManager } from '../services/settingsManager';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Get the appropriate prompt for a given agent based on the current provider
 */
const getPromptForAgent = (
  agentId: number,
  labCreationMode: 'single' | 'series' = 'series',
  numLabs?: number,
  numRequirements?: number
): string => {
  const currentProvider = SettingsManager.getSettings().provider;
  const prompts = getPromptsForProvider(currentProvider);

  let prompt: string;

  switch (agentId) {
    case 1:
      prompt = labCreationMode === 'single' ? prompts.AGENT_1_SINGLE_PROMPT : prompts.AGENT_1_SERIES_COMBINED_PROMPT;
      break;
    case 2:
      prompt = prompts.AGENT_RESTRUCTURE_PROMPT;
      break;
    case 3:
      prompt = prompts.COMBINED_AGENT_PROMPT;
      break;
    default:
      // Fallback to OpenAI prompts if unknown agent
      prompt = getPromptsForProvider('openai').COMBINED_AGENT_PROMPT;
  }

  // Replace placeholders if values are provided
  if (numLabs !== undefined) {
    prompt = prompt.replace(/\{\{NUM_LABS\}\}/g, numLabs.toString());
  }
  if (numRequirements !== undefined) {
    prompt = prompt.replace(/\{\{NUM_REQUIREMENTS\}\}/g, numRequirements.toString());
  }

  return prompt;
};

const downloadMarkdown = (content: string, filename: string) => {
  const element = document.createElement('a');
  const file = new Blob([content], {type: 'text/markdown;charset=utf-8'});
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

const getSeriesName = (content: string): string => {
    const lines = content.split('\n');
    const nameLine = lines.find(line => line.startsWith('**Series Name:**'));
    if (nameLine) {
        const name = nameLine.replace('**Series Name:**', '').trim();
        const safeName = name.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '-').toLowerCase();
        return `lab-series-${safeName}.md`;
    }
    return 'lab-series.md';
}

const getChallengeTitle = (content: string): string | null => {
    const match = content.match(/^>\[challenge-title\]:\s*(.*)/m);
    return match ? match[1].trim() : null;
};

type TextMode = 'type' | 'copy';

interface LabGeneratorProps {
  navigateToScorer: () => void;
  onOpenSettings: () => void;
}

export const LabGenerator: React.FC<LabGeneratorProps> = ({ navigateToScorer, onOpenSettings }) => {
  const [initialContent, setInitialContent] = useState<string>('');
  const [processedContent, setProcessedContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [agentStatuses, setAgentStatuses] = useState<Record<number, AgentStatus>>({});
  
  const [workflowMode, setWorkflowMode] = useState<'topic' | 'document'>('topic');
  const [labCreationMode, setLabCreationMode] = useState<'series' | 'single'>('series');
  const [fileName, setFileName] = useState<string | null>(null);
  const [numLabs, setNumLabs] = useState<number>(10);
  const [numRequirements, setNumRequirements] = useState<number>(4);
  
  const [history, setHistory] = useState<Record<number, string>>({});
  const [viewingAgentId, setViewingAgentId] = useState<number | null>(null);
  
  const [labSeries, setLabSeries] = useState<ParsedLab[]>([]);
  const [processedLabs, setProcessedLabs] = useState<ParsedLab[]>([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  const [textMode, setTextMode] = useState<TextMode>('type');
  const [progress, setProgress] = useState(0);

  const isCancelledRef = useRef(false);
  const progressIntervalRef = useRef<number | null>(null);
  
  const activeAgents = AGENTS.filter(agent => agent.modes.includes(workflowMode));

  useEffect(() => {
    const processingAgentEntry = Object.entries(agentStatuses).find(([, status]) => status === 'processing');

    if (processingAgentEntry) {
        const agentId = parseInt(processingAgentEntry[0], 10);
        const agent = activeAgents.find(a => a.id === agentId);
        const duration = agent?.duration || 30;

        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

        const startTime = Date.now();
        progressIntervalRef.current = window.setInterval(() => {
            const elapsedTime = (Date.now() - startTime) / 1000;
            const newProgress = Math.min((elapsedTime / duration) * 100, 100);
            setProgress(newProgress);
            if (newProgress >= 100) {
                if(progressIntervalRef.current) clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
            }
        }, 200);

    } else {
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }
        setProgress(0);
    }

    return () => {
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
        }
    };
  }, [agentStatuses, activeAgents]);


  useEffect(() => {
    if (viewingAgentId !== null && history[viewingAgentId]) {
      const isShowingTabsForAgent1 = viewingAgentId === 1 && labCreationMode === 'series' && labSeries.length > 0;
      const isShowingTabsForAgent3Or4 = (viewingAgentId === 3 || viewingAgentId === 4) && processedLabs.length > 0;

      if (isShowingTabsForAgent1) {
        setProcessedContent(labSeries[activeTabIndex]?.content || '');
      } else if (isShowingTabsForAgent3Or4) {
        setProcessedContent(processedLabs[activeTabIndex]?.content || '');
      }
      else {
        setProcessedContent(history[viewingAgentId]);
      }
    }
  }, [viewingAgentId, history, processedLabs, labSeries, activeTabIndex, labCreationMode]);


  const parseLabs = (rawContent: string): ParsedLab[] => {
    if (!rawContent) return [];
    const docs = rawContent.split('--- START OF FILE:').filter(s => s.trim().length > 0);
    return docs.map(doc => {
      const lines = doc.split('\n');
      const title = lines[0].replace(/---/g, '').trim();
      const content = lines.slice(1).join('\n').replace(/--- END OF FILE ---\s*$/, '').trim();
      return { title, content };
    });
  };

  const handleStopWorkflow = useCallback(() => {
    isCancelledRef.current = true;
    setError("Stopping workflow...");
  }, []);
  
  const handleAgentSelect = useCallback(async (selectedAgent: Agent) => {
    isCancelledRef.current = false;
    setIsLoading(true);
    setError(null);
    setStatusMessage(null);
    setViewingAgentId(null);

    const lastDoneAgent = activeAgents.slice().reverse().find(a => agentStatuses[a.id] === 'done');
    const lastDoneAgentId = lastDoneAgent ? lastDoneAgent.id : 0;

    let currentContent: string;
    let agentsToRun: Agent[];
    let newHistory = { ...history };
    let newStatuses = { ...agentStatuses };

    // CHANGED: Only run the single selected agent, not all agents up to it
    if (lastDoneAgent && selectedAgent.id > lastDoneAgent.id) {
      // Continue from last completed agent
      currentContent = history[lastDoneAgent.id] || '';
      agentsToRun = [selectedAgent]; // Only run the clicked agent
    } else if (selectedAgent.id === 1 || !lastDoneAgent) {
      // Starting fresh with Agent 1
      setProcessedContent('');
      setLabSeries([]);
      setProcessedLabs([]);
      newHistory = {};
      newStatuses = activeAgents.reduce((acc, agent) => {
        acc[agent.id] = 'pending';
        return acc;
      }, {} as Record<number, AgentStatus>);

      currentContent = initialContent;
      agentsToRun = [selectedAgent]; // Only run Agent 1
    } else {
      // User is clicking an agent out of sequence - only run that agent
      currentContent = history[lastDoneAgent.id] || '';
      agentsToRun = [selectedAgent];
    }

    setHistory(newHistory);
    setAgentStatuses(newStatuses);
  
    let processingAgentId: number | null = null;
    let lastCompletedAgentId: number | null = null;
    let wasCancelled = false;
  
    try {
      for (const agent of agentsToRun) {
        if (isCancelledRef.current) {
          wasCancelled = true;
          if(processingAgentId) setAgentStatuses(prev => ({ ...prev, [processingAgentId]: 'pending' }));
          break;
        }
  
        processingAgentId = agent.id;
        setAgentStatuses(prev => ({ ...prev, [agent.id]: 'processing' }));
  
        if (agent.id === 1) {
            const promptToUse = getPromptForAgent(1, labCreationMode, numLabs, numRequirements);
            setProcessedLabs([]);

            const result = agent.id === selectedAgent.id
                ? await processTextStream(agent.model!, promptToUse, initialContent, (chunk) => setProcessedContent(prev => prev + chunk), isCancelledRef, setStatusMessage)
                : await processText(agent.model!, promptToUse, initialContent, isCancelledRef, setStatusMessage);

            currentContent = result;
            if (isCancelledRef.current) { wasCancelled = true; break; }
            
            if (labCreationMode === 'series') {
                const parts = currentContent.split('\n===SPLIT===\n');
                if (parts.length === 2) {
                    const seriesContent = parts[0];
                    const splitContent = parts[1];
                    downloadMarkdown(seriesContent, getSeriesName(seriesContent));
                    
                    const labs = parseLabs(splitContent);
                    setLabSeries(labs);
                    setHistory(prev => ({ ...prev, [agent.id]: splitContent }));
                } else {
                    throw new Error("Agent 1 failed to produce the correct split output format for the lab series.");
                }
            } else {
                setLabSeries(parseLabs(currentContent));
                setHistory(prev => ({ ...prev, [agent.id]: currentContent }));
            }
        } 
        else if (agent.id === 3) {
            let labsToProcess = labSeries;
            if (labsToProcess.length === 0) {
                const contentSource = history[lastDoneAgentId] || initialContent;
                labsToProcess = parseLabs(contentSource);
                if (labsToProcess.length === 0 && contentSource) {
                    const challengeTitle = getChallengeTitle(contentSource);
                    labsToProcess = [{ title: challengeTitle || fileName || 'Custom Lab', content: contentSource }];
                }
                if (labsToProcess.length > 0) setLabSeries(labsToProcess);
            }
            if (labsToProcess.length === 0) throw new Error("No labs found to process. Please provide a document or run the first agent.");

            const allResults: ParsedLab[] = [];
            for (let i = 0; i < labsToProcess.length; i++) {
                if (isCancelledRef.current) {
                    wasCancelled = true;
                    break;
                }
                const lab = labsToProcess[i];
                setProcessedContent(`Processing lab ${i + 1} of ${labsToProcess.length}: ${lab.title}`);

                const promptToUse = getPromptForAgent(agent.id);
                const result = await processText(agent.model!, promptToUse, lab.content, isCancelledRef, setStatusMessage);
                if (isCancelledRef.current) {
                    wasCancelled = true;
                    break;
                }
                allResults.push({ title: lab.title, content: result });
                setProcessedLabs([...allResults]);
                
                if (i < labsToProcess.length - 1) {
                    await wait(1500);
                }
            }
            if (wasCancelled) break;

            setActiveTabIndex(0);
            
            currentContent = `Processed ${allResults.length} lab(s). View them in the tabs.`;
            setProcessedContent(currentContent);
            setHistory(prev => ({ ...prev, [agent.id]: currentContent }));
        }
        else if (agent.id === 4) {
            if (processedLabs.length === 0) {
                throw new Error("No processed labs to export. Run Agent 3 first.");
            }
            processedLabs.forEach(lab => {
                const filename = `${lab.title.replace(/[<>:"/\\|?*]/g, '_')}.md`;
                downloadMarkdown(lab.content, filename);
            });
            currentContent = `Exported ${processedLabs.length} lab(s) successfully.`;
            setProcessedContent(currentContent);
            setHistory(prev => ({ ...prev, [agent.id]: currentContent }));
        }
        else {
            const promptToUse = getPromptForAgent(agent.id);
            const result = (agent.id === selectedAgent.id)
              ? await processTextStream(agent.model!, promptToUse, currentContent, (chunk) => setProcessedContent(prev => prev + chunk), isCancelledRef, setStatusMessage)
              : await processText(agent.model!, promptToUse, currentContent, isCancelledRef, setStatusMessage);
            
            currentContent = result;
            if (isCancelledRef.current) { wasCancelled = true; break; }
            setHistory(prev => ({ ...prev, [agent.id]: currentContent }));
        }

        if (isCancelledRef.current) {
          wasCancelled = true;
          if(processingAgentId) setAgentStatuses(prev => ({ ...prev, [processingAgentId]: 'pending' }));
          break;
        }
  
        setAgentStatuses(prev => ({ ...prev, [agent.id]: 'done' }));
        lastCompletedAgentId = agent.id;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during processing.';
      setStatusMessage(null);
      if (processingAgentId && !isCancelledRef.current) {
        setAgentStatuses(prev => ({ ...prev, [processingAgentId!]: 'error' }));
        setError(errorMessage);
      }
      console.error(err);
    }

    if (wasCancelled) {
      setError("Workflow stopped by user.");
      setStatusMessage(null);
    } else if (lastCompletedAgentId) {
      setViewingAgentId(lastCompletedAgentId);
      setStatusMessage(null);
    }

    setIsLoading(false);

  }, [initialContent, workflowMode, labCreationMode, agentStatuses, history, labSeries, processedLabs, fileName, activeAgents]);

  const handleAgentClick = (agent: Agent) => {
    const status = agentStatuses[agent.id];
    if (status === 'done') {
      setViewingAgentId(agent.id);
    } else {
      handleAgentSelect(agent);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === 'string') {
          setInitialContent(text);
          setFileName(file.name);
          setProcessedContent('');
          setAgentStatuses({});
          setHistory({});
          setViewingAgentId(null);
          setLabSeries([]);
          setProcessedLabs([]);
        } else {
          console.error("Failed to read file as text.");
          setError("Could not read the selected file.");
        }
      };
      reader.onerror = () => setError("Error reading the file.")
      reader.readAsText(file);
    }
  };
  
  const handleReset = useCallback(() => {
    setInitialContent('');
    setProcessedContent('');
    setIsLoading(false);
    setError(null);
    setStatusMessage(null);
    setAgentStatuses({});
    setFileName(null);
    setHistory({});
    setViewingAgentId(null);
    setLabSeries([]);
    setProcessedLabs([]);
    setActiveTabIndex(0);
    if (isCancelledRef.current) isCancelledRef.current = false;
  }, []);

  const handleTabClick = (mode: 'topic' | 'document') => {
    setWorkflowMode(mode);
    handleReset();
    if (mode === 'topic') {
      setLabCreationMode('series');
    }
  };

  const handleLabCreationModeChange = (newMode: 'series' | 'single') => {
    if (labCreationMode !== newMode) {
      setLabCreationMode(newMode);
      setProcessedContent('');
      setAgentStatuses({});
      setHistory({});
      setViewingAgentId(null);
      setError(null);
      setLabSeries([]);
      setProcessedLabs([]);
      setActiveTabIndex(0);
    }
  };

  const labsToShow = 
    (viewingAgentId === 1 && labCreationMode === 'series' && labSeries.length > 0) ? labSeries :
    ((viewingAgentId === 3 || viewingAgentId === 4) && processedLabs.length > 0) ? processedLabs :
    [];

  const contentForEditor = textMode === 'copy' ? processedContent.replace(/\+\+\+/g, '++') : processedContent;
  const processingAgentId = Number(Object.keys(agentStatuses).find(key => agentStatuses[Number(key)] === 'processing'));
  const completedAgentIds = Object.keys(history).map(Number).sort((a, b) => a - b);

  return (
    <>
      <div className="h-screen bg-dark-bg text-dark-text font-sans flex flex-col">
        <header className="bg-dark-card border-b border-dark-border p-4 shadow-md flex-shrink-0">
          <h1 className="text-2xl font-bold text-center text-green-400 flex items-center justify-center gap-3">
            <UnicornIcon className="w-8 h-8" />
            <span>Challenge Labs: Lab Generator</span>
          </h1>
          <p className="text-center text-dark-text-secondary mt-1">Transform documents with a sequential AI workflow.</p>
        </header>
        
        <main className="flex flex-row p-4 gap-4 flex-grow min-h-0">
          <aside className="w-full md:w-1/3 lg:w-1/4 flex-shrink-0">
            <div className="bg-dark-card rounded-lg border border-dark-border flex flex-col h-full shadow-lg">
              
              <div className="p-4 border-b border-dark-border flex-shrink-0">
                 <h2 className="text-lg font-semibold mb-4">Agent Workflow</h2>
                
                <div className="space-y-2">
                    <div className="flex">
                        <button 
                          onClick={() => handleTabClick('topic')}
                          className={`flex-1 px-4 py-2 text-sm font-semibold transition-colors duration-200 rounded-l-md ${workflowMode === 'topic' ? 'bg-brand-primary text-white' : 'bg-gray-700 text-dark-text-secondary hover:bg-gray-600'}`}
                          aria-current={workflowMode === 'topic' ? 'page' : undefined}
                        >
                          Start from Topic
                        </button>
                        <button 
                          onClick={() => handleTabClick('document')}
                          className={`flex-1 px-4 py-2 text-sm font-semibold transition-colors duration-200 rounded-r-md ${workflowMode === 'document' ? 'bg-brand-primary text-white' : 'bg-gray-700 text-dark-text-secondary hover:bg-gray-600'}`}
                          aria-current={workflowMode === 'document' ? 'page' : undefined}
                        >
                          Start from Document
                        </button>
                    </div>

                    <ToggleSwitch
                        labelLeft="Type Text"
                        labelRight="Copy Text"
                        value={textMode}
                        onChange={(v) => setTextMode(v as TextMode)}
                    />
                    
                    {workflowMode === 'topic' && (
                        <>
                            <div className="flex items-center rounded-md bg-gray-700 border border-dark-border p-0.5">
                                <button
                                  onClick={() => handleLabCreationModeChange('series')}
                                  className={`flex-1 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${labCreationMode === 'series' ? 'bg-brand-primary text-white' : 'hover:bg-gray-600 text-dark-text'}`}
                                >
                                  Lab Series
                                </button>
                                <button
                                  onClick={() => handleLabCreationModeChange('single')}
                                  className={`flex-1 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${labCreationMode === 'single' ? 'bg-brand-primary text-white' : 'hover:bg-gray-600 text-dark-text'}`}
                                >
                                  Single Lab
                                </button>
                            </div>

                            {labCreationMode === 'series' && (
                                <div className="space-y-2 pt-2">
                                    <div>
                                        <label htmlFor="numLabs" className="block text-xs font-medium text-dark-text-secondary mb-1">
                                            Number of Labs
                                        </label>
                                        <input
                                            id="numLabs"
                                            type="number"
                                            min="1"
                                            max="20"
                                            value={numLabs}
                                            onChange={(e) => setNumLabs(parseInt(e.target.value) || 10)}
                                            disabled={isLoading}
                                            className="w-full p-2 bg-dark-bg text-dark-text rounded-md border border-dark-border focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-70"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="numRequirements" className="block text-xs font-medium text-dark-text-secondary mb-1">
                                            Requirements per Lab
                                        </label>
                                        <input
                                            id="numRequirements"
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={numRequirements}
                                            onChange={(e) => setNumRequirements(parseInt(e.target.value) || 4)}
                                            disabled={isLoading}
                                            className="w-full p-2 bg-dark-bg text-dark-text rounded-md border border-dark-border focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-70"
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    
                    <div className="flex gap-2 pt-2">
                        <button
                          onClick={handleReset}
                          className="flex-1 p-2 rounded-md text-dark-text bg-gray-700 hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                          title="Start a fresh series"
                          aria-label="Start a fresh series"
                        >
                          <ArrowPathIcon className="w-5 h-5" />
                          <span>Reset</span>
                        </button>
                        <button
                          onClick={onOpenSettings}
                          className="flex-1 p-2 rounded-md text-dark-text bg-gray-700 hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                          title="Configure AI Provider"
                          aria-label="Configure AI Provider"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>Settings</span>
                        </button>
                        <button
                          onClick={navigateToScorer}
                          className="flex-1 p-2 rounded-md text-dark-text bg-gray-700 hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                          title="Switch to PowerShell Scorer"
                          aria-label="Switch to PowerShell Scorer"
                        >
                          <TerminalIcon className="w-5 h-5" />
                          <span>PowerShell</span>
                        </button>
                    </div>
                </div>
                
                <div className="mt-4">
                    {workflowMode === 'document' ? (
                        <div className="text-center">
                            <label htmlFor="file-upload" className="cursor-pointer px-4 py-2 bg-brand-primary text-white font-semibold rounded-lg hover:bg-green-700 transition-all duration-200 ease-in-out inline-block">
                                {fileName ? 'Change File' : 'Select a file to upload'}
                            </label>
                            <input id="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".md,.txt,text/plain" />
                            {fileName && <p className="mt-2 text-xs text-dark-text-secondary text-center truncate" title={fileName}>Loaded: {fileName}</p>}
                            <p className="mt-2 text-xs text-dark-text-secondary">Start processing at Agent 2.</p>
                        </div>
                    ) : (
                        <textarea
                            value={initialContent}
                            onChange={(e) => {
                                setInitialContent(e.target.value);
                                if(processedContent || Object.keys(agentStatuses).length > 0) {
                                  setProcessedContent('');
                                  setAgentStatuses({});
                                  setHistory({});
                                  setViewingAgentId(null);
                                  setLabSeries([]);
                                  setProcessedLabs([]);
                                }
                            }}
                            disabled={isLoading}
                            placeholder={labCreationMode === 'series' ? "Create a new lab series on the following topic:" : "Create a new single lab on the following topic:"}
                            className="w-full p-2 bg-dark-bg text-dark-text rounded-md resize-y border border-dark-border focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-70"
                            style={{minHeight: '100px'}}
                            aria-label="Input Document"
                        />
                    )}
                </div>
              </div>
              
              <div className="p-4 overflow-y-auto flex-grow">
                {isLoading && (
                  <button
                    onClick={handleStopWorkflow}
                    className="w-full mb-4 px-4 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-all duration-200 ease-in-out flex items-center justify-center gap-2"
                  >
                    <StopIcon className="w-5 h-5" />
                    <span>Stop Workflow</span>
                  </button>
                )}
                
                <div className="space-y-3">
                  {activeAgents.map((agent) => {
                    const status = agentStatuses[agent.id] || 'pending';
                    const isDisabled = isLoading;

                    return (
                      <AgentCard
                        key={agent.id}
                        agent={agent}
                        onClick={() => handleAgentClick(agent)}
                        status={status}
                        isDisabled={isDisabled}
                        isViewing={viewingAgentId === agent.id}
                        progress={agent.id === processingAgentId ? progress : status === 'done' ? 100 : 0}
                      />
                    );
                  })}
                </div>
                {statusMessage && !error && (
                    <div className="mt-4 text-center text-yellow-400 bg-yellow-900/50 p-3 rounded-md" role="status">
                        {statusMessage}
                    </div>
                )}
                {error && <div className="mt-4 text-center text-red-400 bg-red-900/50 p-3 rounded-md" role="alert">{error}</div>}

                <HistoryViewer
                    agents={activeAgents}
                    completedAgentIds={completedAgentIds}
                    viewingAgentId={viewingAgentId}
                    onSelectHistory={setViewingAgentId}
                />
              </div>
            </div>
          </aside>
          
          <section className="w-full md:w-2/3 lg:w-3/4 flex flex-col">
            {labsToShow.length > 0 ? (
                <TabbedEditor
                    labs={labsToShow}
                    activeTabIndex={activeTabIndex}
                    onTabChange={setActiveTabIndex}
                    textMode={textMode}
                />
            ) : (
                <Editor
                    title="Processed Output"
                    content={contentForEditor}
                    isReadOnly={true}
                    isLoading={isLoading}
                    placeholder="Output will appear here after processing..."
                />
            )}
          </section>
        </main>
      </div>
    </>
  );
};
