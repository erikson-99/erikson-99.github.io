import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { MarkdownView } from './MarkdownView';
import { ExplanationPreview } from './ExplanationPreview';
import { runChecks } from '../services/openrouterService';
import { CheckResults, ActionableError, ExplanationSection } from '../types';
import { CheckResultsPanel } from './CheckResultsPanel';
import { Spinner } from './Spinner';
import { ToggleSwitch } from './ToggleSwitch';
import { AIChatPanel } from './AIChatPanel';
import { parseMarkdownToExplanationSections } from '../services/parser';
import { findRange, replaceRange, TextRange, useUndoableState } from '../services/utils/textRanges';
import { usePrompts } from '../contexts/PromptsContext';
import { useModel } from '../contexts/ModelContext';
import { useDebug } from '../contexts/DebugContext';

const INITIAL_EXPLANATION_MARKDOWN = `Stell dir vor, du installierst eine neue **Heizungsanlage** und musst **Kupferrohre** miteinander verbinden. Die Verbindung muss nicht nur dicht sein, sondern auch hohen **Temperaturen** und **Drücken** standhalten. Hier kommt das **Hartlöten** ins Spiel – ein Verfahren, das dir ermöglicht, extrem belastbare und dauerhafte Verbindungen zu schaffen.

**Hartlöten** ist ein **Fügeverfahren**, bei dem **Metallteile** durch ein geschmolzenes **Lot** mit einem **Schmelzpunkt** über **450°C** dauerhaft miteinander verbunden werden, ohne dass die **Grundwerkstoffe** selbst schmelzen.

---

# **Hartlöten vs. Weichlöten**

Der entscheidende Unterschied liegt in der **Arbeitstemperatur** und der resultierenden **Festigkeit**. Die wichtigsten Unterschiede im Überblick:

**Weichlöten:**
* **Arbeitstemperatur** unter **450°C**
* Geeignet für **Elektroinstallationen** und wenig belastete Verbindungen
* **Festigkeit** begrenzt
* **Temperaturbeständigkeit** nur bis etwa **100°C**

**Hartlöten:**
* **Arbeitstemperatur** zwischen **450°C** und **900°C**
* Mechanisch hochbelastbare **Verbindungen**
* **Temperaturbeständigkeit** bis **200°C** und mehr
* Bei **Trinkwasserleitungen** ab **28 mm Durchmesser** vorgeschrieben

**Beispiel aus der Praxis:** Bei einer **Solaranlage** auf dem Dach müssen die **Kupferrohre** sowohl den hohen **Temperaturen** des **Solarfluids** als auch den **Drücken** im System standhalten. **Weichlötverbindungen** würden hier versagen, während **hartgelötete** Verbindungen jahrzehntelang zuverlässig funktionieren.
`;

// --- Local Components for the new structure ---

const StatusIndicator: React.FC<{ results: CheckResults | null | undefined }> = ({ results }) => {
    if (results === undefined) return null; 
    if (results === null) return null; 

    const hasErrors = results.fachlich.length > 0 || results.sprachlich.length > 0 || results.guidelines.length > 0;

    if (hasErrors) {
        return <span className="w-3 h-3 bg-yellow-400 rounded-full flex-shrink-0" title="Fehler gefunden"></span>;
    }

    return <span className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0" title="Geprüft & fehlerfrei"></span>;
};

interface ExplanationSidebarProps {
  sections: ExplanationSection[];
  onSectionSelect: (sectionId: string) => void;
  selectedSectionId: string | null;
  onCheckAll: () => void;
  isChecking: boolean;
  checkResults: Record<string, CheckResults | null> | null;
  onPasteFromClipboard: () => void;
  onCopyToClipboard: () => void;
}

