import React, { useState } from 'react';
import { Task } from '../types';
import { FrontendView } from './FrontendView';
import { MarkdownView } from './MarkdownView';
import { ToggleSwitch } from './ToggleSwitch';
import { Spinner } from './Spinner';

interface TaskViewerProps {
  task: Task | null;
  viewMode: 'frontend' | 'markdown';
  setViewMode: (mode: 'frontend' | 'markdown') => void;
  taskMarkdown: string;
  onTaskMarkdownChange: (markdown: string) => void;
  onCheckTask: () => void;
  isChecking: boolean;
  onDeleteTask?: () => void;
  onCreateTask?: () => void;
  isCreating?: boolean;
  onOpenAIEdit?: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const TaskViewer: React.FC<TaskViewerProps> = ({
  task,
  viewMode,
  setViewMode,
  taskMarkdown,
  onTaskMarkdownChange,
  onCheckTask,
  isChecking,
  onDeleteTask,
  onCreateTask,
  isCreating,
  onOpenAIEdit,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}) => {
  return (
    <div className="flex-1 flex flex-col bg-gray-800">
      <header className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-700 shadow-md z-10">
        <h2 className="text-2xl font-bold text-white truncate pr-4">
          {task ? task.title : (viewMode === 'frontend' ? 'Vorschau' : 'Markdown Editor')}
        </h2>
        <div className="flex items-center space-x-4 flex-shrink-0">
          {onDeleteTask && (
            <button
              onClick={onDeleteTask}
              disabled={!task}
              className="flex items-center justify-center px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              Löschen
            </button>
          )}
          {onCreateTask && (
            <button
              onClick={onCreateTask}
              disabled={!!isCreating}
              className="flex items-center justify-center px-4 py-2 bg-emerald-600 text-white font-semibold rounded-md hover:bg-emerald-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {isCreating ? (
                <>
                  <Spinner />
                  Neue Aufgabe...
                </>
              ) : (
                'Neue Aufgabe'
              )}
            </button>
          )}
          <button
            onClick={onOpenAIEdit}
            disabled={!task}
            className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            AI-Edit
          </button>
          <button
            onClick={onCheckTask}
            disabled={isChecking || !task}
            className="flex items-center justify-center px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            {isChecking ? (
              <>
                <Spinner />
                Prüfung läuft...
              </>
            ) : (
              'Check Aufgabe'
            )}
          </button>
            <span className="text-gray-400">Markdown</span>
            <ToggleSwitch 
                id="task-view-toggle"
                checked={viewMode === 'frontend'}
                onChange={(isChecked) => setViewMode(isChecked ? 'frontend' : 'markdown')}
            />
            <span className="text-gray-400">Vorschau</span>
        </div>
      </header>
      <div className="flex-1 overflow-auto">
        {viewMode === 'frontend' ? (
          <FrontendView task={task} />
        ) : (
          <MarkdownView 
            value={taskMarkdown} 
            onChange={onTaskMarkdownChange}
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
