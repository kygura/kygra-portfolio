// `/cv` (SPEC 3): every section of the old CV page plus `> cv.pdf`. The phone number stays unpublished.
import { cv } from "../content/site";

export default function CvReader() {
  const c = cv.contact;
  return (
    <article>
      <header className="rh">
        <h2 className="rt">{cv.title}</h2>
        <dl className="meta kv">
          <dt>location</dt>
          <dd>{c.location}</dd>
          <dt>email</dt>
          <dd>
            <a href={`mailto:${c.email}`}>{c.email}</a>
          </dd>
          <dt>web</dt>
          <dd>
            <a href={`https://${c.website}`} target="_blank" rel="noopener noreferrer">
              {c.website}
            </a>
          </dd>
          <dt>github</dt>
          <dd>
            <a href={`https://${c.github}`} target="_blank" rel="noopener noreferrer">
              {c.github}
            </a>
          </dd>
        </dl>
        <p className="lk">
          <a href={cv.pdf.href} download={cv.pdf.filename}>
            cv.pdf
          </a>
        </p>
      </header>

      <h3 className="hs">summary</h3>
      <p>{cv.summary}</p>

      <h3 className="hs">projects</h3>
      {cv.projects.map((p) => (
        <section key={p.title} className="cvi" aria-label={p.title}>
          <h4 className="hs">{p.title}</h4>
          <p className="dim">{p.tech}</p>
          <ul>
            {p.points.map((t) => (
              <li key={t.slice(0, 32)}>{t}</li>
            ))}
          </ul>
        </section>
      ))}

      <h3 className="hs">education</h3>
      {cv.education.map((e) => (
        <section key={e.institution} className="cvi" aria-label={e.institution}>
          <h4 className="hs">{e.degree}</h4>
          <p className="dim">
            {e.institution} / {e.period}
          </p>
          {e.description && <p>{e.description}</p>}
        </section>
      ))}

      <h3 className="hs">skills</h3>
      <dl className="kv">
        {Object.entries(cv.skills).map(([k, v]) => (
          <div key={k}>
            <dt>{k.toLowerCase()}</dt>
            <dd>{v.join(", ")}</dd>
          </div>
        ))}
      </dl>

      <h3 className="hs">languages</h3>
      <dl className="kv">
        {cv.languages.map((l) => (
          <div key={l.name}>
            <dt>{l.name.toLowerCase()}</dt>
            <dd>{l.proficiency}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
