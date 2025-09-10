
import React from 'react';
import { Task } from '../types';
import { TaskCard } from './TaskCard';

interface FrontendViewProps {
  task: Task | null;
}

export const FrontendView: React.FC<FrontendViewProps> = ({ task }) => {
  return (
    <div className="p-4 md:p-8 bg-gray-800 h-full">
      {task ? (
        <TaskCard task={task} />
      ) : (
        <div className="flex items-center justify-center h-full text-center text-gray-500">
          <div>
            <h3 className="text-2xl font-semibold">Keine Aufgabe ausgewählt.</h3>
            <p>Wählen Sie eine Aufgabe aus der Seitenleiste aus, um sie hier anzuzeigen.</p>
          </div>
        </div>
      )}
    </div>
  );
};
