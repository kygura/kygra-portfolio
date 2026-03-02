import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react"; // Importing Sun and Moon icons from lucide-react

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClick = () => {
    setIsAnimating(true);
    setTheme(theme === "dark" ? "light" : "dark");
    setTimeout(() => setIsAnimating(false), 777);
  };

  if (!mounted) {
    return (
      <button
        className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full bg-foreground transition-all duration-300 hover:scale-110"
        aria-label="Toggle theme"
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={handleClick}
      className={`relative w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full bg-foreground flex items-center justify-center transition-all duration-300 hover:scale-110 ${isAnimating ? "animate-pulse" : ""
        }`}
      aria-label="Toggle theme"
    >
      {isAnimating && (
        <span className="absolute inset-0 rounded-full bg-foreground animate-ping opacity-75" />
      )}
      {isDark ? (
        <Sun className="h-4 w-4 md:h-6 md:w-6 text-background opacity-0" />
      ) : (
        <Moon className="h-4 w-4 md:h-6 md:w-6 text-background opacity-0" />
      )}
    </button>
  );
};

export default ThemeToggle;
