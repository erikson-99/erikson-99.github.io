
import React from 'react';
import { CheckResults, ActionableError } from '../types';

interface CheckResultsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    results: CheckResults | null;
    onApplyFix: (error: ActionableError) => void;
    onGoToError?: (error: ActionableError) => void;
}

interface ErrorCardProps {
    error: ActionableError;
    onApply: () => void;
    onGoToError?: () => void;
}

const ErrorCard: React.FC<ErrorCardProps> = ({ error, onApply, onGoToError }) => {
    const explanation = (error?.explanation ?? '').toString().trim();
    const originalRaw = (error?.original ?? '').toString().trim();
    const suggestion = (error?.suggestion ?? '').toString().trim();
    const isGenericOriginal = /^(Aufgabe\s*\d+\s*(–|-)?\s*(Aufgabenstellung|Erklärung|Alt[- ]?Text)?)$/i.test(originalRaw)
        || ["Aufgabenstellung","Erklärung","Alt-Text","Alt Text","Abschnitt"].includes(originalRaw);
    const displayOriginal = isGenericOriginal && explanation.length >= 6 ? explanation : originalRaw;
    return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col space-y-3">
            <p className="text-gray-300 text-sm">{explanation || '—'}</p>
            {isGenericOriginal && originalRaw && (
                <div className="text-xs text-gray-400">Stelle: {originalRaw}</div>
            )}
            <div className="bg-gray-900 rounded-md p-3 font-mono text-sm">
                <del className="text-red-400 bg-red-500/10 px-1 rounded-sm whitespace-pre-wrap">{displayOriginal || '—'}</del>
                <ins className="text-green-400 bg-green-500/10 px-1 rounded-sm no-underline ml-2 whitespace-pre-wrap">{suggestion || '—'}</ins>
            </div>

            {error.sources && error.sources.length > 0 && (
                <div className="pt-2 border-t border-gray-700/50">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Quellen</h4>
                    <ul className="space-y-1">
                        {error.sources.map((source, index) => (
                            <li key={index}>
                                <a 
                                    href={source} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-sky-400 hover:text-sky-300 hover:underline text-sm truncate block"
                                    title={source}
                                >
                                    {source}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="self-end flex items-center space-x-2">
                 {onGoToError && (
                    <button
                        onClick={onGoToError}
                        className="px-3 py-1 bg-gray-600 text-white font-semibold rounded-md text-sm hover:bg-gray-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    >
                        Gehe zu
                    </button>
                )}
                <button
                    onClick={onApply}
                    className="px-3 py-1 bg-sky-600 text-white font-semibold rounded-md text-sm hover:bg-sky-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
                    Anwenden
                </button>
            </div>
        </div>
    );
};

interface ResultSectionProps {
    title: string;
    errors: ActionableError[];
    onApplyFix: (error: ActionableError) => void;
    onGoToError?: (error: ActionableError) => void;
}

const ResultSection: React.FC<ResultSectionProps> = ({ title, errors, onApplyFix, onGoToError }) => (
    <details className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden" open>
        <summary className="px-5 py-3 text-lg font-semibold text-sky-300 cursor-pointer hover:bg-gray-700/50 transition-colors flex justify-between items-center">
            <span>{title}</span>
            <span className={`px-2.5 py-0.5 text-sm font-medium rounded-full ${errors.length > 0 ? 'bg-yellow-500 text-gray-900' : 'bg-green-500 text-white'}`}>
                {errors.length}
            </span>
        </summary>
        <div className="p-4 border-t border-gray-700">
            {errors.length > 0 ? (
                <div className="space-y-4">
                    {errors.map((error, index) => (
                        <ErrorCard 
                            key={index} 
                            error={error} 
                            onApply={() => onApplyFix(error)}
                            onGoToError={onGoToError ? () => onGoToError(error) : undefined}
                        />
                    ))}
                </div>
            ) : (
                <p className="text-gray-400 px-2">Keine Fehler in dieser Kategorie gefunden.</p>
            )}
        </div>
    </details>
);

import { useDebug } from '../contexts/DebugContext';

export const CheckResultsPanel: React.FC<CheckResultsPanelProps> = ({ isOpen, onClose, results, onApplyFix, onGoToError }) => {
    const { debug } = useDebug();
    return (
        <aside className={`flex-shrink-0 h-full bg-gray-900 shadow-2xl transition-all duration-300 ease-in-out ${isOpen ? 'w-full md:w-1/2 lg:w-2/5 border-l-2 border-sky-500' : 'w-0 overflow-hidden'}`}>
            <div className="flex flex-col h-full">
                <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
                    <h2 className="text-2xl font-bold text-white">Prüfergebnisse</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 rounded-full hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-white"
                        aria-label="Ergebnispanel schließen"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>
                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                    {!results ? (
                        <div className="flex items-center justify-center h-full">
                           <p className="text-gray-500">Ergebnisse werden geladen...</p>
                        </div>
                    ) : (
                        <>
                            {debug && (
                              <details className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
                                <summary className="px-5 py-3 text-sm font-semibold text-gray-300 cursor-pointer hover:bg-gray-700/50">Debug: Rohdaten anzeigen</summary>
                                <pre className="p-4 text-xs text-gray-200 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(results, null, 2)}</pre>
                              </details>
                            )}
                            <ResultSection title="Fachliche Prüfung" errors={results.fachlich} onApplyFix={onApplyFix} onGoToError={onGoToError}/>
                            <ResultSection title="Sprachliche Prüfung" errors={results.sprachlich} onApplyFix={onApplyFix} onGoToError={onGoToError}/>
                            <ResultSection title="Guideline Prüfung" errors={results.guidelines} onApplyFix={onApplyFix} onGoToError={onGoToError}/>
                        </>
                    )}
                </div>
            </div>
        </aside>
    );
};
