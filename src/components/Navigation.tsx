import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { NavLink } from "@/components/NavLink";

const NAV_ITEMS = [
  { path: "/", label: "Home" },
  { path: "/writings", label: "Writings" },
  { path: "/projects", label: "Software" },
  { path: "/guestbook", label: "Guestbook" },
  { path: "/credentials", label: "Credentials" },
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
          className="px-4 py-1.5 transition-colors duration-200 uppercase whitespace-nowrap text-foreground hover:bg-foreground hover:text-background no-underline text-sm tracking-widest font-['Space_Mono']"
          activeClassName="!bg-foreground !text-background"
        >
          {label}
        </NavLink>
      </motion.div>
    </li>
  );
}

const Navigation = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      className="py-6 px-6 md:px-12 lg:px-16 sticky top-0 z-50"
      animate={{
        backgroundColor: scrolled ? "rgba(18,17,23,0.88)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "blur(0px)",
        borderBottomWidth: scrolled ? 1 : 0,
        borderBottomColor: "rgba(242,237,228,0.07)",
      }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{ borderBottomStyle: "solid" }}
    >
      <div className="flex justify-between items-center gap-4 md:gap-8">
        <ul className="flex flex-wrap md:flex-nowrap gap-4 md:gap-6 items-center">
          {NAV_ITEMS.map((item) => (
            <MagneticNavLink
              key={item.path}
              path={item.path}
              label={item.label}
              end={item.path === "/"}
            />
          ))}
        </ul>
      </div>
    </motion.nav>
  );
};

export default Navigation;
