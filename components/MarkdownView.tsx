

import React, { useRef } from 'react';

interface MarkdownViewProps {
  value: string;
  onChange: (value: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ value, onChange, onUndo, onRedo, canUndo, canRedo }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wrapSelection = (prefix: string, suffix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = textarea.value;

    const selectedText = currentValue.substring(start, end);

    const textBeforeSelection = currentValue.substring(start - prefix.length, start);
    const textAfterSelection = currentValue.substring(end, end + suffix.length);

    // Unwrap if the selection is already wrapped
    if (textBeforeSelection === prefix && textAfterSelection === suffix) {
      const newText = currentValue.substring(0, start - prefix.length) + selectedText + currentValue.substring(end + suffix.length);
      onChange(newText);
      
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start - prefix.length;
          textareaRef.current.selectionEnd = end - prefix.length;
          textareaRef.current.focus();
        }
      });
    } else { // Wrap
      let newText;
      let newSelectionStart;
      let newSelectionEnd;
      
      if (selectedText) {
        newText = `${currentValue.substring(0, start)}${prefix}${selectedText}${suffix}${currentValue.substring(end)}`;
        newSelectionStart = start + prefix.length;
        newSelectionEnd = end + prefix.length;
      } else {
        newText = `${currentValue.substring(0, start)}${prefix}${suffix}${currentValue.substring(end)}`;
        newSelectionStart = start + prefix.length;
        newSelectionEnd = start + prefix.length;
      }

      onChange(newText);

      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = newSelectionStart;
          textareaRef.current.selectionEnd = newSelectionEnd;
          textareaRef.current.focus();
        }
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Check for Ctrl key on Windows/Linux and Meta key (Cmd) on macOS
    const isModifierKeyPressed = e.ctrlKey || e.metaKey;

    if (isModifierKeyPressed) {
        const key = e.key.toLowerCase();

        switch (key) {
            case 'z':
                if (e.shiftKey) {
                    if (canRedo) {
                        e.preventDefault();
                        onRedo();
                    }
                } else {
                    if (canUndo) {
                        e.preventDefault();
                        onUndo();
                    }
                }
                break;
            case 'y':
                if (canRedo) {
                    e.preventDefault();
                    onRedo();
                }
                break;
            case 'b':
                e.preventDefault();
                wrapSelection('**', '**');
                break;
            case 'i':
                e.preventDefault();
                wrapSelection('*', '*');
                break;
            default:
                // Do nothing for other key combinations
                break;
        }
    }
  }

  return (
    <div className="p-4 h-full">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full h-full p-4 bg-gray-900 border border-gray-600 rounded-lg text-gray-200 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-sky-500 transition-shadow"
        placeholder="Schreiben Sie hier Ihr Quiz-Markdown..."
        spellCheck="false"
      />
    </div>
  );
};
