import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Prompts, PromptDefinition } from '../types';
import { useUndoableState } from '../services/utils/textRanges';
import {
  defaultSingleChoicePrompt,
  defaultMultiSingleChoicePrompt,
  builtinCustomPrompts,
} from '../prompts/defaultPrompts';

const DEFAULT_COMBINED_PROMPT = `
Du prüfst Ausbildungsinhalte mit drei Perspektiven gleichzeitig: (1) Fachliche Richtigkeit, (2) Sprache (Rechtschreibung, Grammatik, Zeichensetzung), (3) simpleclub-Guidelines (Stil-Vorgaben).

Arbeitsweise:
- Prüfe den kompletten gelieferten Text/Markdown.
- Finde konkrete, umschriebene Stellen; zitiere den ORIGINALAUSSCHNITT exakt in "original".
- Schlage eine präzise KORREKTUR in "suggestion" vor, markiere Schlüsswörter ggf. fett und nutze niemals Gedankenstricht ("–")
- Erkläre kurz WARUM in "explanation".
- Für fachliche Punkte: optional "sources" (Array mit vertrauenswürdigen URLs) hinzufügen.

Für jeden gefundenen Fehler, gib ein JSON-Objekt mit den Feldern "original", "suggestion", "explanation" und "sources" zurück. "original" ist der exakte, fehlerhafte Textausschnitt samt formatierung (fettgeschrieben, kursiv). "suggestion" ist der korrigierte Text; Markiere Schlüsselbegriffe ggf. fett.  "explanation" ist eine kurze Begründung. "sources" ist ein Array mit URLs zu verlässlichen Quellen (Fachliteratur, Normen, etc.), die deine Korrektur belegen.


Antwortformat (AUSNAHMSLOS NUR JSON):
{
  "fachlich": [ { "original": string, "suggestion": string, "explanation": string, "sources"?: string[] }, ... ],
  "sprachlich": [ { "original": string, "suggestion": string, "explanation": string }, ... ],
  "guidelines": [ { "original": string, "suggestion": string, "explanation": string }, ... ]
}

Wenn es nichts zu bemängeln gibt, gib leere Arrays zurück. Keine zusätzlichen Texte oder Erklärungen außerhalb des JSON.

Beispielausgabe (als reiner Text, kein Markdown-Codeblock):
{
  "fachlich": [
    {
      "original": "Hartlöten beginnt bei 400°C.",
      "suggestion": "Hartlöten beginnt ab 450°C Löttemperatur.",
      "explanation": "Falsche Faktengrenze: Hartlöten ist gemäß gängiger Definitionen ab 450°C definiert.",
      "sources": ["https://de.wikipedia.org/wiki/L%C3%B6ten"]
    }
  ],
  "sprachlich": [
    {
      "original": "Der Kapillareffekt funktioniert optimal bei 0,05-0,2mm.",
      "suggestion": "Die Kapillarwirkung funktioniert optimal bei 0,05–0,2 mm.",
      "explanation": "Begriffsanpassung (Kapillarwirkung), Gedankenstrich vermeiden, geschütztes Leerzeichen vor Einheit."
    }
  ],
  "guidelines": [
    {
      "original": "Man sollte hier die Rohre löten.",
      "suggestion": "Du solltest hier die Rohre löten.",
      "explanation": "Guideline: direkte Ansprache mit ‚du‘; ‚man‘ vermeiden."
    }
  ]
}
`;

const DEFAULT_SINGLE_CHOICE_PROMPT = defaultSingleChoicePrompt;

const defaultPrompts: Prompts = {
  combined: DEFAULT_COMBINED_PROMPT.trim(),
  singleChoice: DEFAULT_SINGLE_CHOICE_PROMPT.trim(),
  multiSingleChoice: defaultMultiSingleChoicePrompt.trim(),
  custom: builtinCustomPrompts.map((p) => ({ ...p })),
};

interface PromptsContextType {
  prompts: Prompts;
  setPrompts: (newState: Prompts | ((prevState: Prompts) => Prompts)) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const PromptsContext = createContext<PromptsContextType | undefined>(undefined);

export const PromptsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const {
    state: prompts,
    setState: setPrompts,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useUndoableState<Prompts>(() => {
    try {
      const savedPrompts = localStorage.getItem('editorPrompts');
      if (savedPrompts) {
        const parsed = JSON.parse(savedPrompts);
        if (parsed && typeof parsed === 'object') {
            const sanitize = (entries: any[]): PromptDefinition[] => {
              if (!Array.isArray(entries)) return [];
              return entries
                .filter((entry): entry is PromptDefinition =>
                  entry && typeof entry.id === 'string' && typeof entry.title === 'string' && typeof entry.content === 'string'
                )
                .map((entry) => ({ ...entry }));
            };

            const savedCustom = sanitize(parsed.custom ?? []);
            const mergedMap = new Map<string, PromptDefinition>();
            builtinCustomPrompts.forEach((prompt) => {
              mergedMap.set(prompt.id, { ...prompt });
            });
            savedCustom.forEach((prompt) => {
              mergedMap.set(prompt.id, { ...mergedMap.get(prompt.id), ...prompt } as PromptDefinition);
            });

            return {
              combined: parsed.combined ?? defaultPrompts.combined,
              singleChoice: parsed.singleChoice ?? defaultPrompts.singleChoice,
              multiSingleChoice: parsed.multiSingleChoice ?? defaultPrompts.multiSingleChoice,
              custom: Array.from(mergedMap.values()),
            } as Prompts;
        }
      }
    } catch (error) {
      console.error("Could not parse prompts from localStorage", error);
    }
    return defaultPrompts;
  });

  useEffect(() => {
    localStorage.setItem('editorPrompts', JSON.stringify(prompts));
  }, [prompts]);

  return (
    <PromptsContext.Provider value={{ prompts, setPrompts, undo, redo, canUndo, canRedo }}>
      {children}
    </PromptsContext.Provider>
  );
};

export const usePrompts = (): PromptsContextType => {
  const context = useContext(PromptsContext);
  if (!context) {
    throw new Error('usePrompts must be used within a PromptsProvider');
  }
  return context;
};
