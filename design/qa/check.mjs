#!/usr/bin/env node
// NULL ORRERY QA harness (design/SPEC.md 6.2 + 6.3).
//
//   bun run build && node design/qa/check.mjs            # starts `vite preview` on 127.0.0.1:4173 if nothing answers
//   BASE_URL=http://127.0.0.1:4173 node design/qa/check.mjs
//   node design/qa/check.mjs 1 7 9 static               # run a subset (check ids, `static`, `placeholders`)
//   QA_WORKERS=2 node design/qa/check.mjs                # fewer parallel browser contexts (default 4)
//
// Playwright comes from /opt/node-tools (override with PLAYWRIGHT_MODULE), browsers from /opt/pw-browsers.
// Screenshots go to design/qa/shots/ (gitignored). Exits 1 when any check fails.
// Google Fonts requests are answered with empty CSS so the run is hermetic (no network, no font console noise).
//
// DOM contract (ids/classes from design/mock/index.html; T4/T5 keep them):
//   #status StatusBar (#pal, #mot, #res, gl:none text) · #modeline · #stack left pane stack · .sec section panes
//   #skywrap + canvas#sky · .skyfb pre / #ascii no-WebGL fallback · #keybar · #boot · #cmd · #help
//   .row.sel selected row · .sw[data-p=<palette>] swatches · #reader Reader pane

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SHOTS = path.join(ROOT, "design/qa/shots");
const BASE = (process.env.BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const ONLY = new Set(process.argv.slice(2));
const want = (id) => ONLY.size === 0 || ONLY.has(String(id));

const ROUTES = [
  "/", "/projects", "/projects/hyperion", "/writings", "/writings/thaumazein", "/links",
  "/now", "/guestbook", "/cv", "/about", "/artifacts", "/does-not-exist",
];
const READER_ROUTES = new Set(["/projects/hyperion", "/writings/thaumazein", "/cv", "/about", "/does-not-exist"]);
const PALS = ["sodium", "phosphor", "oxide", "coldstar"];

const SEL = {
  status: "#status",
  modeline: "#modeline",
  stack: "#stack",
  sections: ".sec",
  skywrap: "#skywrap",
  sky: "canvas#sky",
  fallback: ".skyfb pre, #ascii",
  keybar: "#keybar",
  boot: "#boot",
  cmd: "#cmd",
  help: "#help",
  reader: "#reader",
  selRow: ".row.sel",
  pal: "#pal",
  motion: "#mot",
  res: "#res",
  swatch: (p) => `.sw[data-p="${p}"]`,
};

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
const NARROW = { width: 360, height: 740 };
// Readiness waits, not assertions: they return as soon as the condition holds. Parallel contexts share one
// SwiftShader GPU process, so under load the first paint after `load` can take several seconds (3s flaked).
const READY_MS = 15000;
const SKY_MS = 15000;
const STEP_MS = 3000;
const WORKERS = Math.max(1, Number(process.env.QA_WORKERS) || 4);

// ---------------------------------------------------------------- results

const results = [];
function record(check, route, ok, detail = "") {
  results.push({ check: String(check), route, ok: Boolean(ok), detail: String(detail).replace(/\s+/g, " ").slice(0, 140) });
}
async function guard(check, route, fn) {
  try {
    await fn();
  } catch (e) {
    record(check, route, false, (e && e.message ? e.message.split("\n")[0] : String(e)));
  }
}

const errorsByRoute = new Map();
const noteError = (route, text) => {
  if (!errorsByRoute.has(route)) errorsByRoute.set(route, []);
  errorsByRoute.get(route).push(text);
};

const slugOf = (route) => (route === "/" ? "root" : route.slice(1).replace(/[^a-z0-9-]+/gi, "_"));

// ---------------------------------------------------------------- server

async function reachable(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(1500) });
    return r.ok;
  } catch {
    return false;
  }
}

