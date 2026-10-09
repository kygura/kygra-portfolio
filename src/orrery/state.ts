// Pure console store (SPEC 5.1, DESIGN §7/§8 + A1-A7). One reducer owns sections,
// per-section selection and filter, modes, Inspector/Reader flags, palette, motion and
// the transient Modeline message. Side effects (navigation, opening URLs, clipboard,
// sky calls) are queued as data in `fx`; the shell runs every effect whose `seq` is newer
// than the last one it ran, so batching several dispatches never drops one.

import { buildCommands, matchCommands, type Command, type CommandResult } from "./commands.ts";
import { matchesFilter, type LinkRow, type LogRow, type NoteRow, type NowRow, type ProjectRow } from "./model.ts";
import type { Palette } from "./palette.ts";
import {
  SECTIONS,
  SECTION_META,
  sectionPath,
  stepSection,
  type ReaderKind,
  type Route,
  type Section,
} from "./routes.ts";

export type Mode = "BOOT" | "NORMAL" | "FILTER" | "CMD" | "LOOK" | "INSERT" | "HELP";

export interface Rows {
  projects: ProjectRow[];
  notes: NoteRow[];
  links: LinkRow[];
  now: NowRow[];
  log: LogRow[];
}

export interface Reader {
  kind: ReaderKind;
  slug: string | null;
}

export interface Msg {
  text: string;
  err: boolean;
  seq: number;
}

export type Effect =
  /** react-router `navigate(to, { replace })`. */
  | { type: "navigate"; to: string; replace: boolean }
  /** Open a URL (site-relative paths resolve against `location.origin`). */
  | { type: "open"; url: string; newTab: boolean }
  /** Write to the clipboard; site-relative text resolves against `location.origin`. */
  | { type: "yank"; text: string }
  | { type: "tear"; frames: number }
  /** applyPalette + savePalette + sky.setPalette. */
  | { type: "palette"; palette: Palette }
  /** sky.motion(on); saveMotion(on) when `persist`. */
  | { type: "motion"; on: boolean; persist: boolean }
  | { type: "res"; h: number }
  | { type: "look"; on: boolean }
  /** LOOK camera step: degrees of yaw/pitch, zoom steps (negative = in). */
  | { type: "orbit"; yaw: number; pitch: number; zoom: number }
  /** Start the boot sequence; the shell dispatches `bootDone` when it ends or is skipped. */
  | { type: "boot" }
  /** Boot finished: remember it in sessionStorage (`BOOT_KEY`). */
  | { type: "booted" }
  /** Reader scroll by text lines (`j`/`k` = 3). */
  | { type: "scroll"; lines: number }
  | { type: "scrollEdge"; end: "top" | "bottom" }
  /** Move focus between Inspector links (`j`/`k` while focus is inside it). */
  | { type: "inspectorLink"; delta: number }
  /** Guestbook: load the next page. */
  | { type: "more" }
  /** Guestbook: send the INSERT form; reply with `insertDone` on success, `msg` on error. */
  | { type: "submit" };

export interface Fx {
  seq: number;
  effect: Effect;
}

export interface State {
  mode: Mode;
  section: Section;
  /** Selected row index per section (index into `rows[section]`, not into the visible list). */
  sel: Record<Section, number>;
  filter: Record<Section, string>;
  rows: Rows;
  inspector: boolean;
  reader: Reader | null;
  /** Key of the log entry expanded inline, or null. */
  expanded: string | null;
  palette: Palette;
  motion: boolean;
  /** The viewer chose motion explicitly; the media query no longer drives it. */
  motionPinned: boolean;
  gl: "pending" | "on" | "none";
  /** Internal sky height reported by the Sky, null until known. */
  res: number | null;
  /** StatusBar `ERR` (404). */
  err: boolean;
  msg: Msg | null;
  /** `g` leader pressed at `at` (ms, caller clock). */
  pending: { at: number } | null;
  cmd: { query: string; index: number };
  /** Fortune roll counter; the shell picks a new random quote whenever it changes. */
  fortune: number;
  fx: Fx[];
  seq: number;
}

