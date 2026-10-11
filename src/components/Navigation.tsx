import { useEffect, useRef, useState } from "react";
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
        className="nav-link uppercase whitespace-nowrap font-mono tracking-[0.08em] sm:tracking-[0.14em]"
        activeClassName="nav-link--active"
        title={CHORD_FOR[path] ? `g ${CHORD_FOR[path]}` : undefined}
        aria-keyshortcuts={CHORD_FOR[path] ? `g ${CHORD_FOR[path]}` : undefined}
      >
        <span className="nav-br" aria-hidden="true">[</span>
        <span className="nav-cur" aria-hidden="true">&gt;</span>
        {label}
        <span className="nav-br" aria-hidden="true">]</span>
      </NavLink>
    </li>
  );
}

function ThemeMenu() {
  const accent = useAccent();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = ACCENTS[accent];
  return (
    <div className="theme-menu" ref={root}>
      <button
        type="button"
        className="theme-trigger font-mono uppercase"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="theme-list"
        onClick={() => setOpen((o) => !o)}
        title="Theme (1–5)"
      >
        <i className="theme-sw" style={{ "--sw": current.hex } as React.CSSProperties} />
        <span className="theme-trigger-label">Theme</span>
        <span aria-hidden="true" className="theme-caret">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <ul id="theme-list" className="theme-list font-mono" role="group" aria-label="Theme">
          {ACCENTS.map((a, i) => (
            <li key={a.id}>
              <button
                type="button"
                className="theme-opt"
                aria-pressed={i === accent}
                aria-keyshortcuts={String(i + 1)}
                onClick={() => {
                  setAccent(i);
                  setOpen(false);
                }}
              >
                <span className="theme-opt-cur" aria-hidden="true">&gt;</span>
                <i className="theme-sw" style={{ "--sw": a.hex } as React.CSSProperties} />
                <span className="theme-opt-name">{a.name}</span>
                <kbd>{i + 1}</kbd>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
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

        <ul className="nav-items flex flex-nowrap min-w-0 gap-0 sm:gap-3 items-center">
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
          <ThemeMenu />
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
