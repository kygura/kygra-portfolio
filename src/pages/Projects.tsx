import { ExternalLink, Github } from "lucide-react";

interface Project {
  title: string;
  description: string;
  techStack: string[];
  liveUrl?: string;
  githubUrl?: string;
}

const projects: Project[] = [
  {
    title: "zkNull",
    description:
      "zkNull is a privacy coin with a dedicated privacy layer built on top of the zkEVM.",
    techStack: ["Solidity", "zkSNARKs", "Circom", "Foundry"],
    githubUrl: "https://github.com/kygura/zknull",
    liveUrl: "https://zknull.xyz",
  },
  {
    title: "Equilibria",
    description:
      "An algorithmic flatcoin with a built-in tranching system pegged to supply market dynamics.",
    techStack: ["Solidity", "NextJS", "Hardhat"],
    githubUrl: "https://github.com/kygura/equilibria-protocol",
    liveUrl: "https://equilibria.cash",
  },
  {
    title: "Meridian",
    description:
      "A cartographing interface to explore and mark meaningful experiences across the globe.",
    techStack: ["Google Maps", "Deepseek", "Claude", "React"],
    githubUrl: "https://github.com/kygura/meridian",
    liveUrl: "https://meridian-flame.vercel.app/",
  },
];

const Projects = () => {
  return (
    <div className="w-full max-w-[1200px] mx-auto p-4 sm:p-8 bg-background text-foreground relative z-10 font-['Courier_Prime'] animate-fade-in">
      
      <div className="mb-10 pb-8 border-b-2 border-foreground relative">
        <h1 className="font-['Bebas_Neue'] text-4xl md:text-5xl lg:text-6xl text-foreground tracking-wider mb-2">
          SOFTWARE
        </h1>
        <p className="text-[0.85rem] md:text-[0.95rem] text-muted-foreground max-w-2xl leading-[1.7]">
          A selection of systems I'm currently architecting and building.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {projects.map((project, index) => (
          <article
            key={index}
            className="border-2 border-foreground hover:border-destructive transition-colors duration-300 relative group overflow-hidden flex flex-col"
          >
            {/* Background Hover Effect */}
            <div className="absolute inset-0 bg-transparent group-hover:bg-destructive/[0.03] transition-colors duration-500 pointer-events-none z-0"></div>

            {/* Decorative Side Element */}
            <div className="absolute right-0 top-0 bottom-0 w-8 border-l-2 border-foreground group-hover:border-destructive transition-colors duration-300 flex flex-col items-center justify-center bg-foreground group-hover:bg-destructive text-background pointer-events-none z-10 overflow-hidden">
               <span className="font-mono text-[0.6rem] -rotate-90 tracking-[0.3em] uppercase whitespace-nowrap group-hover:scale-110 transition-transform duration-300">
                  SYS.0{index + 1}
               </span>
            </div>

            <div className="relative z-10 p-6 pr-12 flex flex-col flex-grow">
              <div className="mb-4">
                <h2 className="font-['Bebas_Neue'] text-3xl md:text-4xl tracking-[0.05em] text-foreground m-0 leading-[0.9] group-hover:text-destructive transition-colors duration-300">
                  {project.title}
                </h2>
              </div>

              <p className="font-['Courier_Prime'] text-[0.85rem] md:text-[0.95rem] text-muted-foreground leading-[1.6] mb-8 flex-grow">
                {project.description}
              </p>

              <div className="flex flex-wrap gap-2 mb-8">
                {project.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="font-['Special_Elite'] text-[0.65rem] uppercase tracking-widest text-foreground border border-foreground/30 px-2 py-1"
                  >
                    {tech}
                  </span>
                ))}
              </div>

              <div className="flex gap-6 mt-auto border-t border-dashed border-muted pt-4">
                {project.githubUrl && (
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 font-['Special_Elite'] text-[0.7rem] uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors duration-300 no-underline"
                  >
                    <Github className="w-4 h-4" />
                    Source
                  </a>
                )}
                {project.liveUrl && (
                  <a
                    href={project.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 font-['Special_Elite'] text-[0.7rem] uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors duration-300 no-underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Live
                  </a>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default Projects;
