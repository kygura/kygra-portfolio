import { useEffect, useState } from "react";
import { NavLink } from "@/components/NavLink";
import { ACCENTS, setAccent, useAccent } from "@/theme/accent";
import { CHORD_FOR } from "@/theme/keymap";

const CLOCK_FORMAT = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Europe/Madrid",
});

const NAV_ITEMS = [
  { path: "/", label: "Home" },
  { path: "/writings", label: "Writings" },
  { path: "/projects", label: "Software" },
  { path: "/guestbook", label: "Guestbook" },
  { path: "/cv", label: "CV" },
];

function NavItem({ path, label, end }: { path: string; label: string; end?: boolean }) {
  return (
    <li>
      <NavLink
        to={path}
        end={end}
        className="nav-link uppercase whitespace-nowrap font-mono tracking-[0.08em] sm:tracking-[0.16em]"
        activeClassName="nav-link--active"
        title={CHORD_FOR[path] ? `g ${CHORD_FOR[path]}` : undefined}
        aria-keyshortcuts={CHORD_FOR[path] ? `g ${CHORD_FOR[path]}` : undefined}
      >
        <span className="nav-br" aria-hidden="true">[</span>
        <span className="nav-cur" aria-hidden="true">&gt;</span>
        <span className="nav-label">{label}</span>
        <span className="nav-br" aria-hidden="true">]</span>
      </NavLink>
    </li>
  );
}

function AccentPick() {
  const accent = useAccent();
  return (
    <div className="accent-pick" role="group" aria-label="Accent">
      {ACCENTS.map((a, i) => (
        <button
          key={a.id}
          type="button"
          onClick={() => setAccent(i)}
          aria-pressed={i === accent}
          aria-label={`Accent: ${a.name}`}
          title={`${a.name} (${i + 1})`}
          aria-keyshortcuts={String(i + 1)}
          style={{ "--sw": a.hex } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

/** Left/Right/Home/End move focus along the links, like a toolbar. */
function arrowNav(e: React.KeyboardEvent<HTMLUListElement>) {
  const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
  if (!keys.includes(e.key) || e.altKey || e.ctrlKey || e.metaKey) return;
  const links = Array.from(e.currentTarget.querySelectorAll<HTMLAnchorElement>("a"));
  const i = links.indexOf(document.activeElement as HTMLAnchorElement);
  if (i < 0) return;
  e.preventDefault();
  const n = e.key === "Home" ? 0 : e.key === "End" ? links.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + links.length) % links.length;
  links[n].focus();
}

const Navigation = () => {
  const [scrolled, setScrolled] = useState(false);
  const [clock, setClock] = useState("--:--");
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const tick = () => {
      try {
        setClock(CLOCK_FORMAT.format(new Date()));
      } catch {
        setClock("--:--");
      }
    };
    tick();
    const interval = setInterval(tick, 20000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav
      className={`nav-bar sticky top-0 z-50 border-b transition-[background-color,border-color] duration-300 ${
        scrolled ? "border-[var(--border-subtle)]" : "border-transparent"
      }`}
      style={{
        // No backdrop-blur: re-blurring the animating hero canvas every
        // frame was the main scroll-jank source. Near-opaque bg instead.
        backgroundColor: scrolled
          ? "color-mix(in srgb, var(--bg-primary) 96%, transparent)"
          : "transparent",
      }}
    >
      <div className="flex h-full justify-between items-center gap-2 sm:gap-6">
        <div className="nav-micro flex items-baseline gap-1.5 sm:gap-2.5 font-mono tracking-[0.16em] font-medium whitespace-nowrap">
          <span className="wordmark text-foreground">
            <b>NCA</b> <em>Ventures</em>
          </span>
          <span className="text-[var(--text-secondary)] hidden sm:inline">&copy;2026</span>
        </div>

        <ul onKeyDown={arrowNav} className="nav-items flex flex-nowrap min-w-0 gap-0 sm:gap-4 md:gap-7 items-center">
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.path}
              path={item.path}
              label={item.label}
              end={item.path === "/"}
            />
          ))}
        </ul>

        <div className="flex items-center gap-2 md:gap-5 flex-shrink-0">
          <span className="nav-micro hidden lg:inline font-mono tracking-[0.16em] text-[var(--text-secondary)] whitespace-nowrap">
            {clock}
          </span>
          <AccentPick />
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
