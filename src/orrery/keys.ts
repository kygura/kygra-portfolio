// Production keymap (DESIGN §7 + A1-A4). `resolveKey` is pure: (state, key, now) ->
// action. `useKeys` is the single global listener that feeds it.
//
// DOM contract for `useKeys` target classification (T4 markup):
//   - section rows carry `data-row`
//   - the Inspector root carries `data-inspector`
//   - inputs/textareas/contenteditable are treated as text inputs
//   - any other focused button/link is a control (Enter keeps its native click)

import { useEffect } from "react";
import { paletteForKey } from "./palette.ts";
import { READER_LINES, type Action, type Mode, type State } from "./state.ts";

export const LEADER_MS = 800;

export type KeyTarget = "body" | "row" | "input" | "control" | "inspector";

export interface KeyInput {
  /** `KeyboardEvent.key` */
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  meta?: boolean;
  target?: KeyTarget;
}

export interface KeyResult {
  action: Action | null;
  /** Call preventDefault on the event. */
  prevent: boolean;
}

const NONE: KeyResult = { action: null, prevent: false };
const act = (action: Action): KeyResult => ({ action, prevent: true });

const LOOK_STEP = 5;
const LOOK_KEYS: Record<string, [number, number, number]> = {
  h: [-LOOK_STEP, 0, 0],
  ArrowLeft: [-LOOK_STEP, 0, 0],
  l: [LOOK_STEP, 0, 0],
  ArrowRight: [LOOK_STEP, 0, 0],
  j: [0, -LOOK_STEP, 0],
  ArrowDown: [0, -LOOK_STEP, 0],
  k: [0, LOOK_STEP, 0],
  ArrowUp: [0, LOOK_STEP, 0],
  "+": [0, 0, -1],
  "=": [0, 0, -1],
  "-": [0, 0, 1],
};

const NORMAL_KEYS: Record<string, Action> = {
  j: { type: "move", delta: 1 },
  ArrowDown: { type: "move", delta: 1 },
  k: { type: "move", delta: -1 },
  ArrowUp: { type: "move", delta: -1 },
  h: { type: "sectionStep", delta: -1 },
  ArrowLeft: { type: "sectionStep", delta: -1 },
  l: { type: "sectionStep", delta: 1 },
  ArrowRight: { type: "sectionStep", delta: 1 },
  G: { type: "edge", end: "last" },
  o: { type: "open" },
  Enter: { type: "open" },
  O: { type: "open", newTab: true },
  "/": { type: "filterOpen" },
  n: { type: "filterStep", delta: 1 },
  N: { type: "filterStep", delta: -1 },
  ":": { type: "cmdOpen" },
  "?": { type: "help" },
  m: { type: "motion" },
  f: { type: "look", on: true },
  y: { type: "yank" },
};

const READER_KEYS: Record<string, Action> = {
  j: { type: "readerScroll", lines: READER_LINES },
  ArrowDown: { type: "readerScroll", lines: READER_LINES },
  k: { type: "readerScroll", lines: -READER_LINES },
  ArrowUp: { type: "readerScroll", lines: -READER_LINES },
  G: { type: "readerEdge", end: "bottom" },
};

