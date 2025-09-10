import { CheckResults, Prompts } from '../types';


export const runChecks = async (
  taskMarkdown: string,
  prompts: Prompts,
  modelOverride?: string,
  debug?: boolean
): Promise<CheckResults> => {
  const proxyUrl = (import.meta as any).env?.VITE_PROXY_URL as string | undefined;
  const baseUrl = ((import.meta as any).env?.VITE_OPENROUTER_BASE_URL as string) || 'https://openrouter.ai/api/v1';
  const model = modelOverride || ((import.meta as any).env?.VITE_OPENROUTER_MODEL as string) || 'google/gemini-2.5-flash';
  const promptContent = `Hier ist die Aufgabe, die du prüfen sollst:\n\n---\n\n${taskMarkdown}`;
  try {
    const systemInstruction = `Du bist ein professioneller Korrektor und Fachprüfer für Ausbildungsinhalte. Du prüfst jeden gelieferten Text gleichzeitig in drei Kategorien: fachlich, sprachlich (Rechtschreibung, Grammatik, Zeichensetzung) und simpleclub-Guidelines.\n\nFür jeden gefundenen Fehler, gib ein JSON-Objekt mit den Feldern "original", "suggestion", "explanation" und "sources" zurück. "original" ist der exakte, fehlerhafte Textausschnitt. "suggestion" ist der korrigierte Text. "explanation" ist eine kurze Begründung. "sources" ist ein Array mit URLs zu verlässlichen Quellen (Fachliteratur, Normen, etc.), die deine Korrektur belegen.\n\nGib AUSSCHLIESSLICH EIN EINZIGES JSON-OBJEKT mit genau diesen Schlüsseln zurück: {\n  "fachlich": [ { "original": string, "suggestion": string, "explanation": string, "sources": string[] }, ... ],\n  "sprachlich": [ { "original": string, "suggestion": string, "explanation": string, "sources": string[] }, ... ],\n  "guidelines": [ { "original": string, "suggestion": string, "explanation": string, "sources": string[] }, ... ]\n}\nWenn es nichts zu bemängeln gibt, gib leere Arrays zurück. Keine Einleitung oder Nachsätze. Kein Markdown-Codeblock (keine \u0060\u0060\u0060).`;

    const body = {
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: systemInstruction
        },
        { role: 'user', content: promptContent }
      ]
    } as const;

    if (debug) {
      // Attach to window for inspection and log to console
      try { (window as any).__lastOpenRouterRequest = { url: `${baseUrl}/chat/completions`, model, body }; } catch {}
      console.info('[DEBUG] OpenRouter model', model);
      console.info('[DEBUG] OpenRouter request', body);
    }

    const targetUrl = proxyUrl || `${baseUrl}/chat/completions`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (!proxyUrl) {
      const clientKey = (import.meta as any).env?.VITE_OPENROUTER_API_KEY as string | undefined;
      if (!clientKey) {
        throw new Error('Kein Proxy konfiguriert und VITE_OPENROUTER_API_KEY fehlt. Für Production bitte einen Proxy nutzen.');
      }
      headers['Authorization'] = `Bearer ${clientKey}`;
    }

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const text = await res.text();
      if (debug) {
        try { (window as any).__lastOpenRouterResponse = text; } catch {}
        console.info('[DEBUG] OpenRouter HTTP error', res.status, text);
      }
      throw new Error(`OpenRouter HTTP ${res.status}: ${text}`);
    }

    const data = await res.json();
    if (debug) {
      try { (window as any).__lastOpenRouterResponse = data; } catch {}
      console.info('[DEBUG] OpenRouter response (raw)', data);
    }
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    const parsed = content ? JSON.parse(content) : {};

    const coerceString = (v: any): string => (typeof v === 'string' ? v : v == null ? '' : String(v));

    const deriveOriginalFromContext = (orig: string, expl: string, sugg: string): string => {
      const o = (orig || '').trim();
      // Consider these as generic labels that shouldn't be shown as the original snippet
      const generic = [
        'Aufgabenstellung', 'Lösungserklärung', 'Alt-Text', 'Alt Text', 'Abschnitt'
      ];
      const isGeneric = (s: string) =>
        !s || s.length < 8 || generic.includes(s) || /^Aufgabe\s*\d+$/i.test(s);

      if (!isGeneric(o)) return o;

      // Try to extract a quoted snippet from the explanation first
      const quoteRegexes = [
        /"([^"]{8,200})"/,           // "..."
        /„([^“]{8,200})“/,             // „…“
        /‚([^’]{8,200})’/,             // ‚…’
        /'([^']{8,200})'/              // '...'
      ];
      for (const rx of quoteRegexes) {
        const m = expl.match(rx);
        if (m && m[1]) {
          const snippet = m[1].trim();
          if (taskMarkdown.includes(snippet)) return snippet;
        }
      }

      // If the explanation itself is an exact snippet from the markdown, use it
      if (expl && expl.length >= 8 && expl.length <= 400 && taskMarkdown.includes(expl)) {
        return expl;
      }

      // Keyword-based fallback: pick a line from the markdown containing salient tokens
      const mkTokens = (text: string) =>
        (text || '')
          .toLowerCase()
          .replace(/[^a-zäöüß0-9\s-]/gi, ' ')
          .split(/\s+/)
          .filter(w => w.length >= 6);

      const tokens = Array.from(new Set([...mkTokens(expl), ...mkTokens(sugg)])).slice(0, 6);
      if (tokens.length) {
        const lines = taskMarkdown.split('\n').map(l => l.trim()).filter(Boolean);
        let bestLine = '';
        let bestScore = 0;
        for (const line of lines) {
          const lower = line.toLowerCase();
          let score = 0;
          for (const t of tokens) if (lower.includes(t)) score++;
          if (score > bestScore) { bestScore = score; bestLine = line; }
        }
        if (bestScore > 0 && bestLine) return bestLine;
      }

      return o; // fallback to whatever we had
    };

    const mapItem = (item: any) => {
      let original = coerceString(item?.original ?? item?.Stelle ?? item?.Original ?? item?.Abschnitt ?? item?.Aufgabe ?? '');
      const suggestion = coerceString(item?.suggestion ?? item?.Lösungsvorschlag ?? item?.Korrektur ?? '');
      const explanation = coerceString(item?.explanation ?? item?.Fehlerbeschreibung ?? item?.Begründung ?? '');
      original = deriveOriginalFromContext(original, explanation, suggestion);
      const sources = Array.isArray(item?.sources)
        ? item.sources
        : Array.isArray(item?.Quellen)
        ? item.Quellen
        : undefined;
      return { original, suggestion, explanation, ...(sources ? { sources } : {}) };
    };

    const normalize = (val: any): CheckResults => {
      // Already in correct shape
      if (val && typeof val === 'object' && (
        Array.isArray((val as any).fachlich) ||
        Array.isArray((val as any).sprachlich) ||
        Array.isArray((val as any).guidelines)
      )) {
        const f = Array.isArray((val as any).fachlich) ? (val as any).fachlich.map(mapItem) : [];
        const s = Array.isArray((val as any).sprachlich) ? (val as any).sprachlich.map(mapItem) : [];
        const g = Array.isArray((val as any).guidelines) ? (val as any).guidelines.map(mapItem) : [];
        return { fachlich: f, sprachlich: s, guidelines: g };
      }
      // Common alternative: top-level { errors: [...] }
      if (val && typeof val === 'object' && Array.isArray((val as any).errors)) {
        return { fachlich: (val as any).errors.map(mapItem), sprachlich: [], guidelines: [] };
      }
      // Fallback: array of objects with German keys
      if (Array.isArray(val)) {
        const mapped = val.map(mapItem);
        return { fachlich: mapped, sprachlich: [], guidelines: [] };
      }
      return { fachlich: [], sprachlich: [], guidelines: [] };
    };

    const normalized = normalize(parsed);
    if (debug) {
      console.info('[DEBUG] OpenRouter parsed content', parsed);
      console.info('[DEBUG] Normalized CheckResults', normalized);
    }
    return normalized;
  } catch (error) {
    console.error('OpenRouter API error or JSON parsing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    if (debug) {
      console.info('[DEBUG] OpenRouter caught error', errorMessage);
    }
    return {
      fachlich: [{ original: 'Fehler', suggestion: 'Prüfung fehlgeschlagen', explanation: `Die KI-Prüfung konnte nicht abgeschlossen werden: ${errorMessage}` }],
      sprachlich: [],
      guidelines: []
    };
  }
};