export type Action =
  | { type: "route"; route: Route }
  | { type: "rows"; section: "projects"; rows: ProjectRow[] }
  | { type: "rows"; section: "notes"; rows: NoteRow[] }
  | { type: "rows"; section: "links"; rows: LinkRow[] }
  | { type: "rows"; section: "now"; rows: NowRow[] }
  | { type: "rows"; section: "log"; rows: LogRow[] }
  | { type: "section"; to: Section }
  | { type: "sectionStep"; delta: number }
  | { type: "move"; delta: number }
  | { type: "edge"; end: "first" | "last" }
  | { type: "select"; section: Section; index: number }
  | { type: "open"; newTab?: boolean }
  | { type: "openProject"; index: number }
  | { type: "navigate"; to: string; replace?: boolean }
  | { type: "inspector"; on: boolean }
  | { type: "inspectorStep"; delta: number }
  | { type: "escape" }
  | { type: "filterOpen" }
  | { type: "filterSet"; query: string }
  | { type: "filterKeep" }
  | { type: "filterStep"; delta: number }
  | { type: "cmdOpen" }
  | { type: "cmdQuery"; query: string }
  | { type: "cmdMove"; delta: number }
  | { type: "cmdComplete" }
  | { type: "cmdRun"; index?: number }
  | { type: "help"; on?: boolean }
  | { type: "palette"; palette: Palette }
  | { type: "motion"; on?: boolean; persist?: boolean }
  | { type: "motionMedia"; reduced: boolean }
  | { type: "look"; on: boolean }
  | { type: "orbit"; yaw: number; pitch: number; zoom: number }
  | { type: "yank"; target?: "email" }
  | { type: "res"; h: number }
  | { type: "resReport"; h: number }
  | { type: "gl"; status: "on" | "none" }
  | { type: "readerScroll"; lines: number }
  | { type: "readerEdge"; end: "top" | "bottom" }
  | { type: "sign" }
  | { type: "insertSubmit" }
  | { type: "insertDone" }
  | { type: "more" }
  | { type: "fortune" }
  | { type: "boot" }
  | { type: "bootDone" }
  | { type: "leader"; at: number }
  | { type: "leaderClear"; at?: number }
  /** Second key of a `g` chord (`g`, `p`, `w`, `c`, `n`, `b`; anything else cancels). */
  | { type: "chord"; key: string }
  | { type: "msg"; text: string; err?: boolean }
  | { type: "msgClear"; seq: number };

const FX_KEEP = 32;
/** Reader `j`/`k` scroll step in lines (A4). */
export const READER_LINES = 3;

const perSection = <T>(v: T): Record<Section, T> =>
  Object.fromEntries(SECTIONS.map((s) => [s, v])) as Record<Section, T>;

export interface InitOptions {
  palette?: Palette;
  motion?: boolean;
  motionPinned?: boolean;
  /** Play the boot sequence (first visit this session, motion on). */
  boot?: boolean;
  route?: Route;
}

export function initState(o: InitOptions = {}): State {
  const base: State = {
    mode: o.boot && o.motion !== false ? "BOOT" : "NORMAL",
    section: "projects",
    sel: perSection(0),
    filter: perSection(""),
    rows: { projects: [], notes: [], links: [], now: [], log: [] },
    inspector: false,
    reader: null,
    expanded: null,
    palette: o.palette ?? "sodium",
    motion: o.motion ?? true,
    motionPinned: o.motionPinned ?? false,
    gl: "pending",
    res: null,
    err: false,
    msg: null,
    pending: null,
    cmd: { query: "", index: 0 },
    fortune: 0,
    fx: [],
    seq: 0,
  };
  return o.route ? { ...applyRoute(base, o.route), fx: [], seq: 0 } : base;
}

// ---------------------------------------------------------------- selectors

