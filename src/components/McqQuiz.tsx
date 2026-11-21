import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import type { McqItem } from '../types/study.ts';

interface McqQuizProps {
  mcqs: McqItem[];
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export function McqQuiz({ mcqs }: McqQuizProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});

  useEffect(() => {
    setSelectedAnswers({});
  }, [mcqs]);

  if (!mcqs.length) return null;

  const answeredCount = Object.keys(selectedAnswers).length;
  const correctCount = mcqs.reduce((acc, q, idx) => {
    return selectedAnswers[idx] === q.correctIndex ? acc + 1 : acc;
  }, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-[#0F2942]">
            Multiple Choice Practice
          </h3>
          <p className="text-xs text-[#647D96] font-mono tabular-nums mt-0.5">
            {answeredCount} / {mcqs.length} answered · {correctCount} correct
          </p>
        </div>

        {answeredCount > 0 && (
          <button
            type="button"
            onClick={() => setSelectedAnswers({})}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#0F2942] bg-[#F4F9FF] hover:bg-[#E0F2FE] border border-[#DCEBFA] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#0284C7]" />
            Reset Quiz
          </button>
        )}
      </div>

      <div className="space-y-4">
        {mcqs.map((item, qIdx) => {
          const picked = selectedAnswers[qIdx];
          const hasPicked = picked !== undefined;
          const isCorrect = picked === item.correctIndex;

          return (
            <div
              key={qIdx}
              className="p-5 sm:p-6 bg-white border border-[#DCEBFA] rounded-2xl space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <p className="font-display text-sm sm:text-base font-semibold text-[#0F2942] leading-snug">
                  <span className="font-mono text-[#0284C7] mr-2 tabular-nums">
                    {String(qIdx + 1).padStart(2, '0')}.
                  </span>
                  {item.question}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {item.options.map((opt, optIdx) => {
                  const isThisPicked = picked === optIdx;
                  const isThisCorrect = optIdx === item.correctIndex;

                  let btnStyle =
                    'bg-[#F8FBFF] border-[#DCEBFA] text-[#0F2942] hover:bg-[#EEF6FF] hover:border-[#93C5FD]';

                  if (hasPicked) {
                    if (isThisCorrect) {
                      btnStyle = 'bg-[#ECFDF5] border-[#6EE7B7] text-[#065F46]';
                    } else if (isThisPicked && !isThisCorrect) {
                      btnStyle = 'bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]';
                    } else {
                      btnStyle = 'bg-[#F8FBFF] border-[#E5EFFA] text-[#647D96]';
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() =>
                        setSelectedAnswers((prev) => ({
                          ...prev,
                          [qIdx]: optIdx,
                        }))
                      }
                      className={`w-full px-4 py-3 text-left text-sm rounded-xl border transition-colors flex items-start gap-2.5 cursor-pointer ${btnStyle}`}
                    >
                      <span className="font-mono text-xs font-semibold mt-0.5 shrink-0">
                        {OPTION_LETTERS[optIdx] ?? optIdx + 1}.
                      </span>
                      <span className="flex-1 leading-snug">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {hasPicked && (
                <div
                  className={`p-3.5 rounded-xl border text-xs sm:text-sm leading-relaxed flex items-start gap-2.5 ${
                    isCorrect
                      ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
                      : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                  }`}
                >
                  {isCorrect ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#16A34A]" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />
                  )}
                  <div>
                    <span className="font-semibold">
                      {isCorrect
                        ? 'Correct'
                        : `Incorrect — Correct option is ${OPTION_LETTERS[item.correctIndex] ?? item.correctIndex + 1}`}
                      :
                    </span>{' '}
                    {item.explanation}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