let server = null;
async function ensureServer() {
  if (await reachable(BASE + "/")) return;
  if (process.env.BASE_URL) throw new Error(`BASE_URL ${BASE} is not reachable`);
  if (!fs.existsSync(path.join(ROOT, "dist/index.html"))) throw new Error("dist/ missing: run `bun run build` first");
  const port = new URL(BASE).port || "4173";
  // vite's server.host is "::"; containers without IPv6 need an explicit IPv4 host.
  server = spawn("bun", ["run", "preview", "--port", port, "--host", "127.0.0.1", "--strictPort"], {
    cwd: ROOT,
    stdio: "ignore",
    detached: true,
  });
  for (let i = 0; i < 60; i++) {
    if (await reachable(BASE + "/")) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("vite preview did not start on " + BASE);
}
function stopServer() {
  if (server && server.pid) {
    try {
      process.kill(-server.pid);
    } catch {
      /* already gone */
    }
  }
}

// ---------------------------------------------------------------- browser helpers

const INIT = {
  skipBoot: () => {
    try {
      sessionStorage.setItem("no.booted", "1");
    } catch {
      /* ignore */
    }
  },
  noWebGL: () => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      if (/webgl/i.test(String(type))) return null;
      return get.call(this, type, ...rest);
    };
  },
  throwingStorage: () => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("blocked", "SecurityError");
      },
    });
  },
};

let browser;
async function openPage(route, { viewport = DESKTOP, mobile = false, reducedMotion = "no-preference", init = ["skipBoot"] } = {}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: mobile,
    hasTouch: mobile,
    reducedMotion,
  });
  await context.route(/fonts\.(googleapis|gstatic)\.com/, (r) =>
    r.fulfill({ status: 200, contentType: "text/css", body: "" }),
  );
  for (const name of init) await context.addInitScript(INIT[name]);
  const page = await context.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") noteError(route, `console: ${m.text()}`);
  });
  page.on("pageerror", (e) => noteError(route, `pageerror: ${e.message}`));
  await page.goto(BASE + route, { waitUntil: "load" });
  return { page, context };
}

async function ready(page) {
  await page.waitForSelector(SEL.status, { state: "visible", timeout: READY_MS });
}

/** Waits until the StatusBar reports the sky (res:<n>) or its absence (gl:none). */
async function skySettled(page) {
  await page.waitForFunction(
    (sel) => /res:\s*\d+|gl:none/i.test(document.querySelector(sel)?.textContent || ""),
    SEL.status,
    { timeout: SKY_MS },
  );
  await page.waitForTimeout(400);
}

/** Waits (up to STEP_MS) for a key/click to take effect; the caller still asserts the outcome. */
const until = (page, fn, arg) => page.waitForFunction(fn, arg, { timeout: STEP_MS }).catch(() => {});
const selChanged = ([sel, before]) => (document.querySelector(sel)?.textContent ?? null) !== before;
const pathIs = (re) => new RegExp(re).test(location.pathname);
const shown = (page, sel, state = "visible") => page.locator(sel).first().waitFor({ state, timeout: STEP_MS }).catch(() => {});

const visible = (page, sel) => page.locator(sel).first().isVisible().catch(() => false);
const text = (page, sel) => page.locator(sel).first().textContent({ timeout: STEP_MS }).catch(() => null);
const rect = (page, sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, bottom: r.bottom, right: r.right };
  }, sel);

const hex = (h) => {
  const s = h.trim().replace("#", "");
  const f = s.length === 3 ? [...s].map((c) => c + c).join("") : s.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
};
const cssVar = (page, name) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);

/** Open-sky region on desktop: right of the left stack, between the bars. */
async function skyClip(page) {
  const vp = page.viewportSize();
  const st = await rect(page, SEL.stack);
  const x = Math.min(vp.width - 64, Math.max(16, Math.round((st ? st.right : 0) + 16)));
  return { x, y: 32, width: vp.width - x - 16, height: vp.height - 32 - 48 };
}

async function skyPixels(page, clip) {
  const buf = await page.screenshot({ clip });
  const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, info };
}

