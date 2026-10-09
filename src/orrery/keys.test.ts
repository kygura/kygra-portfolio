import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { KEYMAP, LEADER_MS, chipHit, keyId, modelineChips, modelineMode, resolveKey, type KeyInput } from "./keys.ts";
import { initState, type State } from "./state.ts";

const base = initState();
const key = (s: State, k: string | KeyInput, now = 0) => resolveKey(s, typeof k === "string" ? { key: k } : k, now).action;
const withMode = (mode: State["mode"], extra: Partial<State> = {}): State => ({ ...base, mode, ...extra });

describe("NORMAL keymap", () => {
  const table: [string, unknown][] = [
    ["j", { type: "move", delta: 1 }],
    ["ArrowDown", { type: "move", delta: 1 }],
    ["k", { type: "move", delta: -1 }],
    ["h", { type: "sectionStep", delta: -1 }],
    ["l", { type: "sectionStep", delta: 1 }],
    ["G", { type: "edge", end: "last" }],
    ["o", { type: "open" }],
    ["Enter", { type: "open" }],
    ["O", { type: "open", newTab: true }],
    ["/", { type: "filterOpen" }],
    ["n", { type: "filterStep", delta: 1 }],
    [":", { type: "cmdOpen" }],
    ["?", { type: "help" }],
    ["m", { type: "motion" }],
    ["f", { type: "look", on: true }],
    ["y", { type: "yank" }],
    ["3", { type: "palette", palette: "oxide" }],
    ["Escape", { type: "escape" }],
  ];
  for (const [k, want] of table) it(k, () => assert.deepEqual(key(base, k), want));

  it("Ctrl-k opens the command line from anywhere", () => assert.deepEqual(key(base, { key: "k", ctrl: true }), { type: "cmdOpen" }));
  it("debug keys [ ] \\ are unbound (A2)", () => {
    for (const k of ["[", "]", "\\"]) assert.equal(key(base, k), null);
  });
  it("alt/meta combos pass through", () => assert.equal(key(base, { key: "j", meta: true }), null));
  it("Enter on a focused control keeps its native click", () =>
    assert.equal(key(base, { key: "Enter", target: "control" }), null));
  it("j/k inside the Inspector step its links", () =>
    assert.deepEqual(key(base, { key: "j", target: "inspector" }), { type: "inspectorStep", delta: 1 }));
});

describe("g leader (800ms)", () => {
  it("g starts a chord, the next key completes it", () => {
    assert.deepEqual(key(base, "g", 100), { type: "leader", at: 100 });
    const pending = { ...base, pending: { at: 100 } };
    assert.deepEqual(key(pending, "p", 100 + LEADER_MS), { type: "chord", key: "p" });
    assert.deepEqual(key(pending, "g", 500), { type: "chord", key: "g" });
  });
  it("an expired leader is ignored", () => {
    const pending = { ...base, pending: { at: 100 } };
    assert.deepEqual(key(pending, "j", 101 + LEADER_MS), { type: "move", delta: 1 });
  });
});

describe("input focus rules", () => {
  it("typing in an input is left alone except Esc / Enter", () => {
    const f = withMode("FILTER");
    assert.equal(key(f, { key: "j", target: "input" }), null);
    assert.deepEqual(key(f, { key: "Enter", target: "input" }), { type: "filterKeep" });
    assert.deepEqual(key(f, { key: "Escape", target: "input" }), { type: "escape" });
    assert.deepEqual(key(f, { key: "n", ctrl: true, target: "input" }), { type: "move", delta: 1 });
  });
  it("CMD: Enter runs, Tab completes, arrows and Ctrl-n/p move", () => {
    const c = withMode("CMD");
    assert.deepEqual(key(c, { key: "Enter", target: "input" }), { type: "cmdRun" });
    assert.deepEqual(key(c, { key: "Tab", target: "input" }), { type: "cmdComplete" });
    assert.deepEqual(key(c, { key: "ArrowUp", target: "input" }), { type: "cmdMove", delta: -1 });
    assert.deepEqual(key(c, { key: "p", ctrl: true, target: "input" }), { type: "cmdMove", delta: -1 });
    assert.equal(key(c, { key: "j", target: "input" }), null);
  });
  it("INSERT: Enter sends", () =>
    assert.deepEqual(key(withMode("INSERT"), { key: "Enter", target: "input" }), { type: "insertSubmit" }));
});

