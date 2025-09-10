import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TaskViewer } from './TaskViewer';
import { parseMarkdownToTasks } from '../services/parser';
import { Task, CheckResults, ActionableError } from '../types';
import { runChecks } from '../services/openrouterService';
import { CheckResultsPanel } from './CheckResultsPanel';
import { usePrompts } from '../contexts/PromptsContext';
import { useModel } from '../contexts/ModelContext';
import { useUndoableState } from '../services/utils/textRanges';
import { useDebug } from '../contexts/DebugContext';
import { sendChat } from '../services/openrouterChat';
import { NewTaskModal } from './NewTaskModal';
import { AIChatPanel } from './AIChatPanel';

const INITIAL_MARKDOWN = `# Aufgaben

## Aufgabe 1

Was ist die **Mindesttemperatur** für das **Hartlöten**? *Wähle aus.*

A. 300°C
B. 400°C
C. 450°C
D. 500°C
E. 600°C

Richtige Antwort: C

**Erklärung:** **Hartlöten** beginnt bei **450°C Löttemperatur**. Unterhalb dieser Temperatur spricht man von **Weichlöten**. Diese Grenze definiert die unterschiedlichen Verfahren und deren Festigkeitseigenschaften.

## Aufgabe 2

Welcher **Lötspalt** ist für optimale **Kapillarwirkung** erforderlich? *Wähle aus.*

A. 0,01 mm bis 0,03 mm
B. 0,05 mm bis 0,2 mm
C. 0,3 mm bis 0,5 mm
D. 0,6 mm bis 1,0 mm
E. 1,0 mm bis 2,0 mm

Richtige Antwort: B

**Erklärung:** Der **Kapillareffekt** funktioniert optimal bei **0,05-0,2 mm Spaltweite**. Zu enge Spalte verhindern das Eindringen, zu weite Spalte schwächen die **Kapillarwirkung** und führen zu unkontrolliertem Lotfluss.

## Aufgabe 3

Was bedeutet die **Lotbezeichnung** "L-CuP6"? *Wähle aus.*

A. Lot mit 6% Kupfer und Phosphor
B. Lot mit Kupfer und 6% Phosphor
C. Lot mit 6% Kupfer für Phosphorbronze
D. Lot mit Kupfer für 6 bar Druck
E. Lot mit 6% Legierungsanteil

Richtige Antwort: B

**Erklärung:** **L-CuP6** bedeutet **Lot** mit **Kupfer** und **6% Phosphor**. Das **Phosphor** wirkt als **Flussmittel** und macht dieses Lot ideal für **Kupfer-Kupfer-Verbindungen** ohne zusätzliches Flussmittel.
`;

