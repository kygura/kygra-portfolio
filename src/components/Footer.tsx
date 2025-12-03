import { PHRASES } from '../lib/consts';
import {ArrowLeft, ArrowRight} from 'lucide-react';
import { useState } from 'react';

function getRandomQuote(list: string[]) {
  let randomIndex = Math.floor(Math.random() * list.length);

  return {quote: list[randomIndex], index: randomIndex}
}

const Footer = () => {
  const phrase = getRandomQuote(PHRASES)

  const [quote, setQuote] = useState(phrase.quote);

  const prevQuote = phrase.index > 0 ? PHRASES[phrase.index - 1] : null;
  const nextQuote = phrase.index < PHRASES.length - 1 ? PHRASES[phrase.index + 1] : null;

  // Handler for setting the previous quote
  const handlePrevQuote = () => {
    if (prevQuote) {
      setQuote(prevQuote);
    }
  };

  // Handler for setting the next quote
  const handleNextQuote = () => {
    if (nextQuote) {
      setQuote(nextQuote);
    }
  };

  return (
    <footer className="w-full max-w-3xl mx-auto pt-4 pb-10 sm:pb-14 text-center">
    <span className="flex items-center gap-4">
      <ArrowLeft 
        className={`w-6 h-6 transition-all duration-300 ${
          prevQuote ? 'hover:translate-x-1 hover:cursor-pointer hover:scale-110' : 'opacity-50 cursor-not-allowed'
        }`} 
        onClick={handlePrevQuote}
      />
      
      <div className="flex items-center justify-center w-full h-[72px] max-w-[500px] mx-auto text-lg">
      
        <i className="inline-block text-center">
          {quote.split("<br />")[0]} <br />
          {quote.split("<br />")[1]}
        </i>
      </div>
      <ArrowRight 
        className={`w-6 h-6 transition-all duration-300 ${
          nextQuote ? 'hover:-translate-x-1 hover:cursor-pointer hover:scale-110' : 'opacity-50 cursor-not-allowed'
        }`} 
        onClick={handleNextQuote}
      />
      </span>
      


    </footer>

  );
};

export default Footer;
