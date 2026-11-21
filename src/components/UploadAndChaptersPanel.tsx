import { useRef, useState } from 'react';
import {
  UploadCloud,
  FileText,
  Check,
  Sparkles,
  Loader2,
  Eye,
  BookOpen,
  ClipboardPaste,
  RefreshCw,
} from 'lucide-react';
import type { ExtractedDocument, StudyFormatId } from '../types/study.ts';

export const STUDY_FORMAT_OPTIONS: {
  id: StudyFormatId;
  label: string;
  description: string;
}[] = [
  { id: 'detailedNotes', label: 'Detailed Notes', description: 'In-depth structured breakdown' },
  { id: 'shortNotes', label: 'Short Notes', description: 'Rapid revision bullets' },
  { id: 'summary', label: 'Summary', description: 'Cohesive chapter overview' },
  { id: 'twoMarkQuestions', label: '2-Mark Questions', description: 'Crisp short answers' },
  { id: 'fiveMarkQuestions', label: '5-Mark Questions', description: 'Medium structured Q&A' },
  { id: 'tenMarkQuestions', label: '10-Mark Questions', description: 'Long analytical essays' },
  { id: 'mcqs', label: 'MCQs', description: 'Interactive 4-option quiz' },
  { id: 'flashcards', label: 'Flashcards', description: 'Active recall flip deck' },
];

interface UploadAndChaptersPanelProps {
  extractedDoc: ExtractedDocument | null;
  selectedChapterIds: string[];
  selectedFormats: StudyFormatId[];
  isExtracting: boolean;
  isGenerating: boolean;
  uploadSectionRef: React.RefObject<HTMLDivElement | null>;
  chaptersSectionRef: React.RefObject<HTMLDivElement | null>;
  onUploadFile: (file: File) => void;
  onExtractPastedText: (title: string, text: string) => void;
  onToggleChapter: (chapterId: string) => void;
  onSelectAllChapters: () => void;
  onClearChapters: () => void;
  onPreviewChapter: (chapterId: string) => void;
  onToggleFormat: (formatId: StudyFormatId) => void;
  onApplyFormatPreset: (formats: StudyFormatId[]) => void;
  onGenerate: () => void;
}