/** Indices into `rows[section]` that pass the section's filter. */
export function visibleIndices(s: State, section: Section = s.section): number[] {
  const q = s.filter[section];
  const rows = s.rows[section] as { text: string }[];
  const out: number[] = [];
  rows.forEach((r, i) => {
    if (matchesFilter(r, q)) out.push(i);
  });
  return out;
}

/** Modeline position: 1-based index among visible rows, and the visible total. */
export function position(s: State, section: Section = s.section): { index: number; total: number } {
  const v = visibleIndices(s, section);
  const i = v.indexOf(s.sel[section]);
  return { index: v.length ? (i < 0 ? 0 : i) + 1 : 0, total: v.length };
}

export const selectedProject = (s: State): ProjectRow | null => s.rows.projects[s.sel.projects] ?? null;

export const commandList = (s: State): Command[] => buildCommands(s.rows);

export const commandResults = (s: State): CommandResult[] => matchCommands(commandList(s), s.cmd.query);

/** Effects newer than `lastSeq`, oldest first. */
export const effectsSince = (s: State, lastSeq: number): Fx[] => s.fx.filter((f) => f.seq > lastSeq);

// ---------------------------------------------------------------- helpers

function emit(s: State, ...effects: Effect[]): State {
  if (!effects.length) return s;
  let seq = s.seq;
  const fx = [...s.fx, ...effects.map((effect) => ({ seq: ++seq, effect }))].slice(-FX_KEEP);
  return { ...s, fx, seq };
}

function say(s: State, text: string, err = false): State {
  return { ...s, msg: { text, err, seq: (s.msg?.seq ?? 0) + 1 } };
}

const tear = (s: State, frames: number): State => (s.motion ? emit(s, { type: "tear", frames }) : s);

function fail(s: State, text: string): State {
  return tear(say(s, text, true), 2);
}

function setSel(s: State, section: Section, index: number): State {
  const n = s.rows[section].length;
  const i = n ? Math.max(0, Math.min(n - 1, index)) : 0;
  if (s.sel[section] === i) return s;
  return { ...s, sel: { ...s.sel, [section]: i } };
}

/** Keeps the selection on a visible row after a filter or rows change. */
function keepVisible(s: State, section: Section): State {
  const v = visibleIndices(s, section);
  if (!v.length || v.includes(s.sel[section])) return s;
  return setSel(s, section, v[0]);
}

function selectBy(s: State, section: Section, pred: (row: { key: string }) => boolean): State {
  const i = (s.rows[section] as { key: string }[]).findIndex(pred);
  return i < 0 ? s : setSel(s, section, i);
}

/** Leaves FILTER/INSERT/CMD/HELP; FILTER drops its (unkept) query like the mock. */
function toNormal(s: State): State {
  if (s.mode === "FILTER") return { ...s, mode: "NORMAL", filter: { ...s.filter, [s.section]: "" } };
  if (s.mode === "NORMAL" || s.mode === "BOOT") return s;
  return { ...s, mode: "NORMAL" };
}

function syncReaderSelection(s: State): State {
  const r = s.reader;
  if (!r) return s;
  if (r.kind === "dossier") return selectBy(s, "projects", (row) => row.key === r.slug);
  if (r.kind === "post") return selectBy(s, "notes", (row) => row.key === r.slug);
  if (r.kind === "cv") return selectBy(s, "links", (row) => row.key === "cv");
  return s;
}

/** Section change shared by keys, clicks, commands and the URL. */
function enterSection(s: State, to: Section): State {
  if (to === s.section) return s;
  let next: State = s.mode === "LOOK" ? s : toNormal(s);
  next = { ...next, section: to, inspector: false, expanded: null };
  return keepVisible(next, to);
}

function applyRoute(s: State, route: Route): State {
  let next = route.section ? enterSection(s, route.section) : s;
  const reader = route.reader ? { kind: route.reader, slug: route.slug } : null;
  const wasErr = s.err;
  next = { ...next, reader, err: route.reader === "404" };
  next = syncReaderSelection(next);
  if (next.err && !wasErr) next = tear(next, 6);
  return next;
}

