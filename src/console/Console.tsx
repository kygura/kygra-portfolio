// The persistent console shell (SPEC 5, DESIGN §3/§7/§8/§9). Mounted once for every route:
// the URL drives section + Reader, one reducer (orrery/state) owns the rest, and the effects it
// queues (navigation, clipboard, sky calls, boot) run here in order. The Sky is imperative and
// lives in a ref; the HUD is updated from its frame callback without React state.
import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { links as siteLinks, now as siteNow, quotes } from "../content/site";
import { useMarkdownPosts } from "../hooks/useMarkdownPosts";
import { projects } from "../lib/projects";
import { localFallbackSummaries } from "../posts/localFallback";
import { chipHit, useKeys } from "../orrery/keys";
import { linkRows, logRows, noteRows, nowRows, parseQuote, pickQuote, projectRows } from "../orrery/model";
import { BOOT_KEY, applyPalette, loadMotion, loadPalette, saveMotion, savePalette, session } from "../orrery/palette";
import { SECTIONS, docTitle, parseRoute, sectionIndex, type Section } from "../orrery/routes";
import { loadSky, type Sky } from "../orrery/sky/load";
import {
  commandResults,
  effectsSince,
  initState,
  reduce,
  selectedProject,
  visibleIndices,
  type Action,
  type Effect,
  type State,
} from "../orrery/state";
import { useGuestbook } from "../orrery/useGuestbook";
import Reader from "../reader/Reader";
import BootScreen from "./BootScreen";
import CommandLine from "./CommandLine";
import HandleBlock from "./HandleBlock";
import HelpOverlay from "./HelpOverlay";
import HudLayer, { type HudContext, type HudHandle } from "./HudLayer";
import IndexRail from "./IndexRail";
import Inspector from "./Inspector";
import KeyBar from "./KeyBar";
import LinkTable from "./LinkTable";
import LogPane, { type LogDraft } from "./LogPane";
import Modeline from "./Modeline";
import NoteList from "./NoteList";
import NowBlock from "./NowBlock";
import ProjectList from "./ProjectList";
import SectionPane from "./SectionPane";
import SkyFallback from "./SkyFallback";
import StatusBar from "./StatusBar";
import type { RowApi } from "./rows";

const PROJECT_ROWS = projectRows(projects);
const BODIES = projects.map((p) => p.slug);
const LABELS = projects.map((p) => p.title);
const BOOT_LINES = ["KYGRA-OS 0.9", "MEM 2048K OK", "CD-ROM ... OK", "LOADING SKY.DAT", `LOADING ORBITS [${projects.length}]`, "HANDSHAKE kygura"];
const MSG_MS = 3500;
const FLASH_MS = 133;
/** Boot panes in pop-in order (DESIGN §8 step 3): status, handle, index, section, now, modeline. */
const BOOT_PANES = 6;
/** Key actions after which the selected row takes focus (keeps Tab order and selection in sync). */
const FOCUS_ACTIONS = new Set<Action["type"]>(["move", "edge", "chord", "sectionStep", "filterStep"]);

const isDesktop = () => innerWidth >= 1024;
const isMobile = () => innerWidth < 640;
const prefersReduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function init(pathname: string): State {
  const m = loadMotion(prefersReduced());
  let s = initState({
    palette: loadPalette(),
    motion: m.motion,
    motionPinned: m.pinned,
    boot: session.get(BOOT_KEY) !== "1",
    route: parseRoute(pathname),
  });
  s = reduce(s, { type: "rows", section: "projects", rows: PROJECT_ROWS });
  s = reduce(s, { type: "rows", section: "notes", rows: noteRows(localFallbackSummaries) });
  s = reduce(s, { type: "rows", section: "links", rows: linkRows(siteLinks) });
  s = reduce(s, { type: "rows", section: "now", rows: nowRows(siteNow.items) });
  return { ...s, fx: [], seq: 0 };
}

function hit(el: Element) {
  el.classList.add("hit");
  setTimeout(() => el.classList.remove("hit"), FLASH_MS);
}

