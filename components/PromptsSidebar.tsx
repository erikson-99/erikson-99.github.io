import React from 'react';

export interface PromptSidebarItem {
  id: string;
  title: string;
  deletable?: boolean;
}

interface PromptsSidebarProps {
  items: PromptSidebarItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  onPasteSelected: () => void;
  onCopySelected: () => void;
  onAddPrompt: () => void;
  onDeletePrompt: (id: string) => void;
  onRenamePrompt: (id: string) => void;
}

export const PromptsSidebar: React.FC<PromptsSidebarProps> = ({
  items,
  selectedId,
  onSelect,
  onPasteSelected,
  onCopySelected,
  onAddPrompt,
  onDeletePrompt,
  onRenamePrompt,
}) => {
  return (
    <aside className="w-72 bg-gray-900 border-r border-gray-700 flex flex-col shadow-lg">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold text-white">Prompts</h1>
        <span className="text-sm text-gray-400">{items.length} Einträge</span>
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
          <button
            onClick={onAddPrompt}
            className="w-full flex items-center justify-center px-4 py-2 bg-emerald-600 text-white font-semibold rounded-md hover:bg-emerald-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            title="Neuen Prompt anlegen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Neu
          </button>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto">
        <ul className="p-2 space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <div
                className={`flex items-center rounded-md transition-colors duration-200 ${
                  item.id === selectedId ? 'bg-sky-700 text-white' : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                }`}
              >
                <button
                  onClick={() => onSelect(item.id)}
                  className="flex-1 text-left px-4 py-2 truncate"
                  aria-current={item.id === selectedId ? 'page' : undefined}
                >
                  {item.title}
                </button>
                {item.deletable && (
                  <div className="flex items-center pr-2 space-x-1">
                    <button
                      onClick={() => onRenamePrompt(item.id)}
                      className="p-1 text-xs text-gray-300 hover:text-white"
                      title="Umbenennen"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M5 13l4 4-9 1 1-9 4-4 4 4-4 4z" />
                        <path d="M12.586 2.586a2 2 0 012.828 0l2 2a2 2 0 010 2.828l-7.586 7.586L5 11l7.586-7.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDeletePrompt(item.id)}
                      className="p-1 text-xs text-gray-300 hover:text-white"
                      title="Löschen"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-1 1v1H5a1 1 0 100 2h10a1 1 0 100-2h-3V3a1 1 0 00-1-1H9zm-3 6a1 1 0 011 1v7a1 1 0 102 0V9a1 1 0 112 0v7a1 1 0 102 0V9a1 1 0 112 0v7a3 3 0 01-3 3H9a3 3 0 01-3-3V9z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};
