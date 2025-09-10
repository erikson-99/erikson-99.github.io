import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sendChat, ChatMessage } from '../services/openrouterChat';
import { useModel } from '../contexts/ModelContext';
import { useDebug } from '../contexts/DebugContext';
import { usePrompts } from '../contexts/PromptsContext';

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  contextLabel: string;
  contextMarkdown: string;
  onReplace?: (newMarkdown: string) => void;
  supportsPrompts?: boolean;
  docked?: boolean; // when true, render as inline pane instead of overlay
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({ isOpen, onClose, contextLabel, contextMarkdown, onReplace, supportsPrompts, docked }) => {
  const { model, options } = useModel();
  const { debug } = useDebug();
  const { prompts } = usePrompts();
  const [chatModel, setChatModel] = useState<string>(model);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<'none' | 'review' | 'single'>('none');
  const [includeTE, setIncludeTE] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen) return;
    const prelude: ChatMessage[] = [
      { role: 'system', content: 'Du bist ein hilfreicher KI-Editor. Du hilfst, den folgenden Markdown-Inhalt gezielt zu verbessern. Antworte präzise, liefere bei Bedarf direkt eine überarbeitete Fassung.' }
    ];
    if (supportsPrompts && selectedPrompt !== 'none') {
      const p = selectedPrompt === 'review' ? prompts.combined : prompts.singleChoice;
      prelude.push({ role: 'system', content: p });
    }
    if (supportsPrompts && includeTE) {
      const te = localStorage.getItem('explanationMarkdown') || '';
      if (te.trim()) prelude.push({ role: 'user', content: `Kontext (TE):\n${te}` });
    }
    prelude.push({ role: 'user', content: `Kontext (${contextLabel}):\n\n${contextMarkdown}` });
    setMessages(prelude);
    setInput('');
    setChatModel(model);
  }, [isOpen, contextLabel, contextMarkdown, model, supportsPrompts, selectedPrompt, includeTE, prompts]);

  useEffect(() => {
    // autoscroll
    viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight });
  }, [messages, isSending]);

  const lastAssistant = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i].content;
    }
    return '';
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isSending) return;
    const toSend: ChatMessage[] = [...messages, { role: 'user', content: input.trim() }];
    setMessages(toSend);
    setIsSending(true);
    try {
      const reply = await sendChat(toSend, chatModel, debug);
      setMessages([...toSend, { role: 'assistant', content: reply }]);
      setInput('');
    } catch (e: any) {
      const msg = e?.message || 'Fehler beim Senden';
      setMessages([...toSend, { role: 'assistant', content: `Fehler: ${msg}` }]);
    } finally {
      setIsSending(false);
    }
  }, [messages, input, chatModel, debug, isSending]);

  const handleReplace = useCallback(() => {
    if (onReplace && lastAssistant.trim()) onReplace(lastAssistant);
  }, [onReplace, lastAssistant]);

  if (!isOpen && docked) return null;

  return (
    <aside className={`${docked ? 'h-full w-full md:w-[520px] flex-shrink-0' : 'fixed right-0 top-0 h-full z-50'} bg-gray-900 border-l border-gray-700 shadow-2xl transition-all duration-300 ${docked ? '' : (isOpen ? 'w-full md:w-[520px]' : 'w-0 overflow-hidden')}`}>
      <div className="flex flex-col h-full">
        <header className="flex items-center justify-between p-3 border-b border-gray-700">
          <div className="flex flex-col">
            <h3 className="text-lg font-bold text-white">AI-Edit</h3>
            <span className="text-xs text-gray-400 truncate max-w-[420px]" title={contextLabel}>{contextLabel}</span>
          </div>
          <div className="flex items-center space-x-2">
            {supportsPrompts && (
              <>
                <label htmlFor="chat-prompt" className="text-xs text-gray-400">Prompt</label>
                <select
                  id="chat-prompt"
                  className="bg-gray-800 text-gray-200 px-2 py-1 rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                  value={selectedPrompt}
                  onChange={(e) => setSelectedPrompt(e.target.value as any)}
                >
                  <option value="none">Keiner</option>
                  <option value="review">Review</option>
                  <option value="single">Single-Choice</option>
                </select>
                <label htmlFor="te-toggle" className="text-xs text-gray-400 ml-2">TE</label>
                <input id="te-toggle" type="checkbox" className="accent-sky-500" checked={includeTE} onChange={(e) => setIncludeTE(e.target.checked)} />
              </>
            )}
            <label htmlFor="chat-model" className="text-xs text-gray-400">Modell</label>
            <select
              id="chat-model"
              className="bg-gray-800 text-gray-200 px-2 py-1 rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
              value={chatModel}
              onChange={(e) => setChatModel(e.target.value)}
              title="Modell für diese AI-Edit Sitzung wählen"
            >
              {options.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
            <button
              onClick={handleReplace}
              disabled={!lastAssistant.trim() || !onReplace}
              className="px-3 py-1 bg-sky-600 text-white rounded-md text-sm disabled:opacity-50"
              title="Letzte KI-Antwort in den Text übernehmen"
            >
              Übernehmen
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 rounded hover:bg-gray-700"
              aria-label="AI-Edit schließen"
            >
              ✕
            </button>
          </div>
        </header>
        <div ref={viewportRef} className="flex-1 overflow-auto p-3 space-y-3">
          {messages.filter(m => m.role !== 'system').map((m, idx) => (
            <div key={idx} className={`max-w-[90%] rounded-lg px-3 py-2 whitespace-pre-wrap ${m.role === 'user' ? 'bg-gray-700 text-gray-100 self-end ml-auto' : 'bg-gray-800 text-gray-200'}`}>
              {m.content}
            </div>
          ))}
          {isSending && <div className="text-sm text-gray-400">Senden...</div>}
        </div>
        <div className="p-3 border-t border-gray-700">
          <div className="flex items-end space-x-2">
            <textarea
              className="flex-1 bg-gray-800 border border-gray-700 rounded-md p-2 text-gray-200 resize-none h-24 focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nachricht an die KI..."
            />
            <button
              onClick={handleSend}
              disabled={isSending || !input.trim()}
              className="h-10 px-4 bg-sky-600 text-white rounded-md disabled:opacity-50"
            >
              Senden
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
