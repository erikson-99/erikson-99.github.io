import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type ModelOption = { id: string; label: string };

interface ModelContextType {
  model: string;
  setModel: (id: string) => void;
  options: ModelOption[];
}

const DEFAULT_OPTIONS: ModelOption[] = [
  // OpenAI
  { id: 'openai/gpt-5', label: 'ChatGPT5 Thinking' },
  { id: 'openai/gpt-5-chat', label: 'ChatGPT5' },
  // Anthropic
  { id: 'anthropic/claude-3.7-sonnet', label: 'Claude Sonnet 4.1' }, // closest available; 4.1 Sonnet not listed
  { id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4' },
  // Google
  { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
];

const ModelContext = createContext<ModelContextType | undefined>(undefined);

// Map legacy or invalid IDs to known-good ones
const LEGACY_MODEL_MAP: Record<string, string> = {
  'openai/chatgpt-5o-thinking': 'openai/gpt-5',
  'openai/chatgpt-5o': 'openai/gpt-5-chat',
  'anthropic/claude-4.1-sonnet': 'anthropic/claude-3.7-sonnet',
  'anthropic/claude-4-sonnet': 'anthropic/claude-sonnet-4',
  'google/gemini-2.5pro': 'google/gemini-2.5-pro',
  'google/gemini-2.5flash': 'google/gemini-2.5-flash',
};

const normalizeModel = (id: string, allowed: string[], fallback: string) => {
  const mapped = LEGACY_MODEL_MAP[id] || id;
  return allowed.includes(mapped) ? mapped : fallback;
};

export const ModelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const allowed = DEFAULT_OPTIONS.map(o => o.id);
  const envDefault = ((import.meta as any).env?.VITE_OPENROUTER_MODEL as string) || 'google/gemini-2.5-flash';
  const defaultModel = normalizeModel(envDefault, allowed, 'google/gemini-2.5-flash');
  const [model, setModel] = useState<string>(() => {
    const stored = localStorage.getItem('openrouter:model');
    return normalizeModel(stored || defaultModel, allowed, defaultModel);
  });

  useEffect(() => {
    localStorage.setItem('openrouter:model', model);
  }, [model]);

  const safeSetModel = (id: string) => setModel(normalizeModel(id, allowed, defaultModel));

  const value = useMemo(() => ({ model, setModel: safeSetModel, options: DEFAULT_OPTIONS }), [model]);
  return <ModelContext.Provider value={value}>{children}</ModelContext.Provider>;
};

export const useModel = (): ModelContextType => {
  const ctx = useContext(ModelContext);
  if (!ctx) throw new Error('useModel must be used within a ModelProvider');
  return ctx;
};