describe("other modes", () => {
  it("BOOT: any plain key skips, keeping its default", () => {
    const b = withMode("BOOT");
    for (const k of ["x", "Enter", " ", "Escape", "j"]) {
      assert.deepEqual(resolveKey(b, { key: k }, 0), { action: { type: "bootDone" }, prevent: false });
    }
  });
  it("BOOT: modifiers, combos, Tab and F-keys pass through untouched", () => {
    const b = withMode("BOOT");
    const none = { action: null, prevent: false };
    for (const k of ["Shift", "Control", "Alt", "Meta", "CapsLock", "Tab", "F5", "F12"]) assert.deepEqual(resolveKey(b, { key: k }, 0), none);
    assert.deepEqual(resolveKey(b, { key: "r", ctrl: true }, 0), none);
    assert.deepEqual(resolveKey(b, { key: "l", meta: true }, 0), none);
    assert.deepEqual(resolveKey(b, { key: "d", alt: true }, 0), none);
  });
  it("HELP swallows keys except ? and Esc", () => {
    const h = withMode("HELP");
    assert.equal(key(h, "j"), null);
    assert.deepEqual(key(h, "?"), { type: "help", on: false });
  });
  it("LOOK: hjkl orbit 5 degrees, +/- zoom, f exits, 1-4 palette", () => {
    const l = withMode("LOOK");
    assert.deepEqual(key(l, "h"), { type: "orbit", yaw: -5, pitch: 0, zoom: 0 });
    assert.deepEqual(key(l, "k"), { type: "orbit", yaw: 0, pitch: 5, zoom: 0 });
    assert.deepEqual(key(l, "-"), { type: "orbit", yaw: 0, pitch: 0, zoom: 1 });
    assert.deepEqual(key(l, "f"), { type: "look", on: false });
    assert.deepEqual(key(l, "1"), { type: "palette", palette: "sodium" });
  });
  it("Reader: j/k scroll 3 lines, G bottom, h/l stay global", () => {
    const r = { ...base, reader: { kind: "post" as const, slug: "x" } };
    assert.deepEqual(key(r, "j"), { type: "readerScroll", lines: 3 });
    assert.deepEqual(key(r, "k"), { type: "readerScroll", lines: -3 });
    assert.deepEqual(key(r, "G"), { type: "readerEdge", end: "bottom" });
    assert.deepEqual(key(r, "l"), { type: "sectionStep", delta: 1 });
  });
});

describe("display helpers", () => {
  it("keyId normalises named keys", () => assert.deepEqual(["Escape", "ArrowUp", "j"].map(keyId), ["esc", "up", "j"]));
  it("chip flashes", () => {
    assert.equal(chipHit("j k down up", "down"), true);
    assert.equal(chipHit("gp", "p"), false);
    assert.equal(chipHit("gp", "p", true), true);
    assert.equal(chipHit("1-4", "3"), true);
  });
  it("modeline chips follow mode, inspector and reader (max 6)", () => {
    assert.equal(modelineMode(base), "NORMAL");
    assert.equal(modelineMode({ ...base, inspector: true }), "INSPECT");
    assert.equal(modelineMode({ ...base, reader: { kind: "cv", slug: null } }), "READ");
    assert.equal(modelineMode(withMode("INSERT")), "INSERT");
    for (const m of ["NORMAL", "INSPECT", "READ", "FILTER", "CMD", "LOOK", "INSERT", "HELP"] as const) {
      assert.ok(modelineChips(m === "INSPECT" ? { ...base, inspector: true } : m === "READ" ? { ...base, reader: { kind: "cv", slug: null } } : withMode(m)).length <= 6);
    }
  });
  it("help keymap lists g b and no debug keys", () => {
    const keys = KEYMAP.map(([k]) => k).join(" | ");
    assert.ok(keys.includes("g b"));
    assert.ok(!/\[ \/ \]|\\/.test(keys));
  });
});
