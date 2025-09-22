import React, { useEffect, useState } from 'react';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (count: number, instruction: string | null) => void;
  onCreateEmpty: () => void;
}

export const NewTaskModal: React.FC<NewTaskModalProps> = ({ isOpen, onClose, onGenerate, onCreateEmpty }) => {
  const [text, setText] = useState('');
  const [count, setCount] = useState<number>(1);

  useEffect(() => {
    if (isOpen) {
      setText('');
      setCount(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-[92%] max-w-xl p-4">
        <h3 className="text-lg font-bold text-white mb-2">Neue Aufgabe erstellen</h3>
        <p className="text-sm text-gray-400 mb-3">Optional: Beschreibe kurz, welche Art von Aufgabe du möchtest (Thema, Schwierigkeitsgrad, Format). Leer lassen, um die Standardvorgaben zu verwenden.</p>
        <textarea
          className="w-full h-32 bg-gray-800 border border-gray-700 rounded-md p-2 text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-sky-500"
          placeholder="z. B. Single-Choice zu Pressverbindungen (Grundlagen), mittel, Fokus auf Sicherheitsaspekte"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="mt-3 flex items-center justify-between">
          <label htmlFor="task-count" className="text-sm text-gray-300 font-medium">
            Anzahl Aufgaben
          </label>
          <input
            id="task-count"
            type="number"
            min={1}
            max={10}
            value={count}
            onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
            className="w-24 bg-gray-800 border border-gray-700 rounded-md p-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 text-right"
          />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={onCreateEmpty}
            className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-500"
          >
            Leere Aufgabe
          </button>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
            >
              Abbrechen
            </button>
            <button
              onClick={() => onGenerate(count, text.trim() ? text.trim() : null)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-500"
            >
              Generieren
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
