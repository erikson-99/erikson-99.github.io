export interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Task {
  id:string;
  title: string;
  question: string;
  options: Option[];
  explanation: string;
}

export interface TaskSet {
  id: string;
  title: string;
  tasks: Task[];
}

export interface LessonSlide {
  id: string;
  label: string;
  title: string;
  displayTitle: string;
  markdown: string;
  start: number;
  end: number;
}

export interface LessonDocument {
  title: string;
  slides: LessonSlide[];
}

export interface PromptDefinition {
  id: string;
  title: string;
  content: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface ActionableError {
  original: string;
  suggestion: string;
  explanation: string;
  sources?: string[];
}

export interface CheckResults {
  fachlich: ActionableError[];
  sprachlich: ActionableError[];
  guidelines: ActionableError[];
}

export interface ExplanationSection {
  id: string;
  title: string;
  markdown: string;
}

export interface Prompts {
  combined: string;
  singleChoice: string;
  multiSingleChoice: string;
  custom: PromptDefinition[];
}
