// KYGRA, the kygura reading, name line, role, bio and the manifesto link (DESIGN A6).
import { Link } from "react-router-dom";
import { handle } from "../content/site";

export default function HandleBlock({ hidden, flash }: { hidden: boolean; flash: boolean }) {
  return (
    <section id="handle" className={`pane${hidden ? " hid" : ""}${flash ? " flash" : ""}`} aria-label="handle">
      <span className="tag" aria-hidden="true">
        ##
      </span>
      <h1>{handle.handle}</h1>
      <p className="kg">{handle.reading}</p>
      <p className="nl dim">{handle.nameLine}</p>
      <p>{handle.role}</p>
      <p className="dim">{handle.bio}</p>
      <p className="mf">
        <Link to={handle.manifesto.to}>&gt; {handle.manifesto.label}</Link>
      </p>
    </section>
  );
}
