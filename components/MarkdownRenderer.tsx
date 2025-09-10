
import React from 'react';

interface MarkdownRendererProps {
    text: string;
    className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ text, className }) => {
  if (!text) return null;

  const createMarkup = (rawText: string) => {
    let html = rawText;

    const renderCellContent = (text: string) => text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^- \[x\] (.*)/gm, '<span class="text-green-400 font-bold flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1 inline" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>$1</span>')
        .replace(/______/g, '<span class="block border-b-2 border-dotted border-gray-500 w-full h-6 my-2"></span>');

    // Process tables first to handle their structure correctly before line breaks are added
    const tableRegex = /^(\s*\|.*)\r?\n\|(?:\s*:?-+:?\s*\|)+[\r\n]+((?:\|.*(?:[\r\n]|$))*)/gm;
    html = html.replace(tableRegex, (match, headerLine, bodyLines) => {
        let table = '<table class="w-full my-4 text-left border-collapse">';
        table += '<thead><tr class="border-b-2 border-gray-600 bg-gray-800">';
        headerLine.split('|').slice(1, -1).forEach(cell => {
            table += `<th class="p-3">${renderCellContent(cell.trim())}</th>`;
        });
        table += '</tr></thead>';

        table += '<tbody>';
        bodyLines.trim().split(/[\r\n]+/).forEach(rowLine => {
            if (!rowLine.trim()) return;
            table += '<tr class="border-b border-gray-700">';
            rowLine.split('|').slice(1, -1).forEach(cell => {
                table += `<td class="p-3 align-top">${renderCellContent(cell.trim())}</td>`;
            });
            table += '</tr>';
        });
        table += '</tbody></table>';
        return table;
    });

    // Process the rest of the markdown
    html = html
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-sky-400 mb-2">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold text-sky-400 mb-2">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold text-sky-400 mb-2">$1</h3>')
      .replace(/^---$/gm, '<hr class="my-4 border-gray-700"/>')
      .replace(/______/g, '<span class="block border-b-2 border-dotted border-gray-500 w-full h-6 my-2"></span>')
      .replace(/\n/g, '<br />');

    return { __html: html };
  };

  return <div className={className} dangerouslySetInnerHTML={createMarkup(text)} />;
};
