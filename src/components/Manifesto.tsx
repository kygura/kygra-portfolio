import { Link } from "react-router-dom";
import Plate from "./Plate";

const paragraphs = [
  "I spend most of my waking hours talking to machines. These notes are about how I try to do that without becoming one: why the software I build looks the way it does, and what I refuse to automate away.",

  "I build software the way a cabinetmaker builds a chair: material first, ornament last. Most of what I know came from unmaking things, pulling a system apart until its assumptions sit on the bench, then rebuilding it with fewer parts and better joints. A good tool disappears into the hand. The craft is in what you leave out.",

  "My work sits at the intersection of financial apparatus and software craft. I hold that software can be beautiful as well as functional: interfaces that reduce the friction of modern information systems and do it with elegance, making the experience of using computers a strategic advantage rather than a modern hassle. Each project is an attempt to build something true within the machinery. I just wanna touch grass while the computer does stuff.",
];

const blockquote = {
  text:   "These are not products. They are tools, interfaces to view and understand reality, never to replace it. This work, is an ongoing effort for simplicity, for clarity, for beauty. To build tools that serve us, not tools that withdraw our attention to control us. It is an effort to live and work deliberately, to find the things worth doing.",
  follow: "History is not something that happens to us. It is something we do. Every moment collapses infinite possibilities into a single path. The work we do now reverberates into the future.",
};

const closer = "The ghost in the machine must remain human.";

export default function Manifesto() {
  return (
    <section className="plate frontis" aria-labelledby="manifesto-title">
      <figure className="frontis__fig">
        <Plate name="switch" />
      </figure>

      <div className="frontis__text">
        <div className="session">
          <span className="session__num">
            Plate <em>I</em>
          </span>
          <h2 id="manifesto-title">On software craft</h2>
        </div>

        <div className="prose">
          {paragraphs.map((text, i) => (
            <p key={i}>{text}</p>
          ))}

          <blockquote>
            <p>{blockquote.text}</p>
          </blockquote>

          <p>{blockquote.follow}</p>

          <p className="frontis__closer">{closer}</p>
        </div>

        <p className="frontis__cta">
          <Link to="/projects">
            <kbd>3</kbd>Explore the work
          </Link>
        </p>
      </div>
    </section>
  );
}
