import { WEBRING, SELF_URL, ringNeighbours } from "@/lib/webring";

// Corner ticks that frame the panel like a crop mark.
const Corner = ({ className }: { className: string }) => (
  <span aria-hidden="true" className={`absolute w-2.5 h-2.5 border-[var(--accent)] ${className}`} />
);

const navBtn =
  "group flex items-center gap-2 px-3 py-1.5 border border-[var(--rule-2)] text-[var(--ink-2)] transition-colors duration-200 hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:border-[var(--accent)] focus-visible:text-[var(--accent)] outline-none";

const Webring = () => {
  const { prev, next } = ringNeighbours();
  const friends = WEBRING.filter((s) => s.url !== SELF_URL);
  if (friends.length === 0) return null;
  const selfIndex = Math.max(0, WEBRING.findIndex((s) => s.url === SELF_URL));
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <nav aria-label="Webring" className="w-full max-w-md mx-auto px-4 pb-8 font-mono">
      <div className="relative border border-[var(--rule)] bg-[var(--bg-2)]">
        <Corner className="-top-px -left-px border-t border-l" />
        <Corner className="-top-px -right-px border-t border-r" />
        <Corner className="-bottom-px -left-px border-b border-l" />
        <Corner className="-bottom-px -right-px border-b border-r" />

        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--rule)] text-[0.6rem] tracking-[0.25em] uppercase">
          <span className="text-[var(--accent)]">◈ webring</span>
          <span className="text-muted-foreground">
            {pad(selfIndex + 1)} / {pad(WEBRING.length)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 px-3 py-3 text-[0.65rem] tracking-widest uppercase">
          <a href={prev.url} rel="noopener" className={navBtn} aria-label={`Previous site: ${prev.name}`}>
            <span className="transition-transform duration-200 group-hover:-translate-x-0.5">◂</span> prev
          </a>
          <span aria-hidden="true" className="flex items-center gap-1.5">
            {WEBRING.map((s, i) => (
              <span
                key={s.url}
                className={`block w-1.5 h-1.5 rotate-45 ${
                  i === selfIndex ? "bg-[var(--accent)]" : "border border-[var(--rule-2)]"
                }`}
              />
            ))}
          </span>
          <a href={next.url} rel="noopener" className={navBtn} aria-label={`Next site: ${next.name}`}>
            next <span className="transition-transform duration-200 group-hover:translate-x-0.5">▸</span>
          </a>
        </div>

        <ul className="flex flex-wrap justify-center gap-2 px-3 pb-3">
          {friends.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                rel="noopener"
                className="flex items-center justify-center min-w-[88px] h-[31px] px-2.5 border border-dashed border-[var(--rule-2)] text-[0.65rem] tracking-wider text-foreground transition-colors duration-200 hover:border-solid hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--on-accent)] focus-visible:bg-[var(--accent)] focus-visible:text-[var(--on-accent)] outline-none"
              >
                {s.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default Webring;
