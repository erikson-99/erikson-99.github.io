import React, { useState, useEffect } from 'react';
import { AppHeader } from './components/AppHeader';
import { QuizEditor } from './components/QuizEditor';
import { ExplanationEditor } from './components/ExplanationEditor';
import { PromptsProvider } from './contexts/PromptsContext';
import { ModelProvider } from './contexts/ModelContext';
import { DebugProvider } from './contexts/DebugContext';
import { PromptsEditor } from './components/PromptsEditor';
import { MixedQuizEditor } from './components/MixedQuizEditor';
import { LessonEditor } from './components/LessonEditor';
import ContextManager from './components/ContextManager';

export type EditorMode = 'quiz' | 'explanation' | 'prompts' | 'mixed-quiz' | 'lesson' | 'context';

export default function App() {
  const [mode, setMode] = useState<EditorMode>(() => {
    return (localStorage.getItem('editorMode') as EditorMode) || 'quiz';
  });

  useEffect(() => {
    localStorage.setItem('editorMode', mode);
  }, [mode]);

  const renderEditor = () => {
    switch (mode) {
      case 'quiz':
        return <QuizEditor />;
      case 'explanation':
        return <ExplanationEditor />;
      case 'prompts':
        return <PromptsEditor />;
      case 'mixed-quiz':
        return <MixedQuizEditor />;
      case 'lesson':
        return <LessonEditor />;
      case 'context':
        return <ContextManager />;
      default:
        return <QuizEditor />;
    }
  };

  return (
    <ModelProvider>
      <PromptsProvider>
        <DebugProvider>
          <div className="flex flex-col h-screen font-sans">
            <AppHeader currentMode={mode} onModeChange={setMode} />
            <div className="flex-1 overflow-hidden">
              {renderEditor()}
            </div>
          </div>
        </DebugProvider>
      </PromptsProvider>
    </ModelProvider>
  );
}
