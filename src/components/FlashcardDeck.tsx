import { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Shuffle,
  Lightbulb,
  LayoutGrid,
  Layers,
} from 'lucide-react';
import type { FlashcardItem } from '../types/study.ts';

interface FlashcardDeckProps {
  cards: FlashcardItem[];
}

export function FlashcardDeck({ cards }: FlashcardDeckProps) {
  const [deck, setDeck] = useState<FlashcardItem[]>(cards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [viewMode, setViewMode] = useState<'deck' | 'grid'>('deck');

  useEffect(() => {
    setDeck(cards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
  }, [cards]);

  if (!deck.length) return null;

  const activeCard = deck[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setShowHint(false);
    setCurrentIndex((prev) => (prev + 1) % deck.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setShowHint(false);
    setCurrentIndex((prev) => (prev - 1 + deck.length) % deck.length);
  };

  const handleShuffle = () => {
    const copy = [...deck];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    setDeck(copy);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-[#0F2942]">
            Active Recall Flashcards
          </h3>
          <p className="text-xs text-[#647D96] font-mono tabular-nums mt-0.5">
            {deck.length} cards ready · Click card to flip
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShuffle}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#0F2942] bg-[#F4F9FF] hover:bg-[#E0F2FE] border border-[#DCEBFA] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5 text-[#0284C7]" />
            Shuffle
          </button>

          <div className="flex items-center p-1 bg-[#F4F9FF] border border-[#DCEBFA] rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('deck')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewMode === 'deck'
                  ? 'bg-white text-[#0284C7] shadow-xs'
                  : 'text-[#647D96] hover:text-[#0F2942]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Deck
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-[#0284C7] shadow-xs'
                  : 'text-[#647D96] hover:text-[#0F2942]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              All Cards
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'deck' ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setIsFlipped((prev) => !prev)}
            className={`w-full min-h-[250px] p-6 sm:p-8 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between cursor-pointer ${
              isFlipped
                ? 'bg-[#EEF6FF] border-[#93C5FD]'
                : 'bg-white border-[#DCEBFA] hover:border-[#93C5FD]'
            }`}
          >
            <div className="flex items-center justify-between w-full text-xs text-[#647D96]">
              <span className="font-medium text-[#0284C7]">
                {isFlipped ? 'Answer · Back' : 'Prompt · Front'}
              </span>
              <span className="font-mono tabular-nums">
                {String(currentIndex + 1).padStart(2, '0')} /{' '}
                {String(deck.length).padStart(2, '0')}
              </span>
            </div>

            <div className="my-6 flex-1 flex items-center justify-center text-center px-2">
              <p
                className={`leading-relaxed max-w-xl ${
                  isFlipped
                    ? 'text-base sm:text-lg text-[#0F2942] font-normal'
                    : 'font-display text-lg sm:text-xl text-[#0F2942] font-semibold'
                }`}
              >
                {isFlipped ? activeCard.back : activeCard.front}
              </p>
            </div>

            <div className="flex items-center justify-between w-full text-xs text-[#647D96]">
              <span>{isFlipped ? 'Click to see prompt' : 'Click to reveal answer'}</span>
              <RotateCw className="w-3.5 h-3.5 text-[#0284C7]" />
            </div>
          </button>

          {activeCard.hint && !isFlipped && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-[#F8FBFF] border border-[#DCEBFA] rounded-xl">
              {showHint ? (
                <p className="text-xs text-[#4B647D]">
                  <span className="font-semibold text-[#0284C7]">Hint:</span> {activeCard.hint}
                </p>
              ) : (
                <span className="text-xs text-[#647D96]">Need a gentle nudge?</span>
              )}
              <button
                type="button"
                onClick={() => setShowHint((prev) => !prev)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0284C7] hover:text-[#0369A1] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                {showHint ? 'Hide Hint' : 'Show Hint'}
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={handlePrev}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-[#0F2942] bg-white hover:bg-[#F4F9FF] border border-[#DCEBFA] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-[#0284C7]" />
              Previous
            </button>

            <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto py-1">
              {deck.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  aria-label={`Go to flashcard ${idx + 1}`}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setIsFlipped(false);
                    setShowHint(false);
                  }}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === currentIndex
                      ? 'w-6 bg-[#0284C7]'
                      : 'w-2 bg-[#CFE5FA] hover:bg-[#93C5FD]'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {deck.map((card, idx) => (
            <div
              key={idx}
              className="p-5 bg-white border border-[#DCEBFA] rounded-2xl space-y-3"
            >
              <div className="flex items-center justify-between text-xs text-[#647D96] font-mono tabular-nums">
                <span>Card {String(idx + 1).padStart(2, '0')}</span>
              </div>
              <p className="font-display text-sm font-semibold text-[#0F2942] leading-snug">
                {card.front}
              </p>
              <div className="pt-2.5 border-t border-[#EEF6FF]">
                <p className="text-sm text-[#35516B] leading-relaxed">{card.back}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
