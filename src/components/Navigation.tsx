import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useTheme } from "next-themes";
import { NavLink } from "@/components/NavLink";

const NAV_ITEMS = [
  { path: "/", label: "Home" },
  { path: "/writings", label: "Writings" },
  { path: "/projects", label: "Software" },
  { path: "/guestbook", label: "Guestbook" },
];

const CLOCK_FORMAT = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Europe/Madrid",
});

function MagneticNavLink({ path, label, end }: { path: string; label: string; end?: boolean }) {
  const ref = useRef<HTMLLIElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 400, damping: 25 });
  const y = useSpring(rawY, { stiffness: 400, damping: 25 });

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    rawX.set(dx * 0.22);
    rawY.set(dy * 0.22);
  };

  const handleLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  return (
    <li ref={ref} onMouseMove={handleMove} onMouseLeave={handleLeave}>
      <motion.div style={{ x, y }}>
        <NavLink
          to={path}
          end={end}
          className="nav-link uppercase whitespace-nowrap font-mono text-[9px] sm:text-[11px] tracking-[0.16em]"
          activeClassName="nav-link--active"
        >
          {label}
        </NavLink>
      </motion.div>
    </li>
  );
}

const Navigation = () => {
  const [scrolled, setScrolled] = useState(false);
  const [clock, setClock] = useState("--:--");
  const { resolvedTheme, setTheme } = useTheme();

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

  // Pure CSR — next-themes resolves synchronously; derive directly.
  const isNight = resolvedTheme !== "light";

  const toggleTheme = (e: React.MouseEvent<HTMLButtonElement>) => {
    const next = isNight ? "light" : "dark";
    const reduce =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => unknown;
    };

    if (reduce || typeof doc.startViewTransition !== "function") {
      setTheme(next);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const root = document.documentElement;
    root.style.setProperty("--vt-x", `${rect.left + rect.width / 2}px`);
    root.style.setProperty("--vt-y", `${rect.top + rect.height / 2}px`);

    doc.startViewTransition(() => {
      // Flip the class synchronously so the transition captures the new
      // theme; next-themes then settles to the same class.
      root.classList.toggle("dark", next === "dark");
      setTheme(next);
    });
  };

  return (
    <nav
      className={`py-3 px-4 sm:py-5 sm:px-6 md:px-12 lg:px-16 sticky top-0 z-50 border-b transition-[background-color,border-color] duration-300 ${
        scrolled ? "backdrop-blur-md border-[var(--border-subtle)]" : "border-transparent"
      }`}
      style={{
        backgroundColor: scrolled
          ? "color-mix(in srgb, var(--bg-primary) 88%, transparent)"
          : "transparent",
      }}
    >
      <div className="flex justify-between items-center gap-2 sm:gap-4 md:gap-8">
        <div className="flex items-baseline gap-1.5 sm:gap-2.5 font-mono text-[9px] sm:text-[11px] tracking-[0.16em] font-medium whitespace-nowrap">
          <span className="text-foreground">N.CA</span>
          <span className="text-[var(--text-secondary)] hidden sm:inline">&copy;2026</span>
        </div>

        <ul className="flex flex-wrap md:flex-nowrap gap-0.5 sm:gap-1 md:gap-3 items-center">
          {NAV_ITEMS.map((item) => (
            <MagneticNavLink
              key={item.path}
              path={item.path}
              label={item.label}
              end={item.path === "/"}
            />
          ))}
        </ul>

        <div className="flex items-center gap-2 md:gap-5 flex-shrink-0">
          <span className="hidden lg:inline font-mono text-[11px] tracking-[0.16em] text-[var(--text-secondary)] whitespace-nowrap">
            {clock} &mdash; MALAGA, ES
          </span>
          <button
            onClick={toggleTheme}
            className="font-mono text-[9px] sm:text-[10px] tracking-[0.18em] uppercase px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-full border border-[var(--border-muted)] bg-transparent text-foreground transition-[color,border-color,transform,background-color] duration-200 hover:border-[var(--accent-amber)] hover:text-[var(--accent-amber)] hover:bg-[color-mix(in_srgb,var(--accent-amber)_8%,transparent)] active:translate-y-[1px]"
            aria-label="Toggle theme"
          >
            {isNight ? "DAY" : "NIGHT"}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
