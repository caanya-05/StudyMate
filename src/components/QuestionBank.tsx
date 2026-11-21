import { useState } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import type { QuestionAnswer } from '../types/study.ts';

interface QuestionGroupProps {
  title: string;
  markLabel: string;
  questions: QuestionAnswer[];
}

function QuestionGroup({ title, markLabel, questions }: QuestionGroupProps) {
  const [openIndices, setOpenIndices] = useState<Record<number, boolean>>({ 0: true });

  if (!questions.length) return null;

  const allOpen = questions.every((_, idx) => Boolean(openIndices[idx]));

  const toggleAll = () => {
    const nextState: Record<number, boolean> = {};
    questions.forEach((_, idx) => {
      nextState[idx] = !allOpen;
    });
    setOpenIndices(nextState);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-[#0F2942]">{title}</h3>
          <p className="text-xs text-[#647D96] font-mono tabular-nums mt-0.5">
            {markLabel} · {questions.length} questions
          </p>
        </div>

        <button
          type="button"
          onClick={toggleAll}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#0F2942] bg-[#F4F9FF] hover:bg-[#E0F2FE] border border-[#DCEBFA] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {allOpen ? (
            <>
              <EyeOff className="w-3.5 h-3.5 text-[#0284C7]" />
              Hide All Answers
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5 text-[#0284C7]" />
              Reveal All Answers
            </>
          )}
        </button>
      </div>

      <div className="space-y-3">
        {questions.map((item, idx) => {
          const isOpen = Boolean(openIndices[idx]);
          return (
            <div
              key={idx}
              className="bg-white border border-[#DCEBFA] rounded-2xl overflow-hidden"
            >
              <button
                type="button"
                onClick={() =>
                  setOpenIndices((prev) => ({ ...prev, [idx]: !prev[idx] }))
                }
                className="w-full px-5 py-4 text-left flex items-start justify-between gap-4 hover:bg-[#F8FBFF] transition-colors cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="text-xs font-mono text-[#0284C7] tabular-nums">
                    Question {String(idx + 1).padStart(2, '0')} · {markLabel}
                  </div>
                  <p className="font-display text-sm sm:text-base font-semibold text-[#0F2942] leading-snug">
                    {item.question}
                  </p>
                </div>
                <span className="p-1.5 rounded-lg bg-[#F4F9FF] text-[#0284C7] shrink-0 mt-0.5">
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </span>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-2 border-t border-[#EEF6FF] bg-[#F8FBFF]/60 space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-[#0284C7] mb-1">
                      Model Answer
                    </div>
                    <p className="text-sm text-[#1E3A5F] leading-relaxed whitespace-pre-line">
                      {item.answer}
                    </p>
                  </div>

                  {item.keyPoints.length > 0 && (
                    <div className="pt-2 border-t border-[#E6F1FC]">
                      <div className="text-xs font-semibold text-[#4B647D] mb-1.5">
                        Key Marking Points
                      </div>
                      <ul className="space-y-1.5">
                        {item.keyPoints.map((pt, ptIdx) => (
                          <li
                            key={ptIdx}
                            className="text-xs sm:text-sm text-[#35516B] flex items-start gap-2"
                          >
                            <span className="text-[#0EA5E9] font-bold leading-5 shrink-0">
                              •
                            </span>
                            <span className="leading-relaxed">{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface QuestionBankProps {
  twoMark?: QuestionAnswer[];
  fiveMark?: QuestionAnswer[];
  tenMark?: QuestionAnswer[];
}

export function QuestionBank({ twoMark, fiveMark, tenMark }: QuestionBankProps) {
  return (
    <div className="space-y-8">
      {twoMark && twoMark.length > 0 && (
        <QuestionGroup
          title="2-Mark Questions"
          markLabel="2 Marks · Brief Recall"
          questions={twoMark}
        />
      )}
      {fiveMark && fiveMark.length > 0 && (
        <QuestionGroup
          title="5-Mark Questions"
          markLabel="5 Marks · Structured Explanation"
          questions={fiveMark}
        />
      )}
      {tenMark && tenMark.length > 0 && (
        <QuestionGroup
          title="10-Mark Questions"
          markLabel="10 Marks · Long Analytical"
          questions={tenMark}
        />
      )}
    </div>
  );
}
