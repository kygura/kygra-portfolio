import { Link } from "react-router-dom";
import { projects } from "@/lib/projects";

const Projects = () => {
  return (
    <div className="sheet page">
      <div className="session">
        <span className="session__num">Sheet <em>03</em></span>
        <h1>Catalogue</h1>
        <span className="session__hint">{projects.length} figures · open any for the dossier</span>
      </div>
      <p className="page-lede">
        The current software index. Open any dossier for a more detailed breakdown.
      </p>

      <section className="plate">
        <table className="ledger">
          <tbody>
            {projects.map((project, index) => {
              const repo = project.links.find((link) => link.label === "GitHub")?.href;
              const live = project.links.find((link) => link.label === "Live demo")?.href;
              const meta = [project.status, ...(project.techStack ?? []).slice(0, 2)].join(" · ");

              return (
                <tr key={project.slug}>
                  <td className="ledger__fig">Fig. {index + 2}</td>
                  <td className="ledger__title">
                    <Link to={`/projects/${project.slug}`}>
                      <b>{project.title}</b>
                    </Link>
                    <span>{project.subtitle}</span>
                  </td>
                  <td className="ledger__meta">
                    {meta}
                    {repo && <> · <a href={repo} target="_blank" rel="noopener noreferrer">repo</a></>}
                    {live && <> · <a href={live} target="_blank" rel="noopener noreferrer">live</a></>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default Projects;
