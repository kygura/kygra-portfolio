# SPEC: NULL ORRERY full pass

This document turns the approved mock (`design/mock/index.html`) and brief (`design/DESIGN.md`, including its
"Amendments (full pass)" section) into a production plan for the existing site. Where this spec and the brief
disagree, the amendments in DESIGN.md win, then this spec, then the original brief sections.

## 1. What ships

The whole public site is replaced by the NULL ORRERY console. Every existing route keeps working. The old visual
system (cartographic hero, manifesto scroll page, magnetic nav, custom cursor, smooth scroll, quote footer, day/night
toggle, floating terminal, shadcn components, Tailwind) is deleted, not hidden.

What the visitor gets:

- One persistent console shell on every route: StatusBar, Sky (three.js PS1 pipeline), left pane stack
  (HandleBlock, IndexRail, section pane, Now mini pane), floating Inspector, HudLayer, Modeline, CommandLine,
  HelpOverlay, PaletteSwitcher, mobile KeyBar, BootScreen.
- Five sections in the section pane: `01 PROJECTS`, `02 NOTES`, `03 LINKS`, `04 NOW`, `05 LOG` (guestbook).
- A **Reader** pane for long-form content: blog posts, project dossiers, the CV, the manifesto (`/about`) and 404.
- Palettes: all four from DESIGN §5 ship as CSS token sets (`:root` = SODIUM default, `[data-pal=phosphor|oxide|coldstar]`).
  The PaletteSwitcher ships in production: keys `1`-`4`, clickable swatches (StatusBar on desktop, KeyBar on mobile),
  `:theme sodium|phosphor|oxide|coldstar`. Choice persists per viewer in localStorage (try/catch), recolors UI and sky,
  fires the 2-frame tear, and shows in the StatusBar (`pal:SODIUM`).
