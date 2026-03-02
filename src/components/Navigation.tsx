import { NavLink } from "@/components/NavLink";
import ThemeToggle from "./ThemeToggle";

const Navigation = () => {
  const navItems = [
    { path: "/", label: "Home" },
    { path: "/writings", label: "Writings" },
    { path: "/projects", label: "Software" },
    { path: "/artifacts", label: "Artifacts" },
    { path: "/guestbook", label: "Guestbook" },
    ...(import.meta.env.VITE_SHOW_CV === "true" ? [{ path: "/cv", label: "CV" }] : []),
  ];

  return (
    <nav className="py-8 px-6 md:px-12 lg:px-16">
      <div className="flex justify-between items-center gap-4 md:gap-8">
        <ul className="flex flex-wrap md:flex-nowrap gap-4 md:gap-8 items-center">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === "/"}
                className="nav-link text-muted-foreground relative group transition-colors duration-300 hover:text-primary no-underline"
                activeClassName="active text-foreground"
              >
                {item.label}
                <span className="absolute left-0 bottom-0 w-full h-[2px] bg-gradient-to-r from-primary/80 to-primary origin-left scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100" />
              </NavLink>
            </li>
          ))}
        </ul>
        <ThemeToggle />
      </div>
    </nav>
  );
};

export default Navigation;
