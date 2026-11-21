import { useState } from 'react';
import {
  Copy,
  Check,
  FileDown,
  FileText,
  Loader2,
  BookOpenCheck,
  AlertCircle,
  BookOpen,
} from 'lucide-react';
import type { ExtractedDocument, GeneratedStudyMaterial } from '../types/study.ts';
import {
  formatStudyMaterialAsText,
  downloadStudyMaterialAsPdf,
  downloadStudyMaterialAsDocx,
} from '../utils/exportStudyMaterial.ts';
import { McqQuiz } from './McqQuiz.tsx';
import { FlashcardDeck } from './FlashcardDeck.tsx';
import { QuestionBank } from './QuestionBank.tsx';

export type OutputViewTab =
  | 'all'
  | 'detailedNotes'
  | 'shortNotes'
  | 'summary'
  | 'questions'
  | 'mcqs'
  | 'flashcards'
  | 'extractedText';

interface StudyOutputViewerProps {
  extractedDoc: ExtractedDocument | null;
  generatedMaterial: GeneratedStudyMaterial | null;
  activeTab: OutputViewTab;
  inspectedChapterId: string | null;
  isGenerating: boolean;
  generationStage: string;
  errorMessage: string | null;
  outputSectionRef: React.RefObject<HTMLDivElement | null>;
  exportSectionRef: React.RefObject<HTMLDivElement | null>;
  onSelectTab: (tab: OutputViewTab) => void;
  onSelectInspectedChapter: (chapterId: string | null) => void;
  onDismissError: () => void;
}