- Mock debug controls removed: `[` `]` `\` keys, `ps1 on|off`, `scan on|off`. The `res 120|180|240` command stays
  (command only, no key), and the automatic resolution step-down stays.
- Real content everywhere. No bracketed placeholders remain.

Out of scope: light mode, new content authoring, changes to `api/` (Notion pipeline), changes to the YAML project
schema beyond what the UI reads, analytics.

## 2. Existing site survey (as of commit 28804f1)

| Area | Current state |
|---|---|
| Framework | React 18.3 + Vite 5 + TypeScript, `react-router-dom` 6 (BrowserRouter, lazy routes) |
| Styling | Tailwind 3 + shadcn/ui (`src/components/ui/*`, ~50 files) + 1471-line `src/index.css` + `src/App.css` |
| Motion libs | framer-motion, lenis, next-themes, lucide-react icons |
| Deploy | Vercel. `vercel.json`: `buildCommand: bun run build`, SPA rewrite `/(.*) -> /index.html`, `/api/*` serverless |
| Build | `bun run build` = `bun scripts/build-projects.ts && vite build` (YAML -> `src/lib/project-dossiers.ts`) |
| Scripts | `lint` (eslint .), `typecheck` (3 tsconfigs), `test` (node --test on `api/**/*.test.ts`) |
| Lockfiles | both `bun.lock` and `package-lock.json` (build uses bun) |
| Projects | 6 YAML dossiers in `content/projects/` (equilibria, hyperion, lexis, meridian, noted, swarm): title, subtitle, summary, description, overview[], repo, live, techStack[], status, year, accent |
| Writing | Notion -> Vercel Blob via `api/` (`/api/posts`, `/api/post/:slug`); 12 bundled markdown fallbacks in `src/posts/*.md`; `useMarkdownPosts` hook; tags via `postTagFallbacks` |
| Guestbook | Supabase table `guestbook` (id, name, message, created_at), realtime inserts, 280-char limit, 30s cooldown; disabled when `VITE_SUPABASE_*` missing |
| CV | Hard-coded in `src/pages/CV.tsx` (contact, summary, 4 project areas, education, skills, languages) + `public/CV_NCA.pdf` download |
| Manifesto | Hard-coded in `src/components/Manifesto.tsx` (heading, 3 paragraphs, blockquote, follow-up, closer) |
| Quotes | 54 quotes in `src/lib/consts.ts` (`QUOTES_ARRAY`, some with `<br>` + translation, CJK/Cyrillic/Arabic) shown in Footer, keys `a`/`d` |
| Artifacts | `/artifacts`, empty gallery placeholder, not in nav |
| Terminal | `Ctrl-k` / backtick floating terminal (`Terminal.tsx`, 530 lines) |
| Dead code | `SoundtrackPlayer.tsx` (unused), `graphics/*`, `useParallax`, `useTilt`, `MagneticButton`, `PostCell` |

## 3. Content mapping

| Old content (source) | New slot | Notes |
|---|---|---|
| Name / brand `N.CA`, `<title>` | HandleBlock `KYGRA` + `/ kygura /`; name line `nicolas cerrato anton / malaga` (dim, 12px); `<title>` `kygra / Nicolas Cerrato Anton` | Amendment A6 adds the name line |
| CV summary (focus areas) | HandleBlock role line: `software engineer / agentic systems, trading, protocols` | Derived wording, owner may edit in `src/content/site.ts` |
| Manifesto paragraphs | HandleBlock bio (<= 240ch, verbatim manifesto sentences: "I build software the way a cabinetmaker builds a chair: material first, ornament last. Tools to view and understand reality, never to replace it.") + full text in Reader at `/about` | Link `> manifesto` in HandleBlock; `:about` command |
| 6 project YAMLs | `01 PROJECTS` rows + 6 orbiting bodies | Row: name, year, lang |
| `project.title` | Row name, body HUD label, Inspector title | Truncate with `~` |
| `project.year` | Row year column, Inspector `year` | |
| `project.techStack[0]` | Row `lang` column (lowercased short code: TypeScript->ts, React->react... see 5.3) | Empty stack -> `--` |
| `project.techStack` | Inspector `stack` (comma list, truncated `~`) | |
| `project.subtitle` | Inspector `type` row (replaces the mock's `role` row) | |
| `project.status` | Inspector `status` (lowercase) | |
| `project.summary` | Inspector one-liner | |
| `project.repo` / `project.live` | Inspector `> src` / `> live` (omitted when absent) | `O` opens live, else src |
| `project.description` + `overview[]` | Reader dossier at `/projects/:slug`, Inspector `> dossier` (replaces `> writeup`) | |
| `project.accent` | Dropped from UI (palette tokens own all color) | Field stays in YAML |
| Posts (Notion API + `src/posts/*.md` fallback) | `02 NOTES` rows (date `YYYY-MM-DD`, title, `<n>m`) + Reader at `/writings/:slug` | Order: date desc (existing `sortPostsByDateDesc`) |
| Post tags | `/` filter matches title and tags; tags listed in Reader header | Tag chip bar dropped |
| Post excerpt | Not shown in rows; shown as dim lede in Reader header | |
| GitHub `github.com/kygura` | `03 LINKS` row `github ...... kygura` | |
| Email `ncerratoanton@gmail.com` | `03 LINKS` row `email ...... ncerratoanton@gmail.com`; `y` on links yanks the email | mailto: |
| CV page | `03 LINKS` row `cv ...... /cv` -> Reader CV; `cv.pdf ...... CV_NCA.pdf` -> `/CV_NCA.pdf` | Phone number stays unpublished (it is not rendered today) |
| LinkedIn (commented out in CV.tsx) | Not shown | Owner hid it |
| Guestbook link | `03 LINKS` row `log ...... guestbook` -> section 05 | |
| (no existing source) | `04 NOW`: status line, up to 3 items, `updated <date>` | Seeded from real data (active project statuses + location) in `src/content/site.ts`; owner should confirm wording |
| `QUOTES_ARRAY` | `04 NOW` "fortune" block (one random quote, `<br>` -> new line, translation line dim); `:fortune` rerolls | `a`/`d` keys dropped |
| Guestbook entries (Supabase) | `05 LOG` rows: date, name, message (truncated `~`; Enter expands inline); `+ sign` row and `:sign` open inline INSERT form; `+ more` row pages by 12 | Toasts become Modeline messages |
| `/artifacts` | Redirect to `/` | Empty page, not linked |
| Terminal (`Ctrl-k`, backtick) | CommandLine (`:` / `Ctrl-k`) | Backtick unbound |
| Day/night toggle | Replaced by the 4-palette switcher (all dark) | `next-themes` removed |
| Cartographic hero, custom cursor, smooth scroll, scroll progress, page transition, magnetic buttons, footer | Dropped, replaced by Sky + console | |
| 404 page | Reader `E404` + 6-frame sky tear + StatusBar `ERR` in `--glitch` | No `console.error` |

## 4. Routes (all existing URLs keep working)

| Path | Section | Reader | Notes |
|---|---|---|---|
| `/` | projects | - | Home |
| `/projects` | projects | - | |
| `/projects/:slug` | projects (body selected, camera retargets) | dossier | Unknown slug -> 404 Reader |
| `/writings` | notes | - | |
| `/writings/:slug` | notes (row selected) | post | Not found -> 404 Reader (replaces old redirect) |
| `/links` (new) | links | - | |
| `/now` (new) | now | - | |
| `/guestbook` | log | - | |
| `/cv` | links (cv row selected) | CV | |
| `/about` (new) | - (keeps current section, default projects) | manifesto | |
| `/artifacts` | - | - | `<Navigate to="/" replace>` |
| `*` | projects | 404 | |

URL is the source of truth for section and Reader. Section switches (`h`/`l`, IndexRail, tabs, `g`-chords) call
`navigate(sectionPath, { replace: true })`. Opening a Reader pushes. `Esc` in a Reader navigates to its section path.
`document.title` updates per route (`kygra / <post title>` etc.). `vercel.json` needs no change.

## 5. Stack and architecture

### 5.1 Decisions
- **Port into the existing Vite + React app.** Keep React 18, react-router 6, the YAML build step, the post hooks,
  the Supabase client and all of `api/`. One shell component mounts once and stays mounted across routes, so the
  Sky never re-initialises on navigation.
- **Plain CSS, no Tailwind.** The mock's stylesheet is the starting point (`src/styles/orrery.css`). Tailwind,
  PostCSS config, shadcn `components.json` and `src/components/ui/` are deleted.
- **three.js from npm, pinned exactly**: `"three": "0.160.0"`, `"@types/three": "0.160.0"` (dev). The Sky module is
  loaded with a dynamic `import()` so three lands in its own chunk (`manualChunks: { three: ["three"] }`); the panes
  render before it arrives. A failed import or failed WebGL context uses the CSS/ASCII fallback (`gl:none`).
- **Sky is imperative TS, not React.** `src/orrery/sky/` is a near-direct port of the mock's sky code into a class
  with the API from DESIGN §9 (`focus(id)`, `section(i)`, `setPalette(name)`, `setRes(h)`, `motion(on)`, `tear(n)`,
  `pointer(x,y)`, `dispose()`; the HUD reads body positions from `onFrame`). React talks to it through a ref. Ramp/fog colors are read
  from computed CSS custom properties (at init and on every `setPalette`), never hard-coded a second time.
- **HudLayer updates imperatively** (refs + `textContent`/`style` writes from the Sky's frame callback), never through
  React state per frame.
- **State**: one `useReducer` store + context (`src/orrery/state.ts`). No new state library. Pure logic (reducer,
  fuzzy match, chord parsing, content mapping) lives in alias-free `.ts` modules so `node --test` can run them.
- **No palette flash**: a tiny inline script in `index.html` `<head>` reads `no.pal` from localStorage (try/catch) and
  sets `document.documentElement.dataset.pal` before first paint. `palette.ts` owns the same key afterwards.
- **Mobile KeyBar at 360px** holds `[:]`, `[m]`, `[?]` and the four swatches (3-letter names as in the mock). If they
  do not fit in one 44px row at 360px, the swatches wrap to a second row; the page itself never scrolls sideways.
- **Fonts**: Google Fonts `<link>` in `index.html` for DotGothic16, Martian Mono (wdth 87.5, wght 400/600) and
  Silkscreen, replacing Instrument Serif / Newsreader / IBM Plex Mono.
- **Dependencies removed** (unused after the pass): framer-motion, lenis, next-themes, lucide-react, canvas-confetti,
  sonner, cmdk, vaul, embla-carousel-react, recharts, react-day-picker, input-otp, react-resizable-panels,
  react-hook-form, @hookform/resolvers, date-fns, @tanstack/react-query, all `@radix-ui/*`, class-variance-authority,
  clsx, tailwind-merge, tailwindcss-animate, tailwindcss, @tailwindcss/typography, autoprefixer, postcss,
  react-textarea-autosize, @types/canvas-confetti. Kept: react, react-dom, react-router-dom, react-markdown,
  remark-gfm, react-syntax-highlighter (+types), @supabase/supabase-js, zod, js-yaml, @notionhq/client,
  notion-to-md, @vercel/blob, @vercel/functions, sharp, @inquirer/prompts, caniuse-lite, lovable-tagger and all lint/TS tooling.
  Before removing any package, `rg` for it across `src api scripts content` to confirm it is unused.
- **Lockfile**: bun is canonical (Vercel runs `bun run build`). Delete `package-lock.json`; regenerate `bun.lock`
  with `bun install`.

### 5.2 File plan

Delete:
- `src/components/` except `CodeBlock.tsx`, `Alert.tsx`, `PostImage.tsx` (restyled and moved to `src/reader/`)
- `src/components/ui/`, `src/components/graphics/`, `src/hooks/use-toast.ts`, `src/hooks/use-mobile.tsx`,
  `src/hooks/useParallax.ts`, `src/hooks/useTilt.ts`, `src/lib/utils.ts`, `src/lib/consts.ts` (quotes move)
- `src/pages/` (all ten files; their content moves to `src/content/site.ts` and the Reader)
- `src/index.css`, `src/App.css`, `tailwind.config.ts`, `postcss.config.js`, `components.json`, `package-lock.json`

Keep (logic unchanged unless noted):
- `src/lib/projects.ts`, `src/lib/project-schema.ts`, `src/lib/project-dossiers.ts` (generated), `src/lib/supabase.ts`,
  `src/lib/postTagFallbacks.ts`, `src/hooks/useMarkdownPosts.ts`, `src/posts/*`, `content/*`, `scripts/*`, `api/*`, `public/*`

Create:
```
index.html                      fonts, title, meta, square pixel favicon (data-URI SVG, SODIUM #0c0b10 + #ffaa1f "K")
src/main.tsx                    no ThemeProvider; imports styles/orrery.css
src/App.tsx                     BrowserRouter + route table (section 4) -> <Console route=... />
src/styles/orrery.css           tokens (SODIUM on :root + 3 [data-pal] sets), panes, bars, rows, chips, inspector, help, cmd,
                                keybar, boot, reader prose, fallback, breakpoints 640/1024
src/content/site.ts             handle, name line, role, bio, links, now, manifesto, cv, quotes (typed data)
src/orrery/model.ts             pure: project/post/guestbook -> row view models, lang codes, date/readtime format, truncate(~)
src/orrery/fuzzy.ts             pure: subsequence match + highlight ranges
src/orrery/state.ts             pure reducer + action types (sections, selection, filter, modes, overlays, msg)
src/orrery/keys.ts              pure key -> action resolver (g-leader, 800ms timeout, mode rules) + useKeys hook
src/orrery/commands.ts          command table builder (pure) for CommandLine
src/orrery/routes.ts            pure: path <-> {section, reader, slug}
src/orrery/palette.ts           pure: palette names/order, storage key `no.pal`, safe get/set, applyPalette(root)
src/orrery/useGuestbook.ts      Supabase fetch/page/realtime/insert, cooldown; no toasts
src/orrery/*.test.ts            node --test unit tests for the pure modules above
src/orrery/sky/Sky.ts           three scene, PS1 pipeline, 5 regions, perf guard, visibility/IO pause
src/orrery/sky/shaders.ts       GLSL strings (snap, jitter, affine, gouraud, fog, post pass)
src/orrery/sky/textures.ts      procedural canvas textures
src/console/Console.tsx         shell: layout per breakpoint, store provider, sky ref, route sync, boot gating
src/console/{StatusBar,Modeline,HandleBlock,IndexRail,SectionPane,ProjectList,NoteList,LinkTable,
             NowBlock,LogPane,Inspector,HudLayer,CommandLine,HelpOverlay,KeyBar,KeyChip,BootScreen,
             SkyFallback,Pane,PaletteSwitcher}.tsx
src/reader/{Reader,PostReader,DossierReader,CvReader,AboutReader,NotFoundReader,CodeBlock,Alert,PostImage}.tsx
design/qa/check.mjs             Playwright QA script (section 6)
```

### 5.3 Lang codes
Map `techStack[0]`: TypeScript `ts`, JavaScript `js`, Python `py`, Solidity `sol`, Go `go`, Rust `rs`, C `c`,
React `tsx`, MapLibre GL JS `gl`; anything else becomes its first 4 letters, lowercased with non-letters stripped. An empty
stack gives `--`. This lives in `model.ts` with a test. Current data yields: hyperion `ts`, lexis `tsx`, meridian `gl`,
noted `tsx`, swarm `ts`, equilibria `--`.

## 6. Definition of done

### 6.1 Commands (all must exit 0, run from repo root)
```
bun install
bun run build          # includes build-projects; no TS/rollup errors
bun run lint           # 0 errors (warnings allowed)
bun run typecheck
bun run test           # api tests + src/orrery/*.test.ts (script glob extended)
bun run preview --port 4173 &   # then:
node design/qa/check.mjs        # BASE_URL defaults to http://localhost:4173
```
`check.mjs` imports Playwright from `/opt/node-tools/node_modules/playwright` (browsers in `/opt/pw-browsers`), and
writes screenshots to `design/qa/shots/` (gitignored). It exits non-zero on any failed assertion.

### 6.2 Visual and behavioural checks (automated in `check.mjs` unless marked manual)
For each route in `/`, `/projects`, `/projects/hyperion`, `/writings`, `/writings/thaumazein`, `/links`, `/now`,
`/guestbook`, `/cv`, `/about`, `/artifacts`, `/does-not-exist`:
1. **Desktop 1440x900**: screenshot; left stack is left-aligned (stack `left` <= 16px + 1), sky canvas present and
   non-blank (sampled pixels not all `--bg`), StatusBar and Modeline visible.
2. **Mobile 390x844**: screenshot; sky is a 4:3 band at the top, KeyBar visible at bottom, sections stacked.
3. **360x740**: `document.documentElement.scrollWidth <= 360` (no horizontal scroll).
4. **Reduced motion** (`reducedMotion: 'reduce'`): no BootScreen, StatusBar shows `motion:off`, two screenshots of the
   sky 1s apart are identical.
5. **No WebGL** (init script that makes `getContext('webgl'|'webgl2')` return null): fallback `<pre>` orrery visible,
   StatusBar shows `gl:none`, panes fully usable.
6. **Console**: zero `console.error` / `pageerror` events on every route and mode (404 included). Warnings from
   third-party fonts allowed.
7. **Keyboard smoke** at desktop: `j` moves selection, `l` switches to notes and URL becomes `/writings`, `Enter` on a
   note opens `/writings/<slug>`, `Esc` returns to `/writings`, `:` opens CommandLine, `?` opens help.
8. `/artifacts` ends at `/`. `/does-not-exist` shows `E404` and `ERR`.
9. **Palettes**: on `/` desktop, keys `1`-`4` each set `html[data-pal]`, change `--bg`, change the StatusBar name and
   change sampled sky pixels; screenshot each (`palette-<name>.png`). Clicking a swatch does the same. After reload the
   last choice persists. With localStorage throwing (init script), the page still loads on SODIUM with no errors.
10. Mock debug keys `[` `]` `\` do nothing (StatusBar `res:` unchanged).

Static bans (scripted grep in `check.mjs` over `src/` CSS/TSX, must find nothing): `border-radius` other than `0`,
`box-shadow`/`text-shadow` other than `none`, `backdrop-filter`, `linear-gradient`/`radial-gradient`, `ease-in-out`,
`lucide`, `framer-motion`, font names Inter/Geist/Space Grotesk/Space Mono/JetBrains Mono, hex colors outside the
palette token blocks in `orrery.css` (`:root` and `:root[data-pal=...]`) and the favicon. `repeating-conic-gradient` is allowed only in the no-WebGL fallback rule.

Manual (owner review, recorded in the final report): sky reads chunky and wobbly on desktop; 30fps cap holds on an
integrated GPU; the whole site is usable without a mouse; reading a long post in the Reader is comfortable.

### 6.3 Content completeness
`rg -n "<PROJECT_|<NOTE_|<LINK_|<NOW_ITEM|<EMAIL>|<ROLE|<BIO|<HANDLE" src` returns nothing.
All 6 projects, all posts (bundled fallback at minimum), CV sections and manifesto text are reachable.
