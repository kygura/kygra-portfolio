import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
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
          className="nav-link uppercase whitespace-nowrap font-mono tracking-[0.08em] sm:tracking-[0.16em]"
          activeClassName="nav-link--active"
          title={CHORD_FOR[path] ? `g ${CHORD_FOR[path]}` : undefined}
          aria-keyshortcuts={CHORD_FOR[path] ? `g ${CHORD_FOR[path]}` : undefined}
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
  const accent = useAccent();

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
      className={`nav-bar px-3 sm:px-6 md:px-12 lg:px-16 sticky top-0 z-50 border-b transition-[background-color,border-color] duration-300 ${
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
      <div className="flex h-full justify-between items-center gap-2 sm:gap-4 md:gap-8">
        <div className="nav-micro flex items-baseline gap-1.5 sm:gap-2.5 font-mono tracking-[0.16em] font-medium whitespace-nowrap">
          <span className="wordmark text-foreground">
            <b>NCA</b> <em>Ventures</em>
          </span>
          <span className="text-[var(--text-secondary)] hidden sm:inline">&copy;2026</span>
        </div>

        <ul className="nav-items flex flex-nowrap min-w-0 gap-0.5 sm:gap-1 md:gap-3 items-center">
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
          <span className="nav-micro hidden lg:inline font-mono tracking-[0.16em] text-[var(--text-secondary)] whitespace-nowrap">
            {clock}
          </span>
          {/* Accent picker in the slot the day/night toggle used. Keys 1–4. */}
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
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