export function StudyOutputViewer({
  extractedDoc,
  generatedMaterial,
  activeTab,
  inspectedChapterId,
  isGenerating,
  generationStage,
  errorMessage,
  outputSectionRef,
  exportSectionRef,
  onSelectTab,
  onSelectInspectedChapter,
  onDismissError,
}: StudyOutputViewerProps) {
  const [copied, setCopied] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const handleCopy = async () => {
    if (!generatedMaterial) return;
    const text = formatStudyMaterialAsText(generatedMaterial);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback copy via textarea
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleDownloadPdf = () => {
    if (!generatedMaterial) return;
    downloadStudyMaterialAsPdf(generatedMaterial);
  };

  const handleDownloadDocx = async () => {
    if (!generatedMaterial || isExportingDocx) return;
    setIsExportingDocx(true);
    try {
      await downloadStudyMaterialAsDocx(generatedMaterial);
    } finally {
      setIsExportingDocx(false);
    }
  };

  const hasQuestions = Boolean(
    generatedMaterial?.twoMarkQuestions?.length ||
      generatedMaterial?.fiveMarkQuestions?.length ||
      generatedMaterial?.tenMarkQuestions?.length
  );

  const availableTabs: { id: OutputViewTab; label: string }[] = [];
  if (generatedMaterial) {
    availableTabs.push({ id: 'all', label: 'All Formats' });
    if (generatedMaterial.detailedNotes) {
      availableTabs.push({ id: 'detailedNotes', label: 'Detailed Notes' });
    }
    if (generatedMaterial.shortNotes) {
      availableTabs.push({ id: 'shortNotes', label: 'Short Notes' });
    }
    if (generatedMaterial.summary) {
      availableTabs.push({ id: 'summary', label: 'Summary' });
    }
    if (hasQuestions) {
      availableTabs.push({ id: 'questions', label: '2 / 5 / 10 Marks' });
    }
    if (generatedMaterial.mcqs?.length) {
      availableTabs.push({ id: 'mcqs', label: 'MCQs' });
    }
    if (generatedMaterial.flashcards?.length) {
      availableTabs.push({ id: 'flashcards', label: 'Flashcards' });
    }
  }
  if (extractedDoc) {
    availableTabs.push({ id: 'extractedText', label: 'Extracted Text' });
  }

  const inspectedChapter =
    extractedDoc && inspectedChapterId
      ? extractedDoc.chapters.find((c) => c.id === inspectedChapterId) ?? null
      : null;

  return (
    <main ref={outputSectionRef} className="space-y-5 min-w-0">
      {errorMessage && (
        <div
          role="alert"
          className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-2xl flex items-start justify-between gap-3 text-sm text-[#991B1B]"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />
            <p className="leading-snug">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={onDismissError}
            className="text-xs font-medium text-[#991B1B] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Toolbar & Export Bar when doc or generated material exists */}
      {(generatedMaterial || extractedDoc) && (
        <div
          ref={exportSectionRef}
          className="bg-white border border-[#DCEBFA] rounded-2xl p-4 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4"
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            {availableTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectTab(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#0284C7] text-white'
                      : 'bg-[#F4F9FF] text-[#4B647D] hover:bg-[#E0F2FE] hover:text-[#0F2942]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {generatedMaterial && (
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#0F2942] bg-[#F4F9FF] hover:bg-[#E0F2FE] border border-[#DCEBFA] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#0284C7]" />
                    Copy
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#0F2942] bg-[#F4F9FF] hover:bg-[#E0F2FE] border border-[#DCEBFA] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5 text-[#0284C7]" />
                Download PDF
              </button>

              <button
                type="button"
                disabled={isExportingDocx}
                onClick={handleDownloadDocx}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#0284C7] hover:bg-[#0369A1] disabled:bg-[#B8D9F8] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isExportingDocx ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5" />
                )}
                Download DOCX
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading State during Gemini generation */}
      {isGenerating && (
        <div className="bg-white border border-[#DCEBFA] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#EEF6FF] border border-[#BAE6FD] flex items-center justify-center shrink-0">
              <Loader2 className="w-5 h-5 text-[#0284C7] animate-spin" />
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-[#0F2942]">
                Generating your study pack
              </h3>
              <p className="text-sm text-[#4B647D] mt-0.5">{generationStage}</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="h-5 w-2/3 rounded-lg bg-[#EEF6FF] animate-pulse" />
            <div className="h-4 w-full rounded-lg bg-[#F4F9FF] animate-pulse" />
            <div className="h-4 w-5/6 rounded-lg bg-[#F4F9FF] animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
              <div className="h-28 rounded-xl bg-[#F4F9FF] border border-[#E5EFFA] animate-pulse" />
              <div className="h-28 rounded-xl bg-[#F4F9FF] border border-[#E5EFFA] animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {/* Extracted Text Inspector View */}
      {!isGenerating && activeTab === 'extractedText' && extractedDoc && (
        <div className="bg-white border border-[#DCEBFA] rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#EEF6FF]">
            <div>
              <h3 className="font-display text-lg font-semibold text-[#0F2942]">
                {inspectedChapter ? inspectedChapter.title : extractedDoc.fileName}
              </h3>
              <p className="text-xs text-[#647D96] font-mono tabular-nums mt-0.5">
                {inspectedChapter
                  ? `${inspectedChapter.wordCount.toLocaleString()} words · Chapter ${inspectedChapter.index}`
                  : `${extractedDoc.totalWords.toLocaleString()} total words · ${extractedDoc.chapters.length} detected chapters`}
              </p>
            </div>

            {extractedDoc.chapters.length > 1 && (
              <select
                aria-label="Choose extracted chapter to view"
                value={inspectedChapterId ?? 'all'}
                onChange={(e) =>
                  onSelectInspectedChapter(e.target.value === 'all' ? null : e.target.value)
                }
                className="px-3 py-2 text-xs font-medium bg-[#F8FBFF] border border-[#DCEBFA] rounded-xl text-[#0F2942] focus:outline-none focus:border-[#38BDF8]"
              >
                <option value="all">Full Extracted Document</option>
                {extractedDoc.chapters.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.title} ({ch.wordCount} words)
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="max-h-[580px] overflow-y-auto pr-2">
            <pre className="font-sans text-sm text-[#1E3A5F] leading-relaxed whitespace-pre-wrap">
              {inspectedChapter ? inspectedChapter.content : extractedDoc.fullText}
            </pre>
          </div>
        </div>
      )}

      {/* Generated Study Content */}
      {!isGenerating && generatedMaterial && activeTab !== 'extractedText' && (
        <div className="space-y-6">
          {/* Document Output Header */}
          <div className="bg-white border border-[#DCEBFA] rounded-2xl p-6">
            <p className="text-xs font-medium text-[#0284C7]">
              Generated Study Pack · {new Date(generatedMaterial.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0F2942] mt-1 text-balance">
              {generatedMaterial.chapterTitle}
            </h2>
          </div>

          {/* Summary */}
          {(activeTab === 'all' || activeTab === 'summary') &&
            generatedMaterial.summary && (
              <section className="bg-white border border-[#DCEBFA] rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="font-display text-lg font-semibold text-[#0F2942]">
                    Executive Summary
                  </h3>
                  <p className="text-sm font-medium text-[#0284C7] mt-1 leading-snug">
                    {generatedMaterial.summary.headline}
                  </p>
                </div>

                <div className="space-y-3 text-[15px] text-[#1E3A5F] leading-relaxed">
                  {generatedMaterial.summary.paragraphs.map((p, idx) => (
                    <p key={idx}>{p}</p>
                  ))}
                </div>

                {generatedMaterial.summary.takeaways.length > 0 && (
                  <div className="p-4 bg-[#F4F9FF] border border-[#DCEBFA] rounded-xl space-y-2">
                    <h4 className="font-display text-xs font-semibold text-[#0284C7]">
                      Core Takeaways
                    </h4>
                    <ul className="space-y-1.5">
                      {generatedMaterial.summary.takeaways.map((t, idx) => (
                        <li
                          key={idx}
                          className="text-sm text-[#0F2942] flex items-start gap-2"
                        >
                          <span className="text-[#0EA5E9] font-bold leading-5 shrink-0">
                            •
                          </span>
                          <span className="leading-relaxed">{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

          {/* Short Notes */}
          {(activeTab === 'all' || activeTab === 'shortNotes') &&
            generatedMaterial.shortNotes && (
              <section className="bg-white border border-[#DCEBFA] rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="font-display text-lg font-semibold text-[#0F2942]">
                    Short Notes · {generatedMaterial.shortNotes.title}
                  </h3>
                  <p className="text-xs text-[#647D96] mt-0.5">
                    High-yield revision points for quick recall
                  </p>
                </div>

                <ul className="space-y-2.5">
                  {generatedMaterial.shortNotes.bullets.map((bullet, idx) => (
                    <li
                      key={idx}
                      className="text-sm sm:text-[15px] text-[#1E3A5F] flex items-start gap-2.5"
                    >
                      <span className="font-mono text-xs font-semibold text-[#0284C7] mt-1 tabular-nums shrink-0">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="leading-relaxed">{bullet}</span>
                    </li>
                  ))}
                </ul>

                {generatedMaterial.shortNotes.memoryHooks.length > 0 && (
                  <div className="p-4 bg-[#F4F9FF] border border-[#DCEBFA] rounded-xl space-y-2">
                    <h4 className="font-display text-xs font-semibold text-[#0284C7]">
                      Memory Hooks & Mnemonics
                    </h4>
                    <ul className="space-y-1.5">
                      {generatedMaterial.shortNotes.memoryHooks.map((hook, idx) => (
                        <li
                          key={idx}
                          className="text-sm text-[#0F2942] flex items-start gap-2"
                        >
                          <span className="text-[#0EA5E9] font-bold leading-5 shrink-0">
                            •
                          </span>
                          <span className="leading-relaxed">{hook}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

          {/* Detailed Notes */}
          {(activeTab === 'all' || activeTab === 'detailedNotes') &&
            generatedMaterial.detailedNotes && (
              <section className="bg-white border border-[#DCEBFA] rounded-2xl p-6 space-y-6">
                <div className="space-y-1.5">
                  <h3 className="font-display text-lg font-semibold text-[#0F2942]">
                    Detailed Study Notes
                  </h3>
                  <p className="text-sm sm:text-[15px] text-[#35516B] leading-relaxed">
                    {generatedMaterial.detailedNotes.overview}
                  </p>
                </div>

                <div className="space-y-6 divide-y divide-[#EEF6FF]">
                  {generatedMaterial.detailedNotes.sections.map((sec, idx) => (
                    <div key={idx} className={idx > 0 ? 'pt-6 space-y-3.5' : 'space-y-3.5'}>
                      <h4 className="font-display text-base font-semibold text-[#0F2942]">
                        <span className="font-mono text-sm text-[#0284C7] mr-2 tabular-nums">
                          {String(idx + 1).padStart(2, '0')}.
                        </span>
                        {sec.heading}
                      </h4>

                      <div className="p-3.5 bg-[#F4F9FF] border border-[#DCEBFA] rounded-xl">
                        <span className="text-xs font-semibold text-[#0284C7] block mb-0.5">
                          Key Concept
                        </span>
                        <p className="text-sm font-medium text-[#0F2942] leading-relaxed">
                          {sec.keyConcept}
                        </p>
                      </div>

                      <ul className="space-y-2">
                        {sec.explanation.map((point, pIdx) => (
                          <li
                            key={pIdx}
                            className="text-sm sm:text-[15px] text-[#1E3A5F] flex items-start gap-2.5"
                          >
                            <span className="text-[#0EA5E9] font-bold leading-6 shrink-0">
                              •
                            </span>
                            <span className="leading-relaxed">{point}</span>
                          </li>
                        ))}
                      </ul>

                      {sec.examples.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <h5 className="text-xs font-semibold text-[#4B647D]">
                            Examples & Applications
                          </h5>
                          <ul className="space-y-1">
                            {sec.examples.map((ex, exIdx) => (
                              <li
                                key={exIdx}
                                className="text-sm text-[#35516B] flex items-start gap-2"
                              >
                                <span className="text-[#7DD3FC] font-bold leading-5 shrink-0">
                                  –
                                </span>
                                <span className="leading-relaxed">{ex}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {sec.importantTerms.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          {sec.importantTerms.map((termObj, tIdx) => (
                            <div
                              key={tIdx}
                              className="p-3 bg-[#F8FBFF] border border-[#E5EFFA] rounded-xl"
                            >
                              <div className="text-xs font-semibold text-[#0284C7]">
                                {termObj.term}
                              </div>
                              <div className="text-xs text-[#35516B] mt-0.5 leading-relaxed">
                                {termObj.definition}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

          {/* 2 / 5 / 10 Mark Questions */}
          {(activeTab === 'all' || activeTab === 'questions') && hasQuestions && (
            <QuestionBank
              twoMark={generatedMaterial.twoMarkQuestions}
              fiveMark={generatedMaterial.fiveMarkQuestions}
              tenMark={generatedMaterial.tenMarkQuestions}
            />
          )}

          {/* MCQs */}
          {(activeTab === 'all' || activeTab === 'mcqs') &&
            generatedMaterial.mcqs &&
            generatedMaterial.mcqs.length > 0 && (
              <McqQuiz mcqs={generatedMaterial.mcqs} />
            )}

          {/* Flashcards */}
          {(activeTab === 'all' || activeTab === 'flashcards') &&
            generatedMaterial.flashcards &&
            generatedMaterial.flashcards.length > 0 && (
              <FlashcardDeck cards={generatedMaterial.flashcards} />
            )}
        </div>
      )}

      {/* Empty State before generation (and not inspecting extracted text) */}
      {!isGenerating && !generatedMaterial && activeTab !== 'extractedText' && (
        <div className="bg-white border border-[#DCEBFA] rounded-2xl p-6 sm:p-10 text-center space-y-6">
          <div className="max-w-sm mx-auto">
            {!imgFailed ? (
              <img
                src="/src/assets/images/study_desk_illustration_1795224282717.jpg"
                alt="Minimalist powder-blue study notebook, flashcards, and fountain pen"
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="w-full h-56 object-contain mx-auto rounded-xl"
              />
            ) : (
              <div className="w-full h-48 rounded-2xl bg-gradient-to-br from-[#F4F9FF] to-[#E0F2FE] border border-[#DCEBFA] flex flex-col items-center justify-center gap-2">
                <BookOpenCheck className="w-10 h-10 text-[#0284C7]" />
                <span className="font-display text-sm font-semibold text-[#0F2942]">
                  Smart Study Notes
                </span>
              </div>
            )}
          </div>

          <div className="max-w-lg mx-auto space-y-2">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0F2942] text-balance">
              {extractedDoc
                ? 'Chapters extracted and ready to study'
                : 'Turn your readings into structured study packs'}
            </h2>
            <p className="text-sm text-[#4B647D] leading-relaxed">
              {extractedDoc
                ? 'Choose your chapters and study formats on the left, then click Generate Study Pack. You can also inspect the extracted text above.'
                : 'Upload a PDF, DOCX, or TXT file on the left to extract text, select chapters, and generate notes, exam questions, MCQs, and flashcards.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto text-left pt-2">
            <div className="p-4 bg-[#F8FBFF] border border-[#E5EFFA] rounded-xl space-y-1">
              <div className="font-mono text-xs font-semibold text-[#0284C7]">01</div>
              <div className="font-display text-sm font-semibold text-[#0F2942]">
                Upload & Extract
              </div>
              <p className="text-xs text-[#647D96] leading-relaxed">
                Parse PDF, DOCX, or TXT files and detect chapters automatically.
              </p>
            </div>
            <div className="p-4 bg-[#F8FBFF] border border-[#E5EFFA] rounded-xl space-y-1">
              <div className="font-mono text-xs font-semibold text-[#0284C7]">02</div>
              <div className="font-display text-sm font-semibold text-[#0F2942]">
                Tailored Formats
              </div>
              <p className="text-xs text-[#647D96] leading-relaxed">
                Generate detailed notes, 2/5/10-mark Q&A, quizzes, and flashcards.
              </p>
            </div>
            <div className="p-4 bg-[#F8FBFF] border border-[#E5EFFA] rounded-xl space-y-1">
              <div className="font-mono text-xs font-semibold text-[#0284C7]">03</div>
              <div className="font-display text-sm font-semibold text-[#0F2942]">
                Copy or Export
              </div>
              <p className="text-xs text-[#647D96] leading-relaxed">
                One-click copy or download formatted PDF and Word DOCX files.
              </p>
            </div>
          </div>

          {extractedDoc && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => onSelectTab('extractedText')}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#0284C7] bg-[#F4F9FF] hover:bg-[#E0F2FE] border border-[#DCEBFA] rounded-xl transition-colors cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Inspect Extracted Text ({extractedDoc.chapters.length} chapters)
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
