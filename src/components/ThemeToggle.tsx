import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

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
        className="w-10 h-10 rounded-full bg-foreground transition-all duration-300 hover:scale-110"
        aria-label="Toggle theme"
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={handleClick}
      className={`relative w-10 h-10 rounded-full bg-foreground transition-all duration-300 hover:scale-110 ${
        isAnimating ? 'animate-pulse' : ''
      }`}
      aria-label="Toggle theme"
    >
      {isAnimating && (
        <span className="absolute inset-0 rounded-full bg-foreground animate-ping opacity-75" />
      )}
    </button>
  );
};

export default ThemeToggle;
