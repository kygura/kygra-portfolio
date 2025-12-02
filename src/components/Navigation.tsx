import { NavLink } from "@/components/NavLink";
import ThemeToggle from "./ThemeToggle";

const Navigation = () => {
  const navItems = [
    { path: "/", label: "Home" },
    { path: "/writings", label: "Writings" },
    { path: "/projects", label: "Projects" },
    { path: "/cv", label: "CV" },
  ];

  return (
    <nav className="py-8 px-6 md:px-12 lg:px-16">
      <div className="flex justify-between items-center">
        <ul className="flex gap-6 md:gap-8 items-center">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === "/"}
                className="nav-link text-muted-foreground"
                activeClassName="active text-foreground"
              >
                {item.label}
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
