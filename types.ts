
import type React from 'react';

export type AgentStatus = 'pending' | 'processing' | 'done' | 'error' | 'skipped';

export interface Agent {
  id: number;
  title: string;
  description: string;
  prompt: string;
  icon: React.ReactNode;
  modes: ('topic' | 'document')[];
  duration?: number; // Estimated duration in seconds
  // FIX: Add optional 'model' property to Agent interface to support model specification per agent.
  model?: string;
}

export interface ParsedLab {
  title: string;
  content: string;
}

// Types for PowerShell Scorer structured output
export interface ActivityGroup {
  name: string;
  replacementTokenAlias: string;
}

export interface AutomatedActivity {
  name: string;
  configuration: string[];
}

export interface ScriptConfig {
  targetVM: string;
  taskListFields: string;
  correctFeedback: string;
  incorrectFeedback: string;
  powershellScript: string;
}

export interface GeneratedRequirement {
  title: string;
  activityGroup: ActivityGroup;
  automatedActivity: AutomatedActivity;
  scriptConfig: ScriptConfig;
}