/** h/l, IndexRail, tabs, g-chords and section commands: replace history (SPEC 4). */
function goSection(s: State, to: Section): State {
  if (to === s.section && !s.reader) return s.mode === "LOOK" ? s : toNormal(s);
  const next = { ...enterSection(s, to), reader: null, err: false };
  return emit(next, { type: "navigate", to: sectionPath(to), replace: true });
}

function move(s: State, delta: number): State {
  const v = visibleIndices(s);
  if (!v.length) return s;
  const at = v.indexOf(s.sel[s.section]);
  const j = at < 0 ? 0 : Math.max(0, Math.min(v.length - 1, at + delta));
  return { ...setSel(s, s.section, v[j]), expanded: null };
}

function edge(s: State, end: "first" | "last"): State {
  const v = visibleIndices(s);
  if (!v.length) return s;
  return { ...setSel(s, s.section, end === "first" ? v[0] : v[v.length - 1]), expanded: null };
}

const nothing = (s: State, what = "nothing to open"): State => say(s, `${s.section}: ${what}`);

/** Row key of what the open Reader shows in the current section (selection is synced to it). */
function readerKey(s: State): string | null {
  const r = s.reader;
  if (r?.kind === "dossier" && s.section === "projects") return r.slug;
  if (r?.kind === "post" && s.section === "notes") return r.slug;
  if (r?.kind === "cv" && s.section === "links") return "cv";
  return null;
}

function openRow(s: State, newTab: boolean): State {
  const i = s.sel[s.section];
  // o/Enter on the row a Reader already shows is a no-op (no duplicate push, no hidden Inspector
  // flag). A click that selected another row in the visible list still opens it.
  if (s.reader && !newTab && (s.rows[s.section] as { key: string }[])[i]?.key === readerKey(s)) return s;
  switch (s.section) {
    case "projects": {
      const p = s.rows.projects[i];
      if (!p) return s;
      if (newTab) return p.primary ? emit(s, { type: "open", url: p.primary, newTab: true }) : nothing(s);
      // First Enter opens the Inspector; Enter again opens the dossier Reader.
      if (!s.inspector || s.reader) return { ...s, inspector: true };
      return emit(s, { type: "navigate", to: p.dossier, replace: false });
    }
    case "notes": {
      const n = s.rows.notes[i];
      if (!n) return s;
      return emit(s, newTab ? { type: "open", url: n.path, newTab: true } : { type: "navigate", to: n.path, replace: false });
    }
    case "links": {
      const l = s.rows.links[i];
      if (!l) return s;
      if (newTab || l.kind === "external" || l.kind === "mailto" || l.kind === "file") {
        // Files (cv.pdf) get a tab of their own so the console is not torn down.
        return emit(s, { type: "open", url: l.href, newTab: newTab || l.kind === "file" });
      }
      if (l.id === "log") return goSection(s, "log");
      return emit(s, { type: "navigate", to: l.href, replace: false });
    }
    case "log": {
      const r = s.rows.log[i];
      if (!r || newTab) return nothing(s);
      if (r.kind === "sign") return reduce(s, { type: "sign" });
      if (r.kind === "more") return emit(s, { type: "more" });
      return { ...s, expanded: s.expanded === r.key ? null : r.key };
    }
    default:
      return nothing(s);
  }
}

function yank(s: State, target?: "email"): State {
  let text: string | null = null;
  if (target === "email" || s.section === "links") {
    text = s.rows.links.find((l) => l.id === "email")?.handle ?? null;
  } else if (s.section === "projects") {
    const p = s.rows.projects[s.sel.projects];
    text = p ? (p.primary ?? p.dossier) : null;
  } else if (s.section === "notes") {
    text = s.rows.notes[s.sel.notes]?.path ?? null;
  }
  if (!text) return say(s, "nothing to yank here");
  // The shell replaces this with a fallback message if the clipboard refuses.
  return emit(say(s, `yanked ${text}`), { type: "yank", text });
}

