import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { links } from "../content/site.ts";
import { linkRows, logRows, noteRow, nowRows, type ProjectRow } from "./model.ts";
import { parseRoute } from "./routes.ts";
import { commandResults, effectsSince, initState, position, reduce, visibleIndices, type Action, type Effect, type State } from "./state.ts";

const project = (slug: string, extra: Partial<ProjectRow> = {}): ProjectRow => ({
  key: slug,
  text: slug,
  slug,
  name: slug,
  title: slug[0].toUpperCase() + slug.slice(1),
  year: "2026",
  lang: "ts",
  type: "t",
  status: "s",
  stack: "--",
  summary: "",
  src: `https://github.com/kygura/${slug}`,
  live: null,
  dossier: `/projects/${slug}`,
  primary: `https://github.com/kygura/${slug}`,
  ...extra,
});

const note = (slug: string, title = slug) => noteRow({ slug, title, excerpt: "", date: "2026-01-01", tags: [], readTime: 2 });

function loaded(o: Parameters<typeof initState>[0] = {}, online = true): State {
  const actions: Action[] = [
    { type: "rows", section: "projects", rows: ["hyperion", "meridian", "lexis", "swarm", "equilibria", "noted"].map((s) => project(s)) },
    { type: "rows", section: "notes", rows: [note("thaumazein"), note("100m"), note("always-against", "Always Against")] },
    { type: "rows", section: "links", rows: linkRows(links) },
    { type: "rows", section: "now", rows: nowRows(["a", "b"]) },
    {
      type: "rows",
      section: "log",
      rows: logRows([{ id: "e1", name: "ana", message: "hola", created_at: "2026-01-01" }], { online, hasMore: true }),
    },
  ];
  return actions.reduce(reduce, initState(o));
}

const run = (s: State, ...as: Action[]): State => as.reduce(reduce, s);
const effects = (before: State, after: State): Effect[] => effectsSince(after, before.seq).map((f) => f.effect);

describe("initState", () => {
  it("starts on projects in NORMAL, or BOOT when asked with motion on", () => {
    assert.equal(initState().mode, "NORMAL");
    assert.equal(initState({ boot: true }).mode, "BOOT");
    assert.equal(initState({ boot: true, motion: false }).mode, "NORMAL");
  });
  it("applies the initial route without queuing effects", () => {
    const s = initState({ route: parseRoute("/does-not-exist") });
    assert.equal(s.reader?.kind, "404");
    assert.equal(s.err, true);
    assert.deepEqual(s.fx, []);
  });
});

describe("selection", () => {
  it("j/k move and clamp; gg/G jump", () => {
    let s = loaded();
    s = run(s, { type: "move", delta: 1 }, { type: "move", delta: 1 });
    assert.equal(s.sel.projects, 2);
    s = run(s, { type: "move", delta: -9 });
    assert.equal(s.sel.projects, 0);
    s = run(s, { type: "edge", end: "last" });
    assert.equal(s.sel.projects, 5);
    assert.deepEqual(position(s), { index: 6, total: 6 });
  });
  it("selection is kept per section", () => {
    let s = run(loaded(), { type: "move", delta: 3 }, { type: "sectionStep", delta: 1 }, { type: "move", delta: 1 });
    assert.equal(s.section, "notes");
    assert.equal(s.sel.notes, 1);
    s = run(s, { type: "sectionStep", delta: -1 });
    assert.equal(s.sel.projects, 3);
  });
  it("rows shrinking clamps the selection", () => {
    const s = run(loaded(), { type: "edge", end: "last" }, { type: "rows", section: "projects", rows: [project("a")] });
    assert.equal(s.sel.projects, 0);
  });
});

