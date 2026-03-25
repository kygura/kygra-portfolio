import { Link } from "react-router-dom";
import { TypewriterEffect } from "../components/ui/typewriter-effect";

const Home = () => {
  return (
    <div className="w-full max-w-[1200px] mx-auto p-4 sm:p-8 bg-background text-foreground relative z-10 font-['Courier_Prime']">
      {/* INTRO SECTION */}
      <div className="flex flex-col md:flex-row gap-12 md:gap-16 mb-16">
        {/* Left Side: Typewriter and Intro */}
        <div className="flex-1 md:pr-8 md:border-r-2 border-foreground relative border-b-2 md:border-b-0 pb-8 md:pb-0">
          <div className="mb-8 relative z-10 mt-2">
            <h1 className="font-['Bebas_Neue'] text-3xl md:text-5xl lg:text-5xl text-foreground leading-[1.2] tracking-wider mb-2 min-h-[1.2em]">
              <TypewriterEffect text="Greetings" typingDelay={70} deletingDelay={30} cursor={true} cursorCharacter="_" />
            </h1>
            
          </div>

          <div className="text-[0.85rem] md:text-[0.95rem] leading-[1.7] max-w-[520px] text-foreground space-y-5 relative z-10">
{/*             <p>
              This site is a record of an ongoing attempt at the active state of living. The thinking, the work, the effort to be a real person in an era that finds that inconvenient.
            </p> */}
            <p>
              I build autonomous systems to track the flow of information and value, write about the nature of the structures that surround us, and seek to map the game being played beneath the surface.
            </p>
            <p>
              I work independently, which means I answer to outcomes rather than processes. My edge is pattern recognition across domains: the same instincts that read a derivatives market inform how I architect a product, structure an argument, or shape a narrative.
            </p>
            <p>
              I believe tools should extend human judgment, not replace it. So I build with that in mind: Systems that stay legible, interfaces that respect the user, automations that amplify rather than obscure. The goal is always leverage without dependency. Agentic development for the age of augmented interfaces.
            </p>
          </div>

          
        </div>

        {/* Right Side: Quote, Languages, Contact, and Core Ideology Link */}
        <div className="flex-[0.8] flex flex-col justify-between pt-2">
          <div>
            <div className="mb-10 pb-8 border-b border-dashed border-muted relative">
              <p className="font-['Special_Elite'] text-[1.1rem] leading-[1.5] text-[#2c4a7c] dark:text-[#5e8be6] border-l-4 border-[#2c4a7c] dark:border-[#5e8be6] pl-4 italic">
                "Everything is a pattern asking to be resolved."
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-10 pb-8 border-b border-dashed border-muted">
              <div className="text-[0.8rem] leading-[2] font-['Special_Elite'] text-foreground">
                <div className="text-muted-foreground uppercase text-[0.7rem] tracking-widest mb-2">Languages</div>
                <div>ES — native</div>
                <div>EN — fluent</div>
                <div>DE — functional</div>
              </div>
              
              <div className="text-[0.75rem] leading-[1.8] text-muted-foreground font-['Courier_Prime']">
                <div className="uppercase text-[0.7rem] tracking-widest mb-2 font-['Special_Elite']">Location</div>
                Find me where the work lives.<br />
                Not on LinkedIn.<br />
                <a href="mailto:ncerratoanton@gmail.com"
                  rel="noopener noreferrer"
                  className="text-destructive font-['Special_Elite'] no-underline text-[0.85rem] mt-2 inline-block hover:underline">ncerratoanton@gmail.com</a>
              </div>
            </div>
          </div>

          <Link
            to="/writings/on-the-state-of-things"
            className="block border-2 border-foreground hover:border-destructive transition-colors duration-300 relative group overflow-hidden no-underline mt-4 md:mt-0"
          >
            {/* Background Hover Effect */}
            <div className="absolute inset-0 bg-transparent group-hover:bg-destructive/[0.03] transition-colors duration-500 pointer-events-none z-0"></div>

            {/* Decorative Side Element */}
            <div className="absolute right-0 top-0 bottom-0 w-8 md:w-12 border-l-2 border-foreground group-hover:border-destructive transition-colors duration-300 flex flex-col items-center justify-center bg-foreground group-hover:bg-destructive text-background pointer-events-none z-10 overflow-hidden">
              <span className="font-mono text-[0.6rem] md:text-[0.75rem] -rotate-90 tracking-[0.3em] uppercase whitespace-nowrap group-hover:scale-110 transition-transform duration-300">
                Read
              </span>
            </div>

            <div className="relative z-10 p-5 md:p-6 pr-12 md:pr-16 flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="h-[2px] w-4 md:w-6 bg-destructive group-hover:w-10 transition-all duration-300"></span>
                <span className="font-['Special_Elite'] text-[0.65rem] uppercase tracking-widest text-destructive">
                  Core Ideology
                </span>
              </div>
              
              <h3 className="font-['Bebas_Neue'] text-2xl md:text-3xl lg:text-4xl tracking-[0.05em] text-foreground m-0 leading-[0.9] group-hover:text-destructive transition-colors duration-300">
                ON THE STATE OF THINGS
              </h3>

              <p className="font-['Courier_Prime'] text-[0.75rem] text-muted-foreground md:text-[0.8rem] mt-2 mb-0">
                The full essay exploring the erasure of the humane, the interfaced flesh, and the absolute necessity of reclaiming agency.
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* BOTTOM STRIP - PROJECTS */}
      <div className="pt-8 border-t-2 border-foreground relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          <div className="relative">
            <div className="font-['Bebas_Neue'] text-[1.8rem] leading-none mb-2 text-foreground">HYPERQUANT</div>
            <p className="text-[0.8rem] leading-[1.6] text-muted-foreground">
              A trading dashboard built for the way I actually think.
              Regime classification, margin visualization, execution flow.
            </p>
          </div>

          <div className="relative">
            <div className="font-['Bebas_Neue'] text-[1.8rem] leading-none mb-2 text-foreground">MEMESCOPE</div>
            <p className="text-[0.8rem] leading-[1.6] text-muted-foreground">
              Autonomous terminal for tracking memetic narratives
              and token flows. Because information is the real asset.
              Alpha doesn't sleep.
            </p>
          </div>

          <div className="relative">
            <div className="font-['Bebas_Neue'] text-[1.8rem] leading-none mb-2 text-foreground">AGORA</div>
            <p className="text-[0.8rem] leading-[1.6] text-muted-foreground">
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
