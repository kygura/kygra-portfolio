// Palette names/order and the per-viewer preferences kept in browser storage
// (palette, motion, boot-seen). Every storage access is wrapped: a private window or
// blocked site data must never break the page. The pre-paint script in index.html reads
// the same `no.pal` key before first paint; this module owns it afterwards.

export const PALETTES = ["sodium", "phosphor", "oxide", "coldstar"] as const;
export type Palette = (typeof PALETTES)[number];
export const DEFAULT_PALETTE: Palette = "sodium";

export const PALETTE_KEY = "no.pal";
export const MOTION_KEY = "no.motion";
/** sessionStorage: set once the boot sequence has played (or been skipped). */
export const BOOT_KEY = "no.booted";

export const isPalette = (v: unknown): v is Palette => typeof v === "string" && (PALETTES as readonly string[]).includes(v);

/** `1`..`4` -> palette, anything else -> null. */
export const paletteForKey = (key: string): Palette | null => {
  const i = "1234".indexOf(key);
  return key.length === 1 && i >= 0 ? PALETTES[i] : null;
};

/** StatusBar label: `SODIUM` (desktop) / `SOD` (mobile). */
export const paletteLabel = (p: Palette, short = false): string => (short ? p.slice(0, 3) : p).toUpperCase();

export interface SafeStore {
  get(key: string): string | null;
  /** Returns false when the write was refused. */
  set(key: string, value: string): boolean;
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;

/** Wraps a storage getter so that both the access and each call may throw. */
export function safeStore(get: () => StorageLike | null | undefined): SafeStore {
  return {
    get(key) {
      try {
        return get()?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        const s = get();
        if (!s) return false;
        s.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    },
  };
}

export const local = safeStore(() => (typeof window === "undefined" ? null : window.localStorage));
export const session = safeStore(() => (typeof window === "undefined" ? null : window.sessionStorage));

export function loadPalette(store: SafeStore = local): Palette {
  const v = store.get(PALETTE_KEY);
  return isPalette(v) ? v : DEFAULT_PALETTE;
}

export const savePalette = (p: Palette, store: SafeStore = local): boolean => store.set(PALETTE_KEY, p);

/** Sets `data-pal`; SODIUM lives on `:root`, the attribute only selects the other three. */
export function applyPalette(root: { dataset: DOMStringMap }, p: Palette): void {
  root.dataset.pal = p;
}

export interface MotionPref {
  motion: boolean;
  /** true when the viewer chose explicitly (`m`, `:motion`): the media query no longer applies. */
  pinned: boolean;
}

/** A stored `on`/`off` wins; otherwise motion follows `prefers-reduced-motion`. */
export function loadMotion(prefersReduced: boolean, store: SafeStore = local): MotionPref {
  const v = store.get(MOTION_KEY);
  if (v === "on" || v === "off") return { motion: v === "on", pinned: true };
  return { motion: !prefersReduced, pinned: false };
}

export const saveMotion = (on: boolean, store: SafeStore = local): boolean => store.set(MOTION_KEY, on ? "on" : "off");