describe("sections and routes", () => {
  it("h/l wrap through 5 sections and replace history", () => {
    const s0 = loaded();
    const s1 = run(s0, { type: "sectionStep", delta: -1 });
    assert.equal(s1.section, "log");
    assert.deepEqual(effects(s0, s1), [{ type: "navigate", to: "/guestbook", replace: true }]);
  });
  it("g chords jump to sections; gg goes to the first row", () => {
    let s = run(loaded(), { type: "leader", at: 0 }, { type: "chord", key: "w" });
    assert.equal(s.section, "notes");
    assert.equal(s.pending, null);
    s = run(s, { type: "edge", end: "last" }, { type: "leader", at: 1 }, { type: "chord", key: "g" });
    assert.equal(s.sel.notes, 0);
    s = run(s, { type: "leader", at: 2 }, { type: "chord", key: "b" });
    assert.equal(s.section, "log");
  });
  it("section switch closes the inspector and an open (unkept) filter", () => {
    const s = run(loaded(), { type: "open" }, { type: "filterOpen" }, { type: "filterSet", query: "x" }, { type: "sectionStep", delta: 1 });
    assert.equal(s.inspector, false);
    assert.equal(s.mode, "NORMAL");
    assert.equal(s.filter.projects, "");
  });
  it("route to a post selects its row and opens the reader", () => {
    const s = run(loaded(), { type: "route", route: parseRoute("/writings/always-against") });
    assert.equal(s.section, "notes");
    assert.equal(s.sel.notes, 2);
    assert.deepEqual(s.reader, { kind: "post", slug: "always-against" });
  });
  it("reader slug syncs when rows arrive later", () => {
    let s = initState({ route: parseRoute("/projects/swarm") });
    s = run(s, { type: "rows", section: "projects", rows: ["hyperion", "swarm"].map((x) => project(x)) });
    assert.equal(s.sel.projects, 1);
  });
  it("/cv selects the cv link; /about keeps the section", () => {
    let s = run(loaded(), { type: "route", route: parseRoute("/cv") });
    assert.equal(s.section, "links");
    assert.equal(s.rows.links[s.sel.links].id, "cv");
    s = run(s, { type: "route", route: parseRoute("/about") });
    assert.equal(s.section, "links");
    assert.equal(s.reader?.kind, "about");
  });
  it("404 sets ERR and tears 6 frames once", () => {
    const s0 = loaded();
    const s1 = run(s0, { type: "route", route: parseRoute("/nope") });
    assert.equal(s1.err, true);
    assert.deepEqual(effects(s0, s1), [{ type: "tear", frames: 6 }]);
    const s2 = run(s1, { type: "route", route: parseRoute("/writings") });
    assert.equal(s2.err, false);
  });
});

describe("open / yank", () => {
  it("projects: Enter opens the Inspector, Enter again pushes the dossier", () => {
    const s0 = loaded();
    const s1 = run(s0, { type: "open" });
    assert.equal(s1.inspector, true);
    assert.deepEqual(effects(s0, s1), []);
    const s2 = run(s1, { type: "open" });
    assert.deepEqual(effects(s1, s2), [{ type: "navigate", to: "/projects/hyperion", replace: false }]);
  });
  it("O opens the primary url in a new tab", () => {
    const s0 = loaded();
    assert.deepEqual(effects(s0, run(s0, { type: "open", newTab: true })), [
      { type: "open", url: "https://github.com/kygura/hyperion", newTab: true },
    ]);
  });
  it("notes: Enter pushes the post reader; Esc returns to /writings", () => {
    const s0 = run(loaded(), { type: "section", to: "notes" }, { type: "move", delta: 1 });
    const s1 = run(s0, { type: "open" });
    assert.deepEqual(effects(s0, s1), [{ type: "navigate", to: "/writings/100m", replace: false }]);
    const s2 = run(s1, { type: "route", route: parseRoute("/writings/100m") });
    const s3 = run(s2, { type: "escape" });
    assert.equal(s3.reader, null);
    assert.deepEqual(effects(s2, s3), [{ type: "navigate", to: "/writings", replace: true }]);
  });
  it("o/Enter in a Reader on the row it shows is a no-op; another row still opens", () => {
    const post = run(loaded(), { type: "route", route: parseRoute("/writings/100m") });
    assert.equal(run(post, { type: "open" }), post);
    const other = run(post, { type: "select", section: "notes", index: 0 }, { type: "open" });
    assert.deepEqual(effects(post, other), [{ type: "navigate", to: "/writings/thaumazein", replace: false }]);
    const dossier = run(loaded(), { type: "route", route: parseRoute("/projects/meridian") });
    const d1 = run(dossier, { type: "open" });
    assert.equal(d1, dossier);
    assert.equal(d1.inspector, false);
    const cv = run(loaded(), { type: "route", route: parseRoute("/cv") });
    assert.equal(run(cv, { type: "open" }), cv);
    // O (new tab) still works inside a Reader.
    assert.deepEqual(effects(post, run(post, { type: "open", newTab: true })), [{ type: "open", url: "/writings/100m", newTab: true }]);
  });
  it("links: cv.pdf opens in a new tab", () => {
    const s0 = run(loaded(), { type: "section", to: "links" }, { type: "move", delta: 3 });
    assert.deepEqual(effects(s0, run(s0, { type: "open" })), [{ type: "open", url: "/CV_NCA.pdf", newTab: true }]);
  });
  it("links: external opens, cv pushes, log switches section", () => {
    const s0 = run(loaded(), { type: "section", to: "links" });
    assert.deepEqual(effects(s0, run(s0, { type: "open" })), [{ type: "open", url: "https://github.com/kygura", newTab: false }]);
    const cv = run(s0, { type: "move", delta: 2 });
    assert.deepEqual(effects(cv, run(cv, { type: "open" })), [{ type: "navigate", to: "/cv", replace: false }]);
    const log = run(s0, { type: "edge", end: "last" }, { type: "open" });
    assert.equal(log.section, "log");
  });
  it("y yanks the email on links, the url elsewhere", () => {
    const s0 = run(loaded(), { type: "section", to: "links" });
    const s1 = run(s0, { type: "yank" });
    assert.deepEqual(effects(s0, s1), [{ type: "yank", text: "ncerratoanton@gmail.com" }]);
    assert.equal(s1.msg?.text, "yanked ncerratoanton@gmail.com");
    const n = run(loaded(), { type: "section", to: "now" }, { type: "yank" });
    assert.equal(n.msg?.text, "nothing to yank here");
  });
  it("log: Enter expands an entry, + more queues a page load", () => {
    let s = run(loaded(), { type: "section", to: "log" }, { type: "move", delta: 1 }, { type: "open" });
    assert.equal(s.expanded, "e1");
    s = run(s, { type: "open" });
    assert.equal(s.expanded, null);
    const m0 = run(s, { type: "edge", end: "last" });
    assert.deepEqual(effects(m0, run(m0, { type: "open" })), [{ type: "more" }]);
  });
});

