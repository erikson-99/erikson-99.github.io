import React from 'react';
import { Task } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface TaskCardProps {
  task: Task;
}

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${className || 'text-green-500'}`} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${className || 'text-red-500'}`} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
);


export const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const getOptionStyles = (isCorrect: boolean) => {
    return {
      containerClasses: isCorrect
        ? 'bg-green-500/10 border-green-500/30 text-green-300'
        : 'bg-red-500/10 border-red-500/30 text-red-300',
      iconClassName: isCorrect ? 'text-green-400' : 'text-red-400',
    };
  };

  return (
    <div id={task.id} className="bg-gray-900 rounded-xl shadow-2xl overflow-hidden border border-gray-700 transition-shadow duration-300 hover:shadow-sky-500/20">
      <div className="p-6">
        <h3 className="text-xl font-bold text-sky-400 mb-4">{task.title}</h3>
        <MarkdownRenderer text={task.question} className="text-gray-300 mb-6" />
        
        <div className="space-y-3">
          {task.options.map((option) => {
            const styles = getOptionStyles(option.isCorrect);
            return (
              <div
                key={option.id}
                className={`flex items-center p-3 rounded-lg border ${styles.containerClasses}`}
              >
                {option.isCorrect 
                  ? <CheckIcon className={styles.iconClassName} /> 
                  : <XIcon className={styles.iconClassName} />
                }
                <span className="flex-1">
                  <MarkdownRenderer text={option.text} />
                </span>
              </div>
            );
          })}
        </div>
        
        {task.explanation && (
          <div className="mt-6 p-4 bg-gray-800 border-l-4 border-yellow-500 rounded-r-lg">
            <h4 className="font-semibold text-yellow-400 mb-2">Erklärung</h4>
            <MarkdownRenderer text={task.explanation} className="text-gray-400" />
          </div>
        )}
      </div>
    </div>
  );
};
