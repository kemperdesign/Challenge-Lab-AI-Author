
import React, { useState } from 'react';
import { LabGenerator } from './components/LabGenerator';
import { PowerShellScorer } from './components/PowerShellScorer';
import Settings from './components/Settings';

const App: React.FC = () => {
    const [currentApp, setCurrentApp] = useState<'generator' | 'scorer'>('generator');
    const [showSettings, setShowSettings] = useState(false);

    const navigateToGenerator = () => {
        setCurrentApp('generator');
    };

    const navigateToScorer = () => {
        setCurrentApp('scorer');
    };

    const toggleSettings = () => {
        setShowSettings(!showSettings);
    };

    return (
        <>
            {currentApp === 'scorer' ? (
                <PowerShellScorer
                    navigateToGenerator={navigateToGenerator}
                    onOpenSettings={toggleSettings}
                />
            ) : (
                <LabGenerator
                    navigateToScorer={navigateToScorer}
                    onOpenSettings={toggleSettings}
                />
            )}

            {showSettings && <Settings onClose={() => setShowSettings(false)} />}
        </>
    );
};

export default App;
