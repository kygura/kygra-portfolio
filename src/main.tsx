import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  // One dark world: the survey-sheet theme has no light variant.
  <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
    <App />
  </ThemeProvider>
);
