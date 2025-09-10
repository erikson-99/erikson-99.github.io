import React from 'react';
import { Task, CheckResults } from '../types';
import { Spinner } from './Spinner';


interface SidebarProps {
  tasks: Task[];
  onTaskSelect: (taskId: string) => void;
  selectedTaskId: string | null;
  onCheckAllTasks: () => void;
  isChecking: boolean;
  checkResults: Record<string, CheckResults | null> | null;
  onPasteFromClipboard: () => void;
  onCopyToClipboard: () => void;
}

const StatusIndicator: React.FC<{ results: CheckResults | null | undefined }> = ({ results }) => {
    if (results === undefined) return null; // Not checked yet
    if (results === null) return null; // In progress, but global spinner is enough

    const hasErrors = results.fachlich.length > 0 || results.sprachlich.length > 0 || results.guidelines.length > 0;

    if (hasErrors) {
        return <span className="w-3 h-3 bg-yellow-400 rounded-full flex-shrink-0" title="Fehler gefunden"></span>;
    }

    return <span className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0" title="Geprüft & fehlerfrei"></span>;
};


export const Sidebar: React.FC<SidebarProps> = ({ tasks, onTaskSelect, selectedTaskId, onCheckAllTasks, isChecking, checkResults, onPasteFromClipboard, onCopyToClipboard }) => {
  return (
    <aside className="w-72 bg-gray-900 border-r border-gray-700 flex flex-col shadow-lg">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold text-white">Aufgabenübersicht</h1>
        <span className="text-sm text-gray-400">{tasks.length} Aufgaben geladen</span>
         <div className="mt-4 space-y-2">
            <button
                onClick={onCheckAllTasks}
                disabled={isChecking}
                className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
                {isChecking ? <Spinner /> : null}
                Alle Aufgaben prüfen
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
          {tasks.map((task) => (
            <li key={task.id}>
              <button
                onClick={() => onTaskSelect(task.id)}
                className={`w-full text-left px-4 py-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  task.id === selectedTaskId
                    ? 'bg-sky-700 text-white'
                    : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                }`}
                aria-current={task.id === selectedTaskId ? 'page' : undefined}
              >
                <div className="flex justify-between items-center">
                    <span className="truncate pr-2">{task.title}</span>
                    <StatusIndicator results={checkResults?.[task.id]} />
                </div>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};