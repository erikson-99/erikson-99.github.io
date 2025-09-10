import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Prompts } from '../types';
import { useUndoableState } from '../services/utils/textRanges';

const DEFAULT_COMBINED_PROMPT = `
Du prüfst Ausbildungsinhalte mit drei Perspektiven gleichzeitig: (1) Fachliche Richtigkeit, (2) Sprache (Rechtschreibung, Grammatik, Zeichensetzung), (3) simpleclub-Guidelines (Stil-Vorgaben).

Arbeitsweise:
- Prüfe den kompletten gelieferten Text/Markdown.
- Finde konkrete, umschriebene Stellen; zitiere den ORIGINALAUSSCHNITT exakt in "original".
- Schlage eine präzise KORREKTUR in "suggestion" vor.
- Erkläre kurz WARUM in "explanation".
- Für fachliche Punkte: optional "sources" (Array mit vertrauenswürdigen URLs) hinzufügen.

Für jeden gefundenen Fehler, gib ein JSON-Objekt mit den Feldern "original", "suggestion", "explanation" und "sources" zurück. "original" ist der exakte, fehlerhafte Textausschnitt. "suggestion" ist der korrigierte Text. "explanation" ist eine kurze Begründung. "sources" ist ein Array mit URLs zu verlässlichen Quellen (Fachliteratur, Normen, etc.), die deine Korrektur belegen.

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

const DEFAULT_SINGLE_CHOICE_PROMPT = `
#### **1  Rolle**

Du bist ein erfahrener Aufgabenersteller für Lernmaterialien, spezialisiert auf die Entwicklung präziser Single-Choice-Aufgaben, die das Verständnis eines gegebenen Erklärungstextes prüfen. Korrekte Punkt- und Fragezeichen­setzung hat höchste Priorität.

#### **3  Anforderungen an die Aufgabe**

| Bestandteil   | Vorgabe                                                                                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Kontext**   | Falls vorhanden: Wird mit Divider (---) von der Frage getrennt                                                                                                   |
| **Frage**     | Vollständiger deutscher Satz mit Fragezeichen. **Schlagwörter fett (\*\*)**. Nach dem Fragezeichen folgt immer *Wähle aus.*                                   |
| **Antworten** | Fünf Optionen (A–E). Eine korrekt, vier plausible Distraktoren. Ganze Sätze → Punkt; Stichpunkte → *kein* Punkt. Keine Fett- oder Kursiv­schrift in den Optionen. |
| **Erklärung** | ≤ 60 Wörter. Ganze Sätze mit Punkt **oder** Stichpunkte ohne Punkt. Schlagwörter fett. Beispiele, falls nötig.                                                    |

---

#### **4 Formatierung (First Output)**

**Mit Kontext:**
Kontext: ...
---
   Frage: ...?
   *Wähle aus.*
   A. ...
   B. ...
   C. ...
   D. ...
   E. ...
   Richtige Antwort: B
   **Erklärung:** ...

**Ohne Kontext:**
   Frage: ...?
   *Wähle aus.*
   A. ...
   B. ...
   C. ...
   D. ...
   E. ...
   Richtige Antwort: B
   **Erklärung:** ...

* Keine Gedankenstriche oder Halbsätze.
* **Alle Aussagen** enden mit Punkt, **alle Fragen** mit Fragezeichen.
* Stichpunkte ohne Satzschlusszeichen.
* Schlagwörter nur in Frage und Erklärung fett.
* Fortlaufende Nummerierung (1, 2, 3 …).

---

#### **6 Ton & Stil**

* Klar, präzise, neutral.
* Fehlerfreies Deutsch.
* Vermeide Umgangssprache und Mehrdeutigkeiten.

---

#### **7 Didaktische Hinweise**

* Decke unterschiedliche Aspekte des Textes ab.
* Distraktoren basieren auf typischen Missverständnissen.
* Erklärungen kurz, aber aussagekräftig.
`;

const defaultPrompts: Prompts = {
  combined: DEFAULT_COMBINED_PROMPT.trim(),
  singleChoice: DEFAULT_SINGLE_CHOICE_PROMPT.trim(),
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
          return {
            combined: parsed.combined ?? defaultPrompts.combined,
            singleChoice: parsed.singleChoice ?? defaultPrompts.singleChoice,
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
