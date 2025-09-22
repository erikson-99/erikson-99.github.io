import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { TaskViewer } from './TaskViewer';
import { parseMarkdownToTaskSets } from '../services/parser';
import { Task, TaskSet, CheckResults, ActionableError } from '../types';
import { runChecks } from '../services/openrouterService';
import { CheckResultsPanel } from './CheckResultsPanel';
import { usePrompts } from '../contexts/PromptsContext';
import { useModel } from '../contexts/ModelContext';
import { Sidebar } from './Sidebar';
import { useUndoableState, findRange, replaceRange } from '../services/utils/textRanges';
import { useDebug } from '../contexts/DebugContext';
import { AIChatPanel } from './AIChatPanel';

const INITIAL_MARKDOWN = `## **Aufgabensatz: Grundlagen & Sicherheit (4 Aufgaben)**

## Aufgabe 1

Welche Aussagen zu **Pressverbindungen** und ihren **Vorteilen** sind korrekt? *Wähle aus*.

| **Aussage** | **Wahr/Falsch** |
| --- | --- |
| **Pressverbindungen** benötigen eine **offene Flamme** zur Herstellung. | - [x] Falsch |
| Bei **Restfeuchte** in den Rohren können **Pressverbindungen** trotzdem ausgeführt werden. | - [x] Wahr |
| **Pressverbindungen** sind **lösbare Verbindungen**, die bei Bedarf demontiert werden können. | - [x] Falsch |
| Die **Bauteile** unterliegen bei der Montage keinen **thermischen Belastungen**. | - [x] Wahr |

### Erklärung

**Pressverbindungen** arbeiten **kalt** durch **mechanische Krafteinwirkung** ohne **offene Flamme**, was die **Brandgefahr** eliminiert.

**Restfeuchte** in den Rohren stellt kein Problem dar, da keine **Verdampfung** wie beim **Löten** auftritt.

**Pressverbindungen** sind **unlösbare Verbindungen** - einmal verpresst, können sie nur durch **Trennen** entfernt werden.

Da keine **Erwärmung** stattfindet, bleiben die **Materialeigenschaften** der Bauteile vollständig erhalten.

---

## Aufgabe 2

*Fülle die Lücken.*

| Bei **Pressverbindungen** wird durch ____ Krafteinwirkung eine dauerhafte Verbindung hergestellt. | - [x] mechanische |
| --- | --- |
| Der ____ aus EPDM oder FKM dichtet die Rohr-Fitting-Fuge ab. | - [x] O-Ring |
| Die Pressung erzeugt die mechanische ____, während der O-Ring für die Abdichtung sorgt. | - [x] Klemmung |

### Erklärung

Die **mechanische** Krafteinwirkung durch die **Pressmaschine** verformt den **Fitting** plastisch und dauerhaft.

Der **O-Ring** liegt in einer **Nut** des Fittings und wird beim **Verpressen** komprimiert, wodurch er die **Rohr-Fitting-Fuge** zuverlässig abdichtet.

Die **Klemmung** entsteht durch die **plastische Verformung** des Fittings, während der **O-Ring** ausschließlich für die **Abdichtung** verantwortlich ist.

---

## Aufgabe 3

Ordne die **Vorteile** den **Fügeverfahren** zu.

| **Fügeverfahren** | **Vorteil** |
| --- | --- |
| **Pressverbindung** | - [x] Keine Brandgefahr durch kalte Verarbeitung |
| **Lötverbindung** | - [x] Materialverbindung durch Diffusion |
| **Schraubverbindung** | - [x] Lösbare Verbindung für Wartungszwecke |
| **Schweißverbindung** | - [x] Höchste Festigkeit durch Materialverschmelzung |

### Erklärung

**Pressverbindungen** arbeiten **kalt** ohne **offene Flamme**, wodurch **Brandgefahr** und **Rauchentwicklung** vermieden werden.

**Lötverbindungen** entstehen durch **Diffusion** zwischen **Lot** und **Grundwerkstoff** bei erhöhten **Temperaturen**.

**Schraubverbindungen** bleiben **lösbar** und ermöglichen **Wartung** oder **Umbau** der Installation.

**Schweißverbindungen** verschmelzen die **Grundwerkstoffe** miteinander und erreichen die **höchste Festigkeit**.

---

## Aufgabe 4

Ein **Azubi** soll in einem **bewohnten Altbau** eine **Trinkwasserleitung** im **Dachgeschoss** installieren. Der **Dachstuhl** besteht aus **trockenem Holz**, und unter der **Arbeitsstelle** befinden sich **bewohnte Räume**.

**Analysiere** die **Situation** und **begründe**, warum **Pressverbindungen** hier die **sicherste Wahl** darstellen. Nenne dabei **drei konkrete Sicherheitsaspekte**.

______
______
______
(Solution prompt: "Inhaltliche Anforderungen:
Die Antwort muss drei konkrete Sicherheitsaspekte nennen, die für Pressverbindungen in der beschriebenen Situation sprechen.
Folgende Aspekte sind korrekt:

Keine Brandgefahr durch offene Flamme im trockenen Holz-Dachstuhl
Keine Rauchentwicklung in bewohnten Räumen
Keine Gefahr durch herabfallende heiße Lottropfen
Keine thermische Belastung der umliegenden Bauteile
Kein Einsatz von Gasflaschen im engen Dachgeschoss
Keine Gefahr von Schwelbränden nach Arbeitsende
Arbeiten auch bei Wind/Durchzug möglich
Keine Brandwache erforderlich

Bewertung:
Vergeben werden bis zu drei Punkte:
Ein Punkt für jeden korrekt genannten Sicherheitsaspekt aus der obigen Liste
Maximal 3 Punkte insgesamt

Formulierungsflexibilität:
Der exakte Wortlaut ist nicht erforderlich
Fachlich richtige Umschreibungen oder sinngemäße Formulierungen sind zulässig
Die Antwort sollte auf die konkrete Situation Bezug nehmen
Reihenfolge ist beliebig")

### Erklärung

Drei wichtige Sicherheitsaspekte für **Pressverbindungen** in dieser Situation:

- **Keine Brandgefahr** durch offene Flamme im **trockenen Holz-Dachstuhl**
- **Keine Rauchentwicklung**, die in die **bewohnten Räume** ziehen könnte
- **Keine heißen Lottropfen**, die herabfallen und **Personen** oder **Einrichtung** gefährden könnten

Weitere relevante Sicherheitsaspekte wären:
- Keine **thermische Belastung** angrenzender **Holzbauteile**
- Kein Transport von **Gasflaschen** ins **Dachgeschoss**
- Keine **Brandwache** nach **Arbeitsende** erforderlich
- Keine Gefahr von **Schwelbränden** in **Hohlräumen**
`;

