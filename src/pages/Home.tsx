import { Link } from "react-router-dom";
import CartographicHero from "../components/CartographicHero";
import Manifesto from "../components/Manifesto";
import { projects } from "../lib/projects";
import { useMarkdownPosts } from "../hooks/useMarkdownPosts";
import { resolvePostTags } from "../lib/postTagFallbacks";

const external = (href: string) => /^https?:\/\//.test(href);
const linkLabel = (href: string) => (href.includes("github.com") ? "repo" : "live");

const Home = () => {
  const { posts, loading, error } = useMarkdownPosts();
  const notes = posts.slice(0, 4);

  return (
    <>
      <CartographicHero />

      <div className="sheet home">
        <Manifesto />

        <div className="session" id="work">
          <span className="session__num">
            Plate <em>II</em>
          </span>
          <h2 id="work-title">Selected work</h2>
          <Link className="session__hint" to="/projects">
            full catalogue →
          </Link>
        </div>
        <section className="plate" aria-labelledby="work-title">
          <table className="ledger">
            <tbody>
              {projects.map((project, i) => (
                <tr key={project.slug}>
                  <td className="ledger__fig">Fig. {i + 2}</td>
                  <td className="ledger__title">
                    <b>
                      <Link to={`/projects/${project.slug}`}>{project.title}</Link>
                    </b>
                    <span>{project.summary}</span>
                  </td>
                  <td className="ledger__meta">
                    {(project.techStack ?? []).slice(0, 3).join(" · ")}
                    {project.links
                      .filter((link) => external(link.href))
                      .map((link, i) => (
                        <a
                          key={link.href}
                          className={`home__link${i === 0 && !(project.techStack ?? []).length ? " home__link--first" : ""}`}
                          href={link.href}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {linkLabel(link.href)}
                        </a>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="session" id="notes">
          <span className="session__num">
            Plate <em>III</em>
          </span>
          <h2 id="notes-title">Notes</h2>
          <Link className="session__hint" to="/writings">
            all writings →
          </Link>
        </div>
        <section className="plate" aria-labelledby="notes-title">
          <table className="ledger">
            <tbody>
              {loading ? (
                [0, 1, 2].map((i) => (
                  <tr key={i}>
                    <td className="ledger__fig">—</td>
                    <td className="ledger__title">—</td>
                    <td className="ledger__meta">—</td>
                  </tr>
                ))
              ) : error || notes.length === 0 ? (
                <tr>
                  <td className="ledger__title" colSpan={3}>
                    notes unavailable
                  </td>
                </tr>
              ) : (
                notes.map((post) => (
                  <tr key={post.slug}>
                    <td className="ledger__fig">{post.date ? post.date.slice(0, 10) : "—"}</td>
                    <td className="ledger__title">
                      <b>
                        <Link to={`/writings/${post.slug}`}>{post.title}</Link>
                      </b>
                      {post.excerpt && <span>{post.excerpt}</span>}
                    </td>
                    <td className="ledger__meta">{resolvePostTags(post)[0] ?? ""}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
};

export default Home;