describe("modes", () => {
  it("filter narrows rows, n/N step matches, Esc clears", () => {
    let s = run(loaded(), { type: "filterOpen" });
    assert.equal(s.mode, "FILTER");
    s = run(s, { type: "filterSet", query: "er" });
    assert.deepEqual(visibleIndices(s), [0, 1]);
    s = run(s, { type: "filterKeep" });
    assert.equal(s.mode, "NORMAL");
    s = run(s, { type: "filterStep", delta: 1 });
    assert.equal(s.sel.projects, 1);
    s = run(s, { type: "escape" });
    assert.equal(s.filter.projects, "");
    assert.equal(visibleIndices(s).length, 6);
  });
  it("filter moves the selection onto a visible row", () => {
    const s = run(loaded(), { type: "filterOpen" }, { type: "filterSet", query: "noted" });
    assert.equal(s.sel.projects, 5);
    assert.deepEqual(position(s), { index: 1, total: 1 });
  });
  it("command line: query, move, complete, run", () => {
    let s = run(loaded(), { type: "cmdOpen" }, { type: "cmdQuery", query: "thco" });
    assert.equal(s.mode, "CMD");
    assert.equal(commandResults(s)[0].command.name, "theme coldstar");
    s = run(s, { type: "cmdComplete" });
    assert.equal(s.cmd.query, "theme coldstar");
    const before = s;
    s = run(s, { type: "cmdRun" });
    assert.equal(s.mode, "NORMAL");
    assert.equal(s.palette, "coldstar");
    assert.deepEqual(effects(before, s), [{ type: "palette", palette: "coldstar" }, { type: "tear", frames: 2 }]);
  });
  it("Ctrl-k inside the command line keeps the query", () => {
    const s0 = run(loaded(), { type: "cmdOpen" }, { type: "cmdQuery", query: "them" });
    assert.equal(run(s0, { type: "cmdOpen" }), s0);
  });
  it("cmdMove wraps", () => {
    const s = run(loaded(), { type: "cmdOpen" }, { type: "cmdQuery", query: "motion" }, { type: "cmdMove", delta: -1 });
    assert.equal(s.cmd.index, 1);
  });
  it("unknown command: E492 in glitch plus a 2-frame tear", () => {
    const s0 = run(loaded(), { type: "cmdOpen" }, { type: "cmdQuery", query: "qqq" });
    const s1 = run(s0, { type: "cmdRun" });
    assert.deepEqual(s1.msg && { text: s1.msg.text, err: s1.msg.err }, { text: "E492: not an editor command: qqq", err: true });
    assert.deepEqual(effects(s0, s1), [{ type: "tear", frames: 2 }]);
  });
  it(":open <project> selects it and opens the Inspector", () => {
    const s = run(loaded(), { type: "section", to: "now" }, { type: "cmdOpen" }, { type: "cmdQuery", query: "open swarm" }, { type: "cmdRun" });
    assert.equal(s.section, "projects");
    assert.equal(s.sel.projects, 3);
    assert.equal(s.inspector, true);
  });
  it("only one overlay at a time; Esc unwinds", () => {
    let s = run(loaded(), { type: "help" });
    assert.equal(s.mode, "HELP");
    s = run(s, { type: "cmdOpen" });
    assert.equal(s.mode, "CMD");
    s = run(s, { type: "escape" });
    assert.equal(s.mode, "NORMAL");
  });
  it("Esc order: inspector before an applied filter", () => {
    let s = run(loaded(), { type: "filterOpen" }, { type: "filterSet", query: "e" }, { type: "filterKeep" }, { type: "open" });
    s = run(s, { type: "escape" });
    assert.equal(s.inspector, false);
    assert.equal(s.filter.projects, "e");
    s = run(s, { type: "escape" });
    assert.equal(s.filter.projects, "");
  });
  it("LOOK: enter, orbit, exit", () => {
    const s0 = loaded();
    const s1 = run(s0, { type: "look", on: true }, { type: "orbit", yaw: 5, pitch: 0, zoom: 0 }, { type: "escape" });
    assert.equal(s1.mode, "NORMAL");
    assert.deepEqual(effects(s0, s1), [
      { type: "look", on: true },
      { type: "orbit", yaw: 5, pitch: 0, zoom: 0 },
      { type: "look", on: false },
    ]);
  });
  it("INSERT via :sign; offline reports E: log offline", () => {
    const s = run(loaded(), { type: "sign" });
    assert.equal(s.mode, "INSERT");
    assert.equal(s.section, "log");
    const s2 = run(s, { type: "insertSubmit" });
    assert.deepEqual(effects(s, s2), [{ type: "submit" }]);
    assert.equal(run(s2, { type: "insertDone" }).mode, "NORMAL");
    const off = run(loaded({}, false), { type: "sign" });
    assert.equal(off.mode, "NORMAL");
    assert.deepEqual(off.msg && [off.msg.text, off.msg.err], ["E: log offline", true]);
  });
  it("BOOT: done persists once", () => {
    const s0 = loaded({ boot: true });
    const s1 = run(s0, { type: "bootDone" });
    assert.equal(s1.mode, "NORMAL");
    assert.deepEqual(effects(s0, s1), [{ type: "booted" }]);
    assert.deepEqual(effects(s1, run(s1, { type: "boot" })), [{ type: "boot" }]);
  });
});

