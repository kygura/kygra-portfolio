/**
 * The four accent variants and the one switch that applies them. CSS tokens
 * live in index.css under `:root[data-accent=…]` (an inline script in
 * index.html applies the saved one before first paint); the hero reads
 * `hex`/`deep`/`fog`/`zen` for its shader uniforms, so one switch recolours
 * both the page and the scene.
 */
import { useSyncExternalStore } from "react";

export interface Accent {
  id: "lichen" | "torch" | "astral" | "madder";
  name: string;
  hex: string;
  deep: string;
  fog: string;
  zen: string;
}

export const ACCENTS: Accent[] = [
  { id: "lichen", name: "Lichen", hex: "#bcc77c", deep: "#5d7a3a", fog: "#3b4c4b", zen: "#0f171b" },
  { id: "torch", name: "Torch Amber", hex: "#eaa24c", deep: "#a24e1c", fog: "#4a453d", zen: "#15121a" },
  { id: "astral", name: "Astral Cyan", hex: "#86d3dc", deep: "#2f6f9a", fog: "#33475a", zen: "#0b1222" },
  { id: "madder", name: "Ritual Madder", hex: "#e5787f", deep: "#7e2638", fog: "#463a42", zen: "#140d14" },
];

export const ACCENT_KEY = "nca-accent";
export const SHEET_KEY = "nca-sheet";

export function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage blocked: the preference just won't persist */
  }
}

export function storedIndex(key: string, length: number): number {
  const n = Number.parseInt(readStored(key) ?? "", 10);
  return Number.isInteger(n) && n >= 0 && n < length ? n : 0;
}

let current = typeof window === "undefined" ? 0 : storedIndex(ACCENT_KEY, ACCENTS.length);
const listeners = new Set<() => void>();

export function setAccent(i: number) {
  const n = ((i % ACCENTS.length) + ACCENTS.length) % ACCENTS.length;
  current = n;
  writeStored(ACCENT_KEY, String(n));
  const a = ACCENTS[n];
  if (a.id === "lichen") document.documentElement.removeAttribute("data-accent");
  else document.documentElement.setAttribute("data-accent", a.id);
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Index of the active accent; re-renders the caller when it changes. */
export function useAccent(): number {
  return useSyncExternalStore(subscribe, () => current, () => 0);
}
