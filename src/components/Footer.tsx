import { ArrowLeft, ArrowRight } from 'lucide-react';
import { QUOTES_ARRAY } from '../lib/consts';
import { useState, useEffect, useCallback } from 'react';

function initQuote(list: string[]) {
  const r = Math.floor(Math.random() * list.length);
  return { index: r, content: list[r] };
}

const Footer = () => {
  const [currentQuote, setCurrentQuote] = useState(() => initQuote(QUOTES_ARRAY));
  const [direction, setDirection] = useState<'left' | 'right' | 'none'>('none');

  const handlePrev = useCallback(() => {
    setCurrentQuote(prev => {
      if (prev.index > 0) {
        setDirection('left');
        const newIndex = prev.index - 1;
        return {
          index: newIndex,
          content: QUOTES_ARRAY[newIndex]
        };
      }
      return prev;
    });
  }, []);

  const handleNext = useCallback(() => {
    setCurrentQuote(next => {
      if (next.index < QUOTES_ARRAY.length - 1) {
        setDirection('right');
        const newIndex = next.index + 1;
        return {
          index: newIndex,
          content: QUOTES_ARRAY[newIndex]
        };
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'a' || e.key === 'A') {
        handlePrev();
      } else if (e.key === 'd' || e.key === 'D') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext]);

  const hasPrev = currentQuote.index > 0;
  const hasNext = currentQuote.index < QUOTES_ARRAY.length - 1;
  const quote = currentQuote.content.split("<br>");

  return (
    <footer className="w-full relative overflow-hidden flex flex-col mt-auto bg-background">
      {/* Interactive Quotes Section */}
      <div className="relative w-full max-w-4xl mx-auto py-12 sm:py-16 px-6 flex items-center justify-center group">
        {/* Left Control */}
        <div className="absolute left-6 z-10 flex flex-col items-center gap-2 transition-opacity duration-300">
          <button
            onClick={hasPrev ? handlePrev : undefined}
            disabled={!hasPrev}
            className={`p-2 rounded-none border-2 border-transparent transition-all duration-300 ${hasPrev
              ? 'hover:border-destructive hover:text-destructive cursor-pointer'
              : 'opacity-30 cursor-not-allowed hidden sm:block'
              }`}
            aria-label="Previous quote"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
          </button>
          <span className="hidden sm:block text-[10px] font-['Courier_Prime'] text-muted-foreground font-bold tracking-widest">
            [A]
          </span>
        </div>

        {/* Content Area */}
        <div className="w-full px-16 sm:px-24 overflow-hidden relative z-0">
          <div
            key={currentQuote.index}
            className={`w-full flex flex-col items-center justify-center animate-in fade-in ${direction === 'left' ? 'slide-in-from-left-8' :
              direction === 'right' ? 'slide-in-from-right-8' :
                'zoom-in-95'
              } duration-500 ease-out`}
          >
            <p className="font-['Roboto_Slab'] font-normal text-lg sm:text-xl md:text-2xl text-foreground tracking-[0.08em] leading-relaxed max-w-3xl break-words px-4 text-center">
              {quote.map((line, i) => (
                <span key={i}
                  className="block mb-2 last:mb-0">
                  {line}
                </span>
              ))}
            </p>
          </div>
        </div>

        {/* Right Control */}
        <div className="absolute right-6 z-10 flex flex-col items-center gap-2 transition-opacity duration-300">
          <button
            onClick={hasNext ? handleNext : undefined}
            disabled={!hasNext}
            className={`p-2 rounded-none border-2 border-transparent transition-all duration-300 ${hasNext
              ? 'hover:border-destructive hover:text-destructive cursor-pointer'
              : 'opacity-30 cursor-not-allowed hidden sm:block'
              }`}
            aria-label="Next quote"
          >
            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
          </button>
          <span className="hidden sm:block text-[10px] font-['Courier_Prime'] text-muted-foreground font-bold tracking-widest">
            [D]
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