/** Esc: close the innermost thing first (DESIGN §7, A3, A4). */
function escape(s: State): State {
  switch (s.mode) {
    case "CMD":
    case "HELP":
    case "INSERT":
      return { ...s, mode: "NORMAL" };
    case "FILTER":
      return toNormal(s);
    case "LOOK":
      return emit({ ...s, mode: "NORMAL" }, { type: "look", on: false });
    case "BOOT":
      return reduce(s, { type: "bootDone" });
  }
  // Back to the section path; replaces like every other section move (SPEC 4).
  if (s.reader) return emit({ ...s, reader: null, err: false }, { type: "navigate", to: sectionPath(s.section), replace: true });
  if (s.inspector) return { ...s, inspector: false };
  if (s.filter[s.section]) return { ...s, filter: { ...s.filter, [s.section]: "" } };
  if (s.expanded) return { ...s, expanded: null };
  return s;
}

function openOverlay(s: State, mode: "CMD" | "HELP" | "FILTER" | "LOOK"): State {
  let next = s;
  if (s.mode === "LOOK" && mode !== "LOOK") next = emit({ ...s, mode: "NORMAL" }, { type: "look", on: false });
  // Leaving FILTER for another overlay keeps the query (mock `fltDone()` without clear).
  return { ...next, mode };
}

// ---------------------------------------------------------------- reducer

