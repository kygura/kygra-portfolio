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
        There's a kind of person who comes to understand... that the game being played on the surface is not the actual game. That life as it is currently being presented is not an active state of living, but a slow erasure and annihilation of the humane; as it is replaced by the machine-like.
      </p>
      <p>
        What we inherited was its husk. The form without the substance. Democracy as a marketing term. Freedom as the freedom to choose the size of your cage. Meaning as something you're supposed to find on your own time, after your shift.
      </p>
    </>,
    <>
      <p className="mb-4">
        Meaning used to be an experience and state of being inherit in a simpler lifestyle guided by the need for survival. Now it is surrogated as an external and commodified into a product one must buy.
      </p>
      <p>
        The promise is: You'll find your meaning on a subscription plan... a new job... a new relationship... Meaning is understood as this external source of fulfillment, something that you can't create for yourself, but must seek out.
      </p>
    </>,
    <>
      <p className="mb-4">
        You cannot vote your way out of this. You cannot hustle your way out of it either — the hustle is part of the same machine, repackaged as resistance. Three side incomes and a growth mindset is not emancipation. It is participation with extra steps.
      </p>
      <p>
        Posed differently: <em>how do I live?</em> Not "how do I succeed" — success does not mean much if you remain confined and captive in the system.
      </p>
    </>,
    <>
      <p className="mb-4">
        Treat life as a game you didn't design but have to play. Not with cynicism, but positive indifference. With clarity. The rules are visible if you stop pretending they're natural.
      </p>
      <p>
        You learn to read the structure of what surrounds you — the market, the institution, the social system — and you find the degrees of freedom that the structure inadvertently permits.
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
      {/*  <Header /> */}

      <main className="bebop-main">

        {/* MANIFESTO — White Box */}
        <div className="box b-manifesto fi">
          <div className="flex flex-col h-full justify-between pb-4">
            <div>
              <h2 className="mb-6">
                <TypewriterEffect text="time to lock in brother" typingDelay={70} deletingDelay={30} cursor={true} cursorCharacter="_" />
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
          <h3>TECHNOLOGY<br />IS A<br />SERVANT.</h3>
          <p>
            A terrible master;<br />
            embedding itself<br />
            into the fabric<br />
            of civilization.<br /><br />
            I view it with<br />
            skepticism<br />
            and suspicion.
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
            <h2>ON THE STATE<br />OF THINGS.</h2>

            <div className={`transition-opacity duration-300 font-['Space_Mono'] text-[0.8rem] leading-[1.8] mb-8 ${isSegmentFading ? 'opacity-0' : 'opacity-100'}`}>
              {manifestoSegments[currentSegmentIndex]}
            </div>

            <p className="border-t border-white/20 pt-4 opacity-80 mt-auto">
              "...by breaking traditional styles.<br />
              They are sick and tired of<br />
              conventional fixed style.<br />
              The work, which becomes a new<br />
              genre itself, will play without<br />
              fear of risky things."<br /><br />
              — COWBOY BEBOP MANIFESTO, 2071
            </p>
          </div>
          <div className="sess">SESSION 01 / 26</div>
        </div>

        {/* AXIS */}
        <Axis />


      </main>
        <Header />
    </div>
  );
};

export default Home;
