import { ArrowUpRight, ExternalLink, GitBranch } from "lucide-react";
import { Link } from "react-router-dom";
import { projects } from "@/lib/projects";

const Projects = () => {
  return (
    <div className="px-6 md:px-12 lg:px-16 py-16 max-w-[1000px] mx-auto animate-fade-in">
      <div className="mb-16 pb-8 border-b-[4px] border-foreground relative">
        <h1 className="text-5xl md:text-7xl font-['Bebas_Neue'] text-foreground tracking-widest uppercase mb-4 relative z-10">
          Software Projects
        </h1>
        <p className="text-lg md:text-xl text-foreground max-w-2xl leading-relaxed relative z-10">
          The current software index. Open any dossier for a more detailed breakdown.
        </p>
      </div>

      <div className="space-y-16">
        {projects.map((project, index) => {
          const githubUrl = project.links.find((link) => link.label === "GitHub")?.href;
          const liveUrl = project.links.find((link) => link.label === "Live demo")?.href;

          return (
          <article
            key={project.slug}
            className="relative group border-b-2 border-dashed border-muted pb-12 last:border-0"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <header className="mb-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-[0.72rem] uppercase tracking-[0.24em] text-muted-foreground mb-3">
                    {project.subtitle}
                  </p>
                  <h2 className="text-3xl md:text-5xl font-['Bebas_Neue'] uppercase tracking-wide text-foreground group-hover:text-destructive transition-colors leading-[0.9] mb-4">
                    {project.title}
                  </h2>
                </div>

                <Link
                  to={`/projects/${project.slug}`}
                  className="inline-flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.24em] text-foreground hover:text-destructive transition-colors"
                >
                  Open dossier
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>

              <p className="text-[0.95rem] text-foreground leading-[1.7] max-w-3xl mb-6">
                {project.summary}
              </p>
            </header>

            <div className="flex flex-wrap items-center gap-6 mt-6">
              <div className="flex flex-wrap gap-2">
                {project.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="border border-foreground/30 px-2 py-0.5 text-[0.65rem] tracking-[0.1em] uppercase text-foreground font-bold"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-6 mt-6 pt-4 text-[0.7rem] text-muted-foreground uppercase tracking-widest font-bold">
              {githubUrl && (
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-foreground transition-colors duration-300"
                >
                  <GitBranch className="w-4 h-4" />
                  View Code
                </a>
              )}
              {liveUrl && (
                <a
                  href={liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-foreground transition-colors duration-300"
                >
                  <ExternalLink className="w-4 h-4" />
                  Live Demo
                </a>
              )}
            </div>
          </article>
        )})}
      </div>
    </div>
  );
};

export default Projects;
