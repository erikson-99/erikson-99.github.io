import { Task, Option, ExplanationSection, TaskSet } from '../types';

export const parseMarkdownToTasks = (markdown: string): Task[] => {
    if (!markdown.trim()) return [];

    const tasks: Task[] = [];
    const taskBlocks = markdown.split(/\n## /).slice(1);
    
    taskBlocks.forEach((block, index) => {
        const lines = block.split('\n');
        const title = lines[0].trim();
        const uniqueId = `aufgabe-${title.match(/\d+/)?.[0] || index}-${index}`;
        
        const content = lines.slice(1).join('\n');

        const explanationMatch = content.match(/(?:\*\*Erklärung:\*\*|### Erklärung)\s*([\s\S]*)/);
        const explanation = explanationMatch ? explanationMatch[1].trim() : '';

        let questionAndOptions = explanationMatch ? content.substring(0, explanationMatch.index).trim() : content.trim();

        const correctAnswerMatch = questionAndOptions.match(/Richtige Antwort:\s*([A-Z])/);
        const correctLetter = correctAnswerMatch ? correctAnswerMatch[1] : '';

        // Remove the "Richtige Antwort" line from the content
        if(correctAnswerMatch) {
            questionAndOptions = questionAndOptions.replace(correctAnswerMatch[0], '').trim();
        }

        const optionRegex = /^(?:[A-Z]\. |- \[[x\s]\])\s*.*$/gm;
        const optionMatches = questionAndOptions.match(optionRegex);
        
        let questionText = questionAndOptions;
        if(optionMatches){
            const firstOptionIndex = questionAndOptions.indexOf(optionMatches[0]);
            if (firstOptionIndex !== -1) {
              questionText = questionAndOptions.substring(0, firstOptionIndex).trim();
            }
        }
        
        const options: Option[] = optionMatches ? optionMatches.map((optLine, optIndex) => {
            const line = optLine.trim();
            if (/^[A-Z]\.\s/.test(line)) {
                const letter = line.charAt(0);
                return {
                    id: `${uniqueId}-opt-${letter}`,
                    text: line.substring(3).trim(),
                    isCorrect: letter === correctLetter,
                };
            }
            if (/^- \[[x\s]\]/.test(line)) {
                return {
                    id: `${uniqueId}-opt-${optIndex}`,
                    text: line.replace(/^- \[[x\s]\]\s*/, '').trim(),
                    isCorrect: line.includes('[x]'),
                };
            }
            return null;
        }).filter((opt): opt is Option => opt !== null) : [];

        if(title) {
            tasks.push({
                id: uniqueId,
                title,
                question: questionText,
                options,
                explanation,
            });
        }
    });

    return tasks;
};

export const parseMarkdownToExplanationSections = (markdown: string): ExplanationSection[] => {
    if (!markdown.trim()) return [];

    const sections: ExplanationSection[] = [];
    // Split on a newline that is followed by a markdown heading or a thematic break (---)
    const sectionBlocks = markdown.split(/\n(?=#{1,6} |---)/);
    
    sectionBlocks.forEach((block, index) => {
        if (block.trim() === '') return;

        const trimmedBlock = block.trim();
        const lines = trimmedBlock.split('\n');
        let rawTitle = `Abschnitt ${index + 1}`; // Default title

        // Logic to extract a raw, untruncated title
        if (lines[0].startsWith('#')) {
            rawTitle = lines[0].replace(/#{1,6}\s*/, '').trim();
        } else if (lines[0].startsWith('---')) {
            if (lines.length > 1 && lines[1].startsWith('#')) {
              rawTitle = lines[1].replace(/#{1,6}\s*/, '').trim();
            }
        } else {
             // Use the first line as a preview, cleaning up markdown characters
             const firstLine = lines[0].trim();
             rawTitle = firstLine.replace(/[\*_`#]/g, '');
        }

        // Now, truncate the rawTitle if it's too long
        const TITLE_LIMIT = 40;
        let finalTitle = rawTitle;
        if (rawTitle.length > TITLE_LIMIT) {
            finalTitle = rawTitle.substring(0, TITLE_LIMIT).trimEnd() + '...';
        }
        
        sections.push({
            id: `section-${index}`,
            title: finalTitle,
            markdown: block,
        });
    });

    return sections;
};

export const parseMarkdownToTaskSets = (markdown: string): TaskSet[] => {
    if (!markdown.trim()) return [];

    const taskSets: TaskSet[] = [];
    const taskSetBlocks = markdown.split(/(?=^## \*\*Aufgabensatz:.*)/m).filter(b => b.trim());

    taskSetBlocks.forEach((setBlock, setIndex) => {
        const setLines = setBlock.trim().split('\n');
        const setTitleLine = setLines[0];
        
        const setTitle = setTitleLine.replace(/^## \*\*/, '').replace(/\*\*$/, '').trim();

        const setId = `set-${setIndex}`;

        const setContent = setLines.slice(1).join('\n');
        const taskBlocks = setContent.split(/(?=^## Aufgabe \d+)/m).filter(b => b.trim());
        
        const tasks: Task[] = [];
        taskBlocks.forEach((taskBlock, taskIndex) => {
            const cleanedTaskBlock = taskBlock.trim().replace(/---\s*$/, '').trim();
            const taskLines = cleanedTaskBlock.split('\n');
            const taskTitle = taskLines[0].replace(/^## /, '').trim();
            const taskId = `${setId}-task-${taskIndex}`;

            const taskContent = taskLines.slice(1).join('\n');

            const explanationMatch = taskContent.match(/### Erklärung\s*([\s\S]*)/m);
            let explanation = explanationMatch ? explanationMatch[1].trim() : '';

            let questionPart = explanationMatch ? taskContent.substring(0, explanationMatch.index).trim() : taskContent.trim();
            
            const solutionPromptMatch = questionPart.match(/\(Solution prompt: "([\s\S]*?)"\)/m);
            if (solutionPromptMatch) {
                const solutionPromptText = solutionPromptMatch[1].trim().replace(/\n/g, '<br />');
                explanation = `<div class="p-3 bg-gray-700/50 rounded-md my-2"><h4 class="font-bold text-sm uppercase text-gray-400">Lösungshinweis</h4><p class="font-mono text-xs mt-2">${solutionPromptText}</p></div>` + explanation;
                questionPart = questionPart.replace(solutionPromptMatch[0], '').trim();
            }

            tasks.push({
                id: taskId,
                title: taskTitle,
                question: questionPart,
                options: [],
                explanation: explanation,
            });
        });

        if (tasks.length > 0) {
            taskSets.push({
                id: setId,
                title: setTitle,
                tasks: tasks,
            });
        }
    });

    return taskSets;
};