export const QuizEditor: React.FC = () => {
  const { 
    state: rawMarkdown, 
    setState: setRawMarkdown, 
    resetState: resetRawMarkdown,
    undo, 
    redo, 
    canUndo, 
    canRedo 
  } = useUndoableState<string>(
    () => localStorage.getItem('quizMarkdown') || INITIAL_MARKDOWN
  );
  
  const [viewMode, setViewMode] = useState<'frontend' | 'markdown'>('frontend');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isAIEditOpen, setIsAIEditOpen] = useState<boolean>(false);
  const [checkResults, setCheckResults] = useState<Record<string, CheckResults | null> | null>(null);
  const [isResultsPanelOpen, setIsResultsPanelOpen] = useState<boolean>(false);
  const { prompts } = usePrompts();
  const { model } = useModel();
  const { debug } = useDebug();


  const tasks: Task[] = useMemo(() => parseMarkdownToTasks(rawMarkdown), [rawMarkdown]);
  
  useEffect(() => {
    localStorage.setItem('quizMarkdown', rawMarkdown);
  }, [rawMarkdown]);

  useEffect(() => {
    if (!selectedTaskId && tasks.length > 0) {
      setSelectedTaskId(tasks[0].id);
    }
    if (selectedTaskId && !tasks.find(t => t.id === selectedTaskId)) {
      setSelectedTaskId(tasks.length > 0 ? tasks[0].id : null);
    }
  }, [tasks, selectedTaskId]);

  const getMarkdownForTask = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return '';
    
    const parts = rawMarkdown.split(/(?=## )/);
    
    const taskBlock = parts.find(p => {
        const trimmedPart = p.trim();
        if (!trimmedPart.startsWith('## ')) return false;
        
        const firstLine = trimmedPart.split('\n')[0];
        const titleInPart = firstLine.replace(/^##\s+/, '').trim();
        
        return titleInPart === task.title;
    });
    
    return taskBlock || '';
  }, [tasks, rawMarkdown]);

  const selectedTaskMarkdown = useMemo(() => {
    return selectedTaskId ? getMarkdownForTask(selectedTaskId) : '';
  }, [selectedTaskId, getMarkdownForTask]);

  const { selectedTask } = useMemo(() => {
    if (!selectedTaskId || !tasks.length) {
      return { selectedTask: null };
    }
    const task = tasks.find(t => t.id === selectedTaskId);
    return { selectedTask: task || null };
  }, [selectedTaskId, tasks]);

  const handleTaskMarkdownChange = useCallback((newMarkdownForTask: string) => {
      if (!selectedTask) return;
  
      const taskIdentifier = `## ${selectedTask.title}`;
      const markdownParts = rawMarkdown.split(/(?=## )/);
      
      let taskFound = false;
      const newMarkdownParts = markdownParts.map(part => {
          const trimmedPart = part.trim();
          if (!trimmedPart.startsWith('## ')) return part;

          const partTitleLine = trimmedPart.split('\n')[0].trim();
          if (partTitleLine === taskIdentifier.trim()) {
            taskFound = true;
            return newMarkdownForTask;
          }
          
          return part;
      });
  
      if (taskFound) {
          setRawMarkdown(newMarkdownParts.join(''));
      }
  }, [rawMarkdown, selectedTask, setRawMarkdown]);


  const handleTaskSelect = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
    setViewMode('frontend');
    const hasResultsForTask = checkResults && checkResults[taskId];
    setIsResultsPanelOpen(!!hasResultsForTask);
  }, [checkResults]);

  const handleCheckTask = useCallback(async () => {
    if (!selectedTaskMarkdown || !selectedTaskId) return;
    setIsChecking(true);
    setCheckResults(prev => ({...prev, [selectedTaskId!]: null })); // Show loading
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

    for (const task of tasks) {
        const taskMarkdown = getMarkdownForTask(task.id);
        if (taskMarkdown) {
            const result = await runChecks(taskMarkdown, prompts, model, debug);
            allResults[task.id] = result;
            setCheckResults(prev => ({ ...prev, [task.id]: result }));
        }
    }

    setIsChecking(false);
    
    const firstTaskWithErrorsId = tasks.find(task => {
        const res = allResults[task.id];
        return res && (res.fachlich.length > 0 || res.sprachlich.length > 0 || res.guidelines.length > 0);
    })?.id;

    if (firstTaskWithErrorsId) {
        setSelectedTaskId(firstTaskWithErrorsId);
        setIsResultsPanelOpen(true);
    } else {
        alert('Keine Fehler in allen Aufgaben gefunden!');
    }
  }, [tasks, getMarkdownForTask, prompts, model, debug]);


  const handleApplyFix = useCallback((errorToFix: ActionableError) => {
    if (!selectedTaskMarkdown || !selectedTaskId) return;
  
    const updatedMarkdown = selectedTaskMarkdown.replace(errorToFix.original, errorToFix.suggestion);
    handleTaskMarkdownChange(updatedMarkdown);

    setCheckResults(prevResults => {
        if (!prevResults || !selectedTaskId || !prevResults[selectedTaskId]) {
            return prevResults;
        }

        const currentTaskResults = prevResults[selectedTaskId]!;
        const isSameError = (e: ActionableError) => 
            e.original === errorToFix.original && 
            e.suggestion === errorToFix.suggestion && 
            e.explanation === errorToFix.explanation;

        const updatedTaskResults: CheckResults = {
            fachlich: currentTaskResults.fachlich.filter(e => !isSameError(e)),
            sprachlich: currentTaskResults.sprachlich.filter(e => !isSameError(e)),
            guidelines: currentTaskResults.guidelines.filter(e => !isSameError(e)),
        };

        return {
            ...prevResults,
            [selectedTaskId]: updatedTaskResults,
        };
    });
  }, [selectedTaskMarkdown, handleTaskMarkdownChange, selectedTaskId]);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
        const text = await navigator.clipboard.readText();
        if (text) {
            resetRawMarkdown(text);
            setSelectedTaskId(null);
            setCheckResults(null);
            setIsResultsPanelOpen(false);
        } else {
            alert("Die Zwischenablage ist leer.");
        }
    } catch (err) {
        console.error('Failed to read clipboard contents: ', err);
        alert("Fehler beim Lesen aus der Zwischenablage. Bitte stellen Sie sicher, dass die Berechtigung erteilt wurde.");
    }
  }, [resetRawMarkdown]);

  const handleCopyToClipboard = useCallback(async () => {
    try {
        await navigator.clipboard.writeText(rawMarkdown);
        alert("Markdown wurde in die Zwischenablage kopiert!");
    } catch (err) {
        console.error('Failed to copy text: ', err);
        alert("Fehler beim Kopieren in die Zwischenablage.");
    }
  }, [rawMarkdown]);

  const handleDeleteTask = useCallback(() => {
    if (!selectedTask) return;
    const taskIdentifier = `## ${selectedTask.title}`;
    const parts = rawMarkdown.split(/(?=## )/);
    const kept = parts.filter(part => {
      const trimmed = part.trim();
      if (!trimmed.startsWith('## ')) return true; // keep non-task preamble
      const firstLine = trimmed.split('\n')[0].trim();
      return firstLine !== taskIdentifier.trim();
    });
    const newMarkdown = kept.join('');
    setRawMarkdown(newMarkdown);
    setCheckResults(prev => {
      if (!prev) return prev;
      const copy = { ...prev } as Record<string, CheckResults | null>;
      delete (copy as any)[selectedTask.id];
      return copy;
    });
    // Update selection
    const remainingTasks = parseMarkdownToTasks(newMarkdown);
    setSelectedTaskId(remainingTasks.length ? remainingTasks[0].id : null);
    setIsResultsPanelOpen(false);
  }, [rawMarkdown, selectedTask, setRawMarkdown]);

  const generateTask = useCallback(async (instruction: string | null) => {
    setIsCreating(true);
    try {
      const te = localStorage.getItem('explanationMarkdown') || '';
      const nextNumber = (() => {
        const nums = (rawMarkdown.match(/##\s*Aufgabe\s+(\d+)/g) || []).map(m => parseInt(m.replace(/[^0-9]/g, ''), 10)).filter(n => !isNaN(n));
        const max = nums.length ? Math.max(...nums) : 0;
        return max + 1;
      })();

      const system = 'Du erstellst eine einzelne Single-Choice-Aufgabe im vorgegebenen Markdown-Format. Antworte ausschließlich mit dem fertigen Markdown der Aufgabe, ohne zusätzliche Erklärungen.';
      const basePrompt = `${prompts.singleChoice}\n\nZusatzvorgaben:\n- Erzeuge exakt eine Aufgabe mit der Überschrift \"## Aufgabe ${nextNumber}\".\n- Verwende keine Inhalte, die bereits in den vorhandenen Aufgaben vorkommen.\n- Richte Inhalt thematisch am gegebenen Kontext (TE) aus, wenn sinnvoll.`;
      const userContext = `Kontext (TE):\n${te}\n\nBereits vorhandene Aufgaben (nur zur Vermeidung von Duplikaten):\n${rawMarkdown}`;
      const userInstruction = instruction ? `\n\nZusätzliche Anforderungen des Nutzers:\n${instruction}` : '';

      const reply = await sendChat([
        { role: 'system', content: system },
        { role: 'user', content: basePrompt + userInstruction },
        { role: 'user', content: userContext }
      ], model, debug);

      const trimmed = reply.trim();
      const separator = rawMarkdown.endsWith('\n') ? '\n' : '\n\n';
      setRawMarkdown(prev => prev + separator + (trimmed.startsWith('## ') ? trimmed : `## Aufgabe ${nextNumber}\n${trimmed}`) + '\n');
    } catch (e: any) {
      console.error('Neue Aufgabe erstellen fehlgeschlagen:', e);
      alert('Erstellen der neuen Aufgabe fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      setIsCreating(false);
      setIsCreateModalOpen(false);
    }
  }, [prompts.singleChoice, rawMarkdown, model, debug, setRawMarkdown]);

  const handleCreateTask = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);


  return (
    <div className="flex h-full">
      <Sidebar 
        tasks={tasks} 
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
          isChecking={isChecking}
          onOpenAIEdit={() => setIsAIEditOpen(true)}
          onDeleteTask={handleDeleteTask}
          onCreateTask={handleCreateTask}
          isCreating={isCreating}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
        <NewTaskModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onGenerate={(instruction) => generateTask(instruction)}
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
