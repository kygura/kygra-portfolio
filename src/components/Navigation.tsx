import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { NavLink } from "@/components/NavLink";
import { NAV_ROUTES } from "@/lib/keybindings";
import { cycleAccent, useAccent } from "@/hooks/useKeyboardNav";

const CLOCK_FORMAT = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Europe/Madrid",
});

interface NavigationProps {
  onHelp: () => void;
}

const Navigation = ({ onHelp }: NavigationProps) => {
  const [scrolled, setScrolled] = useState(false);
  const [clock, setClock] = useState("--:--");
  const { resolvedTheme, setTheme } = useTheme();
  const accent = useAccent();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
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

  const base = resolvedTheme === "light" ? "codex" : "hangar";
  const other = base === "codex" ? "hangar" : "codex";

  return (
    <nav className={`nav-bar${scrolled ? " nav-bar--scrolled" : ""}`} aria-label="Main">
      <div className="nav-bar__id">
        <span className="nav-stamp">N.CA</span>
        <span className="nav-rev">SHEET · REV 2026</span>
      </div>

      <ul className="nav-items">
        {NAV_ROUTES.map((r) => (
          <li key={r.path}>
            <NavLink
              to={r.path}
              end={r.path === "/"}
              className="nav-link"
              activeClassName="nav-link--active"
            >
              <kbd>{r.key}</kbd>
              {r.label}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="nav-tools">
        <span className="nav-clock">{clock}</span>
        <button
          type="button"
          className="nav-tool"
          onClick={() => setTheme(base === "codex" ? "dark" : "light")}
          title="Base (b)"
          aria-label={`${base} base, switch to ${other}`}
        >
          {base}
        </button>
        <button
          type="button"
          className="nav-tool nav-swatch"
          onClick={cycleAccent}
          title="Accent (t)"
          aria-label={`Accent: ${accent}, cycle`}
        >
          <span aria-hidden="true" />
        </button>
        <button
          type="button"
          className="nav-tool nav-help"
          onClick={onHelp}
          aria-label="Keyboard map"
          aria-haspopup="dialog"
        >
          ?
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