export const MixedQuizEditor: React.FC = () => {
  const { 
    state: rawMarkdown, 
    setState: setRawMarkdown, 
    resetState: resetRawMarkdown,
    undo, 
    redo, 
    canUndo, 
    canRedo 
  } = useUndoableState<string>(
    () => localStorage.getItem('mixedQuizMarkdown') || INITIAL_MARKDOWN
  );
  const [viewMode, setViewMode] = useState<'frontend' | 'markdown'>('frontend');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [checkResults, setCheckResults] = useState<Record<string, CheckResults | null> | null>(null);
  const [isResultsPanelOpen, setIsResultsPanelOpen] = useState<boolean>(false);
  const [isAIEditOpen, setIsAIEditOpen] = useState<boolean>(false);
  const { prompts } = usePrompts();
  const { model } = useModel();
  const { debug } = useDebug();

  const taskSets: TaskSet[] = useMemo(() => parseMarkdownToTaskSets(rawMarkdown), [rawMarkdown]);
  const allTasks: Task[] = useMemo(() => taskSets.flatMap(ts => ts.tasks), [taskSets]);

  useEffect(() => {
    localStorage.setItem('mixedQuizMarkdown', rawMarkdown);
  }, [rawMarkdown]);

  useEffect(() => {
    if (!selectedTaskId && allTasks.length > 0) {
      setSelectedTaskId(allTasks[0].id);
    }
    if (selectedTaskId && !allTasks.find(t => t.id === selectedTaskId)) {
      setSelectedTaskId(allTasks.length > 0 ? allTasks[0].id : null);
    }
  }, [allTasks, selectedTaskId]);

  const getMarkdownForTask = useCallback((taskId: string) => {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return '';
    
    // This is a simplified way; it relies on `## Task Title` being unique enough.
    const regex = new RegExp(`(## ${task.title}[\\s\\S]*?)(?=## Aufgabe|## \\*\\*Aufgabensatz|$)`);
    const match = rawMarkdown.match(regex);
    
    return match ? match[1].trim().replace(/---\s*$/, '').trim() : '';
  }, [allTasks, rawMarkdown]);

  const selectedTaskMarkdown = useMemo(() => {
    return selectedTaskId ? getMarkdownForTask(selectedTaskId) : '';
  }, [selectedTaskId, getMarkdownForTask]);

  const selectedTask = useMemo(() => {
    return allTasks.find(t => t.id === selectedTaskId) || null;
  }, [selectedTaskId, allTasks]);

  const handleTaskMarkdownChange = useCallback((newMarkdownForTask: string) => {
      const currentMarkdown = selectedTaskId ? getMarkdownForTask(selectedTaskId) : '';
      if (!currentMarkdown) return;
      
      const newRawMarkdown = rawMarkdown.replace(currentMarkdown, newMarkdownForTask);
      setRawMarkdown(newRawMarkdown);
  }, [rawMarkdown, selectedTaskId, getMarkdownForTask, setRawMarkdown]);


  const handleTaskSelect = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
    setViewMode('frontend');
    const hasResultsForTask = checkResults && checkResults[taskId];
    setIsResultsPanelOpen(!!hasResultsForTask);
  }, [checkResults]);

  const handleCheckTask = useCallback(async () => {
    if (!selectedTaskMarkdown || !selectedTaskId) return;
    setIsChecking(true);
    setCheckResults(prev => ({...prev, [selectedTaskId!]: null }));
    setIsResultsPanelOpen(true);
    try {
      const results = await runChecks(selectedTaskMarkdown, prompts, model, debug);
      setCheckResults(prev => ({...prev, [selectedTaskId!]: results}));
    } catch (error) {
      console.error("Error checking task:", error);
      alert("Fehler bei der Überprüfung der Aufgabe. Bitte versuchen Sie es erneut.");
    } finally {
      setIsChecking(false);
    }
  }, [selectedTaskMarkdown, selectedTaskId, prompts, model, debug]);

  const handleCheckAllTasks = useCallback(async () => {
    setIsChecking(true);
    setIsResultsPanelOpen(false);
    setCheckResults({});

    const allResults: Record<string, CheckResults> = {};

    for (const task of allTasks) {
        const taskMarkdown = getMarkdownForTask(task.id);
        if (taskMarkdown) {
            const result = await runChecks(taskMarkdown, prompts, model, debug);
            allResults[task.id] = result;
            setCheckResults(prev => ({ ...prev, [task.id]: result }));
        }
    }

    setIsChecking(false);
    
    const firstTaskWithErrorsId = allTasks.find(task => {
        const res = allResults[task.id];
        return res && (res.fachlich.length > 0 || res.sprachlich.length > 0 || res.guidelines.length > 0);
    })?.id;

    if (firstTaskWithErrorsId) {
        setSelectedTaskId(firstTaskWithErrorsId);
        setIsResultsPanelOpen(true);
    } else {
        alert('Keine Fehler in allen Aufgaben gefunden!');
    }
  }, [allTasks, getMarkdownForTask, prompts, model, debug]);


  const handleApplyFix = useCallback((errorToFix: ActionableError) => {
    if (!selectedTaskMarkdown || !selectedTaskId) return;

    const r = findRange(selectedTaskMarkdown, errorToFix.original);
    if (!r) {
      alert('Originaltext konnte im Aufgaben-Markdown nicht eindeutig gefunden werden. Bitte manuell prüfen/übernehmen.');
      return; // Fehler verbleibt
    }
    const updatedMarkdown = replaceRange(selectedTaskMarkdown, r, errorToFix.suggestion);
    handleTaskMarkdownChange(updatedMarkdown);

    setCheckResults(prevResults => {
        if (!prevResults || !selectedTaskId || !prevResults[selectedTaskId]) return prevResults;
        const currentTaskResults = prevResults[selectedTaskId]!;
        const isSameError = (e: ActionableError) => 
            e.original === errorToFix.original && 
            e.suggestion === errorToFix.suggestion && 
            e.explanation === errorToFix.explanation;

        return {
            ...prevResults,
            [selectedTaskId]: {
                fachlich: currentTaskResults.fachlich.filter(e => !isSameError(e)),
                sprachlich: currentTaskResults.sprachlich.filter(e => !isSameError(e)),
                guidelines: currentTaskResults.guidelines.filter(e => !isSameError(e)),
            },
        };
    });
  }, [selectedTaskMarkdown, handleTaskMarkdownChange, selectedTaskId]);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
        const text = await navigator.clipboard.readText();
        resetRawMarkdown(text);
        setSelectedTaskId(null);
        setCheckResults(null);
        setIsResultsPanelOpen(false);
    } catch (err) {
        console.error('Failed to read clipboard contents: ', err);
    }
  }, [resetRawMarkdown]);

  const handleCopyToClipboard = useCallback(async () => {
    try {
        await navigator.clipboard.writeText(rawMarkdown);
        alert("Markdown wurde in die Zwischenablage kopiert!");
    } catch (err) {
        console.error('Failed to copy text: ', err);
    }
  }, [rawMarkdown]);

  return (
    <div className="flex h-full">
      <Sidebar
        tasks={allTasks} 
        onTaskSelect={handleTaskSelect}
        selectedTaskId={selectedTaskId}
        onCheckAllTasks={handleCheckAllTasks}
        isChecking={isChecking}
        checkResults={checkResults}
        onPasteFromClipboard={handlePasteFromClipboard}
        onCopyToClipboard={handleCopyToClipboard}
      />
      <main className="flex-1 flex flex-row overflow-hidden">
        <TaskViewer
          task={selectedTask}
          viewMode={viewMode}
          setViewMode={setViewMode}
          taskMarkdown={selectedTaskMarkdown}
          onTaskMarkdownChange={handleTaskMarkdownChange}
          onCheckTask={handleCheckTask}
          isChecking={isChecking && !!(checkResults && selectedTaskId && checkResults[selectedTaskId] === null)}
          onOpenAIEdit={() => setIsAIEditOpen(true)}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
        <CheckResultsPanel 
            isOpen={isResultsPanelOpen}
            onClose={() => setIsResultsPanelOpen(false)}
            results={selectedTaskId ? checkResults?.[selectedTaskId] ?? null : null}
            onApplyFix={handleApplyFix}
        />
        <AIChatPanel
          isOpen={isAIEditOpen}
          docked
          supportsPrompts
          onClose={() => setIsAIEditOpen(false)}
          contextLabel={selectedTask ? selectedTask.title : 'Aufgabe'}
          contextMarkdown={selectedTaskMarkdown}
          onReplace={handleTaskMarkdownChange}
        />
      </main>
    </div>
  );
}