interface BootView {
  screen: boolean;
  lines: number;
  /** Panes revealed so far (0..BOOT_PANES). */
  shown: number;
  flash: number;
}
const BOOT_DONE: BootView = { screen: false, lines: BOOT_LINES.length, shown: BOOT_PANES, flash: -1 };
const BOOT_START: BootView = { screen: true, lines: 0, shown: 0, flash: -1 };

export default function Console() {
  const loc = useLocation();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(reduce, loc.pathname, init);
  const stateRef = useRef(state);
  stateRef.current = state;

  const posts = useMarkdownPosts().posts;
  const gb = useGuestbook();
  const gbRef = useRef(gb);
  gbRef.current = gb;
  const [draft, setDraft] = useState<LogDraft>({ name: "", msg: "" });
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const skyRef = useRef<Sky | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stackRef = useRef<HTMLElement>(null);
  const inspRef = useRef<HTMLElement>(null);
  const readerRef = useRef<HTMLElement>(null);
  const fpsRef = useRef<HTMLSpanElement>(null);
  const hudRef = useRef<HudHandle>(null);
  const secEls = useRef<Partial<Record<Section, HTMLElement | null>>>({});
  const hovRef = useRef(-1);
  const kbdFocus = useRef(false);
  const quiet = useRef(false);
  const ptr = useRef<{ section: Section; index: number } | null>(null);

  const inspOpen = state.inspector && !state.reader && state.section === "projects";
  const hudCtx = useRef<HudContext>({ sel: 0, hov: -1, section: "projects", insp: false, reader: false });
  hudCtx.current = {
    sel: state.sel.projects,
    hov: hovRef.current,
    section: state.section,
    insp: inspOpen,
    reader: Boolean(state.reader),
  };

  // ---------------------------------------------------------------- boot

  const [boot, setBoot] = useState<BootView>(() => (state.mode === "BOOT" ? BOOT_START : BOOT_DONE));
  const bootTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bootSky = useRef(1);
  const skyBoot = useCallback((v: number) => {
    bootSky.current = v;
    skyRef.current?.dissolve(v);
    skyRef.current?.constellations(v);
  }, []);
  const clearBoot = useCallback(() => {
    bootTimers.current.forEach(clearTimeout);
    bootTimers.current = [];
  }, []);
  const startBoot = useCallback(() => {
    clearBoot();
    const at = (ms: number, f: () => void) => bootTimers.current.push(setTimeout(f, ms));
    setBoot(BOOT_START);
    skyBoot(0);
    BOOT_LINES.forEach((_, i) => at(i * 30, () => setBoot((b) => ({ ...b, lines: i + 1 }))));
    at(500, () => setBoot((b) => ({ ...b, screen: false })));
    for (let k = 1; k <= 16; k++) at(500 + k * 37.5, () => skyBoot(k / 16));
    for (let j = 0; j < BOOT_PANES; j++) {
      at(1100 + j * 90, () => {
        setBoot((b) => ({ ...b, shown: j + 1, flash: j }));
        at(66, () => setBoot((b) => (b.flash === j ? { ...b, flash: -1 } : b)));
      });
    }
    at(1600, () => dispatch({ type: "bootDone" }));
  }, [clearBoot, skyBoot]);
  const endBoot = useCallback(() => {
    clearBoot();
    setBoot(BOOT_DONE);
    skyBoot(1);
    session.set(BOOT_KEY, "1");
  }, [clearBoot, skyBoot]);

  useEffect(() => {
    if (stateRef.current.mode === "BOOT") startBoot();
    return clearBoot;
  }, [startBoot, clearBoot]);

  const booting = state.mode === "BOOT";
  const bootHid = (i: number) => booting && boot.shown <= i;
  const bootFlash = (i: number) => booting && boot.flash === i;

  // ---------------------------------------------------------------- effects queued by the reducer

  const rowEl = useCallback((): HTMLElement | null => {
    const s = stateRef.current;
    return secEls.current[s.section]?.querySelector<HTMLElement>(".row.sel") ?? null;
  }, []);

  const run = useCallback(
    (e: Effect) => {
      const sky = skyRef.current;
      switch (e.type) {
        case "navigate":
          navigate(e.to, { replace: e.replace });
          break;
        case "open": {
          const url = new URL(e.url, window.location.origin);
          if (e.newTab) window.open(url.href, "_blank", "noopener");
          else window.location.assign(url.href);
          break;
        }
        case "yank": {
          const text = e.text.startsWith("/") ? window.location.origin + e.text : e.text;
          const blocked = () => dispatch({ type: "msg", text: `yanked ${e.text} (clipboard blocked: shown here)` });
          try {
            if (navigator.clipboard) navigator.clipboard.writeText(text).catch(blocked);
            else blocked();
          } catch {
            blocked();
          }
          break;
        }
        case "tear":
          sky?.tear(e.frames);
          break;
        case "palette":
          applyPalette(document.documentElement, e.palette);
          savePalette(e.palette);
          sky?.setPalette();
          break;
        case "motion":
          sky?.motion(e.on);
          if (e.persist) saveMotion(e.on);
          break;
        case "res":
          if (sky) {
            sky.setRes(e.h);
            dispatch({ type: "resReport", h: sky.res() });
          }
          break;
        case "look":
          if (!e.on) sky?.lookReset();
          sky?.invalidate();
          break;
        case "orbit":
          sky?.look(e.yaw, e.pitch, e.zoom);
          break;
        case "boot":
          startBoot();
          break;
        case "booted":
          endBoot();
          break;
        case "scroll": {
          // The Reader scrolls itself on desktop/tablet; on mobile it is part of the page.
          const el = readerRef.current?.querySelector<HTMLElement>(".rb");
          if (!el) break;
          const top = e.lines * (parseFloat(getComputedStyle(el).lineHeight) || 22);
          if (el.scrollHeight > el.clientHeight + 1) el.scrollBy({ top });
          else window.scrollBy({ top });
          break;
        }
        case "scrollEdge": {
          const el = readerRef.current?.querySelector<HTMLElement>(".rb");
          if (!el) break;
          if (el.scrollHeight > el.clientHeight + 1) el.scrollTo({ top: e.end === "top" ? 0 : el.scrollHeight });
          else readerRef.current?.scrollIntoView({ block: e.end === "top" ? "start" : "end" });
          break;
        }
        case "inspectorLink": {
          const links = [...(inspRef.current?.querySelectorAll<HTMLElement>(".lk a") ?? [])];
          const i = links.indexOf(document.activeElement as HTMLElement);
          links[Math.max(0, Math.min(links.length - 1, i + e.delta))]?.focus();
          break;
        }
        case "more":
          gbRef.current.more().then((r) => dispatch({ type: "msg", text: r.msg, err: !r.ok }));
          break;
        case "submit": {
          // Optimistic send (A3): close the form and let the entry appear at once. sign() is the one
          // checker (offline, cooldown, draft, write); on any failure the draft comes back and the form
          // reopens if the visitor is still on the log. Errors go to the Modeline.
          const d = draftRef.current;
          const say = (text: string, err: boolean) => dispatch({ type: "msg", text, err });
          const reopen = () => {
            setDraft((cur) => (cur.msg ? cur : d));
            const s = stateRef.current;
            // INSERT: the close above may not have rendered yet (sign() rejects a bad draft at once).
            if (s.section === "log" && (s.mode === "NORMAL" || s.mode === "INSERT") && !s.reader) dispatch({ type: "sign" });
          };
          setDraft({ name: d.name, msg: "" });
          dispatch({ type: "insertDone" });
          gbRef.current.sign(d.name, d.msg).then(
            (r) => {
              if (!r.ok) reopen();
              say(r.msg, !r.ok);
            },
            () => {
              reopen();
              say("E: log write failed", true);
            },
          );
          break;
        }
      }
    },
    [navigate, startBoot, endBoot],
  );

  const lastFx = useRef(0);
  useEffect(() => {
    for (const f of effectsSince(state, lastFx.current)) {
      lastFx.current = f.seq;
      run(f.effect);
    }
  }, [state, run]);

  // ---------------------------------------------------------------- URL, rows, preferences

  useEffect(() => {
    const route = parseRoute(loc.pathname);
    if (route.redirect) navigate(route.redirect, { replace: true });
    dispatch({ type: "route", route });
  }, [loc.pathname, navigate]);

  useEffect(() => {
    if (posts.length) dispatch({ type: "rows", section: "notes", rows: noteRows(posts) });
  }, [posts]);

  useEffect(() => {
    dispatch({ type: "rows", section: "log", rows: logRows(gb.entries, { online: gb.online, hasMore: gb.hasMore }) });
  }, [gb.entries, gb.online, gb.hasMore]);

  // A failed first read is retried whenever the visitor comes back to the log.
  useEffect(() => {
    if (state.section === "log" && !gbRef.current.online) void gbRef.current.more();
  }, [state.section]);

  useEffect(() => {
    applyPalette(document.documentElement, stateRef.current.palette);
    if (typeof matchMedia !== "function") return;
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => dispatch({ type: "motionMedia", reduced: mq.matches });
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    const root = document.documentElement.classList;
    root.toggle("rm", !state.motion);
    root.toggle("look", state.mode === "LOOK");
    root.toggle("nogl", state.gl === "none");
    root.toggle("reading", Boolean(state.reader));
  }, [state.motion, state.mode, state.gl, state.reader]);

  const msgSeq = state.msg?.seq;
  useEffect(() => {
    if (msgSeq == null) return;
    const t = setTimeout(() => dispatch({ type: "msgClear", seq: msgSeq }), MSG_MS);
    return () => clearTimeout(t);
  }, [msgSeq]);

  const [quote, setQuote] = useState(() => pickQuote(quotes.length));
  useEffect(() => {
    if (state.fortune) setQuote(pickQuote(quotes.length));
  }, [state.fortune]);

  // ---------------------------------------------------------------- sky

  useEffect(() => {
    let dead = false;
    const s0 = stateRef.current;
    loadSky(canvasRef.current as HTMLCanvasElement, {
      bodies: BODIES,
      motion: s0.motion,
      section: sectionIndex(s0.section),
      focus: selectedProject(s0)?.slug ?? null,
      stackRight: () => stackRef.current?.getBoundingClientRect().right ?? 0,
      onFrame: (ps) => hudRef.current?.frame(ps),
      onLost: () => {
        // GPU reset or context eviction: drop to the static fallback for the rest of the visit.
        const sky = skyRef.current;
        skyRef.current = null;
        sky?.dispose();
        dispatch({ type: "gl", status: "none" });
      },
      onStats: ({ fps, res }) => {
        if (fpsRef.current) fpsRef.current.textContent = `${fps}fps`;
        if (stateRef.current.res !== res) dispatch({ type: "resReport", h: res });
      },
    }).then((sky) => {
      if (dead) {
        sky?.dispose();
        return;
      }
      skyRef.current = sky;
      dispatch({ type: "gl", status: sky ? "on" : "none" });
      if (!sky) return;
      const s = stateRef.current;
      sky.motion(s.motion);
      sky.section(sectionIndex(s.section), true);
      sky.focus(selectedProject(s)?.slug ?? null, true);
      sky.dissolve(bootSky.current);
      sky.constellations(bootSky.current);
      if (s.err && s.motion) sky.tear(6);
      dispatch({ type: "resReport", h: sky.res() });
    });
    const onPtr = (e: PointerEvent) => skyRef.current?.pointer((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
    addEventListener("pointermove", onPtr);
    return () => {
      dead = true;
      removeEventListener("pointermove", onPtr);
      skyRef.current?.dispose();
      skyRef.current = null;
    };
  }, []);

  const focusSlug = selectedProject(state)?.slug ?? null;
  useEffect(() => {
    skyRef.current?.section(sectionIndex(state.section));
  }, [state.section]);
  useEffect(() => {
    skyRef.current?.focus(focusSlug);
  }, [focusSlug]);
  useEffect(() => {
    skyRef.current?.invalidate();
  }, [state.sel.projects, state.section, inspOpen, state.reader]);

  // The floating Inspector stays invisible until the next HUD frame docks it beside the body.
  useLayoutEffect(() => {
    const el = inspRef.current;
    if (!el || !inspOpen) return;
    if (isDesktop() && skyRef.current) {
      el.style.visibility = "hidden";
      skyRef.current.invalidate();
    } else el.style.visibility = "";
    if (isMobile()) el.scrollIntoView({ block: "nearest" });
  }, [inspOpen]);

  // ---------------------------------------------------------------- section switch: wipe, decode, mobile scroll

  const [oldSec, setOldSec] = useState<Section | null>(null);
  const [decode, setDecode] = useState<{ to: Section; n: number }>({ to: state.section, n: 0 });
  const prevSec = useRef<Section | null>(null);
  useEffect(() => {
    const prev = prevSec.current;
    prevSec.current = state.section;
    const el = secEls.current[state.section];
    if (!el) return;
    if (isMobile()) {
      if (!quiet.current && (prev !== null || state.section !== "projects")) el.scrollIntoView({ block: "start" });
      quiet.current = false;
      return;
    }
    quiet.current = false;
    if (prev === null || prev === state.section || !stateRef.current.motion) return;
    setOldSec(prev);
    setDecode((d) => ({ to: state.section, n: d.n + 1 }));
    let k = 1;
    el.style.clipPath = "inset(0 0 75% 0)";
    const t = setInterval(() => {
      k++;
      el.style.clipPath = k < 4 ? `inset(0 0 ${100 - 25 * k}% 0)` : "";
      if (k >= 4) {
        clearInterval(t);
        setOldSec(null);
      }
    }, 33);
    return () => {
      clearInterval(t);
      el.style.clipPath = "";
    };
  }, [state.section]);

  // ---------------------------------------------------------------- focus follows the keyboard

  const selKey = `${state.section}:${state.sel[state.section]}`;
  useEffect(() => {
    if (!kbdFocus.current) return;
    kbdFocus.current = false;
    const el = rowEl();
    if (!el) return;
    const ae = document.activeElement as HTMLElement | null;
    if (!ae || ae === document.body || ae.closest("[data-row]")) el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "nearest" });
  }, [selKey, rowEl]);

  const prevMode = useRef(state.mode);
  useEffect(() => {
    const p = prevMode.current;
    prevMode.current = state.mode;
    if (state.mode !== "NORMAL" || !["CMD", "HELP", "FILTER", "INSERT"].includes(p)) return;
    const ae = document.activeElement as HTMLElement | null;
    if (!ae || ae === document.body || ae.closest("#cmd,#help,.flt,#logf")) rowEl()?.focus({ preventScroll: true });
  }, [state.mode, rowEl]);

  // ---------------------------------------------------------------- Reader: focus, 404 swap, title

  // Opening a Reader moves focus into it; closing returns focus to the selected row.
  const readerKey = state.reader ? `${state.reader.kind}:${state.reader.slug ?? ""}` : null;
  const prevReader = useRef(readerKey);
  useEffect(() => {
    const was = prevReader.current;
    prevReader.current = readerKey;
    if (was === readerKey) return;
    if (readerKey) readerRef.current?.focus({ preventScroll: !isMobile() });
    else if (was) {
      const ae = document.activeElement as HTMLElement | null;
      if (!ae || ae === document.body) rowEl()?.focus({ preventScroll: true });
    }
  }, [readerKey, rowEl]);

  const notFound = useCallback(() => dispatch({ type: "route", route: { section: null, reader: "404", slug: null } }), []);
  const unknownDossier = state.reader?.kind === "dossier" && !state.rows.projects.some((p) => p.key === state.reader?.slug);
  useEffect(() => {
    if (unknownDossier) notFound();
  }, [unknownDossier, notFound]);

  const titleName =
    state.reader?.kind === "post"
      ? state.rows.notes.find((n) => n.key === state.reader?.slug)?.title
      : state.reader?.kind === "dossier"
        ? state.rows.projects.find((p) => p.key === state.reader?.slug)?.title
        : null;
  useEffect(() => {
    document.title = docTitle(state.section, state.reader, titleName);
  }, [state.section, state.reader, titleName]);

  const say = useCallback((text: string, err = false) => dispatch({ type: "msg", text, err }), []);

  // ---------------------------------------------------------------- keys + pointer

  const getState = useCallback(() => stateRef.current, []);
  const keyDispatch = useCallback((a: Action) => {
    kbdFocus.current = FOCUS_ACTIONS.has(a.type);
    dispatch(a);
  }, []);
  const onKey = useCallback((id: string) => {
    const s = stateRef.current;
    if (s.mode === "BOOT") return;
    document.querySelectorAll<HTMLElement>("[data-k]").forEach((c) => {
      if (chipHit(c.dataset.k ?? "", id, Boolean(s.pending))) hit(c);
    });
  }, []);
  useKeys({ getState, dispatch: keyDispatch, onKey });

  useEffect(() => {
    const down = (e: PointerEvent) => {
      if (stateRef.current.mode === "BOOT") {
        dispatch({ type: "bootDone" });
        return;
      }
      const b = (e.target as Element | null)?.closest?.("button,.chip,a");
      if (b) hit(b);
    };
    document.addEventListener("pointerdown", down, true);
    return () => document.removeEventListener("pointerdown", down, true);
  }, []);

  const api = useMemo<RowApi>(
    () => ({
      down(section, index) {
        const s = stateRef.current;
        ptr.current = s.section === section && s.sel[section] === index ? { section, index } : null;
      },
      click(section, index, e) {
        // Modified clicks keep native link behaviour (new tab, download).
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        kbdFocus.current = false;
        const s = stateRef.current;
        const was = ptr.current;
        ptr.current = null;
        const again =
          (was?.section === section && was.index === index) || (e.detail === 0 && s.section === section && s.sel[section] === index);
        if (section !== s.section) {
          quiet.current = true;
          dispatch({ type: "section", to: section });
        }
        dispatch({ type: "select", section, index });
        if (again || section === "links") dispatch({ type: "open" });
      },
      focus(section, index) {
        const s = stateRef.current;
        if (section !== s.section) {
          if (!isMobile()) return;
          quiet.current = true;
          dispatch({ type: "section", to: section });
        }
        if (s.sel[section] !== index) dispatch({ type: "select", section, index });
      },
      hover(index) {
        hovRef.current = index;
        hudCtx.current.hov = index;
        skyRef.current?.invalidate();
      },
    }),
    [],
  );

  // ---------------------------------------------------------------- render

  const go = useCallback((to: Section) => dispatch({ type: "section", to }), []);
  const toggleLook = useCallback(() => dispatch({ type: "look", on: stateRef.current.mode !== "LOOK" }), []);
  const openCmd = useCallback(() => dispatch({ type: "cmdOpen" }), []);
  const toggleHelp = useCallback(() => dispatch({ type: "help" }), []);
  const setPalette = useCallback((palette: State["palette"]) => dispatch({ type: "palette", palette }), []);

  const project = selectedProject(state);
  const r = state.reader;
  const readerProject = r?.kind === "dossier" ? (state.rows.projects.find((p) => p.key === r.slug) ?? null) : project;
  const readerNote = r?.kind === "post" ? (state.rows.notes.find((n) => n.key === r.slug) ?? null) : null;
  const q = quote >= 0 ? parseQuote(quotes[quote]) : null;

  const pane = (section: Section) => {
    const active = section === state.section;
    const vis = visibleIndices(state, section);
    const visible = new Set(vis);
    const sel = active ? state.sel[section] : -1;
    const query = state.filter[section];
    const props = { sel, visible, api };
    let list;
    let count = vis.length;
    const empty = query && !vis.length ? <p className="empty">-- no matches for /{query} --</p> : null;
    switch (section) {
      case "projects":
        list = <ProjectList rows={state.rows.projects} {...props} />;
        break;
      case "notes":
        list = <NoteList rows={state.rows.notes} {...props} />;
        break;
      case "links":
        list = <LinkTable rows={state.rows.links} {...props} />;
        break;
      case "now":
        list = <NowBlock rows={state.rows.now} quote={q} {...props} />;
        break;
      case "log":
        list = (
          <LogPane
            rows={state.rows.log}
            expanded={state.expanded}
            online={gb.online}
            loading={gb.loading}
            insert={state.mode === "INSERT"}
            draft={draft}
            onDraft={setDraft}
            onSend={() => dispatch({ type: "insertSubmit" })}
            onCancel={() => dispatch({ type: "insertDone" })}
            {...props}
          />
        );
        count = vis.filter((k) => state.rows.log[k]?.kind === "entry").length;
        break;
    }
    return (
      <SectionPane
        key={section}
        ref={(el) => {
          secEls.current[section] = el;
        }}
        section={section}
        active={active}
        old={oldSec === section}
        hidden={bootHid(3)}
        flash={active && bootFlash(3)}
        decode={decode.to === section ? decode.n : 0}
        count={count}
        query={query}
        filtering={state.mode === "FILTER"}
        empty={empty}
        onQuery={(query) => dispatch({ type: "filterSet", query })}
        onFilter={() => {
          if (!active) go(section);
          dispatch({ type: "filterOpen" });
        }}
        onHelp={toggleHelp}
      >
        {list}
      </SectionPane>
    );
  };

  return (
    <>
      <a className="skip" href="#secs">
        skip to sections
      </a>
      {booting && boot.screen && <BootScreen lines={BOOT_LINES} shown={boot.lines} />}

      <StatusBar
        section={state.section}
        look={state.mode === "LOOK"}
        palette={state.palette}
        motion={state.motion}
        res={state.res}
        gl={state.gl}
        err={state.err}
        hidden={bootHid(0)}
        fpsRef={fpsRef}
        onSection={go}
        onLook={toggleLook}
        onPalette={setPalette}
        onCmd={openCmd}
        onHelp={toggleHelp}
      />

      <div id="skywrap">
        <canvas
          id="sky"
          ref={canvasRef}
          hidden={state.gl === "none"}
          role="img"
          aria-label="low-poly orrery: project bodies orbiting a monolith"
        />
        {state.gl === "none" && <SkyFallback />}
        <HudLayer ref={hudRef} labels={LABELS} ctx={hudCtx} inspRef={inspRef} stackRef={stackRef} />
      </div>

      <main id="stack" ref={stackRef}>
        <HandleBlock hidden={bootHid(1)} flash={bootFlash(1)} />
        <IndexRail section={state.section} hidden={bootHid(2)} flash={bootFlash(2)} onSection={go} />
        <div id="secs" tabIndex={-1}>
          {SECTIONS.map(pane)}
        </div>
        <Inspector
          ref={inspRef}
          project={project}
          open={inspOpen && !booting}
          onOpen={() => dispatch({ type: "open" })}
          onClose={() => dispatch({ type: "inspector", on: false })}
        />
        {r && (
          <Reader
            ref={readerRef}
            reader={r}
            path={loc.pathname}
            project={readerProject}
            note={readerNote}
            onClose={() => dispatch({ type: "escape" })}
            onExternal={() => dispatch({ type: "open", newTab: true })}
            onMissing={notFound}
            say={say}
          />
        )}
        <section
          id="nowmini"
          className={`pane${bootHid(4) ? " hid" : ""}${bootFlash(4) ? " flash" : ""}`}
          aria-label="now"
        >
          <b>NOW</b>
          <span>{siteNow.status}</span>
          <span className="dim">..</span>
          <span className="dim">{siteNow.updated}</span>
        </section>
      </main>

      <CommandLine
        open={state.mode === "CMD"}
        query={state.cmd.query}
        index={state.cmd.index}
        results={commandResults(state)}
        onQuery={(query) => dispatch({ type: "cmdQuery", query })}
        onRun={(index) => dispatch({ type: "cmdRun", index })}
      />
      <Modeline state={state} hidden={bootHid(5)} />
      <KeyBar
        palette={state.palette}
        onCmd={openCmd}
        onMotion={() => dispatch({ type: "motion" })}
        onHelp={toggleHelp}
        onPalette={setPalette}
      />
      <HelpOverlay open={state.mode === "HELP"} onClose={() => dispatch({ type: "help", on: false })} />
    </>
  );
}
