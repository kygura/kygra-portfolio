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
  /*   {
      title: "Nyx",
      description:
        "A decentralised social media app with a closed economy and a built-in prediction market.",
      techStack: [],
      githubUrl: "https://github.com/kygura/nyx",
      liveUrl: "https://nyx.xyz",
    }, */
];

const Projects = () => {
  return (
    <div className="px-6 md:px-12 lg:px-16 py-16 md:py-24 max-w-5xl mx-auto animate-fade-in">
      <h1 className="text-5xl md:text-6xl font-display font-light mb-4">Software Projects</h1>
      <p className="text-lg text-muted-foreground mb-16">
        A selection of projects I'm currently building.
      </p>

      <div className="space-y-16">
        {projects.map((project, index) => (
          <article
            key={index}
            className="border-b border-border pb-16 last:border-0 hover:translate-x-1 transition-transform duration-300"
          >
            <h2 className="text-3xl md:text-4xl font-display font-light mb-4">
              {project.title}
            </h2>

            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              {project.description}
            </p>

            <div className="flex flex-wrap gap-2 mb-6">
              {project.techStack.map((tech) => (
                <span
                  key={tech}
                  className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-sm"
                >
                  {tech}
                </span>
              ))}
            </div>

            <div className="flex gap-4">
              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  <Github className="w-4 h-4" />
                  View Code
                </a>
              )}
              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  <ExternalLink className="w-4 h-4" />
                  Live Demo
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default Projects;