export function resolveKey(s: State, e: KeyInput, now: number): KeyResult {
  const k = e.key;
  const target = e.target ?? "body";

  if (s.mode === "BOOT") return act({ type: "bootDone" });
  if (e.alt || e.meta) return NONE;

  if (e.ctrl) {
    if (k === "k") return act({ type: "cmdOpen" });
    if ((k === "n" || k === "p") && s.mode === "CMD") return act({ type: "cmdMove", delta: k === "n" ? 1 : -1 });
    if ((k === "n" || k === "p") && s.mode === "FILTER") return act({ type: "move", delta: k === "n" ? 1 : -1 });
    return NONE;
  }

  if (k === "Escape") return act({ type: "escape" });

  if (s.mode === "CMD") {
    if (k === "Enter") return act({ type: "cmdRun" });
    if (k === "Tab") return act({ type: "cmdComplete" });
    if (k === "ArrowDown" || k === "ArrowUp") return act({ type: "cmdMove", delta: k === "ArrowDown" ? 1 : -1 });
    return NONE;
  }
  if (s.mode === "INSERT") return k === "Enter" ? act({ type: "insertSubmit" }) : NONE;
  if (target === "input") return k === "Enter" && s.mode === "FILTER" ? act({ type: "filterKeep" }) : NONE;
  if (s.mode === "HELP") return k === "?" ? act({ type: "help", on: false }) : NONE;

  if (s.mode === "LOOK") {
    const step = LOOK_KEYS[k];
    if (step) return act({ type: "orbit", yaw: step[0], pitch: step[1], zoom: step[2] });
    if (k === "f") return act({ type: "look", on: false });
    const p = paletteForKey(k);
    return p ? act({ type: "palette", palette: p }) : NONE;
  }

  if (s.pending && now - s.pending.at <= LEADER_MS) return act({ type: "chord", key: k });

  if (target === "inspector" && (k === "j" || k === "k")) return act({ type: "inspectorStep", delta: k === "j" ? 1 : -1 });
  if (s.reader && READER_KEYS[k]) return act(READER_KEYS[k]);

  if (k === "g") return act({ type: "leader", at: now });
  const p = paletteForKey(k);
  if (p) return act({ type: "palette", palette: p });
  if (k === "Enter" && (target === "control" || target === "inspector")) return NONE;
  const a = NORMAL_KEYS[k];
  return a ? act(a) : NONE;
}

// ---------------------------------------------------------------- display helpers

/** Normalised key id for KeyChip flashes (`esc`, `enter`, `down`, ...). */
export function keyId(key: string): string {
  const named: Record<string, string> = {
    Escape: "esc",
    Enter: "enter",
    Tab: "tab",
    ArrowDown: "down",
    ArrowUp: "up",
    ArrowLeft: "left",
    ArrowRight: "right",
  };
  return named[key] ?? key;
}

/**
 * Does a chip with `data-k` keys (space separated, e.g. `"j k down up"`, `"gp"`, `"1-4"`)
 * flash for key id `id`? `leader` is true while a `g` chord is pending.
 */
export function chipHit(chipKeys: string, id: string, leader = false): boolean {
  const ks = chipKeys.split(" ");
  if (ks.includes(id)) return true;
  if (leader && ks.includes(`g${id}`)) return true;
  return ks.includes("1-4") && id.length === 1 && "1234".includes(id);
}

export interface Chip {
  /** Text inside the brackets, `[j/k]`. */
  label: string;
  /** `data-k` value for flashes. */
  keys: string;
  text: string;
}

const chip = (label: string, keys: string, text: string): Chip => ({ label, keys, text });

export type ModelineMode = Mode | "INSPECT" | "READ";

export const MODE_CHIPS: Record<ModelineMode, Chip[]> = {
  NORMAL: [
    chip("j/k", "j k down up", "move"),
    chip("h/l", "h l left right", "section"),
    chip("o", "o enter", "open"),
    chip(":", ":", "cmd"),
    chip("?", "?", "keys"),
    chip("1-4", "1-4", "palette"),
  ],
  INSPECT: [
    chip("j/k", "j k", "move"),
    chip("o", "o enter", "dossier"),
    chip("O", "O", "new tab"),
    chip("y", "y", "yank"),
    chip("esc", "esc", "close"),
    chip("?", "?", "keys"),
  ],
  READ: [
    chip("j/k", "j k down up", "scroll"),
    chip("gg/G", "g G", "top/end"),
    chip("h/l", "h l left right", "section"),
    chip("esc", "esc", "close"),
    chip("?", "?", "keys"),
  ],
  FILTER: [chip("^n/^p", "n p", "match"), chip("enter", "enter", "keep"), chip("esc", "esc", "clear")],
  CMD: [chip("^n/^p", "n p down up", "move"), chip("tab", "tab", "complete"), chip("enter", "enter", "run"), chip("esc", "esc", "close")],
  LOOK: [chip("hjkl", "h j k l", "orbit"), chip("+/-", "+ - =", "zoom"), chip("f", "f esc", "exit")],
  INSERT: [chip("enter", "enter", "send"), chip("esc", "esc", "cancel")],
  HELP: [chip("?", "?", "close"), chip("esc", "esc", "close")],
  BOOT: [],
};