const ExplanationSidebar: React.FC<ExplanationSidebarProps> = ({ sections, onSectionSelect, selectedSectionId, onCheckAll, isChecking, checkResults, onPasteFromClipboard, onCopyToClipboard }) => {
  return (
    <aside className="w-72 bg-gray-900 border-r border-gray-700 flex flex-col shadow-lg">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold text-white">Abschnitte</h1>
        <span className="text-sm text-gray-400">{sections.length} Abschnitte geladen</span>
         <div className="mt-4 space-y-2">
            <button
                onClick={onCheckAll}
                disabled={isChecking}
                className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
                {isChecking ? <Spinner /> : null}
                Alle Abschnitte prüfen
            </button>
            <button
                onClick={onPasteFromClipboard}
                className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
                title="Inhalt aus der Zwischenablage einfügen"
            >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Einfügen
            </button>
            <button
                onClick={onCopyToClipboard}
                className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
                title="Markdown in die Zwischenablage kopieren"
            >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Kopieren
            </button>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto">
        <ul className="p-2">
          {sections.map((section) => (
            <li key={section.id}>
              <button
                onClick={() => onSectionSelect(section.id)}
                className={`w-full text-left px-4 py-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  section.id === selectedSectionId
                    ? 'bg-sky-700 text-white'
                    : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                }`}
                aria-current={section.id === selectedSectionId ? 'page' : undefined}
              >
                <div className="flex justify-between items-center">
                    <span className="truncate pr-2">{section.title}</span>
                    <StatusIndicator results={checkResults?.[section.id]} />
                </div>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};


interface ExplanationViewerProps {
  section: ExplanationSection | null;
  viewMode: 'preview' | 'markdown';
  setViewMode: (mode: 'preview' | 'markdown') => void;
  sectionMarkdown: string;
  onSectionMarkdownChange: (markdown: string) => void;
  onCheckSection: () => void;
  onOpenAIEdit: () => void;
  isChecking: boolean;
  highlightedRange: TextRange | null;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const ExplanationViewer: React.FC<ExplanationViewerProps> = ({
  section,
  viewMode,
  setViewMode,
  sectionMarkdown,
  onSectionMarkdownChange,
  onCheckSection,
  onOpenAIEdit,
  isChecking,
  highlightedRange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) => {
  return (
    <div className="flex-1 flex flex-col bg-gray-800">
      <header className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-700 shadow-md z-10">
        <h2 className="text-2xl font-bold text-white truncate pr-4">
          {section ? section.title : (viewMode === 'preview' ? 'Vorschau' : 'Markdown Editor')}
        </h2>
        <div className="flex items-center space-x-4 flex-shrink-0">
          <button
            onClick={onOpenAIEdit}
            disabled={!section}
            className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            AI-Edit
          </button>
          <button
            onClick={onCheckSection}
            disabled={isChecking || !section}
            className="flex items-center justify-center px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            {isChecking ? (
              <>
                <Spinner />
                Prüfung läuft...
              </>
            ) : (
              'Abschnitt prüfen'
            )}
          </button>
            <span className="text-gray-400">Markdown</span>
            <ToggleSwitch 
                id="ex-editor-view-toggle"
                checked={viewMode === 'preview'}
                onChange={(isChecked) => setViewMode(isChecked ? 'preview' : 'markdown')}
            />
            <span className="text-gray-400">Vorschau</span>
        </div>
      </header>
      <div className="flex-1 overflow-auto">
        {viewMode === 'preview' ? (
          <ExplanationPreview section={section} highlightedRange={highlightedRange} />
        ) : (
          <MarkdownView 
            value={sectionMarkdown} 
            onChange={onSectionMarkdownChange}
            onUndo={onUndo}
            onRedo={onRedo}
            canUndo={canUndo}
            canRedo={canRedo}
          />
        )}
      </div>
    </div>
  );
};


export const ExplanationEditor: React.FC = () => {
    const {
      state: sections,
      setState: setSections,
      resetState: resetSections,
      undo,
      redo,
      canUndo,
      canRedo,
    } = useUndoableState<ExplanationSection[]>(() => 
        parseMarkdownToExplanationSections(localStorage.getItem('explanationMarkdown') || INITIAL_EXPLANATION_MARKDOWN)
    );
    const [viewMode, setViewMode] = useState<'preview' | 'markdown'>('preview');
    const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [checkResults, setCheckResults] = useState<Record<string, CheckResults | null> | null>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [highlightedRange, setHighlightedRange] = useState<TextRange | null>(null);
    const { prompts } = usePrompts();
    const { model } = useModel();
    const { debug } = useDebug();

    const rawMarkdown = useMemo(() => {
      return sections.map(s => s.markdown).join('\n');
    }, [sections]);

    useEffect(() => {
        localStorage.setItem('explanationMarkdown', rawMarkdown);
    }, [rawMarkdown]);

    useEffect(() => {
        if (!selectedSectionId && sections.length > 0) {
            setSelectedSectionId(sections[0].id);
        }
        if (selectedSectionId && !sections.find(s => s.id === selectedSectionId)) {
            setSelectedSectionId(sections.length > 0 ? sections[0].id : null);
        }
    }, [sections, selectedSectionId]);

    const selectedSection = useMemo(() => sections.find(s => s.id === selectedSectionId) || null, [sections, selectedSectionId]);
    const selectedSectionMarkdown = selectedSection?.markdown ?? '';

    const handleSectionMarkdownChange = useCallback((newMarkdownForSection: string) => {
        if (!selectedSectionId) return;
        setSections(prevSections =>
            prevSections.map(section =>
                section.id === selectedSectionId
                    ? { ...section, markdown: newMarkdownForSection, title: parseMarkdownToExplanationSections(newMarkdownForSection)[0]?.title || section.title }
                    : section
            )
        );
    }, [selectedSectionId, setSections]);

    const handleSectionSelect = useCallback((sectionId: string) => {
        setSelectedSectionId(sectionId);
        setViewMode('preview');
        setHighlightedRange(null);
        const hasResultsForSection = checkResults && checkResults[sectionId];
        setIsPanelOpen(!!hasResultsForSection);
    }, [checkResults]);

    const handleCheckSection = useCallback(async () => {
        if (!selectedSection) return;

        setIsChecking(true);
        setHighlightedRange(null);
        setCheckResults(prev => ({ ...prev, [selectedSection.id]: null }));
        setIsPanelOpen(true);
        try {
            const results = await runChecks(selectedSection.markdown, prompts, model, debug);
            setCheckResults(prev => ({ ...prev, [selectedSection.id]: results }));
        } catch (error) {
            console.error("Error checking section:", error);
            alert("Fehler bei der Überprüfung des Abschnitts.");
        } finally {
            setIsChecking(false);
        }
    }, [selectedSection, prompts, model, debug]);

    const handleCheckAllSections = useCallback(async () => {
        setIsChecking(true);
        setIsPanelOpen(false);
        setCheckResults({});

        try {
            const batch = sections.map(s => ({ id: s.id, markdown: s.markdown }));
            const { runChecksBatch } = await import('../services/openrouterService');
            const resultsMap = await runChecksBatch(batch, prompts, model, debug, 'Abschnitte');
            const allResults: Record<string, CheckResults> = {};
            for (const s of batch) {
                const r = resultsMap[s.id] || { fachlich: [], sprachlich: [], guidelines: [] };
                allResults[s.id] = r;
                setCheckResults(prev => ({ ...prev, [s.id]: r }));
            }

            const firstSectionWithErrors = sections.find(sec => {
                const res = allResults[sec.id];
                return res && (res.fachlich.length > 0 || res.sprachlich.length > 0 || res.guidelines.length > 0);
            });

            if (firstSectionWithErrors) {
                setSelectedSectionId(firstSectionWithErrors.id);
                setIsPanelOpen(true);
            } else {
                alert('Keine Fehler in allen Abschnitten gefunden!');
            }
        } catch (e) {
            console.error('Batch-Prüfung (TE) fehlgeschlagen, fallback auf Einzelprüfung:', e);
            const allResults: Record<string, CheckResults> = {};
            for (const section of sections) {
                const result = await runChecks(section.markdown, prompts, model, debug);
                allResults[section.id] = result;
                setCheckResults(prev => ({...prev, [section.id]: result}));
            }
            const firstSectionWithErrors = sections.find(s => {
                const res = allResults[s.id];
                return res && (res.fachlich.length > 0 || res.sprachlich.length > 0 || res.guidelines.length > 0);
            });
            if(firstSectionWithErrors) {
                setSelectedSectionId(firstSectionWithErrors.id);
                setIsPanelOpen(true);
            } else {
                alert('Keine Fehler in allen Abschnitten gefunden!');
            }
        } finally {
            setIsChecking(false);
        }
    }, [sections, prompts, model, debug]);

    const handleApplyFix = useCallback((errorToFix: ActionableError) => {
        if (!selectedSection) return;
      
        const r = findRange(selectedSection.markdown, errorToFix.original);
        if (!r) {
          alert("Originaltext wurde im Abschnitt nicht gefunden");
          return;
        }
      
        const updatedMarkdown = replaceRange(selectedSection.markdown, r, errorToFix.suggestion);
        handleSectionMarkdownChange(updatedMarkdown);
        setHighlightedRange(null);
      
        setCheckResults(prev => {
          if (!prev || !prev[selectedSection.id]) return prev;
          const cur = prev[selectedSection.id]!;
          const same = (e: ActionableError) => e.original === errorToFix.original && e.suggestion === errorToFix.suggestion;
          return {
            ...prev,
            [selectedSection.id]: {
              fachlich: cur.fachlich.filter(e => !same(e)),
              sprachlich: cur.sprachlich.filter(e => !same(e)),
              guidelines: cur.guidelines.filter(e => !same(e)),
            }
          };
        });
      }, [selectedSection, handleSectionMarkdownChange]);
    
    const handlePasteFromClipboard = useCallback(async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                resetSections(parseMarkdownToExplanationSections(text));
                setSelectedSectionId(null);
                setCheckResults(null);
                setIsPanelOpen(false);
            } else {
                alert("Die Zwischenablage ist leer.");
            }
        } catch (err) {
            console.error('Failed to read clipboard contents: ', err);
            alert("Fehler beim Lesen aus der Zwischenablage.");
        }
    }, [resetSections]);

    const handleCopyToClipboard = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(rawMarkdown);
            alert("Markdown wurde in die Zwischenablage kopiert!");
        } catch (err) {
            console.error('Failed to copy text: ', err);
            alert("Fehler beim Kopieren in die Zwischenablage.");
        }
    }, [rawMarkdown]);

    const handleGoToError = useCallback((error: ActionableError) => {
        if (!selectedSection) return;
        const r = findRange(selectedSection.markdown, error.original);
        if (!r) {
          alert("Textstelle wurde nicht gefunden");
          return;
        }
        setHighlightedRange(r);
        setViewMode('preview');
      }, [selectedSection]);

    return (
        <div className="flex h-full">
            <ExplanationSidebar
                sections={sections}
                onSectionSelect={handleSectionSelect}
                selectedSectionId={selectedSectionId}
                onCheckAll={handleCheckAllSections}
                isChecking={isChecking}
                checkResults={checkResults}
                onPasteFromClipboard={handlePasteFromClipboard}
                onCopyToClipboard={handleCopyToClipboard}
            />
            <main className="flex-1 flex flex-row overflow-hidden">
                <ExplanationViewer
                    section={selectedSection}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    sectionMarkdown={selectedSectionMarkdown}
                    onSectionMarkdownChange={handleSectionMarkdownChange}
                    onCheckSection={handleCheckSection}
                    onOpenAIEdit={() => setIsChatOpen(true)}
                    isChecking={isChecking && !!(checkResults && selectedSectionId && checkResults[selectedSectionId] === null)}
                    highlightedRange={highlightedRange}
                    onUndo={undo}
                    onRedo={redo}
                    canUndo={canUndo}
                    canRedo={canRedo}
                />
                <CheckResultsPanel
                    isOpen={isPanelOpen}
                    onClose={() => setIsPanelOpen(false)}
                    results={selectedSectionId ? checkResults?.[selectedSectionId] ?? null : null}
                    onApplyFix={handleApplyFix}
                    onGoToError={handleGoToError}
                />
                <AIChatPanel
                    isOpen={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                    contextLabel={selectedSection ? selectedSection.title : 'Abschnitt'}
                    contextMarkdown={selectedSectionMarkdown}
                    onReplace={handleSectionMarkdownChange}
                />
            </main>
        </div>
    );
};
