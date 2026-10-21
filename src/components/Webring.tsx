import { WEBRING, SELF_URL, ringNeighbours } from "@/lib/webring";

const linkClass =
  "transition-colors duration-200 hover:text-[var(--accent)] focus-visible:text-[var(--accent)] outline-none";

const Webring = () => {
  const { prev, next } = ringNeighbours();
  const friends = WEBRING.filter((s) => s.url !== SELF_URL);
  if (friends.length === 0) return null;

  return (
    <nav
      aria-label="Webring"
      className="w-full max-w-4xl mx-auto px-4 sm:px-6 pb-6 flex flex-col items-center gap-3 font-mono text-[0.65rem] tracking-widest uppercase text-muted-foreground"
    >
      <div className="flex items-center gap-3 sm:gap-5">
        <a href={prev.url} rel="noopener" className={linkClass} aria-label={`Previous site: ${prev.name}`}>
          ← prev
        </a>
        <span className="text-foreground/70">✦ webring ✦</span>
        <a href={next.url} rel="noopener" className={linkClass} aria-label={`Next site: ${next.name}`}>
          next →
        </a>
      </div>
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 normal-case tracking-wider">
        {friends.map((s) => (
          <li key={s.url}>
            <a href={s.url} rel="noopener" className={`${linkClass} underline decoration-[var(--rule-2)] underline-offset-4`}>
              {s.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Webring;
