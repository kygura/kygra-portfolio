import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { NAV_ROUTES, shouldIgnoreKey } from "@/lib/keybindings";

export const ACCENTS = ["swordfish", "session", "hammerhead", "gate"] as const;
export type Accent = (typeof ACCENTS)[number];

const ACCENT_EVENT = "accentchange";

export function isAccent(v: unknown): v is Accent {
  return ACCENTS.includes(v as Accent);
}

export function getAccent(): Accent {
  const a = document.documentElement.dataset.accent;
  return isAccent(a) ? a : "session";
}

/** Writes the accent to <html data-accent> and localStorage, and tells
 *  listeners (key bar, nav swatch, hero) through a window event. */
export function setAccent(a: Accent) {
  document.documentElement.dataset.accent = a;
  try {
    localStorage.setItem("accent", a);
  } catch {
    /* storage blocked: the accent still applies for this visit */
  }
  window.dispatchEvent(new CustomEvent(ACCENT_EVENT, { detail: a }));
}

export function cycleAccent() {
  setAccent(ACCENTS[(ACCENTS.indexOf(getAccent()) + 1) % ACCENTS.length]);
}

export function useAccent(): Accent {
  const [accent, set] = useState<Accent>(getAccent);
  useEffect(() => {
    const on = () => set(getAccent());
    window.addEventListener(ACCENT_EVENT, on);
    return () => window.removeEventListener(ACCENT_EVENT, on);
  }, []);
  return accent;
}

/** The global keyboard contract (SPEC.md). Mount once, in Layout. */
export function useKeyboardNav() {
  const [helpOpen, setHelpOpen] = useState(false);
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && helpOpen) {
        setHelpOpen(false);
        return;
      }
      // The help overlay is modal: only "?" and Escape work while it is up.
      if (helpOpen && e.key !== "?") return;
      if (shouldIgnoreKey(e)) return;

      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const behavior: ScrollBehavior = reduce ? "auto" : "smooth";
      const route = NAV_ROUTES.find((r) => r.key === e.key);

      if (route) navigate(route.path);
      else if (e.key === "j") window.scrollBy({ top: window.innerHeight / 3, behavior });
      else if (e.key === "k") window.scrollBy({ top: -window.innerHeight / 3, behavior });
      else if (e.key === "g") window.scrollTo({ top: 0, behavior });
      else if (e.key === "t") cycleAccent();
      else if (e.key === "b") setTheme(resolvedTheme === "light" ? "dark" : "light");
      else if (e.key === "?") setHelpOpen((o) => !o);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [helpOpen, navigate, resolvedTheme, setTheme]);

  return { helpOpen, setHelpOpen };
}
