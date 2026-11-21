import { useRef, useState } from 'react';
import { StudyHeader } from './components/StudyHeader.tsx';
import {
  UploadAndChaptersPanel,
  STUDY_FORMAT_OPTIONS,
} from './components/UploadAndChaptersPanel.tsx';
import {
  StudyOutputViewer,
  type OutputViewTab,
} from './components/StudyOutputViewer.tsx';
import type {
  ExtractedDocument,
  GeneratedStudyMaterial,
  StudyFormatId,
} from './types/study.ts';

const DEFAULT_FORMATS: StudyFormatId[] = [
  'detailedNotes',
  'shortNotes',
  'summary',
  'twoMarkQuestions',
  'fiveMarkQuestions',
  'tenMarkQuestions',
  'mcqs',
  'flashcards',
];

export default function App() {
  const [extractedDoc, setExtractedDoc] = useState<ExtractedDocument | null>(null);
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] =
    useState<StudyFormatId[]>(DEFAULT_FORMATS);
  const [generatedMaterial, setGeneratedMaterial] =
    useState<GeneratedStudyMaterial | null>(null);

  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState(
    'Reading selected chapters...'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<OutputViewTab>('all');
  const [inspectedChapterId, setInspectedChapterId] = useState<string | null>(null);

  const uploadSectionRef = useRef<HTMLDivElement | null>(null);
  const chaptersSectionRef = useRef<HTMLDivElement | null>(null);
  const outputSectionRef = useRef<HTMLDivElement | null>(null);
  const exportSectionRef = useRef<HTMLDivElement | null>(null);

  const handleJumpToSection = (
    section: 'upload' | 'chapters' | 'output' | 'export'
  ) => {
    const map = {
      upload: uploadSectionRef.current,
      chapters: chaptersSectionRef.current,
      output: outputSectionRef.current,
      export: exportSectionRef.current ?? outputSectionRef.current,
    };
    map[section]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleResetWorkspace = () => {
    setExtractedDoc(null);
    setSelectedChapterIds([]);
    setGeneratedMaterial(null);
    setErrorMessage(null);
    setInspectedChapterId(null);
    setActiveTab('all');
    uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const applyExtractedDocument = (doc: ExtractedDocument) => {
    setExtractedDoc(doc);
    setSelectedChapterIds(doc.chapters.map((c) => c.id));
    setGeneratedMaterial(null);
    setInspectedChapterId(null);
    setActiveTab('all');
    setErrorMessage(null);
  };

  const handleUploadFile = async (file: File) => {
    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.pdf') && !ext.endsWith('.docx') && !ext.endsWith('.txt')) {
      setErrorMessage('Unsupported file type. Please upload a PDF, DOCX, or TXT file.');
      return;
    }

    setIsExtracting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not extract text from this document.');
      }

      applyExtractedDocument(data as ExtractedDocument);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to extract document text.'
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleExtractPastedText = async (title: string, text: string) => {
    setIsExtracting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/extract-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, text }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not process the pasted text.');
      }

      applyExtractedDocument(data as ExtractedDocument);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to process pasted text.'
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleToggleChapter = (chapterId: string) => {
    setSelectedChapterIds((prev) =>
      prev.includes(chapterId)
        ? prev.filter((id) => id !== chapterId)
        : [...prev, chapterId]
    );
  };

  const handleToggleFormat = (formatId: StudyFormatId) => {
    setSelectedFormats((prev) =>
      prev.includes(formatId)
        ? prev.filter((id) => id !== formatId)
        : [...prev, formatId]
    );
  };

  const handlePreviewChapter = (chapterId: string) => {
    setInspectedChapterId(chapterId);
    setActiveTab('extractedText');
    outputSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleGenerate = async () => {
    if (!extractedDoc || selectedChapterIds.length === 0 || selectedFormats.length === 0) {
      return;
    }

    const chosenChapters = extractedDoc.chapters.filter((c) =>
      selectedChapterIds.includes(c.id)
    );
    const chapterTitle =
      chosenChapters.length === 1
        ? chosenChapters[0].title
        : chosenChapters.length === extractedDoc.chapters.length
        ? `${extractedDoc.fileName.replace(/\.(pdf|docx|txt)$/i, '')} (All ${chosenChapters.length} Chapters)`
        : `${chosenChapters[0].title} + ${chosenChapters.length - 1} more`;

    const sourceText = chosenChapters
      .map((ch) => `=== ${ch.title} ===\n\n${ch.content}`)
      .join('\n\n');

    setIsGenerating(true);
    setErrorMessage(null);
    setActiveTab('all');
    setGenerationStage('Analyzing selected chapter content...');

    const stageTimer1 = setTimeout(() => {
      setGenerationStage('Synthesizing structured study notes and exam answers with Gemini AI...');
    }, 2200);

    const stageTimer2 = setTimeout(() => {
      setGenerationStage('Organizing MCQs, flashcards, and export-ready formatting...');
    }, 5500);

    try {
      const orderedFormats = STUDY_FORMAT_OPTIONS.map((f) => f.id).filter((id) =>
        selectedFormats.includes(id)
      );

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterTitle,
          sourceText,
          formats: orderedFormats,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gemini AI failed to generate study material.');
      }

      setGeneratedMaterial(data as GeneratedStudyMaterial);
      setActiveTab('all');
      outputSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to generate study material.'
      );
    } finally {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      setIsGenerating(false);
    }
  };

  return (
    <div id="top" className="min-h-screen bg-[#F8FBFF] text-[#0F2942] flex flex-col">
      <StudyHeader
        onJumpToSection={handleJumpToSection}
        onResetWorkspace={handleResetWorkspace}
        hasDocument={Boolean(extractedDoc)}
      />

      <div className="flex-1 max-w-[1380px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Compact Editorial Hero Strip */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F2942] text-balance">
              Smart Study Notes Generator
            </h1>
            <p className="text-sm sm:text-base text-[#4B647D] mt-1">
              Extract text from PDF, DOCX, or TXT files, pick your chapters, and generate notes, exam questions, quizzes, and flashcards.
            </p>
          </div>
          <div className="text-xs text-[#647D96] font-mono tabular-nums whitespace-nowrap shrink-0">
            Powered by Gemini AI
          </div>
        </div>

        {/* Two-Column Study Studio */}
        <div className="grid grid-cols-1 lg:grid-cols-[370px_minmax(0,1fr)] gap-6 items-start">
          <UploadAndChaptersPanel
            extractedDoc={extractedDoc}
            selectedChapterIds={selectedChapterIds}
            selectedFormats={selectedFormats}
            isExtracting={isExtracting}
            isGenerating={isGenerating}
            uploadSectionRef={uploadSectionRef}
            chaptersSectionRef={chaptersSectionRef}
            onUploadFile={handleUploadFile}
            onExtractPastedText={handleExtractPastedText}
            onToggleChapter={handleToggleChapter}
            onSelectAllChapters={() =>
              extractedDoc &&
              setSelectedChapterIds(extractedDoc.chapters.map((c) => c.id))
            }
            onClearChapters={() => setSelectedChapterIds([])}
            onPreviewChapter={handlePreviewChapter}
            onToggleFormat={handleToggleFormat}
            onApplyFormatPreset={(formats) => setSelectedFormats(formats)}
            onGenerate={handleGenerate}
          />

          <StudyOutputViewer
            extractedDoc={extractedDoc}
            generatedMaterial={generatedMaterial}
            activeTab={activeTab}
            inspectedChapterId={inspectedChapterId}
            isGenerating={isGenerating}
            generationStage={generationStage}
            errorMessage={errorMessage}
            outputSectionRef={outputSectionRef}
            exportSectionRef={exportSectionRef}
            onSelectTab={(tab) => setActiveTab(tab)}
            onSelectInspectedChapter={(id) => setInspectedChapterId(id)}
            onDismissError={() => setErrorMessage(null)}
          />
        </div>
      </div>

      <footer className="border-t border-[#DCEBFA] bg-white py-4 mt-8">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#647D96]">
          <span>Smart Study Notes Generator</span>
          <span>PDF · DOCX · TXT Extraction &amp; Export</span>
        </div>
      </footer>
    </div>
  );
}
