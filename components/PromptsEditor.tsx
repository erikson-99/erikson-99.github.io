import React, { useState } from 'react';
import { usePrompts } from '../contexts/PromptsContext';
import { PromptsSidebar } from './PromptsSidebar';

const PromptTextarea: React.FC<{ 
  value: string; 
  onChange: (value: string) => void; 
  title: string; 
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}> = ({ value, onChange, title, onKeyDown }) => {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col h-full">
      <h3 className="text-lg font-bold text-sky-400 mb-2">{title}</h3>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="w-full flex-1 p-3 bg-gray-900 border border-gray-600 rounded-md text-gray-300 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-sky-500 transition-shadow"
        spellCheck="false"
      />
    </div>
  );
};

export const PromptsEditor: React.FC = () => {
  const { prompts, setPrompts, undo, redo, canUndo, canRedo } = usePrompts();
  const [selected, setSelected] = useState<'review' | 'single-choice'>(() => {
    return (localStorage.getItem('promptsSelected') as 'review' | 'single-choice') || 'review';
  });
  const value = selected === 'review' ? prompts.combined : prompts.singleChoice;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey) {
        if (e.key === 'z' && !e.shiftKey) {
            if (canUndo) { 
                e.preventDefault(); 
                undo(); 
            }
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
             if (canRedo) { 
                e.preventDefault(); 
                redo(); 
            }
        }
    }
  };

  const handleChange = (newValue: string) => {
    setPrompts((p) => selected === 'review' ? { ...p, combined: newValue } : { ...p, singleChoice: newValue });
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setPrompts((p) => selected === 'review' ? { ...p, combined: text } : { ...p, singleChoice: text });
      }
    } catch (e) {
      console.error('Clipboard read failed', e);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch (e) {
      console.error('Clipboard write failed', e);
    }
  };

  return (
    <div className="flex h-full bg-gray-900">
      <PromptsSidebar
        selectedId={selected}
        onSelect={(id) => { setSelected(id); localStorage.setItem('promptsSelected', id); }}
        onPasteSelected={handlePaste}
        onCopySelected={handleCopy}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{selected === 'review' ? 'Review Prompt' : 'Single-Choice Prompt'}</h1>
            <p className="text-gray-400 text-sm mt-1">Änderungen werden automatisch gespeichert.</p>
          </div>
          <div className="space-x-2">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="px-3 py-2 bg-gray-700 text-white rounded-md disabled:opacity-50"
              title="Rückgängig (Ctrl+Z)"
            >
              Undo
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="px-3 py-2 bg-gray-700 text-white rounded-md disabled:opacity-50"
              title="Wiederholen (Ctrl+Y / Ctrl+Shift+Z)"
            >
              Redo
            </button>
            <button onClick={handlePaste} className="px-3 py-2 bg-gray-600 text-white rounded-md" title="Prompt aus Zwischenablage einfügen">Einfügen</button>
            <button onClick={handleCopy} className="px-3 py-2 bg-gray-600 text-white rounded-md" title="Prompt in Zwischenablage kopieren">Kopieren</button>
          </div>
        </div>
        <div className="p-4 h-full overflow-hidden">
          <div className="h-full">
            <PromptTextarea
              title={selected === 'review' ? 'Review Prompt' : 'Single-Choice Prompt'}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