export function UploadAndChaptersPanel({
  extractedDoc,
  selectedChapterIds,
  selectedFormats,
  isExtracting,
  isGenerating,
  uploadSectionRef,
  chaptersSectionRef,
  onUploadFile,
  onExtractPastedText,
  onToggleChapter,
  onSelectAllChapters,
  onClearChapters,
  onPreviewChapter,
  onToggleFormat,
  onApplyFormatPreset,
  onGenerate,
}: UploadAndChaptersPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [inputMode, setInputMode] = useState<'file' | 'paste'>('file');
  const [pastedTitle, setPastedTitle] = useState('');
  const [pastedText, setPastedText] = useState('');

  const handleFileChange = (files: FileList | null) => {
    const file = files?.[0];
    if (file) {
      onUploadFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onUploadFile(file);
    }
  };

  const selectedWords = extractedDoc
    ? extractedDoc.chapters
        .filter((c) => selectedChapterIds.includes(c.id))
        .reduce((sum, c) => sum + c.wordCount, 0)
    : 0;

  const canGenerate =
    Boolean(extractedDoc) &&
    selectedChapterIds.length > 0 &&
    selectedFormats.length > 0 &&
    !isExtracting &&
    !isGenerating;

  return (
    <aside className="space-y-5">
      {/* Step 1: Upload Study Material */}
      <section
        ref={uploadSectionRef}
        className="bg-white border border-[#DCEBFA] rounded-2xl p-5 space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-[#0F2942]">
              1. Study Material
            </h2>
            <p className="text-xs text-[#647D96] mt-0.5">
              PDF, DOCX, or TXT documents
            </p>
          </div>

          <div className="flex items-center p-0.5 bg-[#F4F9FF] border border-[#DCEBFA] rounded-xl">
            <button
              type="button"
              onClick={() => setInputMode('file')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                inputMode === 'file'
                  ? 'bg-white text-[#0284C7] shadow-xs'
                  : 'text-[#647D96] hover:text-[#0F2942]'
              }`}
            >
              Upload File
            </button>
            <button
              type="button"
              onClick={() => setInputMode('paste')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                inputMode === 'paste'
                  ? 'bg-white text-[#0284C7] shadow-xs'
                  : 'text-[#647D96] hover:text-[#0F2942]'
              }`}
            >
              Paste Text
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="hidden"
          onChange={(e) => {
            handleFileChange(e.target.files);
            e.target.value = '';
          }}
        />

        {inputMode === 'file' ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !isExtracting && fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!isExtracting) fileInputRef.current?.click();
              }
            }}
            className={`rounded-2xl border-2 border-dashed p-5 text-center transition-colors cursor-pointer ${
              isDragging
                ? 'border-[#0284C7] bg-[#E0F2FE]/50'
                : 'border-[#B8D9F8] bg-[#F8FBFF] hover:border-[#38BDF8] hover:bg-[#F0F7FF]'
            }`}
          >
            {isExtracting ? (
              <div className="py-3 flex flex-col items-center gap-2.5">
                <Loader2 className="w-7 h-7 text-[#0284C7] animate-spin" />
                <div className="text-sm font-medium text-[#0F2942]">
                  Extracting text & detecting chapters...
                </div>
                <p className="text-xs text-[#647D96]">Please wait a moment</p>
              </div>
            ) : (
              <div className="py-2 flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] flex items-center justify-center text-[#0284C7]">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div className="text-sm font-medium text-[#0F2942]">
                  Drop your file here or{' '}
                  <span className="text-[#0284C7] underline underline-offset-2">
                    browse
                  </span>
                </div>
                <p className="text-xs text-[#647D96]">
                  Supports .pdf, .docx, .txt up to 25 MB
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            <input
              type="text"
              value={pastedTitle}
              onChange={(e) => setPastedTitle(e.target.value)}
              placeholder="Document title (optional)"
              className="w-full px-3.5 py-2 text-sm bg-[#F8FBFF] border border-[#DCEBFA] rounded-xl text-[#0F2942] placeholder:text-[#8BA3BA] focus:bg-white focus:border-[#38BDF8] focus:outline-none"
            />
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              rows={5}
              placeholder="Paste lecture notes, textbook chapters, or study text here..."
              className="w-full px-3.5 py-2.5 text-sm bg-[#F8FBFF] border border-[#DCEBFA] rounded-xl text-[#0F2942] placeholder:text-[#8BA3BA] focus:bg-white focus:border-[#38BDF8] focus:outline-none resize-y"
            />
            <button
              type="button"
              disabled={isExtracting || pastedText.trim().length < 20}
              onClick={() => onExtractPastedText(pastedTitle, pastedText)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#0284C7] hover:bg-[#0369A1] disabled:bg-[#B8D9F8] disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer"
            >
              {isExtracting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ClipboardPaste className="w-4 h-4" />
              )}
              Detect Chapters from Text
            </button>
          </div>
        )}

        {extractedDoc && (
          <div className="p-3.5 bg-[#F4F9FF] border border-[#DCEBFA] rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-white border border-[#DCEBFA] flex items-center justify-center text-[#0284C7] shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#0F2942] truncate">
                  {extractedDoc.fileName}
                </p>
                <p className="text-xs text-[#647D96] font-mono tabular-nums truncate">
                  {extractedDoc.fileType.toUpperCase()}
                  {extractedDoc.pageCount ? ` · ${extractedDoc.pageCount} pages` : ''}
                  {` · ${extractedDoc.totalWords.toLocaleString()} words`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Upload a different document"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#0284C7] bg-white hover:bg-[#E0F2FE] border border-[#DCEBFA] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Replace
            </button>
          </div>
        )}
      </section>

      {/* Step 2: Select Chapters */}
      <section
        ref={chaptersSectionRef}
        className="bg-white border border-[#DCEBFA] rounded-2xl p-5 space-y-3.5"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-semibold text-[#0F2942]">
              2. Select Chapters
            </h2>
            <p className="text-xs text-[#647D96] font-mono tabular-nums mt-0.5">
              {extractedDoc
                ? `${selectedChapterIds.length} of ${extractedDoc.chapters.length} selected · ${selectedWords.toLocaleString()} words`
                : 'Upload a document to view chapters'}
            </p>
          </div>

          {extractedDoc && extractedDoc.chapters.length > 1 && (
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={onSelectAllChapters}
                className="font-medium text-[#0284C7] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                All
              </button>
              <span className="text-[#CBD5E1]">/</span>
              <button
                type="button"
                onClick={onClearChapters}
                className="font-medium text-[#647D96] hover:text-[#0F2942] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {!extractedDoc ? (
          <div className="py-5 px-4 bg-[#F8FBFF] border border-[#E5EFFA] rounded-xl text-center">
            <BookOpen className="w-5 h-5 text-[#93C5FD] mx-auto mb-1.5" />
            <p className="text-xs text-[#647D96]">
              Chapters and sections will appear automatically once your document is extracted.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {extractedDoc.chapters.map((ch) => {
              const isSelected = selectedChapterIds.includes(ch.id);
              return (
                <div
                  key={ch.id}
                  className={`rounded-xl border transition-colors flex items-start gap-2.5 p-3 ${
                    isSelected
                      ? 'bg-[#EEF6FF] border-[#93C5FD]'
                      : 'bg-[#F8FBFF] border-[#E5EFFA] hover:border-[#BFDDFB]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onToggleChapter(ch.id)}
                    className="flex-1 flex items-start gap-2.5 text-left min-w-0 cursor-pointer"
                  >
                    <span
                      className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-[#0284C7] border-[#0284C7] text-white'
                          : 'bg-white border-[#B8D9F8]'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#0F2942] leading-snug line-clamp-2">
                        {ch.title}
                      </p>
                      <p className="text-xs text-[#647D96] font-mono tabular-nums mt-0.5">
                        {ch.wordCount.toLocaleString()} words
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onPreviewChapter(ch.id)}
                    title="Inspect extracted chapter text"
                    aria-label={`Inspect text of ${ch.title}`}
                    className="p-1.5 rounded-lg text-[#647D96] hover:text-[#0284C7] hover:bg-white transition-colors shrink-0 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Step 3: Output Formats */}
      <section className="bg-white border border-[#DCEBFA] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-semibold text-[#0F2942]">
              3. Study Formats
            </h2>
            <p className="text-xs text-[#647D96] font-mono tabular-nums mt-0.5">
              {selectedFormats.length} of {STUDY_FORMAT_OPTIONS.length} selected
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() =>
                onApplyFormatPreset(STUDY_FORMAT_OPTIONS.map((f) => f.id))
              }
              className="font-medium text-[#0284C7] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              All
            </button>
            <span className="text-[#CBD5E1]">/</span>
            <button
              type="button"
              onClick={() =>
                onApplyFormatPreset([
                  'twoMarkQuestions',
                  'fiveMarkQuestions',
                  'tenMarkQuestions',
                  'mcqs',
                ])
              }
              className="font-medium text-[#647D96] hover:text-[#0F2942] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              Exam
            </button>
            <span className="text-[#CBD5E1]">/</span>
            <button
              type="button"
              onClick={() =>
                onApplyFormatPreset(['shortNotes', 'summary', 'flashcards'])
              }
              className="font-medium text-[#647D96] hover:text-[#0F2942] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              Quick
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {STUDY_FORMAT_OPTIONS.map((fmt) => {
            const active = selectedFormats.includes(fmt.id);
            return (
              <button
                key={fmt.id}
                type="button"
                onClick={() => onToggleFormat(fmt.id)}
                className={`px-3 py-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#EEF6FF] border-[#7DD3FC] text-[#0F2942]'
                    : 'bg-[#F8FBFF] border-[#E5EFFA] text-[#4B647D] hover:border-[#BFDDFB]'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-xs font-semibold truncate">{fmt.label}</span>
                  <span
                    className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 ${
                      active
                        ? 'bg-[#0284C7] text-white'
                        : 'border border-[#B8D9F8] bg-white'
                    }`}
                  >
                    {active && <Check className="w-2.5 h-2.5 stroke-[2.5]" />}
                  </span>
                </div>
                <p className="text-[11px] text-[#647D96] mt-0.5 truncate">
                  {fmt.description}
                </p>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={!canGenerate}
          onClick={onGenerate}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] disabled:bg-[#B8D9F8] disabled:cursor-not-allowed rounded-xl transition-colors shadow-xs cursor-pointer"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating with Gemini AI...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Study Pack
            </>
          )}
        </button>
      </section>
    </aside>
  );
}
