import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TaskViewer } from './TaskViewer';
import { parseMarkdownToTasks } from '../services/parser';
import { Task, CheckResults, ActionableError } from '../types';
import { runChecks } from '../services/openrouterService';
import { CheckResultsPanel } from './CheckResultsPanel';
import { usePrompts } from '../contexts/PromptsContext';
import { useModel } from '../contexts/ModelContext';
import { useUndoableState, findRange, replaceRange } from '../services/utils/textRanges';
import { useDebug } from '../contexts/DebugContext';
import { sendChat } from '../services/openrouterChat';
import { NewTaskModal } from './NewTaskModal';
import { AIChatPanel } from './AIChatPanel';
import { defaultMultiSingleChoicePrompt } from '../prompts/defaultPrompts';

const TASK_STORAGE_KEY = 'quizTasksV2';
const LEGACY_STORAGE_KEY = 'quizMarkdown';
const DEFAULT_PREFIX = '# Aufgaben';

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

const normalizeTaskBody = (input: string): string => {
  const normalizedLineEndings = (input ?? '').replace(/\r\n/g, '\n');
  const withoutHeading = normalizedLineEndings.replace(/^##\s+Aufgabe[^\n]*(?:\n|$)/i, '');
  if (withoutHeading.startsWith('\n')) {
    return withoutHeading.slice(1);
  }
  return withoutHeading;
};

const buildTaskMarkdown = (index: number, body: string): string => {
  const heading = `## Aufgabe ${index + 1}`;
  const trimmedBody = body.trim();
  if (!trimmedBody) {
    return `${heading}\n`;
  }
  return `${heading}\n\n${trimmedBody}\n`;
};

const combineTaskBodies = (bodies: string[]): string => {
  if (!bodies.length) {
    return `${DEFAULT_PREFIX}\n`;
  }
  const tasksMarkdown = bodies
    .map((body, index) => buildTaskMarkdown(index, body))
    .join('\n\n');
  return `${DEFAULT_PREFIX}\n\n${tasksMarkdown}`.trimEnd() + '\n';
};

const extractTaskBodies = (markdown: string): string[] => {
  const source = markdown ?? '';
  const headerRegex = /^##\s+Aufgabe[^\n]*/gm;
  const matches = Array.from(source.matchAll(headerRegex));
  if (!matches.length) {
    return [];
  }
  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const nextStart = index + 1 < matches.length ? matches[index + 1].index ?? source.length : source.length;
    const block = source.slice(start, nextStart);
    return normalizeTaskBody(block);
  });
};

const fallbackTask = (index: number, markdown: string): Task => ({
  id: `fallback-${index}`,
  title: `Aufgabe ${index + 1}`,
  question: markdown.replace(/^##[^\n]*\n?/, '').trim() || '(Kein Inhalt)',
  options: [],
  explanation: '',
});

const loadInitialTaskBodies = (): string[] => {
  try {
    const stored = localStorage.getItem(TASK_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const bodies = parsed.map((entry) => (typeof entry === 'string' ? normalizeTaskBody(entry) : ''));
        if (bodies.length) {
          return bodies;
        }
      }
    }
  } catch (error) {
    console.warn('Konnte gespeicherte Quiz-Aufgaben nicht laden, verwende Fallback.', error);
  }

  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  const legacyBodies = legacy ? extractTaskBodies(legacy) : [];
  if (legacyBodies.length) {
    return legacyBodies;
  }

  const initialBodies = extractTaskBodies(INITIAL_MARKDOWN);
  return initialBodies.length ? initialBodies : [''];
};

interface TaskEntry {
  id: string;
  index: number;
  body: string;
  markdown: string;
  task: Task;
}

