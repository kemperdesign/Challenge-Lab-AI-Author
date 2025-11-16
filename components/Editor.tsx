
import React from 'react';

interface EditorProps {
  title: string;
  content: string;
  setContent?: (content: string) => void;
  isReadOnly?: boolean;
  isLoading?: boolean;
  isDisabled?: boolean;
  placeholder?: string;
  showTitle?: boolean;
}

export const Editor: React.FC<EditorProps> = ({
  title,
  content,
  setContent,
  isReadOnly = false,
  isLoading = false,
  isDisabled = false,
  placeholder = "Enter your text here...",
  showTitle = true,
}) => {
  return (
    <div className={`flex flex-col h-full ${showTitle ? 'bg-dark-card rounded-lg border border-dark-border shadow-lg' : ''}`}>
      {showTitle && <h3 className="text-lg font-semibold p-3 border-b border-dark-border">{title}</h3>}
      <div className="relative flex-grow min-h-0">
        <textarea
          value={content}
          onChange={(e) => setContent && setContent(e.target.value)}
          readOnly={isReadOnly}
          disabled={isDisabled}
          placeholder={placeholder}
          className={`w-full h-full p-4 bg-transparent text-dark-text resize-none focus:outline-none focus:ring-0 disabled:opacity-70 ${showTitle ? 'rounded-b-lg' : ''}`}
        />
        {isLoading && (
            <div className={`absolute inset-0 bg-dark-card/80 flex items-center justify-center ${showTitle ? 'rounded-b-lg' : ''}`}>
                <div className="text-center">
                    <svg className="animate-spin h-8 w-8 text-brand-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-2 text-dark-text-secondary">Processing...</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
