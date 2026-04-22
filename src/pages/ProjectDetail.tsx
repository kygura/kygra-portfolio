import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getProjectBySlug } from "@/lib/projects";

const ProjectDetail = () => {
  const { slug } = useParams();
  const project = getProjectBySlug(slug);

  if (!project) {
    return (
      <div className="px-6 md:px-12 lg:px-16 py-20 max-w-[980px] mx-auto">
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground mb-4">
          Project not found
        </p>
        <h1 className="text-5xl md:text-7xl text-foreground mb-6">Missing dossier</h1>
        <p className="text-lg text-foreground/80 max-w-2xl mb-8">
          The project you asked for is not in the current index.
        </p>
        <Link to="/projects" className="inline-flex items-center gap-2 project-detail__button">
          <ArrowLeft className="w-4 h-4" />
          Back to projects
        </Link>
      </div>
    );
  }

  const externalLinks = project.links.filter((link) => !link.href.startsWith("/"));

  return (
    <div className="project-detail">
      <section className="project-detail__hero">
        <div className="project-detail__hero-meta">
          <Link to="/projects" className="project-detail__back">
            <ArrowLeft className="w-4 h-4" />
            Back to projects
          </Link>
          <span>{project.status}</span>
        </div>

        <p className="project-detail__eyebrow">{project.subtitle}</p>
        <h1 className="project-detail__title">{project.title}</h1>
        <p className="project-detail__summary">{project.description}</p>

        <div className="project-detail__buttons">
          {externalLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="project-detail__button"
            >
              {link.label}
              <ArrowUpRight className="w-4 h-4" />
            </a>
          ))}
        </div>
      </section>

      <section className="project-detail__grid">
        <article className="project-detail__panel">
          <p className="project-detail__label">Overview</p>
          <div className="project-detail__copy">
            {project.overview.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </article>

        <article className="project-detail__panel">
          <p className="project-detail__label">Highlights</p>
          <ul className="project-detail__list">
            {project.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </article>

        <article className="project-detail__panel project-detail__panel--stack">
          <p className="project-detail__label">Stack</p>
          <div className="project-detail__stack">
            {project.techStack.map((tech) => (
              <span key={tech}>{tech}</span>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
};

export default ProjectDetail;
