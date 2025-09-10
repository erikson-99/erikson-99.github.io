// utils/textRanges.ts
import { useState, useCallback } from 'react';

export type TextRange = { start: number, end: number };

function isSpace(ch: string) {
  return /\s/.test(ch) || ch === '\u00A0';
}

/** Erzeugt eine normalisierte Sicht auf den String,
    Mehrfachleerzeichen werden zu einem Leerzeichen zusammengezogen,
    liefert zusätzlich eine Abbildung von Normalform zu Originalindizes */
function normalizeWithIndexMap(src: string) {
  const map: number[] = [];
  let norm = '';
  let prevWasSpace = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (isSpace(ch)) {
      if (!prevWasSpace) {
        norm += ' ';
        map.push(i);
        prevWasSpace = true;
      }
    } else {
      norm += ch;
      map.push(i);
      prevWasSpace = false;
    }
  }
  return { norm, map };
}

/** Aggressive Normalisierung für fuzzy Matching:
    - Kleinbuchstaben
    - typografische Anführungszeichen vereinheitlichen
    - Gedankenstriche vereinheitlichen
    - Markdown-Formatierungszeichen entfernen (** * _ ` ~)
    - Mehrfach-Leerzeichen zu einem Leerzeichen
 */
function normalizeForMatchWithIndexMap(src: string) {
  const map: number[] = [];
  let norm = '';
  let prevWasSpace = false;

  const toSimple = (ch: string) => {
    // Normalize quotes and dashes
    if ('“”„”«»‟'.includes(ch)) return '"';
    if ("’‘‚`´ʼʹ＇".includes(ch)) return "'";
    if ('–—−‑‒﹘'.includes(ch)) return '-';
    return ch.toLowerCase();
  };

  // letters/digits incl. German umlauts and ß
  const isWordChar = (ch: string) => /[a-z0-9äöüß]/i.test(ch);

  for (let i = 0; i < src.length; i++) {
    let ch = toSimple(src[i]);
    // Treat non-word chars as space (removes punctuation, markdown markers, etc.)
    if (!isWordChar(ch)) ch = ' ';
    if (isSpace(ch)) {
      if (!prevWasSpace) {
        norm += ' ';
        map.push(i);
        prevWasSpace = true;
      }
    } else {
      norm += ch;
      map.push(i);
      prevWasSpace = false;
    }
  }
  return { norm, map };
}

/** Sucht eine Nadel im Heuhaufen,
    zuerst exakt, dann tolerant gegenüber Leerzeichen und Zeilenumbrüchen */
export function findRange(haystack: string, needle: string): TextRange | null {
  const sanitize = (s: string) => {
    let out = s.trim();
    // Remove trailing ellipsis variants and trailing punctuation/quotes/brackets
    out = out.replace(/\s*(?:…|\.\.\.)\s*$/u, '');
    out = out.replace(/[\s\)\]\}"'»]+$/u, '');
    return out;
  };
  const needleClean = sanitize(needle);
  // exakter Treffer
  const i = haystack.indexOf(needleClean);
  if (i >= 0) return { start: i, end: i + needle.length };

  // toleranter Treffer
  const { norm: H, map } = normalizeWithIndexMap(haystack);
  const { norm: N } = normalizeWithIndexMap(needleClean);

  const k = H.indexOf(N);
  if (k < 0) return null;

  const start = map[k];
  const end = map[Math.min(k + N.length - 1, map.length - 1)] + 1;
  if (start !== undefined && end !== undefined) return { start, end };

  // aggressive fuzzy pass
  const A = normalizeForMatchWithIndexMap(haystack);
  const B = normalizeForMatchWithIndexMap(needleClean);
  const k2 = A.norm.indexOf(B.norm);
  if (k2 < 0) return null;
  const start2 = A.map[k2];
  const end2 = A.map[Math.min(k2 + B.norm.length - 1, A.map.length - 1)] + 1;
  return { start: start2, end: end2 };
}

export function replaceRange(src: string, r: TextRange, replacement: string) {
  return src.slice(0, r.start) + replacement + src.slice(r.end);
}

// Fix: Support lazy initialization by accepting a function for the initial state.
export const useUndoableState = <T>(initialState: T | (() => T)) => {
  const [history, setHistory] = useState<{
    past: T[];
    present: T;
    future: T[];
  }>(() => {
    const present =
      typeof initialState === 'function'
        ? (initialState as () => T)()
        : initialState;
    return {
      past: [],
      present,
      future: [],
    };
  });

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const undo = useCallback(() => {
    if (!canUndo) return;
    setHistory(currentHistory => {
      const { past, present, future } = currentHistory;
      const newPast = past.slice(0, past.length - 1);
      const newPresent = past[past.length - 1];
      const newFuture = [present, ...future];
      return { past: newPast, present: newPresent, future: newFuture };
    });
  }, [canUndo]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    setHistory(currentHistory => {
      const { past, present, future } = currentHistory;
      const newPast = [...past, present];
      const newPresent = future[0];
      const newFuture = future.slice(1);
      return { past: newPast, present: newPresent, future: newFuture };
    });
  }, [canRedo]);

  const setState = useCallback((newState: T | ((prevState: T) => T)) => {
    setHistory(currentHistory => {
      const { past, present } = currentHistory;
      
      const newPresent = typeof newState === 'function' 
        ? (newState as (prevState: T) => T)(present) 
        : newState;

      if (newPresent === present) {
        return currentHistory;
      }
      
      const newPast = [...past, present];
      return { past: newPast, present: newPresent, future: [] };
    });
  }, []);

  const resetState = useCallback((newState: T) => {
    setHistory({
        past: [],
        present: newState,
        future: []
    });
  }, []);


  return {
    state: history.present,
    setState,
    resetState,
    undo,
    redo,
    canUndo,
    canRedo,
  };
};
