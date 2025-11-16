import React from 'react';
import { Editor } from './Editor';
import type { ParsedLab } from '../types';

interface TabbedEditorProps {
  labs: ParsedLab[];
  activeTabIndex: number;
  onTabChange: (index: number) => void;
  textMode: 'type' | 'copy';
}

export const TabbedEditor: React.FC<TabbedEditorProps> = ({ labs, activeTabIndex, onTabChange, textMode }) => {
  const activeLab = labs[activeTabIndex];
  const contentToShow = activeLab ? (textMode === 'copy' ? activeLab.content.replace(/\+\+\+/g, '++') : activeLab.content) : '';

  return (
    <div className="bg-dark-card rounded-lg border border-dark-border flex flex-col h-full shadow-lg">
      <div className="flex border-b border-dark-border overflow-x-auto" role="tablist" aria-label="Processed Labs">
        {labs.map((lab, index) => (
          <button
            key={index}
            onClick={() => onTabChange(index)}
            className={`px-4 py-3 font-semibold transition-colors duration-200 whitespace-nowrap text-sm ${
              activeTabIndex === index
                ? 'bg-brand-primary text-white'
                : 'text-dark-text-secondary hover:bg-gray-700'
            }`}
            role="tab"
            aria-selected={activeTabIndex === index}
            aria-controls={`tabpanel-${index}`}
            id={`tab-${index}`}
          >
            {lab.title.replace(/^(Lab \d+:\s*)/, '').trim()}
          </button>
        ))}
      </div>
      <div className="relative flex-grow min-h-0" role="tabpanel" id={`tabpanel-${activeTabIndex}`} aria-labelledby={`tab-${activeTabIndex}`}>
        {activeLab ? (
          <Editor
            title={activeLab.title}
            content={contentToShow}
            isReadOnly={true}
            showTitle={false}
            placeholder="Output will appear here after processing..."
          />
        ) : (
          <div className="p-4 text-dark-text-secondary">No lab selected.</div>
        )}
      </div>
    </div>
  );
};