import React, { useState } from 'react';
import { Editor } from './Editor';
import { MarkdownPreview } from './MarkdownPreview';
import type { ParsedLab } from '../types';

interface TabbedEditorProps {
  labs: ParsedLab[];
  activeTabIndex: number;
  onTabChange: (index: number) => void;
  textMode: 'type' | 'copy';
}

export const TabbedEditor: React.FC<TabbedEditorProps> = ({ labs, activeTabIndex, onTabChange, textMode }) => {
  const [showPreview, setShowPreview] = useState(false);
  const activeLab = labs[activeTabIndex];
  const contentToShow = activeLab ? (textMode === 'copy' ? activeLab.content.replace(/\+\+\+/g, '++') : activeLab.content) : '';

  return (
    <div className="bg-dark-card rounded-lg border border-dark-border flex flex-col h-full shadow-lg">
      <div className="flex border-b border-dark-border overflow-x-auto items-center" role="tablist" aria-label="Processed Labs">
        <div className="flex flex-1 overflow-x-auto">
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
        {activeLab && (
          <button
            onClick={() => setShowPreview(true)}
            className="px-4 py-3 text-dark-text-secondary hover:text-white hover:bg-gray-700 transition-colors"
            title="Preview Markdown"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        )}
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

      {showPreview && activeLab && (
        <MarkdownPreview
          content={contentToShow}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
};