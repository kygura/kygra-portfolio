// Eager-safe entry to the Sky. Importing this module does not pull in three: Sky.ts (and three with it) arrives
// through the dynamic import below, in its own chunk.
import type { Sky, SkyOptions } from "./Sky";

export type { Sky, SkyOptions, SkyProjection, SkyStats } from "./Sky";
export type { SkyTokens } from "./math";

/** Waits for Silkscreen (used by the monolith glyph texture), at most 1.5s. */
function fontReady(): Promise<unknown> {
  const load = document.fonts?.load("8px Silkscreen").catch(() => undefined) ?? Promise.resolve();
  return Promise.race([load, new Promise((r) => setTimeout(r, 1500))]);
}

/**
 * Loads three, builds the Sky on `canvas` and starts its loop. Resolves null when the chunk fails to load or WebGL2
 * is unavailable: the caller shows <SkyFallback> and `gl:none`. Never logs. If the caller unmounts before this
 * resolves, it must dispose() the returned Sky.
 */
export async function loadSky(canvas: HTMLCanvasElement, opts: SkyOptions): Promise<Sky | null> {
  try {
    const [mod] = await Promise.all([import("./Sky"), fontReady()]);
    return new mod.Sky(canvas, opts);
  } catch {
    return null;
  }
}
