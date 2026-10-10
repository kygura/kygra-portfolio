import { Link, useParams } from "react-router-dom";
import SectionHead from "@/components/SectionHead";
import { getProjectBySlug, projects } from "@/lib/projects";

const ProjectDetail = () => {
  const { slug } = useParams();
  const project = getProjectBySlug(slug);

  if (!project) {
    return (
      <div className="empty">
        <p className="mono mute">Dossier not found</p>
        <h1 className="disp">Missing</h1>
        <p className="mono" style={{ marginTop: 20 }}>
          <Link to="/projects" className="u">← Back to the index</Link>
        </p>
      </div>
    );
  }

  const idx = projects.findIndex((p) => p.slug === project.slug);
  const prev = projects[(idx - 1 + projects.length) % projects.length];
  const next = projects[(idx + 1) % projects.length];
  const external = project.links.filter((l) => !l.href.startsWith("/"));

  return (
    <>
      <div className="ptitle">
        <p className="mono mute" style={{ marginTop: 0 }}>
          <Link to="/projects" className="u">← Index</Link> · Dossier {String(idx + 1).padStart(3, "0")}
        </p>
        <h1 className="disp">{project.title}</h1>
        <p>{project.description}</p>
      </div>

      <div className="dossier__meta mono">
        <div><b>Discipline</b>{project.subtitle}</div>
        <div><b>Status</b>{project.status}</div>
        <div><b>Year</b>{project.year}</div>
        <div><b>Index</b>{String(idx + 1).padStart(3, "0")} / {String(projects.length).padStart(3, "0")}</div>
      </div>

      {external.length > 0 && (
        <div className="dossier__links mono">
          {external.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">{l.label} ↗</a>
          ))}
        </div>
      )}

      <SectionHead n="01" title="Overview" />
      <section className="dossier__body">
        <div>
          <p className="mono mute">Summary</p>
          <p style={{ marginTop: 10 }}>{project.summary}</p>
          {project.techStack && project.techStack.length > 0 && (
            <>
              <p className="mono mute" style={{ marginTop: 24 }}>Stack</p>
              <ul className="dossier__stack mono">
                {project.techStack.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </>
          )}
        </div>
        <div>
          {project.overview.map((p) => <p key={p.slice(0, 32)}>{p}</p>)}
        </div>
      </section>

      <div className="colophon__end mono">
        <Link to={`/projects/${prev.slug}`} className="u">← {prev.title}</Link>
        <Link to={`/projects/${next.slug}`} className="u">{next.title} →</Link>
      </div>
    </>
  );
};

export default ProjectDetail;
