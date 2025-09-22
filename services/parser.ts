import { Task, Option, ExplanationSection, TaskSet, LessonDocument, LessonSlide } from '../types';

export const parseMarkdownToTasks = (markdown: string): Task[] => {
    if (!markdown.trim()) return [];

    const tasks: Task[] = [];
    const headerRegex = /^##\s+Aufgabe[^\n]*/gm;
    const headers = Array.from(markdown.matchAll(headerRegex));

    headers.forEach((match, index) => {
        const blockStart = match.index ?? 0;
        const nextStart = index + 1 < headers.length ? headers[index + 1].index ?? markdown.length : markdown.length;
        const rawBlock = markdown.slice(blockStart, nextStart).trim();

        const lines = rawBlock.split('\n');
        const titleLine = lines[0] ?? '';
        const title = titleLine.replace(/^##\s+/, '').trim();
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

export const parseMarkdownToLesson = (markdown: string): LessonDocument => {
    const source = markdown ?? '';
    if (!source.trim()) {
        return { title: '', slides: [] };
    }

    const lessonTitleMatch = source.match(/^#\s+(.+)$/m);
    const lessonTitle = lessonTitleMatch ? lessonTitleMatch[1].trim() : 'Lektion';

    const headerRegex = /^##\s+Folie[^\n]*/gm;
    const headers = Array.from(source.matchAll(headerRegex));
    const slides: LessonSlide[] = [];

    headers.forEach((match, index) => {
        const rawHeader = match[0];
        const blockStart = index === 0 ? 0 : match.index;
        const nextStart = index + 1 < headers.length ? headers[index + 1].index : source.length;
        const block = source.slice(blockStart, nextStart);

        const labelLineMatch = rawHeader.match(/^##\s+(.+)$/m);
        const label = labelLineMatch ? labelLineMatch[1].trim() : `Folie ${index + 1}`;

        const titleLine = block
            .split('\n')
            .map(l => l.trim())
            .find((line, i) => {
                if (i === 0) return false;
                return /^#{1,6}\s+/.test(line) && !/^##\s+Folie/i.test(line);
            });

        const cleanedTitle = titleLine
            ? titleLine.replace(/^#{1,6}\s+/, '').trim()
            : label;

        const displayTitle = titleLine ? `${label} – ${cleanedTitle}` : label;

        slides.push({
            id: `slide-${index}`,
            label,
            title: cleanedTitle,
            displayTitle,
            markdown: block.trimStart(),
            start: blockStart,
            end: nextStart,
        });
    });

    if (slides.length === 0) {
        return {
            title: lessonTitle,
            slides: [
                {
                    id: 'slide-0',
                    label: 'Gesamtes Dokument',
                    title: lessonTitle || 'Lektionen-Markdown',
                    displayTitle: lessonTitle || 'Lektionen-Markdown',
                    markdown: source,
                    start: 0,
                    end: source.length,
                },
            ],
        };
    }

    // Adjust first slide markdown to include leading content (e.g. # Lektion) if not already included
    if (slides[0].start === 0) {
        const firstBlock = source.slice(slides[0].start, slides[0].end);
        slides[0] = {
            ...slides[0],
            markdown: firstBlock,
        };
    }

    for (let i = 1; i < slides.length; i++) {
        const block = source.slice(slides[i].start, slides[i].end);
        slides[i] = {
            ...slides[i],
            markdown: block,
        };
    }

    return {
        title: lessonTitle,
        slides,
    };
};
