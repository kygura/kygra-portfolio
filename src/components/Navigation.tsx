import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { NavLink } from "@/components/NavLink";

const CLOCK_FORMAT = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Europe/Madrid",
});

const NAV_ITEMS = [
  { n: "01", path: "/projects", label: "Projects" },
  { n: "02", path: "/writings", label: "Writings" },
  { n: "03", path: "/artifacts", label: "Artifacts" },
  { n: "04", path: "/guestbook", label: "Guestbook" },
  { n: "05", path: "/cv", label: "CV" },
];

const Navigation = () => {
  const [clock, setClock] = useState("--:--");
  const { resolvedTheme, setTheme } = useTheme();

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

  const inverted = resolvedTheme === "dark";

  return (
    <header className="mast mono">
      <NavLink to="/" end className="mast__brand" aria-label="Home">
        N.CA<small>index</small>
      </NavLink>

      <nav className="mast__nav" aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className="mast__link"
            activeClassName="mast__link--active"
          >
            <i>{item.n}</i>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mast__right">
        <span className="mast__coords">36.72°N 4.42°W</span>
        <span className="mast__clock" title="Local time, Málaga">{clock}</span>
        <button
          type="button"
          className="mast__invert"
          onClick={() => setTheme(inverted ? "light" : "dark")}
          aria-label={inverted ? "Switch to paper" : "Switch to ink"}
        >
          {inverted ? "paper ◑" : "invert ◐"}
        </button>
      </div>
    </header>
  );
};

export default Navigation;
