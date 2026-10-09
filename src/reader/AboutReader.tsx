// `/about` (A4, A6): the full manifesto.
import { Link } from "react-router-dom";
import { manifesto } from "../content/site";

export default function AboutReader() {
  return (
    <article>
      <header className="rh">
        <h2 className="rt">{manifesto.title}</h2>
      </header>
      {manifesto.paragraphs.map((t) => (
        <p key={t.slice(0, 32)}>{t}</p>
      ))}
      <blockquote>
        <p>{manifesto.blockquote}</p>
      </blockquote>
      <p>{manifesto.follow}</p>
      <p className="closer">{manifesto.closer}</p>
      <p className="lk">
        <Link to={manifesto.cta.to}>{manifesto.cta.label.toLowerCase()}</Link>
      </p>
    </article>
  );
}
