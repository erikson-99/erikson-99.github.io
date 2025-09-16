import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type ContextItem = {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
};

const ITEMS_KEY = 'contextItems';
const LEGACY_KEY = 'contextMarkdown';

function loadItems(): ContextItem[] {
  try {
    const raw = localStorage.getItem(ITEMS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // Legacy migration
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy && legacy.trim()) {
    const now = Date.now();
    const migrated: ContextItem[] = [{ id: `ctx-${now}`, title: 'Kontext', content: legacy, createdAt: now, updatedAt: now }];
    localStorage.setItem(ITEMS_KEY, JSON.stringify(migrated));
    return migrated;
  }
  return [];
}

function saveItems(items: ContextItem[]) {
  localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  // Keep combined cache for AIChatPanel (backward compat)
  const combined = items.map(i => `# ${i.title}\n\n${i.content.trim()}`).join('\n\n---\n\n');
  localStorage.setItem(LEGACY_KEY, combined);
}

export const ContextManager: React.FC = () => {
  const [items, setItems] = useState<ContextItem[]>(() => loadItems());
  const [selectedId, setSelectedId] = useState<string | null>(() => (loadItems()[0]?.id ?? null));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [info, setInfo] = useState('');

  const selected = useMemo(() => items.find(i => i.id === selectedId) || null, [items, selectedId]);
  const text = selected?.content ?? '';

  useEffect(() => { saveItems(items); }, [items]);

  const newItem = useCallback((title?: string) => {
    const now = Date.now();
    const item: ContextItem = { id: `ctx-${now}`, title: title || `Element ${items.length + 1}`, content: '', createdAt: now, updatedAt: now };
    setItems(prev => [item, ...prev]);
    setSelectedId(item.id);
  }, [items.length]);

  const renameItem = useCallback((id: string, title: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, title, updatedAt: Date.now() } : i));
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    if (selectedId === id) setSelectedId(prev => (items.find(i => i.id !== id)?.id ?? null));
  }, [selectedId, items]);

  const updateContent = useCallback((id: string, content: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, content, updatedAt: Date.now() } : i));
  }, []);

  const handleCopyAll = useCallback(async () => {
    const combined = items.map(i => `# ${i.title}\n\n${i.content.trim()}`).join('\n\n---\n\n');
    try { await navigator.clipboard.writeText(combined); setInfo('Alle Elemente kopiert.'); setTimeout(()=>setInfo(''),1500);} catch {}
  }, [items]);

  const handlePickFiles = useCallback(() => {
    if (fileInputRef.current) {
      // Reset value so selecting the same file twice still triggers onChange
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, []);

  // Lazy PDF text extractor using PDF.js via ESM CDN
  const extractPdfText = async (file: File): Promise<string> => {
    try {
      const buf = await file.arrayBuffer();
      // @ts-ignore dynamic import of pdfjs from CDN
      const pdfjsLib = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.mjs');
      // Some builds require workerSrc; with ESM build it's embedded. Fallback if needed is ignored.
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      let out = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const textItems = content.items || [];
        const pageText = textItems.map((it: any) => (it.str || '')).join(' ');
        out += `\n\n---\n# Seite ${i}\n\n` + pageText;
      }
      return out.trim();
    } catch (e) {
      console.error('PDF konnte nicht gelesen werden:', file.name, e);
      return '';
    }
  };

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || !files.length) { setInfo('Keine Dateien ausgewählt.'); setTimeout(()=>setInfo(''),1500); return; }
    const allowed = ['text/plain', 'text/markdown', 'application/json', 'application/pdf'];
    const newOnes: ContextItem[] = [];
    for (const f of Array.from(files)) {
      try {
        const isPdf = (f.type || '').includes('application/pdf') || /\.pdf$/i.test(f.name);
        const typeOk = allowed.some(t => (f.type || '').indexOf(t) >= 0) || /\.(md|markdown|txt|json|pdf)$/i.test(f.name);
        if (!typeOk) continue;
        const content = isPdf ? await extractPdfText(f) : (await f.text()).trim();
        if (!content) continue;
        const now = Date.now() + Math.floor(Math.random()*1000);
        newOnes.push({ id: `ctx-${now}`, title: f.name, content, createdAt: now, updatedAt: now });
      } catch (e) {
        console.error('Datei konnte nicht gelesen werden:', f.name, e);
      }
    }
    if (newOnes.length) {
      setItems(prev => [...newOnes, ...prev]);
      setSelectedId(newOnes[0].id);
      setInfo(`${newOnes.length} Datei(en) importiert.`);
      setTimeout(()=>setInfo(''),1500);
    } else {
      setInfo('Keine unterstützten Dateien gefunden (.md, .txt, .json).');
      setTimeout(()=>setInfo(''),2500);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }, [handleFiles]);
  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); }, []);

  const lengthInfo = useMemo(() => `${(text || '').length} Zeichen`, [text]);

  return (
    <div className="h-full flex bg-gray-800">
      {/* Sidebar */}
      <aside className="w-72 bg-gray-900 border-r border-gray-700 flex flex-col">
        <div className="p-3 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Gespeichert</h3>
          <button onClick={() => newItem()} className="px-2 py-1 bg-emerald-600 text-white rounded text-sm">Neu</button>
        </div>
        <div className="p-2 space-y-2 overflow-auto">
          {items.length === 0 && <div className="text-gray-400 text-sm">Noch keine Elemente.</div>}
          {items.map(it => (
            <div key={it.id} className={`p-2 rounded border ${selectedId === it.id ? 'border-sky-500 bg-gray-800' : 'border-gray-700 bg-gray-800/60'} flex items-center justify-between`}>
              <button onClick={() => setSelectedId(it.id)} className="text-left text-sm text-gray-200 truncate pr-2 flex-1">
                {it.title}
              </button>
              <button onClick={() => renameItem(it.id, prompt('Neuer Titel:', it.title) || it.title)} className="px-2 py-1 text-xs bg-gray-700 text-white rounded mr-1">Umben.</button>
              <button onClick={() => deleteItem(it.id)} className="px-2 py-1 text-xs bg-red-600 text-white rounded">Löschen</button>
            </div>
          ))}
        </div>
        <div className="mt-auto p-2 border-t border-gray-700">
          <button onClick={handlePickFiles} className="w-full px-3 py-2 bg-gray-700 text-white rounded-md text-sm hover:bg-gray-600 mb-2">Datei(en) importieren</button>
          <input ref={fileInputRef} type="file" multiple accept=".md,.markdown,.txt,.json,.pdf,text/plain,text/markdown,application/json,application/pdf" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          <button onClick={handleCopyAll} className="w-full px-3 py-2 bg-gray-700 text-white rounded-md text-sm hover:bg-gray-600">Alle kopieren</button>
        </div>
      </aside>

      {/* Editor + Preview */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2">
        <div className="p-3 border-r border-gray-700" onDrop={onDrop} onDragOver={onDragOver}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-xl font-bold text-white">{selected?.title || 'Kein Element ausgewählt'}</h2>
              <span className="text-xs text-gray-400">{lengthInfo}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => selected && updateContent(selected.id, '')} className="px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-500">Leeren</button>
              <button onClick={() => selected && renameItem(selected.id, prompt('Neuer Titel:', selected.title) || selected.title)} className="px-3 py-1 bg-gray-700 text-white rounded-md text-sm hover:bg-gray-600">Umbenennen</button>
            </div>
          </div>
          <textarea
            className="w-full h-[70vh] bg-gray-800 border border-gray-700 rounded-md p-3 text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-sky-500"
            value={text}
            onChange={(e) => selected && updateContent(selected.id, e.target.value)}
            placeholder="Markdown/Text hier eingeben oder Dateien per Drag & Drop ablegen..."
          />
          {info && <div className="mt-2 text-sm text-gray-400">{info}</div>}
        </div>
        <div className="p-3 bg-gray-900 overflow-auto">
          <h3 className="text-lg font-semibold text-sky-300 mb-2">Vorschau</h3>
          <pre className="text-sm text-gray-200 whitespace-pre-wrap">{text}</pre>
        </div>
      </div>
    </div>
  );
};

export default ContextManager;
