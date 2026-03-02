import { useRef, useEffect } from "react";
import { NavLink } from "@/components/NavLink";
import ThemeToggle from "./ThemeToggle";

const Navigation = () => {
  const shadowRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !shadowRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      // Calculate dramatic parallax effect
      shadowRef.current.style.transform = `translate(${8 + x * 20}px, ${8 + y * 20}px)`;
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, []);

  const navItems = [
    { path: "/", label: "Home" },
    { path: "/writings", label: "Writings" },
    { path: "/projects", label: "Software" },
    { path: "/artifacts", label: "Artifacts" },
    { path: "/guestbook", label: "Guestbook" },
    ...(import.meta.env.VITE_SHOW_CV === "true" ? [{ path: "/cv", label: "CV" }] : []),
  ];

  return (
    <div
      ref={containerRef}
      className="relative p-6 sm:p-8 pb-4 border-b-4 border-foreground overflow-hidden animate-in slide-in-from-top-4 duration-500"
    >
      <div className="flex justify-center items-center relative w-full pt-4 pb-2">
        {/* LOGO BLOCK */}
        <div className="relative group">
          <div
            ref={shadowRef}
            className="absolute top-0 left-0 translate-x-[8px] translate-y-[8px] font-['UnifrakturMaguntia'] text-[clamp(5rem,14vw,9rem)] leading-[0.85] text-destructive tracking-[-2px] z-0 opacity-60"
            style={{ transition: 'transform 0.1s ease-out' }}
          >
            Opus Libertatis
          </div>
          <div className="font-['UnifrakturMaguntia'] text-[clamp(5rem,14vw,9rem)] leading-[0.85] text-foreground tracking-[-2px] relative z-10">
            Opus Libertatis
          </div>
        </div>

        {/* THEME TOGGLE */}
        {/* <div className="absolute top-0 right-0">
          <ThemeToggle />
        </div> */}
      </div>

      {/* NAVIGATION BAR */}
      <nav className="border-y-2 border-foreground py-1.5 px-4 sm:px-8 font-['Bebas_Neue'] text-sm sm:text-base tracking-[0.2em] sm:tracking-[0.3em] flex flex-wrap justify-between items-center bg-foreground text-background mt-4 gap-4">
        <ul className="flex flex-wrap gap-x-6 gap-y-2 items-center w-full justify-center sm:justify-start">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === "/"}
                className="transition-colors duration-200 uppercase whitespace-nowrap text-background hover:text-destructive no-underline"
                activeClassName="!text-destructive"
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Navigation;
