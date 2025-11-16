
import React from 'react';

interface ToggleSwitchProps {
  labelLeft: string;
  labelRight: string;
  value: string;
  onChange: (newValue: string) => void;
  className?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ labelLeft, labelRight, value, onChange, className }) => {
  const isLeft = value === 'type';
  return (
    <div className={`flex items-center rounded-md bg-gray-700 border border-dark-border p-0.5 ${className}`}>
      <button
        onClick={() => onChange('type')}
        className={`flex-1 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
          isLeft ? 'bg-brand-primary text-white' : 'hover:bg-gray-600 text-dark-text'
        }`}
        aria-pressed={isLeft}
      >
        {labelLeft}
      </button>
      <button
        onClick={() => onChange('copy')}
        className={`flex-1 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
          !isLeft ? 'bg-brand-primary text-white' : 'hover:bg-gray-600 text-dark-text'
        }`}
        aria-pressed={!isLeft}
      >
        {labelRight}
      </button>
    </div>
  );
};
