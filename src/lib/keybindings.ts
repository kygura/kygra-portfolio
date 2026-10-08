/** Single source for the keyboard layer: the hook, the nav, the key bar and
 *  the help overlay all read from here. */

export const NAV_ROUTES = [
  { key: "1", path: "/", label: "Home" },
  { key: "2", path: "/writings", label: "Writings" },
  { key: "3", path: "/projects", label: "Software" },
  { key: "4", path: "/guestbook", label: "Guestbook" },
  { key: "5", path: "/cv", label: "CV" },
] as const;

export interface Binding {
  keys: string[];
  /** Joins the keys: "/" for alternatives, "–" for a range. */
  sep?: string;
  /** Long description, shown in the help overlay. */
  help: string;
  /** Short legend for the key bar; omitted bindings show in help only. */
  bar?: string;
}

export const BINDINGS: Binding[] = [
  { keys: ["j", "k"], sep: "/", help: "scroll down / up", bar: "scroll" },
  { keys: ["1", "5"], sep: "–", help: "Home, Writings, Software, Guestbook, CV", bar: "pages" },
  { keys: ["g"], help: "back to the top", bar: "top" },
  { keys: ["t"], help: "cycle accent", bar: "accent" },
  { keys: ["b"], help: "hangar / codex base", bar: "base" },
  { keys: [":"], help: "open the terminal (also Ctrl+K or `)", bar: "terminal" },
  { keys: ["a", "d"], sep: "/", help: "previous / next quote in the footer" },
  { keys: ["?", "Esc"], sep: "/", help: "this map", bar: "help" },
];

/** True when a global shortcut should stay out of the way: a modifier is
 *  held (Shift excepted, since `?` and `:` need it), or the user is typing
 *  or inside the terminal. */
export function shouldIgnoreKey(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return true;
  const t = e.target;
  if (!(t instanceof HTMLElement)) return false;
  return (
    t.isContentEditable ||
    t.closest("input, textarea, select, [contenteditable], [data-terminal]") !== null
  );
}
