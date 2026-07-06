import { ExternalLink, GitBranch } from "lucide-react";
import { Link } from "react-router-dom";
import { projects } from "@/lib/projects";

const DEFAULT_ACCENT = "var(--accent-amber)";

const Projects = () => {
  return (
    <div className="px-6 md:px-12 lg:px-16 py-16 max-w-[1000px] mx-auto animate-fade-in">
      <div className="mb-16 pb-8 border-b border-[var(--border-muted)] relative">
        <p className="font-mono text-[10.5px] tracking-[0.2em] uppercase text-[var(--text-secondary)] mb-6">
          ( 02 &mdash; SOFTWARE )
        </p>
        <h1 className="text-5xl md:text-7xl font-display text-foreground tracking-[-0.01em] leading-[0.85] uppercase mb-4 relative z-10">
          Software Projects
        </h1>
        <p className="text-lg md:text-xl text-foreground max-w-2xl leading-relaxed relative z-10">
          The current software index. Open any dossier for a more detailed breakdown.
        </p>
      </div>

      <div className="space-y-16">
        {projects.map((project, index) => {
          const githubUrl = project.links.find((link) => link.label === "GitHub")?.href;
          const deployment = project.links.find((link) => link.label === "Live demo")?.href;

          return (
          <article
            key={project.slug}
            className="project-entry relative group border-b-2 border-dashed border-muted pb-12 last:border-0"
            style={{
              "--project-accent": project.accent ?? DEFAULT_ACCENT,
              animationDelay: `${index * 100}ms`,
            } as React.CSSProperties}
          >
            <header className="mb-4">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.24em] text-muted-foreground mb-3">
                  {project.subtitle}
                </p>
                <div className="flex flex-col gap-3 md:flex-row md:items-baseline md:gap-8">
                  <Link to={`/projects/${project.slug}`}>
                    <h2 className="project-entry__title text-3xl md:text-5xl font-display uppercase tracking-[-0.01em] text-foreground leading-[0.9]">
                      {project.title}
                    </h2>
                  </Link>

                  <div className="project-entry__links flex gap-3 md:self-start">
                    {githubUrl && (
                      <a
                        href={githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="project-entry__link"
                      >
                        <span className="project-entry__link-icon"><GitBranch className="w-4 h-4" /></span>
                        <span className="project-entry__link-text">View Code</span>
                      </a>
                    )}
                    {deployment && (
                      <a
                        href={deployment}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="project-entry__link"
                      >
                        <span className="project-entry__link-icon"><ExternalLink className="w-4 h-4" /></span>
                        <span className="project-entry__link-text">Live Demo</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-[0.95rem] text-foreground leading-[1.7] max-w-3xl mb-6">
                {project.summary}
              </p>
            </header>
          </article>
        )})}
      </div>
    </div>
  );
};

export default Projects;
