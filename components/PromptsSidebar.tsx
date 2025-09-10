import React from 'react';

type PromptId = 'review' | 'single-choice';

interface Item {
  id: PromptId;
  title: string;
}

interface PromptsSidebarProps {
  selectedId: PromptId;
  onSelect: (id: PromptId) => void;
  onPasteSelected: () => void;
  onCopySelected: () => void;
}

const ITEMS: Item[] = [
  { id: 'review', title: 'Review Prompt' },
  { id: 'single-choice', title: 'Single-Choice Prompt' },
];

export const PromptsSidebar: React.FC<PromptsSidebarProps> = ({ selectedId, onSelect, onPasteSelected, onCopySelected }) => {
  return (
    <aside className="w-72 bg-gray-900 border-r border-gray-700 flex flex-col shadow-lg">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold text-white">Prompts</h1>
        <span className="text-sm text-gray-400">{ITEMS.length} Prompt</span>
        <div className="mt-4 space-y-2">
          <button
            onClick={onPasteSelected}
            className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
            title="Inhalt aus der Zwischenablage einfügen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Einfügen
          </button>
          <button
            onClick={onCopySelected}
            className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
            title="Prompt in die Zwischenablage kopieren"
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
          {ITEMS.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onSelect(item.id)}
                className={`w-full text-left px-4 py-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  item.id === selectedId ? 'bg-sky-700 text-white' : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                }`}
                aria-current={item.id === selectedId ? 'page' : undefined}
              >
                <span className="truncate pr-2">{item.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};
