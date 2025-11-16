
import React from 'react';
import type { Agent } from '../types';
import { ClockIcon } from './Icons';

interface HistoryViewerProps {
  agents: Agent[];
  completedAgentIds: number[];
  viewingAgentId: number | null;
  onSelectHistory: (id: number) => void;
}

export const HistoryViewer: React.FC<HistoryViewerProps> = ({ agents, completedAgentIds, viewingAgentId, onSelectHistory }) => {
  if (completedAgentIds.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 pt-4 border-t border-dark-border">
      <h3 className="text-md font-semibold text-dark-text-secondary mb-3 flex items-center gap-2">
        <ClockIcon className="w-5 h-5" />
        Workflow Stages
      </h3>
      <div className="space-y-2">
        {completedAgentIds.map(agentId => {
          const agent = agents.find(a => a.id === agentId);
          if (!agent) return null;

          const isViewing = viewingAgentId === agentId;
          const buttonClasses = `w-full text-left p-2 rounded-md text-sm transition-colors flex items-center gap-3 ${
            isViewing
              ? 'bg-brand-primary/20 text-green-300 font-semibold'
              : 'text-dark-text-secondary hover:bg-gray-700'
          }`;

          return (
            <button key={agentId} onClick={() => onSelectHistory(agentId)} className={buttonClasses} aria-pressed={isViewing}>
              <span className="flex-shrink-0 w-6 h-6 p-1 bg-gray-600 rounded-md">{agent.icon}</span>
              <span className="flex-grow">{agent.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
