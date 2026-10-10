/** Shared key tables and helpers for the keyboard layer (see Keys.tsx). */

export const CHORDS: Record<string, { to: string; label: string }> = {
  h: { to: "/", label: "Home" },
  w: { to: "/writings", label: "Writings" },
  s: { to: "/projects", label: "Software" },
  b: { to: "/guestbook", label: "Guestbook" },
  c: { to: "/cv", label: "CV" },
};

/** Nav path → chord letter, for printing hints next to nav links. */
export const CHORD_FOR: Record<string, string> = Object.fromEntries(
  Object.entries(CHORDS).map(([k, v]) => [v.to, k]),
);

export const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (el.isContentEditable || el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT");
