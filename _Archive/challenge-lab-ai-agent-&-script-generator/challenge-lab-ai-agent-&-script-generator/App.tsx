
import React, { useState } from 'react';
import { LabGenerator } from './components/LabGenerator';
import { PowerShellScorer } from './components/PowerShellScorer';

const App: React.FC = () => {
    const [currentApp, setCurrentApp] = useState<'generator' | 'scorer'>('generator');

    const navigateToGenerator = () => {
        setCurrentApp('generator');
    };

    const navigateToScorer = () => {
        setCurrentApp('scorer');
    };

    if (currentApp === 'scorer') {
        return <PowerShellScorer navigateToGenerator={navigateToGenerator} />;
    }
    
    return <LabGenerator navigateToScorer={navigateToScorer} />;
};

export default App;
