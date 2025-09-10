import React, { useEffect, useMemo, useRef } from 'react';
import { ExplanationSection } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { TextRange } from '../services/utils/textRanges';
import { MarkdownView } from './MarkdownView';
import { ExplanationPreview } from './ExplanationPreview';
import { ToggleSwitch } from './ToggleSwitch';
import { Spinner } from './Spinner';

interface ExplanationViewerProps {
  section: ExplanationSection | null;
  viewMode: 'preview' | 'markdown';
  setViewMode: (mode: 'preview' | 'markdown') => void;
  sectionMarkdown: string;
  onSectionMarkdownChange: (markdown: string) => void;
  onCheckSection: () => void;
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
                id="ex-viewer-view-toggle"
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
export { ExplanationViewer };
