import { Link, useParams } from "react-router-dom";
import { getProjectBySlug, projects } from "@/lib/projects";
import Plate from "@/components/Plate";

const PLATES = ["gears", "crank", "switch", "worm"] as const;

const ProjectDetail = () => {
  const { slug } = useParams();
  const project = getProjectBySlug(slug);

  if (!project) {
    return (
      <div className="sheet page">
        <Link to="/projects" className="back"><kbd>3</kbd>← catalogue</Link>
        <div className="session">
          <span className="session__num">Fig. <em>—</em></span>
          <h1 className="page-title">Missing dossier</h1>
        </div>
        <section className="plate">
          <table className="ledger">
            <tbody>
              <tr>
                <td className="ledger__state">The project you asked for is not in the current index.</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    );
  }

  const index = projects.indexOf(project);
  const repo = project.links.find((link) => link.label === "GitHub")?.href;
  const live = project.links.find((link) => link.label === "Live demo")?.href;
  const stack = project.techStack?.length ? project.techStack.join(" · ") : "—";

  return (
    <div className="sheet page">
      <Link to="/projects" className="back"><kbd>3</kbd>← catalogue</Link>
      <div className="session">
        <span className="session__num">Fig. <em>{index + 2}</em></span>
        <h1 className="page-title">{project.title}</h1>
      </div>
      <p className="page-lede marg">{project.description}</p>

      <div className="titleblock">
        <div><b>Year</b>{project.year}</div>
        <div><b>Status</b>{project.status}</div>
        <div><b>Stack</b>{stack}</div>
        <div>
          <b>Links</b>
          {repo && <a href={repo} target="_blank" rel="noopener noreferrer">repo</a>}
          {live && <a href={live} target="_blank" rel="noopener noreferrer">live</a>}
          {!repo && !live && "—"}
        </div>
      </div>

      <section className="plate detail-cols">
        <div className="prose">
          {project.overview.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <aside>
          <Plate name={PLATES[index % PLATES.length]} />
          <p className="marg">{project.subtitle}</p>
        </aside>
      </section>
    </div>
  );
};

export default ProjectDetail;
