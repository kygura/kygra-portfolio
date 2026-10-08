import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";
import { isAccent } from "./hooks/useKeyboardNav";

// Apply the saved accent before the first paint so it does not flash.
let savedAccent: string | null = null;
try {
  savedAccent = localStorage.getItem("accent");
} catch {
  /* storage blocked: use the default */
}
document.documentElement.dataset.accent = isAccent(savedAccent) ? savedAccent : "session";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={true}>
    <App />
  </ThemeProvider>
);