function sample({ data, info }, step = 3) {
  const out = [];
  for (let y = 0; y < info.height; y += step) {
    for (let x = 0; x < info.width; x += step) {
      const i = (y * info.width + x) * 3;
      out.push([data[i], data[i + 1], data[i + 2]]);
    }
  }
  return out;
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// Palette tokens are read from the stylesheet, not duplicated here.
function paletteTokens() {
  const css = fs.readFileSync(path.join(ROOT, "src/styles/orrery.css"), "utf8");
  const out = {};
  const re = /:root(?:\[data-pal=["']?(\w+)["']?\])?\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const name = m[1] || "sodium";
    const toks = {};
    for (const t of m[2].matchAll(/--(bg|panel|rule|fg|dim|acc|acc2|glitch)\s*:\s*(#[0-9a-f]{3,8})/gi)) toks[t[1]] = hex(t[2]);
    if (Object.keys(toks).length) out[name] = { ...(out[name] || {}), ...toks };
  }
  return out;
}

/** Share of non-background sky pixels whose nearest palette-ramp color belongs to `pal`. */
function paletteShare(pixels, pal, tokens) {
  const bgs = PALS.map((p) => tokens[p]?.bg).filter(Boolean);
  const ramp = [];
  for (const p of PALS) for (const k of ["rule", "dim", "acc2", "acc", "fg"]) if (tokens[p]?.[k]) ramp.push([p, tokens[p][k]]);
  let total = 0;
  let mine = 0;
  for (const px of pixels) {
    if (bgs.some((b) => dist(px, b) < 20)) continue;
    let best = null;
    let bd = Infinity;
    for (const [p, c] of ramp) {
      const d = dist(px, c);
      if (d < bd) [bd, best] = [d, p];
    }
    total++;
    if (best === pal) mine++;
  }
  return { share: total ? mine / total : 0, total };
}

// ---------------------------------------------------------------- per-route scenarios

async function desktop(route) {
  const { page, context } = await openPage(route);
  try {
    if (want(1)) {
      await guard(1, route, async () => {
        await ready(page);
        await skySettled(page).catch(() => {});
        await page.screenshot({ path: path.join(SHOTS, `desktop-${slugOf(route)}.png`) });
        const st = await rect(page, SEL.stack);
        const bars = (await visible(page, SEL.status)) && (await visible(page, SEL.modeline));
        const canvas = await visible(page, SEL.sky);
        let lit = 0;
        if (canvas) {
          const bg = hex(await cssVar(page, "--bg"));
          const px = sample(await skyPixels(page, await skyClip(page)));
          lit = px.filter((p) => dist(p, bg) > 12).length / px.length;
        }
        const ok = st && st.x <= 17 && bars && canvas && lit > 0.002;
        record(1, route, ok, `stack.left=${st ? st.x.toFixed(0) : "none"} bars=${bars} canvas=${canvas} lit=${(lit * 100).toFixed(2)}%`);
      });
    }
    if (want(8) && (route === "/artifacts" || route === "/does-not-exist")) {
      await guard(8, route, async () => {
        if (route === "/artifacts") {
          await page.waitForTimeout(300);
          const p = new URL(page.url()).pathname;
          record(8, route, p === "/", `ends at ${p}`);
        } else {
          await ready(page);
          const body = (await page.textContent("body")) || "";
          const status = (await text(page, SEL.status)) || "";
          record(8, route, body.includes("E404") && /ERR/.test(status), `E404=${body.includes("E404")} status ERR=${/ERR/.test(status)}`);
        }
      });
    }
  } finally {
    await context.close();
  }
}

async function mobile(route) {
  const { page, context } = await openPage(route, { viewport: MOBILE, mobile: true });
  try {
    await guard(2, route, async () => {
      await ready(page);
      await skySettled(page).catch(() => {});
      await page.screenshot({ path: path.join(SHOTS, `mobile-${slugOf(route)}.png`), fullPage: true });
      const band = await rect(page, SEL.skywrap);
      const ratio = band ? band.w / band.h : 0;
      const bandOk = band && band.y <= 32 && band.x <= 0.5 && band.w >= MOBILE.width - 1 && Math.abs(ratio - 4 / 3) < 0.02;
      const kb = await rect(page, SEL.keybar);
      const kbOk = (await visible(page, SEL.keybar)) && kb && Math.abs(kb.bottom - MOBILE.height) <= 1;
      let stackOk;
      let stackInfo;
      if (READER_ROUTES.has(route)) {
        stackOk = await visible(page, SEL.reader);
        stackInfo = `reader=${stackOk}`;
      } else {
        const tops = await page.$$eval(SEL.sections, (els) =>
          els.filter((e) => e.getBoundingClientRect().height > 0).map((e) => [e.getBoundingClientRect().top, e.getBoundingClientRect().left]),
        );
        stackOk = tops.length >= 2 && tops.every((t, i) => i === 0 || (t[0] > tops[i - 1][0] && Math.abs(t[1] - tops[0][1]) < 1));
        stackInfo = `sections=${tops.length}`;
      }
      record(2, route, bandOk && kbOk && stackOk, `band=${band ? `${band.w.toFixed(0)}x${band.h.toFixed(0)}@${band.y.toFixed(0)}` : "none"} keybar=${Boolean(kbOk)} ${stackInfo}`);
    });
  } finally {
    await context.close();
  }
}

async function narrow(route) {
  const { page, context } = await openPage(route, { viewport: NARROW, mobile: true });
  try {
    await guard(3, route, async () => {
      await page.waitForTimeout(300);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      record(3, route, sw <= NARROW.width, `scrollWidth=${sw}`);
    });
  } finally {
    await context.close();
  }
}

async function reduced(route) {
  const { page, context } = await openPage(route, { reducedMotion: "reduce", init: [] });
  try {
    await guard(4, route, async () => {
      const bootEarly = await visible(page, SEL.boot);
      await ready(page);
      await skySettled(page);
      const bootLate = await visible(page, SEL.boot);
      const mot = (await text(page, SEL.motion)) || (await text(page, SEL.status)) || "";
      const clip = await skyClip(page);
      const a = await skyPixels(page, clip);
      await page.waitForTimeout(1000);
      const b = await skyPixels(page, clip);
      const same = a.data.equals(b.data);
      const ok = !bootEarly && !bootLate && /motion:off/i.test(mot) && same;
      record(4, route, ok, `boot=${bootEarly || bootLate} motion:off=${/motion:off/i.test(mot)} identical=${same}`);
    });
  } finally {
    await context.close();
  }
}

async function noWebGL(route) {
  const { page, context } = await openPage(route, { init: ["skipBoot", "noWebGL"] });
  try {
    await guard(5, route, async () => {
      await ready(page);
      await skySettled(page);
      const fb = await visible(page, SEL.fallback);
      const gl = /gl:none/i.test((await text(page, SEL.status)) || "");
      let usable;
      let why = "";
      if (READER_ROUTES.has(route)) {
        usable = await visible(page, SEL.reader);
      } else {
        const before = await text(page, SEL.selRow);
        // A one-row list cannot move (05 LOG offline holds only `+ sign`, A3): selection staying put is correct.
        const rows = await page.locator(".sec.on .row").filter({ visible: true }).count();
        await page.keyboard.press("j");
        if (rows > 1) await until(page, selChanged, [SEL.selRow, before]);
        else await page.waitForTimeout(150);
        const after = await text(page, SEL.selRow);
        const moved = rows === 1 ? before === after : before !== after;
        usable = (await visible(page, SEL.stack)) && before != null && after != null && moved;
        if (!usable) why = ` rows=${rows} sel=${JSON.stringify(before)}->${JSON.stringify(after)}`;
      }
      record(5, route, fb && gl && usable, `fallback=${fb} gl:none=${gl} usable=${usable}${why}`);
    });
  } finally {
    await context.close();
  }
}

// ---------------------------------------------------------------- single-route checks

async function keyboardSmoke() {
  const route = "/";
  const { page, context } = await openPage(route);
  try {
    await guard(7, route, async () => {
      await ready(page);
      // The key listener binds in a mount effect after first paint; the sky status is written by the same effect pass.
      await skySettled(page).catch(() => {});
      const steps = [];
      const s0 = await text(page, SEL.selRow);
      await page.keyboard.press("j");
      await until(page, selChanged, [SEL.selRow, s0]);
      const s1 = await text(page, SEL.selRow);
      steps.push(["j moves", s0 != null && s1 != null && s0 !== s1]);
      await page.keyboard.press("l");
      await until(page, pathIs, "^/writings$");
      steps.push(["l -> /writings", new URL(page.url()).pathname === "/writings"]);
      await page.keyboard.press("Enter");
      await until(page, pathIs, "^/writings/[^/]+$");
      await shown(page, SEL.reader);
      steps.push(["Enter -> /writings/<slug>", /^\/writings\/[^/]+$/.test(new URL(page.url()).pathname)]);
      await page.keyboard.press("Escape");
      await until(page, pathIs, "^/writings$");
      await shown(page, SEL.reader, "hidden");
      steps.push(["Esc -> /writings", new URL(page.url()).pathname === "/writings"]);
      await page.keyboard.press(":");
      await shown(page, SEL.cmd);
      steps.push([": opens cmd", await visible(page, SEL.cmd)]);
      await page.keyboard.press("Escape");
      await shown(page, SEL.cmd, "hidden");
      await page.keyboard.press("?");
      await shown(page, SEL.help);
      steps.push(["? opens help", await visible(page, SEL.help)]);
      const failed = steps.filter(([, ok]) => !ok).map(([n]) => n);
      record(7, route, failed.length === 0, failed.length ? `failed: ${failed.join(", ")}` : steps.map(([n]) => n).join(", "));
    });
  } finally {
    await context.close();
  }
}

async function palettes() {
  const route = "/";
  const tokens = paletteTokens();
  const { page, context } = await openPage(route);
  try {
    await guard(9, route + " keys", async () => {
      await ready(page);
      await skySettled(page);
      const clip = await skyClip(page);
      let prevBg = await cssVar(page, "--bg");
      const notes = [];
      let ok = true;
      for (const [key, pal] of [["2", "phosphor"], ["3", "oxide"], ["4", "coldstar"], ["1", "sodium"]]) {
        await page.keyboard.press(key);
        await until(page, (p) => (document.documentElement.dataset.pal || "sodium") === p, pal);
        await page.waitForTimeout(400);
        const attr = await page.evaluate(() => document.documentElement.dataset.pal || "");
        const bg = await cssVar(page, "--bg");
        const name = ((await text(page, SEL.pal)) || "").toUpperCase();
        const { share, total } = paletteShare(sample(await skyPixels(page, clip)), pal, tokens);
        await page.screenshot({ path: path.join(SHOTS, `palette-${pal}.png`) });
        const step = (attr === pal || (pal === "sodium" && attr === "")) && bg !== prevBg && name.includes(pal.toUpperCase()) && total > 0 && share >= 0.4;
        notes.push(`${key}:${pal}${step ? "" : `(attr=${attr || "-"} bg=${bg} name=${name.trim() || "-"} sky=${(share * 100).toFixed(0)}%/${total})`}`);
        ok = ok && step;
        prevBg = bg;
      }
      record(9, route + " keys", ok, notes.join(" "));
    });

    await guard(9, route + " swatches", async () => {
      await ready(page);
      const notes = [];
      let ok = true;
      let prevBg = await cssVar(page, "--bg");
      for (const pal of ["oxide", "phosphor", "coldstar"]) {
        const sw = page.locator(SEL.swatch(pal)).filter({ visible: true }).first();
        await sw.click({ timeout: STEP_MS });
        await until(page, (p) => document.documentElement.dataset.pal === p, pal);
        const attr = await page.evaluate(() => document.documentElement.dataset.pal || "");
        const bg = await cssVar(page, "--bg");
        const name = ((await text(page, SEL.pal)) || "").toUpperCase();
        const step = attr === pal && bg !== prevBg && name.includes(pal.toUpperCase());
        notes.push(`${pal}:${step ? "ok" : "fail"}`);
        ok = ok && step;
        prevBg = bg;
      }
      record(9, route + " swatches", ok, notes.join(" "));
    });

    await guard(9, route + " persist", async () => {
      await page.reload({ waitUntil: "load" });
      const attr = await page.evaluate(() => document.documentElement.dataset.pal || "");
      record(9, route + " persist", attr === "coldstar", `after reload data-pal=${attr || "-"}`);
    });
  } finally {
    await context.close();
  }

  await guard(9, route + " no-storage", async () => {
    const errsBefore = (errorsByRoute.get(route) || []).length;
    const { page: p2, context: c2 } = await openPage(route, { init: ["throwingStorage"] });
    try {
      // Errors from this context also count against the route in check 6.
      await ready(p2);
      await p2.waitForTimeout(300);
      const attr = await p2.evaluate(() => document.documentElement.dataset.pal || "");
      const bg = await cssVar(p2, "--bg");
      const sodiumBg = tokens.sodium?.bg;
      const bgOk = sodiumBg ? dist(hex(bg || "#000"), sodiumBg) < 1 : false;
      const errs = (errorsByRoute.get(route) || []).length - errsBefore;
      record(9, route + " no-storage", (attr === "" || attr === "sodium") && bgOk && errs === 0, `data-pal=${attr || "-"} --bg=${bg} errors=${errs}`);
    } finally {
      await c2.close();
    }
  });
}

async function debugKeys() {
  const route = "/";
  const { page, context } = await openPage(route);
  try {
    await guard(10, route, async () => {
      await ready(page);
      await skySettled(page);
      const before = await text(page, SEL.res);
      if (before == null) throw new Error("no #res in StatusBar");
      for (const k of ["[", "]", "\\"]) await page.keyboard.press(k);
      await page.waitForTimeout(300);
      const after = await text(page, SEL.res);
      record(10, route, before === after, `res ${before} -> ${after}`);
    });
  } finally {
    await context.close();
  }
}

// ---------------------------------------------------------------- static checks (no browser)

function walk(dir, exts, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, exts, out);
    else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}

const lineOf = (src, index) => src.slice(0, index).split("\n").length;

function staticBans() {
  const files = walk(path.join(ROOT, "src"), [".css", ".tsx"]);
  const rules = [
    ["border-radius", /(?:border-radius|borderRadius)\s*:\s*(?!["']?0(?:px)?["']?\s*[;,}!\n])[^;,}\n]+/g],
    ["box/text-shadow", /(?:box-shadow|text-shadow|boxShadow|textShadow)\s*:\s*(?!["']?none["']?\s*[;,}!\n])[^;,}\n]+/g],
    ["backdrop-filter", /backdrop-filter|backdropFilter/g],
    ["gradient", /(?<!repeating-conic-)\b(?:repeating-)?(?:linear|radial)-gradient/g],
    ["ease-in-out", /ease-in-out/g],
    ["lucide", /lucide/g],
    ["framer-motion", /framer-motion/g],
    ["banned font", /\b(?:Inter|Geist|Space Grotesk|Space Mono|JetBrains Mono)\b/g],
  ];
  const hits = Object.fromEntries([...rules.map(([n]) => [n, []]), ["hex color", []], ["repeating-conic-gradient", []]]);
  for (const f of files) {
    const rel = path.relative(ROOT, f);
    const src = fs.readFileSync(f, "utf8");
    for (const [name, re] of rules) for (const m of src.matchAll(re)) hits[name].push(`${rel}:${lineOf(src, m.index)}`);

    // Hex colors: allowed only inside the :root / :root[data-pal=...] token blocks of orrery.css.
    let scan = src;
    if (rel === path.join("src", "styles", "orrery.css")) {
      scan = src.replace(/:root(?:\[data-pal=[^\]]+\])?\s*\{[^}]*\}/g, (b) => b.replace(/[^\n]/g, " "));
    }
    for (const m of scan.matchAll(/#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![0-9a-zA-Z_-])/g)) {
      hits["hex color"].push(`${rel}:${lineOf(src, m.index)} ${m[0]}`);
    }

    // repeating-conic-gradient: only in the no-WebGL fallback rule.
    for (const m of src.matchAll(/repeating-conic-gradient/g)) {
      const open = src.lastIndexOf("{", m.index);
      const prevClose = src.lastIndexOf("}", open);
      const selector = f.endsWith(".css") ? src.slice(prevClose + 1, open) : "";
      if (!/nogl|skyfb|fallback/i.test(selector)) hits["repeating-conic-gradient"].push(`${rel}:${lineOf(src, m.index)}`);
    }
  }
  for (const [name, list] of Object.entries(hits)) {
    record("static", name, list.length === 0, list.length ? list.slice(0, 4).join(", ") + (list.length > 4 ? ` (+${list.length - 4})` : "") : `${files.length} files clean`);
  }
}

function placeholders() {
  const files = walk(path.join(ROOT, "src"), [""]);
  const re = /<PROJECT_|<NOTE_|<LINK_|<NOW_ITEM|<EMAIL>|<ROLE|<BIO|<HANDLE/g;
  const hits = [];
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    for (const m of src.matchAll(re)) hits.push(`${path.relative(ROOT, f)}:${lineOf(src, m.index)}`);
  }
  record("placeholders", "src/", hits.length === 0, hits.length ? hits.slice(0, 4).join(", ") : `${files.length} files clean`);
}

// ---------------------------------------------------------------- run

async function pool(tasks, n) {
  const queue = [...tasks];
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (queue.length) await queue.shift()();
    }),
  );
}

function printTable() {
  const order = (c) => (/^\d+$/.test(c) ? Number(c) : c === "static" ? 100 : 101);
  results.sort((a, b) => order(a.check) - order(b.check) || ROUTES.indexOf(a.route) - ROUTES.indexOf(b.route));
  const w = { check: 12, route: 26 };
  const line = (c, r, s, d) => `${c.padEnd(w.check)} ${r.padEnd(w.route)} ${s.padEnd(4)}  ${d}`;
  console.log(line("CHECK", "ROUTE", "RES", "DETAIL"));
  console.log("-".repeat(110));
  for (const r of results) console.log(line(r.check, r.route.slice(0, w.route), r.ok ? "PASS" : "FAIL", r.detail));
  const fail = results.filter((r) => !r.ok).length;
  console.log("-".repeat(110));
  console.log(`${results.length - fail} passed, ${fail} failed`);
  return fail;
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  if (want("static")) staticBans();
  if (want("placeholders")) placeholders();

  const browserChecks = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].some(want);
  if (browserChecks) {
    await ensureServer();
    process.env.PLAYWRIGHT_BROWSERS_PATH ||= "/opt/pw-browsers";
    const mod = process.env.PLAYWRIGHT_MODULE || "/opt/node-tools/node_modules/playwright/index.mjs";
    const { chromium } = await import(pathToFileURL(mod).href);
    browser = await chromium.launch({
      args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
    });
    try {
      const tasks = [];
      for (const route of ROUTES) {
        if (want(1) || want(6) || want(8)) tasks.push(() => desktop(route));
        if (want(2) || want(6)) tasks.push(() => mobile(route));
        if (want(3) || want(6)) tasks.push(() => narrow(route));
        if (want(4) || want(6)) tasks.push(() => reduced(route));
        if (want(5) || want(6)) tasks.push(() => noWebGL(route));
      }
      if (want(7) || want(6)) tasks.push(keyboardSmoke);
      if (want(9) || want(6)) tasks.push(palettes);
      if (want(10) || want(6)) tasks.push(debugKeys);
      await pool(tasks, WORKERS);
      if (want(6)) {
        for (const route of ROUTES) {
          const errs = errorsByRoute.get(route) || [];
          record(6, route, errs.length === 0, errs.length ? `${errs.length} error(s): ${errs[0]}` : "no console errors");
        }
      }
    } finally {
      await browser.close();
    }
  }
  // When a subset excluded some checks, drop their rows (they only ran as a side effect).
  if (ONLY.size) for (let i = results.length - 1; i >= 0; i--) if (!want(results[i].check)) results.splice(i, 1);
  return printTable();
}

let code = 1;
try {
  code = (await main()) ? 1 : 0;
} catch (e) {
  console.error(`check.mjs: ${e.message}`);
  code = 2;
} finally {
  stopServer();
}
process.exit(code);