/** Which chip set the Modeline shows. */
export function modelineMode(s: State): ModelineMode {
  if (s.mode !== "NORMAL") return s.mode;
  if (s.reader) return "READ";
  if (s.inspector && s.section === "projects") return "INSPECT";
  return "NORMAL";
}

export const modelineChips = (s: State): Chip[] => MODE_CHIPS[modelineMode(s)];

/** HelpOverlay rows, generated from the bindings above. */
export const KEYMAP: readonly (readonly [string, string])[] = [
  ["j / down", "next row; camera retargets on projects"],
  ["k / up", "previous row"],
  ["h / left", "previous section (wraps)"],
  ["l / right", "next section"],
  ["g g", "first row"],
  ["G", "last row"],
  ["g p / g w / g c / g n / g b", "projects / notes / links / now / log"],
  ["Enter / o", "open: inspector (again: dossier) on projects, reader on notes, link otherwise"],
  ["O", "open primary url in a new tab"],
  ["Esc", "close cmd / help / reader / inspector, clear filter, NORMAL"],
  ["/", "filter the active list"],
  ["n / N", "next / previous match"],
  [": / Ctrl-k", "command line (Ctrl-n / Ctrl-p move, Tab completes)"],
  ["?", "toggle this keymap"],
  ["1 2 3 4", "palette: sodium / phosphor / oxide / coldstar"],
  ["m", "toggle motion"],
  ["f", "LOOK mode: sky + modeline only"],
  ["LOOK: h j k l", "orbit camera in 5 deg steps"],
  ["LOOK: + / -", "zoom"],
  ["y", "yank url (email on links)"],
  ["READER: j / k", "scroll 3 lines"],
  ["READER: g g / G", "top / bottom"],
  ["LOG: Enter", "expand entry; + sign opens the form; + more loads older"],
  ["INSERT: Enter / Esc", "send / cancel"],
  ["Tab / Shift-Tab", "native focus; selection follows"],
];

// ---------------------------------------------------------------- hook

export function classifyTarget(t: EventTarget | null): KeyTarget {
  const el = t as HTMLElement | null;
  if (!el || typeof el.closest !== "function" || el === document.body) return "body";
  if (el.isContentEditable || el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return "input";
  if (el.closest("[data-inspector]")) return "inspector";
  if (el.closest("[data-row]")) return "row";
  if (el.closest("a,button,[role=button],[tabindex]")) return "control";
  return "body";
}

export interface UseKeysOptions {
  getState: () => State;
  dispatch: (a: Action) => void;
  /** Called with `keyId(e.key)` for every keydown (KeyChip flashes). */
  onKey?: (id: string) => void;
}

/**
 * The single global key handler. Schedules `leaderClear` for the `g-` Modeline hint.
 * Pass stable callbacks (e.g. `getState` reading a ref) so the listener is not re-bound every render.
 */
export function useKeys({ getState, dispatch, onKey }: UseKeysOptions): void {
  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const onKeyDown = (e: KeyboardEvent) => {
      onKey?.(keyId(e.key));
      const r = resolveKey(
        getState(),
        { key: e.key, ctrl: e.ctrlKey, alt: e.altKey, meta: e.metaKey, target: classifyTarget(e.target) },
        performance.now(),
      );
      if (r.prevent) e.preventDefault();
      if (!r.action) return;
      dispatch(r.action);
      if (r.action.type === "leader") {
        const at = r.action.at;
        const t = setTimeout(() => {
          timers.delete(t);
          dispatch({ type: "leaderClear", at });
        }, LEADER_MS);
        timers.add(t);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      timers.forEach(clearTimeout);
    };
  }, [getState, dispatch, onKey]);
}
