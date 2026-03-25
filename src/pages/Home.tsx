import { useRef, useEffect, useState } from "react";
import { TypewriterEffect } from "../components/ui/typewriter-effect";
//import { Link } from "react-router-dom";
import Header from "../components/Header"
import { Stratum } from '../components/graphics/Stratum';
import { Geo1 } from '../components/graphics/Geo1';
import { Solis } from '../components/graphics/Solis';
import { Axis } from '../components/graphics/Axis';
import { Geo2 } from '../components/graphics/Geo2';
import { Eclipse } from '../components/graphics/Eclipse';

const Home = () => {
  // --- Quote Rotation State ---
  const phrases = [
    { content: "TIME KEEPS PASSING "},
    {content: "TIME TO LET GO "}

  ];

  const manifestoSegments = [
    <>
      <p className="mb-4">
        "Music is your own experience, your thoughts, your wisdom. If you don't live it, it won't come out of your horn. They teach you there's a boundary line to music. But, man, there's no boundary line to art."
      </p>
      <p>
        — CHARLIE PARKER
      </p>
    </>,
    <>
      <p className="mb-4">
        "Don't play what's there, play what's not there. It's not about standing still and becoming safe. If you're not making mistakes, you're not trying anything new."
      </p>
      <p>
        — MILES DAVIS
      </p>
    </>,
    <>
      <p className="mb-4">
        "I say, play your own way. Don't play what the public wants. You play what you want and let the public pick up on what you're doing — even if it does take them fifteen, twenty years."
      </p>
      <p>
        — THELONIOUS MONK
      </p>
    </>,
    <>
      <p className="mb-4">
        "Jazz is the only music in which the same note can be played night after night but differently each time. It is the risk of not knowing what to play."
      </p>
      <p>
        — ORNETTE COLEMAN
      </p>
    </>
  ];

  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [isSegmentFading, setIsSegmentFading] = useState(false);

  useEffect(() => {
    const wordInterval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setCurrentWordIndex((prev) => (prev + 1) % phrases.length);
        setIsFading(false);
      }, 350);
    }, 2800);

    const segmentInterval = setInterval(() => {
      setIsSegmentFading(true);
      setTimeout(() => {
        setCurrentSegmentIndex((prev) => (prev + 1) % manifestoSegments.length);
        setIsSegmentFading(false);
      }, 350);
    }, 12000); // Rotate manifesto segments every 12 seconds

    return () => {
      clearInterval(wordInterval);
      clearInterval(segmentInterval);
    };
  }, []);
  // -----------------------------

  return (
    <div className="bebop-theme-root">
      <Header />

      <main className="bebop-main">

        {/* MANIFESTO — White Box */}
        <div className="box b-manifesto fi">
          <div className="flex flex-col h-full justify-between pb-4">
            <div>
              <h2 className="mb-6">
                <TypewriterEffect text="time to lock in" typingDelay={70} deletingDelay={30} cursor={true} cursorCharacter="_" />
              </h2>

              <div className="text-[0.95rem] leading-[1.7] max-w-[520px] italic min-h-[1.5em] font-['Space_Mono'] text-black">
                <TypewriterEffect
                  text={[
                    "Sapere aude.",
                    "Veritas vos liberabit.",
                    "Invictus animus.",
                    "Nosce te ipsum.",
                    "Natura libera.",
                    "Non est ad astra mollis e terris via.",
                    "Vincit qui se vincit.",
                    "Nemo liber est qui corpori servit.",
                    "Animus liber est.",
                    "Veritati obnoxius sum.",
                    "In lumine tuo videbimus lumen."
                  ]}
                  typingDelay={100}
                  deletingDelay={50}
                  delay={2000}
                  cursor={true}
                  cursorCharacter="|"
                  startDelay={1600}
                  smartBackspace={true}
                  loop={true}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-dashed border-muted/30">
              <div className={`transition-all duration-300 font-bold ${isFading ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}`}>
                <span>{phrases[currentWordIndex].content}</span>
                
              </div>
            </div>
          </div>
        </div>

        {/* STRATUM */}
        <Stratum />

        {/* GEO1 */}
        <Geo1 />

        {/* QUOTE */}
        <div className="box b-quote fi3">
          <div className="jp">狂った世界では、<br />狂った人々だけが<br />正気である。</div>
          <div className="en">// In a mad world, only the mad are sane.</div>
          <div className="attr">AKIRA KUROSAWA</div>
        </div>

        {/* SOLIS */}
        <Solis />

        {/* TEXT 2 */}
        <div className="box b-text2 fi">
          <h3>SHIPWRECK<br />BY<br />DESIGN.</h3>
          <p>
            "The invention<br />
            of the ship<br />
            is also the<br />
            invention<br />
            of the<br />
            shipwreck."<br /><br />
            — PAUL VIRILIO
          </p>
        </div>

        {/* GEO2 */}
        <Geo2 />

        {/* BIG TYPE */}
        <div className="box b-bigtype">
          <span className="bg-t">FREE&nbsp;AGENT</span>
          <div className="fg-t">FREE<br />AGENT.</div>
        </div>

        {/* ECLIPSE */}
        <Eclipse />

        {/* MANIFESTO 2 — Blue Box */}
        <div className="box b-manifesto2 fi">
          <div>
            <h2>NO BOUNDARY<br />LINE.</h2>

            <div className={`transition-opacity duration-300 font-['Space_Mono'] text-[0.8rem] leading-[1.8] mb-8 ${isSegmentFading ? 'opacity-0' : 'opacity-100'}`}>
              {manifestoSegments[currentSegmentIndex]}
            </div>

            <p className="border-t border-white/20 pt-4 opacity-80 mt-auto">
              "There are decades where nothing<br />
              happens; and there are weeks<br />
              where decades happen."<br /><br />
              — V.I. LENIN (ATTR.)
            </p>
          </div>
          <div className="sess">SESSION 01 / 26</div>
        </div>

        {/* AXIS */}
        <Axis />


      </main>
        
    </div>
  );
};

export default Home;
