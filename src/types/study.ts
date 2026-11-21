export type StudyFormatId =
  | 'detailedNotes'
  | 'shortNotes'
  | 'summary'
  | 'twoMarkQuestions'
  | 'fiveMarkQuestions'
  | 'tenMarkQuestions'
  | 'mcqs'
  | 'flashcards';

export interface ChapterInfo {
  id: string;
  index: number;
  title: string;
  content: string;
  wordCount: number;
  charCount: number;
  preview: string;
}

export interface ExtractedDocument {
  fileName: string;
  fileType: 'pdf' | 'docx' | 'txt';
  fileSizeBytes: number;
  pageCount?: number;
  totalWords: number;
  fullText: string;
  chapters: ChapterInfo[];
}

export interface DetailedNoteSection {
  heading: string;
  keyConcept: string;
  explanation: string[];
  examples: string[];
  importantTerms: { term: string; definition: string }[];
}

export interface QuestionAnswer {
  question: string;
  answer: string;
  keyPoints: string[];
}

export interface McqItem {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface FlashcardItem {
  front: string;
  back: string;
  hint?: string;
}

export interface GeneratedStudyMaterial {
  chapterTitle: string;
  generatedAt: string;
  selectedFormats: StudyFormatId[];
  detailedNotes?: {
    overview: string;
    sections: DetailedNoteSection[];
  };
  shortNotes?: {
    title: string;
    bullets: string[];
    memoryHooks: string[];
  };
  summary?: {
    headline: string;
    paragraphs: string[];
    takeaways: string[];
  };
  twoMarkQuestions?: QuestionAnswer[];
  fiveMarkQuestions?: QuestionAnswer[];
  tenMarkQuestions?: QuestionAnswer[];
  mcqs?: McqItem[];
  flashcards?: FlashcardItem[];
}
