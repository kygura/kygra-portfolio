import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PALETTES,
  PALETTE_KEY,
  applyPalette,
  isPalette,
  loadMotion,
  loadPalette,
  paletteForKey,
  paletteLabel,
  safeStore,
  saveMotion,
  savePalette,
} from "./palette.ts";

const memory = () => {
  const m = new Map<string, string>();
  return { m, store: safeStore(() => ({ getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) })) };
};
const throwing = safeStore(() => {
  throw new Error("SecurityError");
});

describe("palette", () => {
  it("has four palettes in key order, SODIUM first", () => {
    assert.deepEqual([...PALETTES], ["sodium", "phosphor", "oxide", "coldstar"]);
    assert.deepEqual(["1", "2", "3", "4", "5", "x"].map(paletteForKey), [...PALETTES, null, null]);
  });
  it("validates names", () => {
    assert.equal(isPalette("oxide"), true);
    assert.equal(isPalette("OXIDE"), false);
    assert.equal(isPalette(null), false);
  });
  it("labels for the StatusBar", () => {
    assert.equal(paletteLabel("coldstar"), "COLDSTAR");
    assert.equal(paletteLabel("coldstar", true), "COL");
  });
  it("persists under no.pal and falls back to sodium", () => {
    const { m, store } = memory();
    assert.equal(loadPalette(store), "sodium");
    assert.equal(savePalette("phosphor", store), true);
    assert.equal(m.get(PALETTE_KEY), "phosphor");
    assert.equal(loadPalette(store), "phosphor");
    m.set(PALETTE_KEY, "synthwave");
    assert.equal(loadPalette(store), "sodium");
  });
  it("survives storage that throws", () => {
    assert.equal(loadPalette(throwing), "sodium");
    assert.equal(savePalette("oxide", throwing), false);
    assert.equal(safeStore(() => null).get("x"), null);
  });
  it("applyPalette sets data-pal", () => {
    const root = { dataset: {} as DOMStringMap };
    applyPalette(root, "oxide");
    assert.equal(root.dataset.pal, "oxide");
  });
});

describe("motion preference", () => {
  it("follows the media query until pinned", () => {
    const { store } = memory();
    assert.deepEqual(loadMotion(true, store), { motion: false, pinned: false });
    assert.deepEqual(loadMotion(false, store), { motion: true, pinned: false });
    saveMotion(true, store);
    assert.deepEqual(loadMotion(true, store), { motion: true, pinned: true });
    assert.deepEqual(loadMotion(true, throwing), { motion: false, pinned: false });
  });
});
