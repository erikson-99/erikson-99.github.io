import React from 'react';
import type { EditorMode } from '../App';
import { useModel } from '../contexts/ModelContext';
import { useDebug } from '../contexts/DebugContext';
import { ToggleSwitch } from './ToggleSwitch';

interface AppHeaderProps {
    currentMode: EditorMode;
    onModeChange: (mode: EditorMode) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ currentMode, onModeChange }) => {
    const buttonStyle = "px-6 py-2 text-sm font-bold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-sky-500";
    const activeStyle = "bg-sky-600 text-white";
    const inactiveStyle = "bg-gray-700 text-gray-300 hover:bg-gray-600";
    const { model, setModel, options } = useModel();
    const { debug, setDebug } = useDebug();

    return (
        <header className="flex-shrink-0 bg-gray-900 border-b border-gray-700 shadow-md p-3 flex justify-between items-center">
             <div className="flex p-1 space-x-1 bg-gray-800 rounded-lg">
                <button
                    onClick={() => onModeChange('quiz')}
                    className={`${buttonStyle} ${currentMode === 'quiz' ? activeStyle : inactiveStyle}`}
                    aria-pressed={currentMode === 'quiz'}
                >
                    Quiz Editor
                </button>
                <button
                    onClick={() => onModeChange('mixed-quiz')}
                    className={`${buttonStyle} ${currentMode === 'mixed-quiz' ? activeStyle : inactiveStyle}`}
                     aria-pressed={currentMode === 'mixed-quiz'}
                >
                    Gemischte Aufgaben
                </button>
                <button
                    onClick={() => onModeChange('explanation')}
                    className={`${buttonStyle} ${currentMode === 'explanation' ? activeStyle : inactiveStyle}`}
                     aria-pressed={currentMode === 'explanation'}
                >
                    Erklärungs-Editor
                </button>
                <button
                    onClick={() => onModeChange('prompts')}
                    className={`${buttonStyle} ${currentMode === 'prompts' ? activeStyle : inactiveStyle}`}
                     aria-pressed={currentMode === 'prompts'}
                >
                    Prompts
                </button>
            </div>
            <div className="flex items-center space-x-4">
              <label htmlFor="model-select" className="text-sm text-gray-400">Modell</label>
              <select
                id="model-select"
                className="bg-gray-800 text-gray-200 px-3 py-2 rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                title="OpenRouter Modell wählen"
              >
                {options.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-400">Debug</span>
                <ToggleSwitch id="debug-toggle" checked={debug} onChange={setDebug} />
              </div>
            </div>
        </header>
    );
};
