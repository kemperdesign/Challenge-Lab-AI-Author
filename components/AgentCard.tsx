import React from 'react';
import type { Agent, AgentStatus } from '../types';
import { SpinnerIcon, CheckCircleIcon, XCircleIcon } from './Icons';

interface AgentCardProps {
  agent: Agent;
  onClick: () => void;
  status: AgentStatus;
  isDisabled: boolean;
  isViewing?: boolean;
  progress?: number;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent, onClick, status, isDisabled, isViewing, progress = 0 }) => {
  const baseClasses = "flex items-center p-3 rounded-lg w-full text-left transition-all duration-200 ease-in-out relative overflow-hidden";
  const stateClasses = isDisabled
    ? "opacity-60 cursor-not-allowed"
    : "hover:bg-gray-700 transform hover:scale-105";
  
  const statusClasses = {
    pending: "bg-dark-card border border-dark-border",
    processing: "bg-dark-card border border-dark-border", // Progress bar will indicate processing
    done: "bg-green-500/10 border border-green-500/30",
    error: "bg-red-500/10 border border-red-500/30",
    skipped: "bg-dark-card border border-dark-border",
  };

  const viewingClasses = isViewing ? 'ring-2 ring-brand-secondary' : '';

  const getStatusIndicator = () => {
    switch (status) {
      case 'processing':
        return <SpinnerIcon className="w-5 h-5 animate-spin text-brand-primary" />;
      case 'done':
        return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-red-400" />;
      case 'skipped':
         return <span className="text-sm font-mono text-dark-text-secondary">-</span>
      default:
        return null;
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`${baseClasses} ${stateClasses} ${statusClasses[status]} ${viewingClasses}`}
      aria-label={`${agent.title}. Status: ${status}. ${isViewing ? 'Currently viewing output.' : ''}`}
      aria-pressed={isViewing}
    >
      <div
        className="absolute top-0 left-0 h-full bg-brand-primary/20 transition-all duration-300 ease-linear"
        style={{ width: `${status === 'processing' ? progress : 0}%` }}
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      />
      <div className="relative z-10 flex items-center w-full">
        <div className={`mr-4 p-2 rounded-md ${status === 'processing' ? 'bg-brand-primary text-white' : 'bg-gray-600 text-dark-text'}`}>
          {agent.icon}
        </div>
        <div className="flex-1 text-left">
          <p className={`font-semibold ${status === 'done' ? 'text-green-400' : 'text-white'}`}>{agent.title}</p>
          <p className={`text-sm ${status === 'done' ? 'text-green-400/80' : 'text-dark-text-secondary'}`}>{agent.description}</p>
        </div>
        <div className="ml-4 w-5 h-5 flex items-center justify-center">
          {getStatusIndicator()}
        </div>
      </div>
    </button>
  );
};