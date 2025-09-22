import {
  singleChoicePrompt,
  multiSingleChoicePrompt,
  multipleChoicePrompt,
  wahrFalschPrompt,
  textInputPrompt,
  freitextPrompt,
  lueckensatzSelectablePrompt,
  lueckensatzTextInputPrompt,
  lueckentextPrompt,
  mathinputPrompt,
  reihenfolgePrompt,
  zuordnungPrompt,
} from './index';

import type { PromptDefinition } from '../types';

export const defaultSingleChoicePrompt = singleChoicePrompt.trim();
export const defaultMultiSingleChoicePrompt = multiSingleChoicePrompt.trim();

export const builtinCustomPrompts: PromptDefinition[] = [
  {
    id: 'prompt-multiple-choice',
    title: 'Multiple-Choice Prompt',
    content: multipleChoicePrompt.trim(),
  },
  {
    id: 'prompt-wahr-falsch',
    title: 'Wahr/Falsch Prompt',
    content: wahrFalschPrompt.trim(),
  },
  {
    id: 'prompt-text-input',
    title: 'Text-Input Prompt',
    content: textInputPrompt.trim(),
  },
  {
    id: 'prompt-freitext',
    title: 'Freitext Prompt',
    content: freitextPrompt.trim(),
  },
  {
    id: 'prompt-lueckensatz-selectable',
    title: 'Lückensatz (Selectable)',
    content: lueckensatzSelectablePrompt.trim(),
  },
  {
    id: 'prompt-lueckensatz-text-input',
    title: 'Lückensatz (Text Input)',
    content: lueckensatzTextInputPrompt.trim(),
  },
  {
    id: 'prompt-lueckentext',
    title: 'Lückentext Prompt',
    content: lueckentextPrompt.trim(),
  },
  {
    id: 'prompt-mathinput',
    title: 'Math-Input Prompt',
    content: mathinputPrompt.trim(),
  },
  {
    id: 'prompt-reihenfolge',
    title: 'Reihenfolge Prompt',
    content: reihenfolgePrompt.trim(),
  },
  {
    id: 'prompt-zuordnung',
    title: 'Zuordnung Prompt',
    content: zuordnungPrompt.trim(),
  },
];
