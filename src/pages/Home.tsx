import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { TypewriterEffect } from "../components/ui/typewriter-effect";

const Home = () => {
  const phrases = [
    { prefix: "KNOWN AS A ", highlight: "TRADER" },
    { prefix: "KNOWN AS A ", highlight: "BUILDER" },
    { prefix: "KNOWN AS A ", highlight: "TRAVELLER" },
    { prefix: "KNOWN AS A ", highlight: "MUSICIAN" },
    { prefix: "KNOWN AS A ", highlight: "PROGRAMMER" },

    { prefix: "BUT IN TRUTH I AM ", highlight: "JUST A MAN" }
  ];
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const cycleInterval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setCurrentWordIndex((prev) => (prev + 1) % phrases.length);
        setIsFading(false);
      }, 350); // wait for fade out
    }, 2800);
    return () => clearInterval(cycleInterval);
  }, []);

  return (
    <div className="w-full max-w-[1200px] mx-auto p-4 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-0 bg-background text-foreground relative z-10 font-['Courier_Prime']">
      {/* HERO BLOCK */}
      <div className="md:col-span-2 p-6 md:p-8 md:pr-12 md:border-r-2 border-foreground relative border-b-2 md:border-b-0 border-foreground">
        <div className="mb-8 relative z-10 mt-2">
          <h1 className="font-['Bebas_Neue'] text-3xl md:text-5xl lg:text-5xl text-foreground leading-[1.2] tracking-wider mb-2 min-h-[1.2em]">
            <TypewriterEffect text="Welcome friend" typingDelay={70} deletingDelay={30} cursor={true} cursorCharacter="_" />
          </h1>
          <div className="font-['Courier_Prime'] text-[0.85rem] md:text-[0.95rem] leading-[1.7] max-w-[520px] text-muted-foreground italic min-h-[1.5em]">
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

        {/* <h2 className="font-['Bebas_Neue'] text-[clamp(2.5rem,7vw,5.5rem)] leading-[0.9] mb-6 text-foreground relative z-10 mt-8">
          I am a<br />
          <span className="text-destructive relative">reader</span> of<br />
          <span className="relative after:content-[''] after:absolute after:bottom-1 md:after:bottom-2 after:left-0 after:right-0 after:h-[2px] md:after:h-[3px] after:bg-foreground">hidden</span><br />
          order.
        </h2> */}

        <div className="text-[0.85rem] md:text-[0.95rem] leading-[1.7] max-w-[520px] text-foreground space-y-5 relative z-10">
          <p className="font-['Bebas_Neue'] text-2xl sm:text-3xl md:text-4xl text-foreground tracking-[0.1em]">ON THE STATE OF THINGS</p>
          <p>
            There's a kind of person who comes to understand, usually through some combination of luck and suffering, that the game being played on the surface is not the actual game. That life as it is currently being presented is not an active state of living, but a slow erasure and annihilation of the humane; as it is replaced by the machine-like.
          </p>
          <p>
            There was this old ideal that history must have a direction, that progress compounds toward human flourishing. This was the founding myth of the civilization we inherited. What we actually inherited was its husk. The form without the substance. Democracy as a marketing term. Freedom as the freedom to choose the size of your cage. Which subscription plan manages your attention. Meaning as something you're supposed to find on your own time, after your shift.
          </p>
          <div className="border-l-2 border-destructive pl-4 my-6 space-y-4 text-muted-foreground">
            <p>
              Meaning used to be an experience and state of being inherit in a simpler lifestyle guided by the need for survival.
              Now it surrogated as an external and commodified into a product one must buy.
              The promise is:
              You'll find your meaning on a subscription plan, a new job, a new relationship, a new house, a new car, a new phone, a new app, a new game, a new show, a new book, a new person, a new idea, a new belief, a new hope, a new dream, a new goal, a new purpose, a new meaning.
              Meaning is understood as this external source of fulfillment, something that you can't create for yourself, but must seek out.
            </p>
            <p>
              Not a crisis, not a moment a slow erasure. The purchasing power of your time. The integrity of the institutions you were handed. The promise that participation would be enough. Work hard, stay inside the lines, believe in the trajectory. Most of us spent our twenties discovering that the trajectory was never going where they said it was going.
            </p>
          </div>
          <p>
            This isn't a political crisis either. Every political tribe has failed you, in sequence, with conviction. The left and the right are both administrative problems, not spiritual ones. What's broken goes deeper than policy — it's in the texture of daily life. The atomization. The screen-mediated loneliness. The feeling of being a node in a network that doesn't care whether you're there. What I've started calling the interfaced flesh: the human being who can only encounter the world through an interface that is also surveilling him, selling him back to himself, slowly replacing his inner life with a curated performance of it.
          </p>
          <div className="border-l-2 border-destructive pl-4 my-6 space-y-4 text-muted-foreground">
            <p>
              You cannot vote your way out of this. You cannot hustle your way out of it either — the hustle is part of the same machine, repackaged as resistance. Three side incomes and a growth mindset is not emancipation. It is participation with extra steps, optimized for the platform that profits from your exhaustion.
            </p>
          </div>
          <p>
            So where does that leave a person?
          </p>
          <p>
            Posed differently: <em>how do I live?</em>
          </p>
          <p>
            Not "how do I succeed" — success does not mean much if you remain confined and captive in the system . It alleviates the economic pains, but keeps the existential ones.One might rephrase the question into "how do I escape?" Escape here means to stop playing the game entirely. Abandon the rat race all together. I can honor that.
            There is beauty in a quiet life; however it is also tragic to flee from a society, as the world keeps turning without us. Interestingally though, the courage to abandon society belongs to the few amongst us with the wisdom, patience and courage that can heal it.
          </p>
          <p>
            The hermit in the mountain laughs at us, knowing it is all a game. And the games of men run on deception and unspoken rules. A game of poker where the stakes are never disclosed and most of us play double 9s.
          </p>
          <p>
            To me then, the question
            becomes <em>"how do I live?"</em>, to which there is only one answer I have:
            <br />
            With integrity, with agency, with your eyes open to the nature of reality, stripped of ideology and prior assumptions, where nothing is assumed and everything is questioned.
            What you are left with is both illuminating and deceptly disappointing:
            The fact that life was and will never be easy and each generation is tasked with confronting the corruption, decay and evil of their age with courage:
            We inherit the spirit of our ancestors, and attempt to grow beyond them.
          </p>
          <div className="border-l-2 border-destructive pl-4 my-6 space-y-4 text-muted-foreground">
            <p>
              Treat life as a game you didn't design but have to play. Not with cynicism, but positive indifference. With clarity. The rules are visible if you stop pretending they're natural.
              The incentives are legible if you stop mistaking them for morality. The exits are real if you stop needing permission to use them. You learn to read the structure of what surrounds you — the market, the institution, the social system — and you find the degrees of freedom that the structure inadvertently permits.
            </p>
            <p>
              That is not a formula. It's a posture. It requires giving up the story that someone will fix it, that the right ideology will finally get traction, that the system will eventually reward those who play by its stated rules. It requires building your life around what is actually true instead of what was promised.
            </p>
          </div>
          <p>
            This site is a record of that attempt. The thinking, the work, the ongoing effort to be a real person in an era that finds that inconvenient.
          </p>
          <p>
            If that resonates and if you've felt the ache of it, the particular loneliness of seeing clearly in a culture that profits from confussion;
            You are in the right place.
            The work is not done.
            Our ambitions not met.
          </p>
          <p>
            We are not done yet.
            <br />
            <i>
              —K.
            </i>
          </p>
        </div>

        <div className="mt-8 pt-4 border-t border-dashed border-muted relative z-10">
          <div className="font-['Bebas_Neue'] text-2xl sm:text-3xl md:text-4xl text-foreground tracking-[0.1em] min-h-[2.4rem]">
            <div
              className={`transition-all duration-300 ${isFading ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}`}
            >
              <span>{phrases[currentWordIndex].prefix}</span>
              <span className="text-destructive">
                {phrases[currentWordIndex].highlight}</span>
            </div>
          </div>
        </div>

      </div>

      {/* SIDEBAR */}
      <div className="md:col-start-3 md:col-end-4 md:row-span-2 p-6 md:p-8 md:border-l-2 border-foreground relative border-b-2 md:border-b-0">
        <div className="mb-10 pb-8 border-b border-dashed border-muted">
          <ul className="list-none space-y-0">
            {['Writings', 'Projects', 'Artifacts'].map(item => (
              <li key={item} className="border-b border-foreground/15 py-2">
                <Link to={`/${item.toLowerCase()}`} className="font-['Special_Elite'] text-base text-foreground no-underline flex justify-between items-center transition-colors hover:text-destructive after:content-['→'] after:opacity-40 after:font-mono">
                  {item === 'Projects' ? 'Software' : item}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mb-10 pb-8 border-b border-dashed border-muted relative">
          <p className="font-['Special_Elite'] text-[1.1rem] leading-[1.5] text-[#2c4a7c] dark:text-[#5e8be6] border-l-4 border-[#2c4a7c] dark:border-[#5e8be6] pl-4 italic">
            "Everything is a pattern, asking to be resolved."
          </p>
        </div>

        <div className="mb-10 pb-8 border-b border-dashed border-muted hidden md:block">
          <div className="text-[0.8rem] leading-[2] font-['Special_Elite'] text-foreground">
            <div>ES — native</div>
            <div>EN — fluent</div>
            <div>DE — functional</div>
            <div>JS/TS — daily</div>
            <div>PY — when needed</div>
            <div>SOL — on-chain</div>
          </div>
        </div>

        <div>
          <div className="text-[0.75rem] leading-[1.8] text-muted-foreground">
            Find me where the work lives.<br />
            Not on LinkedIn.<br />
            <a href="mailto:alphaomega@outlook.es"
              rel="noopener noreferrer"
              className="text-destructive font-['Special_Elite'] no-underline text-[0.85rem] mt-1 inline-block hover:underline">alphaomega@outlook.es</a>
          </div>
        </div>
      </div>

      {/* BOTTOM STRIP */}
      <div className="md:col-span-2 p-6 md:p-8 md:pr-12 md:border-r-2 md:border-t-2 border-foreground relative grid grid-cols-1 sm:grid-cols-2 gap-8">
        <div className="relative pt-2">
          <div className="font-['Bebas_Neue'] text-[1.8rem] leading-none mb-2">HYPERQUANT</div>
          <p className="text-[0.8rem] leading-[1.6] text-foreground/80">
            A trading dashboard built for the way I actually think.
            Regime classification, margin visualization, execution flow.
          </p>
          {/* <div className="mt-4 flex gap-2 flex-wrap">
            <span className="stamp -rotate-1">DERIVATIVES</span>
            <span className="stamp rotate-1 border-[#2c4a7c] dark:border-[#5e8be6] text-[#2c4a7c] dark:text-[#5e8be6]">REACT</span>
          </div> */}
        </div>

        <div className="pt-2">
          <div className="font-['Bebas_Neue'] text-[1.8rem] leading-none mb-2">MEMESCOPE</div>
          <p className="text-[0.8rem] leading-[1.6] text-foreground/80 mb-6">
            Autonomous terminal for tracking memetic narratives
            and token flows. Because information is the real asset.
            Alpha doesn't sleep.
          </p>

          <div className="mt-8">
            <div className="font-['Bebas_Neue'] text-[1.4rem] leading-none mb-1">AGORA</div>
            <p className="text-[0.8rem] leading-[1.6] text-foreground/80">
              Anti-institutional talent platform.
              Open competition, no gatekeepers.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Home;
