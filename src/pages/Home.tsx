import { useRef, useEffect, useState } from "react";
import { TypewriterEffect } from "../components/ui/typewriter-effect";
//import { Link } from "react-router-dom";

const Home = () => {
  // --- Quote Rotation State ---
  const phrases = [
    { prefix: "KNOWN AS A ", highlight: "TRADER" },
    { prefix: "KNOWN AS A ", highlight: "BUILDER" },
    { prefix: "KNOWN AS A ", highlight: "TRAVELLER" },
    { prefix: "KNOWN AS A ", highlight: "MUSICIAN" },
    { prefix: "KNOWN AS A ", highlight: "PROGRAMMER" },
    { prefix: "BUT IN TRUTH I AM ", highlight: "JUST A MAN" }
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
      <header className="bebop-header">
        <div className="hbg"></div>

        {/* <div className="site-id">KYGRA.XYZ</div> */}

        {/* BASE LAYER — dark text, sits below and is visible on the cream background */}
        <div className="hero-content hero-content--base">
          <div className="hero-name fi">KYGRA</div>
          <div className="hero-sub fi2">
            I AM FROM THE FUTURE
          </div>
        </div>

        {/* INVERT LAYER — cream text, absolute to viewport, clipped to the right-hand black area */}
        <div className="hero-content hero-content--invert" aria-hidden="true">
          <div className="hero-name fi">KYGRA</div>
          <div className="hero-sub fi2">I AM FROM THE FUTURE</div>
        </div>

        <div className="hstrip">
          <span>
            BOUNTY HUNTER · DIGITAL MERCENARY · MARKET OPERATOR · FREE AGENT · NO MASTERS · NO FIXED ORBIT · PERPETUAL FUTURES · SEE YOU SPACE COWBOY ·&nbsp;&nbsp;
            BOUNTY HUNTER · DIGITAL MERCENARY · MARKET OPERATOR · FREE AGENT · NO MASTERS · NO FIXED ORBIT · PERPETUAL FUTURES · SEE YOU SPACE COWBOY ·&nbsp;&nbsp;
          </span>
        </div>
      </header>

      <main className="bebop-main">

        {/* MANIFESTO — White Box */}
        <div className="box b-manifesto fi">
          <div className="flex flex-col h-full justify-between pb-4">
            <div>
              <h2 className="mb-6">
                <TypewriterEffect text="It's time" typingDelay={70} deletingDelay={30} cursor={true} cursorCharacter="_" />
              </h2>
              
              <div className="text-[0.95rem] leading-[1.7] max-w-[520px] text-foreground/80 italic min-h-[1.5em] font-['Space_Mono'] text-black">
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
                <span>{phrases[currentWordIndex].prefix}</span>
                <span className="text-destructive">{phrases[currentWordIndex].highlight}</span>
              </div>
            </div>
          </div>
        </div>

      {/* STRATUM — yellow bg, dense geodesic wireframe globe */}
      <div className="box b-moto fi2">
        <svg viewBox="0 0 500 420" fill="none" style={{ width: '100%', height: '100%', padding: '2rem' }}>
          <g stroke="#f5c842" strokeWidth="1">
            <circle cx="250" cy="210" r="150" strokeWidth="1.6" />
            <ellipse cx="250" cy="210" rx="150" ry="20" strokeWidth="0.8" />
            <ellipse cx="250" cy="210" rx="147" ry="55" strokeWidth="0.8" />
            <ellipse cx="250" cy="210" rx="139" ry="90" strokeWidth="0.8" />
            <ellipse cx="250" cy="210" rx="120" ry="120" strokeWidth="0.8" strokeDasharray="3 2" />
            <ellipse cx="250" cy="210" rx="139" ry="90" transform="rotate(180 250 210)" strokeWidth="0.6" />
            <ellipse cx="250" cy="210" rx="147" ry="55" transform="rotate(180 250 210)" strokeWidth="0.6" />
            <ellipse cx="250" cy="210" rx="30" ry="150" strokeWidth="0.8" />
            <ellipse cx="250" cy="210" rx="80" ry="150" strokeWidth="0.8" />
            <ellipse cx="250" cy="210" rx="120" ry="150" strokeWidth="0.8" />
            <ellipse cx="250" cy="210" rx="30" ry="150" transform="rotate(45 250 210)" strokeWidth="0.6" />
            <ellipse cx="250" cy="210" rx="80" ry="150" transform="rotate(45 250 210)" strokeWidth="0.6" />
            <ellipse cx="250" cy="210" rx="120" ry="150" transform="rotate(45 250 210)" strokeWidth="0.6" />
            <circle cx="250" cy="60" r="4" fill="#f5c842" />
            <circle cx="250" cy="360" r="4" fill="#f5c842" />
            <circle cx="100" cy="210" r="4" fill="#f5c842" />
            <circle cx="400" cy="210" r="4" fill="#f5c842" />
            <line x1="20" y1="20" x2="50" y2="20" strokeWidth="1.2" />
            <line x1="20" y1="20" x2="20" y2="50" strokeWidth="1.2" />
            <line x1="480" y1="400" x2="450" y2="400" strokeWidth="1.2" />
            <line x1="480" y1="400" x2="480" y2="370" strokeWidth="1.2" />
            <text x="22" y="16" fontSize="8" fontFamily="monospace" fill="#f5c842">STRATUM — GEODESIC</text>
            <text x="22" y="395" fontSize="7" fontFamily="monospace" fill="#f5c842">ø 300u · 7 LAT · 8 LONG</text>
          </g>
        </svg>
        <span className="spec">STRATUM — WIREFRAME SPHERE · 2074</span>
      </div>

      {/* GEO1 — teal bg, rotating squares (GEO.01) */}
      <div className="box b-geo1">
        <svg viewBox="0 0 200 280" fill="none">
          <g stroke="#0a0a0a" strokeWidth="1.5">
            <rect x="15" y="15" width="85" height="60" className="df" />
            <rect x="32" y="32" width="85" height="60" className="df" />
            <rect x="49" y="49" width="85" height="60" fill="#0a0a0a" />
            <polygon points="100,135 18,255 182,255" strokeWidth="1.5" className="d2" />
            <polygon points="100,150 42,240 158,240" strokeDasharray="4 3" className="d2" />
            <line x1="100" y1="135" x2="100" y2="255" />
            <circle cx="55" cy="78" r="8" fill="#0a0a0a" />
            <circle cx="100" cy="195" r="13" className="df" />
            <circle cx="100" cy="195" r="5" fill="#0a0a0a" />
            <text x="14" y="11" fontSize="8" fontFamily="monospace" fill="#0a0a0a">GEO.01</text>
            <text x="126" y="253" fontSize="7" fontFamily="monospace" fill="#0a0a0a">45°</text>
          </g>
        </svg>
      </div>

      {/* QUOTE */}
      <div className="box b-quote fi3">
        <div className="jp">狂った世界では、<br />狂った人々だけが<br />正気である。</div>
        <div className="en">// In a mad world, only the mad are sane.</div>
        <div className="attr">AKIRA KUROSAWA</div>
      </div>

      {/* AXIS — coral bg, sparse globe with red tilt axis */}
      <div className="box b-speeder fi2">
        <svg viewBox="0 0 400 280" fill="none" style={{ width: '100%', height: '100%', padding: '1.5rem' }}>
          <g stroke="#0a0a0a" strokeWidth="0.9">
            <circle cx="200" cy="140" r="110" strokeWidth="1.8" />
            <ellipse cx="200" cy="140" rx="110" ry="10" />
            <ellipse cx="200" cy="140" rx="109" ry="28" />
            <ellipse cx="200" cy="140" rx="105" ry="46" />
            <ellipse cx="200" cy="140" rx="99" ry="63" />
            <ellipse cx="200" cy="140" rx="89" ry="78" />
            <ellipse cx="200" cy="140" rx="75" ry="90" />
            <ellipse cx="200" cy="140" rx="55" ry="99" />
            <ellipse cx="200" cy="140" rx="75" ry="90" transform="rotate(180 200 140)" />
            <ellipse cx="200" cy="140" rx="89" ry="78" transform="rotate(180 200 140)" />
            <ellipse cx="200" cy="140" rx="99" ry="63" transform="rotate(180 200 140)" />
            <ellipse cx="200" cy="140" rx="105" ry="46" transform="rotate(180 200 140)" />
            <ellipse cx="200" cy="140" rx="109" ry="28" transform="rotate(180 200 140)" />
            <ellipse cx="200" cy="140" rx="18" ry="110" />
            <ellipse cx="200" cy="140" rx="50" ry="110" />
            <ellipse cx="200" cy="140" rx="80" ry="110" />
            <ellipse cx="200" cy="140" rx="105" ry="110" />
            <ellipse cx="200" cy="140" rx="18" ry="110" transform="rotate(30 200 140)" />
            <ellipse cx="200" cy="140" rx="50" ry="110" transform="rotate(30 200 140)" />
            <ellipse cx="200" cy="140" rx="80" ry="110" transform="rotate(30 200 140)" />
            <ellipse cx="200" cy="140" rx="105" ry="110" transform="rotate(30 200 140)" />
            <ellipse cx="200" cy="140" rx="18" ry="110" transform="rotate(60 200 140)" />
            <ellipse cx="200" cy="140" rx="50" ry="110" transform="rotate(60 200 140)" />
            <ellipse cx="200" cy="140" rx="80" ry="110" transform="rotate(60 200 140)" />
            <circle cx="110" cy="90" r="7" fill="#0a0a0a" />
            <text x="15" y="12" fontSize="8" fontFamily="monospace" fill="#0a0a0a">AXIS — DENSE MESH</text>
          </g>
          {/* Red tilt axis */}
          <line x1="150" y1="45" x2="250" y2="235" stroke="#e8553d" strokeWidth="1.2" strokeDasharray="5 4" />
          <circle cx="154" cy="48" r="4" fill="#e8553d" />
          <circle cx="246" cy="232" r="4" fill="#e8553d" />
        </svg>
        <span className="spec">AXIS — SECURE TRANSMISSION</span>
      </div>

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

      {/* GEO2 — yellow, concentric rotating squares */}
      <div className="box b-geo2">
        <svg viewBox="0 0 240 240" fill="none">
          <g stroke="#0a0a0a" strokeWidth="1.5">
            <rect x="20" y="20" width="200" height="200" className="d2" />
            <rect x="45" y="45" width="150" height="150" transform="rotate(15 120 120)" className="d2" />
            <rect x="70" y="70" width="100" height="100" transform="rotate(30 120 120)" className="d" />
            <rect x="95" y="95" width="50" height="50" transform="rotate(45 120 120)" className="df" />
            <circle cx="120" cy="120" r="6" fill="#0a0a0a" />
            <line x1="20" y1="20" x2="30" y2="20" /><line x1="20" y1="20" x2="20" y2="30" />
            <line x1="220" y1="20" x2="210" y2="20" /><line x1="220" y1="20" x2="220" y2="30" />
            <line x1="20" y1="220" x2="30" y2="220" /><line x1="20" y1="220" x2="20" y2="210" />
            <line x1="220" y1="220" x2="210" y2="220" /><line x1="220" y1="220" x2="220" y2="210" />
            <line x1="20" y1="20" x2="220" y2="220" strokeDasharray="6 4" strokeWidth="0.8" />
            <line x1="220" y1="20" x2="20" y2="220" strokeDasharray="6 4" strokeWidth="0.8" />
            <text x="96" y="234" fontSize="8" fontFamily="monospace" fill="#0a0a0a">GEO.02</text>
          </g>
        </svg>
      </div>

      {/* BIG TYPE */}
      <div className="box b-bigtype">
        <span className="bg-t">FREE&nbsp;AGENT</span>
        <div className="fg-t">FREE<br />AGENT.</div>
      </div>

      {/* ECLIPSE — sparse globe with off-center moon + orbit ring */}
      <div className="box b-jet">
        <svg viewBox="0 0 300 280" fill="none" style={{ width: '100%', height: '100%', padding: '1.5rem' }}>
          <g stroke="#f0ede6" strokeWidth="1.1">
            <circle cx="150" cy="140" r="105" strokeWidth="1.8" />
            <ellipse cx="150" cy="140" rx="105" ry="22" />
            <ellipse cx="150" cy="140" rx="100" ry="55" />
            <ellipse cx="150" cy="140" rx="88" ry="80" />
            <ellipse cx="150" cy="140" rx="88" ry="80" transform="rotate(180 150 140)" strokeDasharray="3 3" />
            <ellipse cx="150" cy="140" rx="100" ry="55" transform="rotate(180 150 140)" strokeDasharray="3 3" />
            <ellipse cx="150" cy="140" rx="40" ry="105" />
            <ellipse cx="150" cy="140" rx="80" ry="105" />
            <ellipse cx="150" cy="140" rx="105" ry="105" strokeDasharray="3 3" />
            <ellipse cx="150" cy="140" rx="40" ry="105" transform="rotate(45 150 140)" strokeDasharray="3 3" />
            <ellipse cx="150" cy="140" rx="80" ry="105" transform="rotate(45 150 140)" strokeDasharray="3 3" />
            {/* Star glint detail */}
            <rect x="20" y="18" width="44" height="44" />
            <line x1="28" y1="26" x2="56" y2="54" strokeWidth="0.7" />
            <line x1="56" y1="26" x2="28" y2="54" strokeWidth="0.7" />
            <polygon points="42,22 44,40 42,58 40,40" fill="#f0ede6" />
            <polygon points="22,40 40,38 58,40 40,42" fill="#f0ede6" />
            <text x="20" y="14" fontSize="7" fontFamily="monospace" fill="#f0ede6">AXIS — ORBITAL GRID</text>
            <text x="20" y="260" fontSize="7" fontFamily="monospace" fill="#f0ede6">ø 210u · SPARSE · 5+5</text>
          </g>
        </svg>
        <span className="spec">ECLIPSE — ORBITAL MECHANICS</span>
      </div>

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

      {/* SOLIS — blueprint grid + radial burst */}
      <div className="box b-blueprint">
        <svg viewBox="0 0 560 280" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', padding: '1.5rem' }}>
          <g stroke="#3d6ee8" strokeWidth="1">
            <circle cx="280" cy="140" r="55" strokeWidth="1.8" />
            <circle cx="280" cy="140" r="40" strokeWidth="0.7" strokeDasharray="2 3" />
            <circle cx="280" cy="140" r="20" strokeWidth="0.7" />
            <circle cx="280" cy="140" r="6" fill="#3d6ee8" />
            <line x1="280" y1="85" x2="280" y2="28" />
            <line x1="309" y1="90" x2="327" y2="38" />
            <line x1="331" y1="109" x2="366" y2="72" />
            <line x1="338" y1="138" x2="385" y2="130" />
            <line x1="330" y1="165" x2="370" y2="185" />
            <line x1="312" y1="186" x2="340" y2="220" />
            <line x1="287" y1="197" x2="295" y2="252" />
            <line x1="260" y1="194" x2="250" y2="250" />
            <line x1="238" y1="180" x2="210" y2="216" />
            <line x1="225" y1="160" x2="190" y2="178" />
            <line x1="222" y1="135" x2="175" y2="128" />
            <line x1="230" y1="109" x2="196" y2="74" />
            <line x1="248" y1="90" x2="231" y2="38" />
            <line x1="295" y1="86" x2="302" y2="48" strokeWidth="0.6" />
            <line x1="320" y1="98" x2="344" y2="64" strokeWidth="0.6" />
            <line x1="335" y1="121" x2="364" y2="101" strokeWidth="0.6" />
            <line x1="339" y1="151" x2="373" y2="157" strokeWidth="0.6" />
            <line x1="322" y1="178" x2="347" y2="202" strokeWidth="0.6" />
            <line x1="300" y1="194" x2="315" y2="234" strokeWidth="0.6" />
            <line x1="271" y1="197" x2="275" y2="238" strokeWidth="0.6" />
            <line x1="247" y1="189" x2="236" y2="228" strokeWidth="0.6" />
            <line x1="229" y1="172" x2="205" y2="200" strokeWidth="0.6" />
            <line x1="222" y1="148" x2="186" y2="152" strokeWidth="0.6" />
            <line x1="225" y1="122" x2="193" y2="105" strokeWidth="0.6" />
            <line x1="238" y1="100" x2="218" y2="64" strokeWidth="0.6" />
            <line x1="264" y1="86" x2="257" y2="46" strokeWidth="0.6" />
            <rect x="22" y="16" width="52" height="52" />
            <circle cx="48" cy="42" r="16" strokeWidth="1.2" />
            <circle cx="48" cy="26" r="16" strokeWidth="0.7" />
            <circle cx="48" cy="58" r="16" strokeWidth="0.7" />
            <circle cx="34" cy="34" r="16" strokeWidth="0.7" />
            <circle cx="62" cy="34" r="16" strokeWidth="0.7" />
            <circle cx="34" cy="50" r="16" strokeWidth="0.7" />
            <circle cx="62" cy="50" r="16" strokeWidth="0.7" />
            <line x1="22" y1="264" x2="50" y2="264" strokeWidth="0.8" />
            <line x1="22" y1="264" x2="22" y2="236" strokeWidth="0.8" />
            <line x1="538" y1="16" x2="510" y2="16" strokeWidth="0.8" />
            <line x1="538" y1="16" x2="538" y2="44" strokeWidth="0.8" />
            <text x="82" y="30" fontSize="9" fontFamily="monospace" fill="#3d6ee8">SOLIS — RADIAL BURST DETAIL</text>
            <text x="22" y="276" fontSize="8" fontFamily="monospace" fill="#3d6ee8">KYGRA ORBIT SPEC — 2074 · 13 PRIMARY · 13 SECONDARY RAYS</text>
          </g>
        </svg>
        <span className="spec">ORBIT.02 — RADIAL + GEODESIC</span>
      </div>

      </main>
    </div>
  );
};

export default Home;
