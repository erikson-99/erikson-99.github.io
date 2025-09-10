import React, { useEffect, useMemo, useRef } from 'react';
import { ExplanationSection } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { TextRange } from '../services/utils/textRanges';

interface ExplanationPreviewProps {
    section: ExplanationSection | null;
    highlightedRange: TextRange | null;
}

export const ExplanationPreview: React.FC<ExplanationPreviewProps> = ({ section, highlightedRange }) => {
    const previewRef = useRef<HTMLDivElement>(null);

    const markdownToRender = useMemo(() => {
        if (!section) return '';
        if (!highlightedRange) return section.markdown;

        const { start, end } = highlightedRange;
        const md = section.markdown;
        const markTagStart = '<mark data-goto-target="true" class="bg-yellow-500/50 rounded px-1">';
        return md.slice(0, start) + markTagStart + md.slice(start, end) + '</mark>' + md.slice(end);
    }, [section, highlightedRange]);

    useEffect(() => {
        if (highlightedRange && previewRef.current) {
            const markElement = previewRef.current.querySelector('mark[data-goto-target="true"]');
            if (markElement) {
                markElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [highlightedRange, markdownToRender]);

    return (
        <div ref={previewRef} className="bg-gray-800 h-full overflow-y-auto">
            <div className="p-6 md:p-8 max-w-4xl mx-auto">
                <div className="bg-gray-900 border border-gray-700 rounded-lg">
                    <div className="p-6 md:p-8">
                        {section ? (
                            <div className="prose prose-invert prose-lg max-w-none">
                                <MarkdownRenderer 
                                    text={markdownToRender} 
                                    className="text-gray-300" 
                                />
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-center text-gray-500 py-10">
                                <div>
                                    <h3 className="text-2xl font-semibold">Kein Abschnitt ausgewählt.</h3>
                                    <p>Wählen Sie einen Abschnitt aus der Seitenleiste aus, um ihn hier anzuzeigen.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
