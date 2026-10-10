import { Link } from "react-router-dom";
import SectionHead from "@/components/SectionHead";
import { projects } from "@/lib/projects";

const pad = (n: number) => String(n).padStart(3, "0");

const Projects = () => {
  return (
    <>
      <div className="ptitle">
        <p className="mono mute" style={{ marginTop: 0 }}>§01 — Projects</p>
        <h1 className="disp">Software</h1>
        <p>The current index of things built. Each row opens a dossier.</p>
      </div>

      <SectionHead n="01" title="Index" right={`${String(projects.length).padStart(2, "0")} entries`} />
      <div className="index">
        {projects.map((p, i) => {
          const repo = p.links.find((l) => l.label === "GitHub")?.href;
          return (
            <Link key={p.slug} to={`/projects/${p.slug}`} className="index__row">
              <span className="mono mute">{pad(i + 1)}</span>
              <span>
                <span className="index__title">{p.title}</span>
                <span className="mono mute" style={{ display: "block", marginTop: 8 }}>
                  {p.subtitle} · {p.status}{repo ? " · src" : ""}
                </span>
                <span style={{ display: "block", marginTop: 10, maxWidth: "62ch", lineHeight: 1.45 }}>
                  {p.summary}
                </span>
              </span>
              <span className="mono mute index__year">{p.year}</span>
              <span className="mono mute index__dis">{p.techStack?.slice(0, 3).join(" · ")}</span>
              <span className="index__arr">↗</span>
            </Link>
          );
        })}
      </div>
    </>
  );
};

export default Projects;
