import React, { useEffect, useMemo, useState } from 'react';
import { usePrompts } from '../contexts/PromptsContext';
import { PromptsSidebar, PromptSidebarItem } from './PromptsSidebar';
import { PromptDefinition } from '../types';

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
  const [selectedId, setSelectedId] = useState<string>(() => localStorage.getItem('promptsSelected') || 'review');

  useEffect(() => {
    localStorage.setItem('promptsSelected', selectedId);
  }, [selectedId]);

  const sidebarItems: PromptSidebarItem[] = useMemo(() => {
    return [
      { id: 'review', title: 'Review Prompt', deletable: false },
      { id: 'single-choice', title: 'Single-Choice Prompt', deletable: false },
      { id: 'multi-single-choice', title: 'Multi Single-Choice Prompt', deletable: false },
      ...prompts.custom.map((entry) => ({ id: entry.id, title: entry.title, deletable: true })),
    ];
  }, [prompts.custom]);

  const resolveSelected = (): { title: string; value: string; custom?: PromptDefinition } => {
    if (selectedId === 'review') {
      return { title: 'Review Prompt', value: prompts.combined };
    }
    if (selectedId === 'single-choice') {
      return { title: 'Single-Choice Prompt', value: prompts.singleChoice };
    }
    if (selectedId === 'multi-single-choice') {
      return { title: 'Multi Single-Choice Prompt', value: prompts.multiSingleChoice };
    }
    const entry = prompts.custom.find((p) => p.id === selectedId);
    if (entry) {
      return { title: entry.title, value: entry.content, custom: entry };
    }
    // Fallback falls Eintrag gelöscht wurde
    return { title: 'Review Prompt', value: prompts.combined };
  };

  const selected = resolveSelected();
  const value = selected.value;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
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
    setPrompts((prev) => {
      if (selectedId === 'review') {
        return { ...prev, combined: newValue };
      }
      if (selectedId === 'single-choice') {
        return { ...prev, singleChoice: newValue };
      }
      if (selectedId === 'multi-single-choice') {
        return { ...prev, multiSingleChoice: newValue };
      }
      const customIndex = prev.custom.findIndex((entry) => entry.id === selectedId);
      if (customIndex >= 0) {
        const updated = [...prev.custom];
        updated[customIndex] = { ...updated[customIndex], content: newValue, updatedAt: Date.now() };
        return { ...prev, custom: updated };
      }
      return prev;
    });
  };

  const handlePasteSelected = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      handleChange(text);
    } catch (error) {
      console.error('Clipboard read failed', error);
    }
  };

  const handleCopySelected = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch (error) {
      console.error('Clipboard write failed', error);
    }
  };

  const handleAddPrompt = () => {
    const title = prompt('Titel für den neuen Prompt:', `Prompt ${prompts.custom.length + 1}`);
    if (!title || !title.trim()) return;
    const id = `prompt-${Date.now()}`;
    const now = Date.now();
    setPrompts((prev) => ({
      ...prev,
      custom: [{ id, title: title.trim(), content: '', createdAt: now, updatedAt: now }, ...prev.custom],
    }));
    setSelectedId(id);
  };

  const deletePrompt = (id: string) => {
    setPrompts((prev) => ({
      ...prev,
      custom: prev.custom.filter((entry) => entry.id !== id),
    }));
    if (selectedId === id) {
      setSelectedId('review');
    }
  };

  const handleDeletePrompt = (id: string, skipConfirmation = false) => {
    if (!skipConfirmation && !confirm('Diesen Prompt wirklich löschen?')) return;
    deletePrompt(id);
  };

  const handleRenamePrompt = (id: string) => {
    const entry = prompts.custom.find((c) => c.id === id);
    if (!entry) return;
    const next = prompt('Neuer Titel:', entry.title);
    if (!next || !next.trim()) return;
    setPrompts((prev) => ({
      ...prev,
      custom: prev.custom.map((item) => (item.id === id ? { ...item, title: next.trim(), updatedAt: Date.now() } : item)),
    }));
    if (selectedId === id) {
      setSelectedId(id); // trigger effect for persistence
    }
  };

  const handleDeleteCurrent = () => {
    if (selectedId === 'review' || selectedId === 'single-choice' || selectedId === 'multi-single-choice') return;
    if (!confirm('Diesen Prompt wirklich löschen?')) return;
    handleDeletePrompt(selectedId, true);
  };

  return (
    <div className="flex h-full bg-gray-900">
      <PromptsSidebar
        items={sidebarItems}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onPasteSelected={handlePasteSelected}
        onCopySelected={handleCopySelected}
        onAddPrompt={handleAddPrompt}
        onDeletePrompt={handleDeletePrompt}
        onRenamePrompt={handleRenamePrompt}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{selected.title}</h1>
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
            <button onClick={handlePasteSelected} className="px-3 py-2 bg-gray-600 text-white rounded-md" title="Prompt aus Zwischenablage einfügen">Einfügen</button>
            <button onClick={handleCopySelected} className="px-3 py-2 bg-gray-600 text-white rounded-md" title="Prompt in Zwischenablage kopieren">Kopieren</button>
            {selected.custom && (
              <button onClick={handleDeleteCurrent} className="px-3 py-2 bg-red-600 text-white rounded-md" title="Prompt löschen">Löschen</button>
            )}
          </div>
        </div>
        <div className="p-4 h-full overflow-hidden">
          <PromptTextarea
            title={selected.title}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
    </div>
  );
};
