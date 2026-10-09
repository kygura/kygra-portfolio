// `/projects/:slug` (A4, SPEC 3): header dl like the Inspector, then description + overview.
import type { Project } from "../lib/project-schema";
import type { ProjectRow } from "../orrery/model";

export default function DossierReader({ row, project }: { row: ProjectRow; project: Project | null }) {
  const stack = project?.techStack?.length ? project.techStack.join(", ") : "--";
  return (
    <article>
      <header className="rh">
        <h2 className="rt">{row.title}</h2>
        <p className="lede">{row.summary}</p>
        <dl className="meta">
          <dt>year</dt>
          <dd>{row.year}</dd>
          <dt>status</dt>
          <dd>{row.status}</dd>
          <dt>type</dt>
          <dd className="w">{row.type}</dd>
          <dt>stack</dt>
          <dd className="w">{stack}</dd>
        </dl>
        {(row.src || row.live) && (
          <p className="lk">
            {row.src && (
              <a href={row.src} target="_blank" rel="noopener noreferrer">
                src
              </a>
            )}
            {row.live && (
              <a href={row.live} target="_blank" rel="noopener noreferrer">
                live
              </a>
            )}
          </p>
        )}
      </header>
      {project?.description && <p>{project.description}</p>}
      {project?.overview?.length ? (
        <>
          <h3 className="hs">overview</h3>
          {project.overview.map((t) => (
            <p key={t.slice(0, 32)}>{t}</p>
          ))}
        </>
      ) : null}
    </article>
  );
}
