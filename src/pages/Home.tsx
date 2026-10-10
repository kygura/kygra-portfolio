import { Link } from "react-router-dom";
import SectionHead from "@/components/SectionHead";
import { projects } from "@/lib/projects";
import { useMarkdownPosts } from "@/hooks/useMarkdownPosts";
import { formatLogDate } from "@/lib/format";

const TICKER = [
  "Independent",
  "Hand-built",
  "No tracking",
  "Agentic systems",
  "Algorithmic trading",
  "On-chain monetary design",
  "The ghost in the machine must remain human",
  "Press ` for the terminal",
  "Say hello → ncerratoanton@gmail.com",
];

const ESSAY = [
  "I spend most of my waking hours talking to machines. These notes are about how I try to do that without becoming one: why the software I build looks the way it does, and what I refuse to automate away.",
  "I build software the way a cabinetmaker builds a chair: material first, ornament last. Most of what I know came from unmaking things, pulling a system apart until its assumptions sit on the bench, then rebuilding it with fewer parts and better joints. A good tool disappears into the hand. The craft is in what you leave out.",
  "My work sits at the intersection of financial apparatus and software craft. I hold that software can be beautiful as well as functional: interfaces that reduce the friction of modern information systems and do it with elegance, making the experience of using computers a strategic advantage rather than a modern hassle. Each project is an attempt to build something true within the machinery. I just wanna touch grass while the computer does stuff.",
];

const QUOTE =
  "These are not products. They are tools, interfaces to view and understand reality, never to replace it. This work is an ongoing effort for simplicity, for clarity, for beauty. To build tools that serve us, not tools that withdraw our attention to control us.";

const FOLLOW =
  "History is not something that happens to us. It is something we do. Every moment collapses infinite possibilities into a single path. The work we do now reverberates into the future.";

const pad = (n: number) => String(n).padStart(3, "0");
const pad2 = (n: number) => String(n).padStart(2, "0");

const Home = () => {
  const { posts, loading } = useMarkdownPosts();
  const latest = posts.slice(0, 5);
  const updated = new Date(__BUILD_DATE__);

  return (
    <>
      <section className="hero" aria-label="Introduction">
        <h1 className="disp hero__name">
          <span>Nicolás</span>
          <span className="hero__ov">Cerrato</span>
        </h1>
        <div className="hero__lede">
          <p>
            Software engineer working the seam between financial apparatus and software craft.{" "}
            <em>Material first, ornament last.</em>
          </p>
          <div className="facts mono">
            <div><b>Status</b><span>Building</span></div>
            <div><b>Based</b><span>Málaga, ES</span></div>
            <div><b>Doing</b><span>Agents · Trading · Protocols</span></div>
            <div><b>Updated</b><span>{updated.getFullYear()}-{pad2(updated.getMonth() + 1)}-{pad2(updated.getDate())}</span></div>
          </div>
        </div>
      </section>

      <div className="ticker mono" aria-hidden="true">
        <div className="ticker__track">
          {TICKER.map((t, i) => <span key={i}>{t}</span>)}
          {TICKER.map((t, i) => <span key={`b${i}`}>{t}</span>)}
        </div>
      </div>

      <SectionHead n="01" title="Projects — selected" right={`${pad2(projects.length)} entries`} to="/projects" />
      <div className="index">
        {projects.map((p, i) => (
          <Link key={p.slug} to={`/projects/${p.slug}`} className="index__row">
            <span className="mono mute">{pad(i + 1)}</span>
            <span className="index__title">{p.title}</span>
            <span className="mono mute index__year">{p.year}</span>
            <span className="mono mute index__dis">{p.subtitle}</span>
            <span className="index__arr">↗</span>
          </Link>
        ))}
      </div>

      <SectionHead
        n="02"
        title="Writings — logbook"
        right={loading ? "…" : `${pad2(posts.length)} entries · all →`}
        to="/writings"
      />
      <div className="log">
        {loading && <div className="notice">Loading the logbook…</div>}
        {latest.map((post) => (
          <Link key={post.slug} to={`/writings/${post.slug}`} className="log__row">
            <span className="mono mute log__date">{formatLogDate(post.date)}</span>
            <span className="log__title">{post.title}</span>
            <span className="mono log__rt">{post.readTime} min</span>
          </Link>
        ))}
      </div>

      <SectionHead n="03" title="On software craft" />
      <section className="essay">
        <div>
          <h2 className="disp essay__title">Material first, ornament last.</h2>
          <span className="stamp mono">The ghost in the machine must remain human</span>
        </div>
        <div>
          {ESSAY.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
          <blockquote>{QUOTE}</blockquote>
          <p>{FOLLOW}</p>
          <p className="mono" style={{ marginTop: "1.6em" }}>
            <Link to="/projects" className="u">Explore the work ↗</Link>
          </p>
        </div>
      </section>
    </>
  );
};

export default Home;