export const QuizEditor: React.FC = () => {
  const {
    state: taskBodies,
    setState: setTaskBodies,
    resetState: resetTaskBodies,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useUndoableState<string[]>(loadInitialTaskBodies);

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

  const combinedMarkdown = useMemo(() => combineTaskBodies(taskBodies), [taskBodies]);

  useEffect(() => {
    localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(taskBodies));
    localStorage.setItem(LEGACY_STORAGE_KEY, combinedMarkdown);
  }, [taskBodies, combinedMarkdown]);

  const taskEntries: TaskEntry[] = useMemo(() => {
    return taskBodies.map((body, index) => {
      const markdown = buildTaskMarkdown(index, body);
      const parsed = parseMarkdownToTasks(markdown)[0];
      const id = parsed?.id ?? `aufgabe-${index}`;
      const task = parsed ?? fallbackTask(index, markdown);
      return { id, index, body, markdown, task };
    });
  }, [taskBodies]);

  const tasks = useMemo(() => taskEntries.map((entry) => entry.task), [taskEntries]);

  useEffect(() => {
    if (!taskEntries.length) {
      setSelectedTaskId(null);
      return;
    }
    if (!selectedTaskId) {
      setSelectedTaskId(taskEntries[0].id);
      return;
    }
    if (!taskEntries.find((entry) => entry.id === selectedTaskId)) {
      setSelectedTaskId(taskEntries[0].id);
    }
  }, [taskEntries, selectedTaskId]);

  const selectedEntry = useMemo(() => {
    if (!selectedTaskId) return taskEntries[0];
    return taskEntries.find((entry) => entry.id === selectedTaskId) ?? taskEntries[0];
  }, [taskEntries, selectedTaskId]);

  const selectedTaskMarkdown = selectedEntry?.markdown ?? '';
  const selectedTaskBody = selectedEntry?.body ?? '';
  const selectedTask = selectedEntry?.task ?? null;

  const handleTaskBodyUpdate = useCallback(
    (index: number, newBody: string) => {
      const normalized = normalizeTaskBody(newBody);
      setTaskBodies((prev) => prev.map((body, idx) => (idx === index ? normalized : body)));
    },
    [setTaskBodies]
  );

  const handleTaskMarkdownChange = useCallback(
    (newMarkdownForTask: string) => {
      if (!selectedEntry) return;
      handleTaskBodyUpdate(selectedEntry.index, newMarkdownForTask);
    },
    [handleTaskBodyUpdate, selectedEntry]
  );

  const handleTaskSelect = useCallback(
    (taskId: string) => {
      setSelectedTaskId(taskId);
      setViewMode('frontend');
      const hasResultsForTask = checkResults && checkResults[taskId];
      setIsResultsPanelOpen(!!hasResultsForTask);
    },
    [checkResults]
  );

  const handleCheckTask = useCallback(async () => {
    if (!selectedTaskMarkdown || !selectedEntry) return;
    setIsChecking(true);
    setCheckResults((prev) => ({ ...(prev ?? {}), [selectedEntry.id]: null }));
    setIsResultsPanelOpen(true);
    try {
      const results = await runChecks(selectedTaskMarkdown, prompts, model, debug);
      setCheckResults((prev) => ({ ...(prev ?? {}), [selectedEntry.id]: results }));
    } catch (error) {
      console.error('Error checking task:', error);
      alert('Fehler bei der Überprüfung der Aufgabe. Bitte versuchen Sie es erneut.');
    } finally {
      setIsChecking(false);
    }
  }, [selectedTaskMarkdown, selectedEntry, prompts, model, debug]);

  const handleCheckAllTasks = useCallback(async () => {
    setIsChecking(true);
    setIsResultsPanelOpen(false);
    setCheckResults({});

    try {
      const batch = taskEntries.map((entry) => ({ id: entry.id, markdown: entry.markdown }));
      const { runChecksBatch } = await import('../services/openrouterService');
      const resultsMap = await runChecksBatch(batch, prompts, model, debug, 'Aufgaben');
      const allResults: Record<string, CheckResults> = {};
      for (const entry of batch) {
        const r = resultsMap[entry.id] || { fachlich: [], sprachlich: [], guidelines: [] };
        allResults[entry.id] = r;
        setCheckResults((prev) => ({ ...(prev ?? {}), [entry.id]: r }));
      }

      const firstTaskWithErrorsId = taskEntries.find((entry) => {
        const res = allResults[entry.id];
        return res && (res.fachlich.length > 0 || res.sprachlich.length > 0 || res.guidelines.length > 0);
      })?.id;

      if (firstTaskWithErrorsId) {
        setSelectedTaskId(firstTaskWithErrorsId);
        setIsResultsPanelOpen(true);
      } else {
        alert('Keine Fehler in allen Aufgaben gefunden!');
      }
    } catch (e) {
      console.error('Batch-Prüfung fehlgeschlagen:', e);
      alert('Batch-Prüfung fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      setIsChecking(false);
    }
  }, [taskEntries, prompts, model, debug]);

  const handleApplyFix = useCallback(
    (errorToFix: ActionableError) => {
      if (!selectedEntry) return;

      const range = findRange(selectedEntry.markdown, errorToFix.original);
      if (!range) {
        alert('Originaltext konnte im Aufgaben-Markdown nicht eindeutig gefunden werden. Bitte manuell prüfen/übernehmen.');
        return;
      }

      const updatedMarkdown = replaceRange(selectedEntry.markdown, range, errorToFix.suggestion);
      const updatedBody = normalizeTaskBody(updatedMarkdown);
      handleTaskBodyUpdate(selectedEntry.index, updatedBody);

      setCheckResults((prevResults) => {
        if (!prevResults || !prevResults[selectedEntry.id]) {
          return prevResults;
        }

        const currentTaskResults = prevResults[selectedEntry.id]!;
        const isSameError = (e: ActionableError) =>
          e.original === errorToFix.original && e.suggestion === errorToFix.suggestion && e.explanation === errorToFix.explanation;

        return {
          ...prevResults,
          [selectedEntry.id]: {
            fachlich: currentTaskResults.fachlich.filter((e) => !isSameError(e)),
            sprachlich: currentTaskResults.sprachlich.filter((e) => !isSameError(e)),
            guidelines: currentTaskResults.guidelines.filter((e) => !isSameError(e)),
          },
        };
      });
    },
    [selectedEntry, handleTaskBodyUpdate]
  );

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        alert('Die Zwischenablage ist leer.');
        return;
      }
      const bodies = extractTaskBodies(text);
      if (!bodies.length) {
        alert('Im eingefügten Markdown konnten keine Aufgaben gefunden werden.');
        return;
      }
      resetTaskBodies(bodies);
      setSelectedTaskId(null);
      setCheckResults(null);
      setIsResultsPanelOpen(false);
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
      alert('Fehler beim Lesen aus der Zwischenablage. Bitte Berechtigungen prüfen.');
    }
  }, [resetTaskBodies]);

  const handleCopyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(combinedMarkdown);
      alert('Markdown wurde in die Zwischenablage kopiert!');
    } catch (err) {
      console.error('Failed to copy text: ', err);
      alert('Fehler beim Kopieren in die Zwischenablage.');
    }
  }, [combinedMarkdown]);

  const handleDeleteTask = useCallback(() => {
    if (!selectedEntry) return;
    setTaskBodies((prev) => prev.filter((_, idx) => idx !== selectedEntry.index));
    setCheckResults((prev) => {
      if (!prev) return prev;
      const copy = { ...prev } as Record<string, CheckResults | null>;
      delete copy[selectedEntry.id];
      return copy;
    });
    setIsResultsPanelOpen(false);
    setSelectedTaskId((prev) => (prev === selectedEntry.id ? null : prev));
  }, [selectedEntry, setTaskBodies]);

  const generateTasks = useCallback(
    async (count: number, instruction: string | null) => {
      const sanitizedCount = Number.isFinite(count) && count > 0 ? Math.floor(count) : 1;
      setIsCreating(true);
      try {
        const te = localStorage.getItem('explanationMarkdown') || '';
        const nextNumber = taskBodies.length + 1;

        if (sanitizedCount <= 1) {
          const system = 'Du erstellst eine einzelne Single-Choice-Aufgabe im vorgegebenen Markdown-Format. Antworte ausschließlich mit dem fertigen Markdown der Aufgabe, ohne zusätzliche Erklärungen.';
          const basePrompt = `${prompts.singleChoice}\n\nZusatzvorgaben:\n- Erzeuge exakt eine Aufgabe mit der Überschrift \"## Aufgabe ${nextNumber}\".\n- Verwende keine Inhalte, die bereits in den vorhandenen Aufgaben vorkommen.\n- Richte Inhalt thematisch am gegebenen Kontext (TE) aus, wenn sinnvoll.`;
          const userContext = `Kontext (TE):\n${te}\n\nBereits vorhandene Aufgaben (nur zur Vermeidung von Duplikaten):\n${combinedMarkdown}`;
          const userInstruction = instruction ? `\n\nZusätzliche Anforderungen des Nutzers:\n${instruction}` : '';

          const reply = await sendChat(
            [
              { role: 'system', content: system },
              { role: 'user', content: basePrompt + userInstruction },
              { role: 'user', content: userContext },
            ],
            model,
            debug
          );

          const trimmedReply = reply.trim();
          const extractedBodies = extractTaskBodies(trimmedReply);
          const newBody = extractedBodies[0] ?? normalizeTaskBody(trimmedReply);
          const newIndex = taskBodies.length;
          const newMarkdown = buildTaskMarkdown(newIndex, newBody);
          const parsed = parseMarkdownToTasks(newMarkdown)[0];

          setTaskBodies((prev) => [...prev, newBody]);
          if (parsed?.id) {
            setSelectedTaskId(parsed.id);
          }
        } else {
          const system = 'Du erstellst mehrere Single-Choice-Aufgaben im vorgegebenen Markdown-Format. Antworte ausschließlich mit dem fertigen Markdown der Aufgaben, ohne zusätzliche Erklärungen.';
          const basePromptSource = (prompts.multiSingleChoice && prompts.multiSingleChoice.trim().length > 0)
            ? prompts.multiSingleChoice
            : defaultMultiSingleChoicePrompt;
          const basePrompt = basePromptSource.replace(/\{\{COUNT\}\}/g, String(sanitizedCount));
          const additionalGuidelines = `\n\nZusatzvorgaben:\n- Beginne die Nummerierung bei \"## Aufgabe ${nextNumber}\" und erhöhe sie für jede weitere Aufgabe um 1.\n- Verwende keine Inhalte, die bereits in den vorhandenen Aufgaben vorkommen.\n- Richte Inhalt thematisch am gegebenen Kontext (TE) aus, wenn sinnvoll.`;
          const userContext = `Kontext (TE):\n${te}\n\nBereits vorhandene Aufgaben (nur zur Vermeidung von Duplikaten):\n${combinedMarkdown}`;
          const userInstruction = instruction ? `\n- Zusätzliche Anforderungen des Nutzers: ${instruction}` : '';

          const reply = await sendChat(
            [
              { role: 'system', content: system },
              {
                role: 'user',
                content: `${basePrompt}${additionalGuidelines}${userInstruction}`,
              },
              { role: 'user', content: userContext },
            ],
            model,
            debug
          );

          const trimmedReply = reply.trim();
          const extractedBodies = extractTaskBodies(trimmedReply);
          const desiredBodies = extractedBodies.slice(0, sanitizedCount).map((body) => normalizeTaskBody(body));

          if (!desiredBodies.length) {
            alert('Die generierte Antwort enthielt keine Aufgaben. Bitte erneut versuchen.');
            return;
          }

          if (desiredBodies.length < sanitizedCount) {
            alert(`Es wurden nur ${desiredBodies.length} von ${sanitizedCount} Aufgaben gefunden. Bitte prüfen oder erneut generieren.`);
          }

          const startIndex = taskBodies.length;
          setTaskBodies((prev) => [...prev, ...desiredBodies]);

          const parsedNewTasks = desiredBodies.map((body, idx) => {
            const markdown = buildTaskMarkdown(startIndex + idx, body);
            return parseMarkdownToTasks(markdown)[0];
          });

          const firstValidId = parsedNewTasks.find((task) => task?.id)?.id ?? `aufgabe-${startIndex}`;
          setSelectedTaskId(firstValidId);
        }
      } catch (e: any) {
        console.error('Neue Aufgabe erstellen fehlgeschlagen:', e);
        alert('Erstellen der neuen Aufgabe fehlgeschlagen. Bitte erneut versuchen.');
      } finally {
        setIsCreating(false);
        setIsCreateModalOpen(false);
      }
    },
    [combinedMarkdown, debug, model, prompts.singleChoice, prompts.multiSingleChoice, taskBodies.length]
  );

  const handleCreateTask = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  const handleCreateEmptyTask = useCallback(() => {
    const nextIndex = taskBodies.length;
    setTaskBodies((prev) => [...prev, '']);
    setSelectedTaskId(`aufgabe-${nextIndex}`);
    setIsCreateModalOpen(false);
    setIsResultsPanelOpen(false);
  }, [setTaskBodies, taskBodies.length, setSelectedTaskId, setIsCreateModalOpen, setIsResultsPanelOpen]);

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
          taskMarkdown={selectedTaskBody}
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
          onGenerate={(count, instruction) => generateTasks(count, instruction)}
          onCreateEmpty={handleCreateEmptyTask}
        />
        <CheckResultsPanel
          isOpen={isResultsPanelOpen}
          onClose={() => setIsResultsPanelOpen(false)}
          results={selectedEntry ? checkResults?.[selectedEntry.id] ?? null : null}
          onApplyFix={handleApplyFix}
        />
        <AIChatPanel
          isOpen={isAIEditOpen}
          docked
          supportsPrompts
          onClose={() => setIsAIEditOpen(false)}
          contextLabel={selectedTask ? selectedTask.title : 'Aufgabe'}
          contextMarkdown={selectedTaskMarkdown}
          onReplace={(updated) => handleTaskMarkdownChange(updated)}
        />
      </main>
    </div>
  );
};
