import { NavLink } from "@/components/NavLink";

const Navigation = () => {
  const navItems = [
    { path: "/", label: "Home" },
    { path: "/writings", label: "Writings" },
    { path: "/projects", label: "Software" },
    { path: "/guestbook", label: "Guestbook" },
    { path: "/cv", label: "CV" }
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
                className="px-4 py-1.5 transition-colors duration-200 uppercase whitespace-nowrap text-foreground hover:bg-foreground hover:text-background no-underline"
                activeClassName="!bg-foreground !text-background"
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default Navigation;