describe("palette, motion, res, message", () => {
  it("palette switch tears only with motion on", () => {
    const s0 = loaded({ motion: false });
    assert.deepEqual(effects(s0, run(s0, { type: "palette", palette: "oxide" })), [{ type: "palette", palette: "oxide" }]);
  });
  it("m pins motion; the media query only applies when unpinned", () => {
    let s = run(loaded(), { type: "motionMedia", reduced: true });
    assert.equal(s.motion, false);
    s = run(s, { type: "motion" });
    assert.equal(s.motion, true);
    assert.equal(s.motionPinned, true);
    s = run(s, { type: "motionMedia", reduced: true });
    assert.equal(s.motion, true);
  });
  it(":res needs a sky", () => {
    const none = run(loaded(), { type: "gl", status: "none" }, { type: "res", h: 120 });
    assert.equal(none.msg?.text, "E: no sky");
    const s0 = run(loaded(), { type: "gl", status: "on" });
    assert.deepEqual(effects(s0, run(s0, { type: "res", h: 180 })), [{ type: "res", h: 180 }]);
  });
  it("msgClear only clears its own message", () => {
    const s = run(loaded(), { type: "msg", text: "a" });
    const seq = s.msg!.seq;
    const s2 = run(s, { type: "msg", text: "b" });
    assert.equal(run(s2, { type: "msgClear", seq }).msg?.text, "b");
    assert.equal(run(s2, { type: "msgClear", seq: s2.msg!.seq }).msg, null);
  });
  it(":fortune rerolls and shows 04 NOW", () => {
    const s = run(loaded(), { type: "fortune" });
    assert.equal(s.fortune, 1);
    assert.equal(s.section, "now");
  });
  it("effect queue is capped and sequenced", () => {
    let s = loaded();
    for (let i = 0; i < 40; i++) s = run(s, { type: "more" });
    assert.equal(s.fx.length, 32);
    assert.equal(s.fx[31].seq, s.seq);
    assert.equal(effectsSince(s, s.seq - 2).length, 2);
  });
});
