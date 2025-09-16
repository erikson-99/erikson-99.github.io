"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMarkdownToLesson = exports.parseMarkdownToTaskSets = exports.parseMarkdownToExplanationSections = exports.parseMarkdownToTasks = void 0;
const parseMarkdownToTasks = (markdown) => {
    if (!markdown.trim())
        return [];
    const tasks = [];
    const taskBlocks = markdown.split(/\n## /).slice(1);
    taskBlocks.forEach((block, index) => {
        var _a;
        const lines = block.split('\n');
        const title = lines[0].trim();
        const uniqueId = `aufgabe-${((_a = title.match(/\d+/)) === null || _a === void 0 ? void 0 : _a[0]) || index}-${index}`;
        const content = lines.slice(1).join('\n');
        const explanationMatch = content.match(/(?:\*\*Erklärung:\*\*|### Erklärung)\s*([\s\S]*)/);
        const explanation = explanationMatch ? explanationMatch[1].trim() : '';
        let questionAndOptions = explanationMatch ? content.substring(0, explanationMatch.index).trim() : content.trim();
        const correctAnswerMatch = questionAndOptions.match(/Richtige Antwort:\s*([A-Z])/);
        const correctLetter = correctAnswerMatch ? correctAnswerMatch[1] : '';
        // Remove the "Richtige Antwort" line from the content
        if (correctAnswerMatch) {
            questionAndOptions = questionAndOptions.replace(correctAnswerMatch[0], '').trim();
        }
        const optionRegex = /^(?:[A-Z]\. |- \[[x\s]\])\s*.*$/gm;
        const optionMatches = questionAndOptions.match(optionRegex);
        let questionText = questionAndOptions;
        if (optionMatches) {
            const firstOptionIndex = questionAndOptions.indexOf(optionMatches[0]);
            if (firstOptionIndex !== -1) {
                questionText = questionAndOptions.substring(0, firstOptionIndex).trim();
            }
        }
        const options = optionMatches ? optionMatches.map((optLine, optIndex) => {
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
        }).filter((opt) => opt !== null) : [];
        if (title) {
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
exports.parseMarkdownToTasks = parseMarkdownToTasks;
const parseMarkdownToExplanationSections = (markdown) => {
    if (!markdown.trim())
        return [];
    const sections = [];
    // Split on a newline that is followed by a markdown heading or a thematic break (---)
    const sectionBlocks = markdown.split(/\n(?=#{1,6} |---)/);
    sectionBlocks.forEach((block, index) => {
        if (block.trim() === '')
            return;
        const trimmedBlock = block.trim();
        const lines = trimmedBlock.split('\n');
        let rawTitle = `Abschnitt ${index + 1}`; // Default title
        // Logic to extract a raw, untruncated title
        if (lines[0].startsWith('#')) {
            rawTitle = lines[0].replace(/#{1,6}\s*/, '').trim();
        }
        else if (lines[0].startsWith('---')) {
            if (lines.length > 1 && lines[1].startsWith('#')) {
                rawTitle = lines[1].replace(/#{1,6}\s*/, '').trim();
            }
        }
        else {
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
exports.parseMarkdownToExplanationSections = parseMarkdownToExplanationSections;
const parseMarkdownToTaskSets = (markdown) => {
    if (!markdown.trim())
        return [];
    const taskSets = [];
    const taskSetBlocks = markdown.split(/(?=^## \*\*Aufgabensatz:.*)/m).filter(b => b.trim());
    taskSetBlocks.forEach((setBlock, setIndex) => {
        const setLines = setBlock.trim().split('\n');
        const setTitleLine = setLines[0];
        const setTitle = setTitleLine.replace(/^## \*\*/, '').replace(/\*\*$/, '').trim();
        const setId = `set-${setIndex}`;
        const setContent = setLines.slice(1).join('\n');
        const taskBlocks = setContent.split(/(?=^## Aufgabe \d+)/m).filter(b => b.trim());
        const tasks = [];
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
exports.parseMarkdownToTaskSets = parseMarkdownToTaskSets;
const parseMarkdownToLesson = (markdown) => {
    const source = markdown !== null && markdown !== void 0 ? markdown : '';
    if (!source.trim()) {
        return { title: '', slides: [] };
    }
    const lessonTitleMatch = source.match(/^#\s+(.+)$/m);
    const lessonTitle = lessonTitleMatch ? lessonTitleMatch[1].trim() : 'Lektion';
    const slideRegex = /^##\s+Folie[^\n]*[\s\S]*?(?=^##\s+Folie|\Z)/gm;
    const slides = [];
    let match;
    let index = 0;
    while ((match = slideRegex.exec(source)) !== null) {
        const block = match[0];
        const blockStart = match.index;
        const blockEnd = slideRegex.lastIndex;
        const start = index === 0 ? 0 : blockStart;
        const end = blockEnd;
        const markdownSlice = source.slice(start, end);
        const labelLineMatch = block.match(/^##\s+(.+)$/m);
        const label = labelLineMatch ? labelLineMatch[1].trim() : `Folie ${index + 1}`;
        const titleLine = block
            .split('\n')
            .map(l => l.trim())
            .find((line, i) => {
            if (i === 0)
                return false;
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
            markdown: markdownSlice.trimStart(),
            start,
            end,
        });
        index += 1;
    }
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
exports.parseMarkdownToLesson = parseMarkdownToLesson;