export function reduce(s: State, a: Action): State {
  switch (a.type) {
    case "route":
      return applyRoute(s, a.route);

    case "rows": {
      let next: State = { ...s, rows: { ...s.rows, [a.section]: a.rows } };
      next = setSel(next, a.section, next.sel[a.section]);
      next = keepVisible(next, a.section);
      if (s.expanded && a.section === "log" && !(a.rows as { key: string }[]).some((r) => r.key === s.expanded)) next = { ...next, expanded: null };
      return syncReaderSelection(next);
    }

    case "section":
      return goSection(s, a.to);
    case "sectionStep":
      return goSection(s, stepSection(s.section, a.delta));

    case "move":
      return move(s, a.delta);
    case "edge":
      return edge(s, a.end);
    case "select":
      // Re-selecting the same row keeps an expanded log entry open (tap, then tap again).
      return { ...setSel(s, a.section, a.index), expanded: s.sel[a.section] === a.index ? s.expanded : null };

    case "open":
      return openRow(s, Boolean(a.newTab));
    case "openProject": {
      const next = goSection(s, "projects");
      return { ...setSel(next, "projects", a.index), inspector: true };
    }
    case "navigate":
      return emit(s, { type: "navigate", to: a.to, replace: Boolean(a.replace) });

    case "inspector":
      return { ...s, inspector: a.on && s.section === "projects" };
    case "inspectorStep":
      return emit(s, { type: "inspectorLink", delta: a.delta });

    case "escape":
      return escape(s);

    case "filterOpen":
      if (s.reader || s.mode === "BOOT") return s;
      return openOverlay(s, "FILTER");
    case "filterSet":
      return keepVisible({ ...s, filter: { ...s.filter, [s.section]: a.query } }, s.section);
    case "filterKeep":
      return s.mode === "FILTER" ? { ...s, mode: "NORMAL" } : s;
    case "filterStep":
      return s.filter[s.section] ? move(s, a.delta) : s;

    case "cmdOpen":
      // Already open: keep the query (Ctrl-k inside the command line).
      if (s.mode === "BOOT" || s.mode === "CMD") return s;
      return { ...openOverlay(s, "CMD"), cmd: { query: "", index: 0 } };
    case "cmdQuery":
      return { ...s, cmd: { query: a.query, index: 0 } };
    case "cmdMove": {
      const n = commandResults(s).length;
      if (!n) return s;
      return { ...s, cmd: { ...s.cmd, index: (((s.cmd.index + a.delta) % n) + n) % n } };
    }
    case "cmdComplete": {
      const r = commandResults(s)[s.cmd.index];
      return r ? { ...s, cmd: { query: r.command.name, index: 0 } } : s;
    }
    case "cmdRun": {
      const r = commandResults(s)[a.index ?? s.cmd.index];
      const query = s.cmd.query.trim();
      const closed: State = { ...s, mode: "NORMAL", cmd: { query: "", index: 0 } };
      return r ? reduce(closed, r.command.action) : fail(closed, `E492: not an editor command: ${query}`);
    }

    case "help": {
      const on = a.on ?? s.mode !== "HELP";
      if (on) return s.mode === "BOOT" ? s : openOverlay(s, "HELP");
      return s.mode === "HELP" ? { ...s, mode: "NORMAL" } : s;
    }

    case "palette": {
      if (a.palette === s.palette) return s;
      return tear(emit({ ...s, palette: a.palette }, { type: "palette", palette: a.palette }), 2);
    }
    case "motion": {
      const on = a.on ?? !s.motion;
      const persist = a.persist ?? true;
      return emit({ ...s, motion: on, motionPinned: s.motionPinned || persist }, { type: "motion", on, persist });
    }
    case "motionMedia": {
      if (s.motionPinned || s.motion === !a.reduced) return s;
      return emit({ ...s, motion: !a.reduced }, { type: "motion", on: !a.reduced, persist: false });
    }

    case "look": {
      if (a.on === (s.mode === "LOOK")) return s;
      if (a.on) return emit({ ...toNormal(s), mode: "LOOK" }, { type: "look", on: true });
      return emit({ ...s, mode: "NORMAL" }, { type: "look", on: false });
    }
    case "orbit":
      return s.mode === "LOOK" ? emit(s, { type: "orbit", yaw: a.yaw, pitch: a.pitch, zoom: a.zoom }) : s;

    case "yank":
      return yank(s, a.target);

    case "res":
      if (s.gl === "none") return say(s, "E: no sky", true);
      return emit(say(s, `res ${a.h}`), { type: "res", h: a.h });
    case "resReport":
      return s.res === a.h ? s : { ...s, res: a.h };
    case "gl":
      return { ...s, gl: a.status };

    case "readerScroll":
      return s.reader ? emit(s, { type: "scroll", lines: a.lines }) : s;
    case "readerEdge":
      return s.reader ? emit(s, { type: "scrollEdge", end: a.end }) : s;

    case "sign": {
      const row = s.rows.log[0];
      if (!row || row.kind !== "sign" || row.offline) return fail(s, "E: log offline");
      const next = setSel(goSection(s, "log"), "log", 0);
      return { ...next, mode: "INSERT", filter: { ...next.filter, log: "" } };
    }
    case "insertSubmit":
      return s.mode === "INSERT" ? emit(s, { type: "submit" }) : s;
    case "insertDone":
      return s.mode === "INSERT" ? { ...s, mode: "NORMAL" } : s;
    case "more":
      return emit(s, { type: "more" });

    case "fortune":
      return { ...goSection(s, "now"), fortune: s.fortune + 1 };

    case "boot":
      if (!s.motion) return s;
      return emit({ ...s, mode: "BOOT", inspector: false }, { type: "boot" });
    case "bootDone":
      return s.mode === "BOOT" ? emit({ ...s, mode: "NORMAL" }, { type: "booted" }) : s;

    case "leader":
      return { ...s, pending: { at: a.at } };
    case "leaderClear":
      if (!s.pending || (a.at != null && a.at !== s.pending.at)) return s;
      return { ...s, pending: null };
    case "chord": {
      const next: State = { ...s, pending: null };
      if (a.key === "g") return next.reader ? reduce(next, { type: "readerEdge", end: "top" }) : edge(next, "first");
      const to = SECTIONS.find((sec) => SECTION_META[sec].chord === a.key);
      return to ? goSection(next, to) : next;
    }

    case "msg":
      return say(s, a.text, Boolean(a.err));
    case "msgClear":
      return s.msg && s.msg.seq === a.seq ? { ...s, msg: null } : s;
  }
  return s;
}

