# TASKS: NULL ORRERY full pass

Read `design/DESIGN.md` (including "Amendments (full pass)"), `design/SPEC.md` and `design/mock/index.html` before
starting any task. The mock is the visual reference. Port its CSS and sky code faithfully; do not redesign.
Each task ends with `bun run build && bun run lint && bun run typecheck && bun run test` green. Do not commit unless the
coordinator says to.

Order: T1 → (T2 ∥ T3) → T4 → T5 → T6.

---

## T1. Teardown and scaffold
- **Deps**: none
- **Lane**: logic
- **Model**: haiku (escalate to sonnet if the delete/import chain fights back)
- **Files**: `package.json`, `bun.lock`, delete `package-lock.json`, `index.html`, `vite.config.ts`,
  `src/main.tsx`, `src/App.tsx`, delete `tailwind.config.ts` / `postcss.config.js` / `components.json`,
  delete `src/index.css`, `src/App.css`, `src/components/**` (move `CodeBlock.tsx`, `Alert.tsx`, `PostImage.tsx` to
  `src/reader/` untouched for now, stripping lucide/sonner imports so they compile), `src/pages/**`, dead hooks/lib
  (SPEC 5.2), new `src/styles/orrery.css` (the four palette token blocks + font vars + base reset from the mock only),
  `.gitignore` (add `design/qa/shots/`).
- **Work**: remove the deps listed in SPEC 5.1 (grep each first); add `three@0.160.0` and `@types/three@0.160.0`
  exact; replace fonts/title/meta/favicon in `index.html` and add the pre-paint palette script; set
  `manualChunks: { three: ["three"] }`; extend the `test` script glob to `"api/**/*.test.ts" "src/**/*.test.ts"`. The
  route table from SPEC 4 renders a stub `<Console>` that prints the parsed route as plain text. Move the CV, manifesto
  and quotes data verbatim into `src/content/site.ts` before deleting their pages.
- **Done when**: the four commands pass; `bun run preview` serves every SPEC 4 route without a console error;
  `rg -l "lucide|framer-motion|tailwind|next-themes|@radix-ui" src package.json` finds nothing.

## T2. Console logic layer and QA harness
- **Deps**: T1
- **Lane**: logic
- **Model**: opus, medium
- **Files**: `src/content/site.ts` (complete: handle, name line, role, bio, links, now, fortune quotes, cv, manifesto),
  `src/orrery/{model,fuzzy,state,keys,commands,routes,palette,useGuestbook}.ts`, `src/orrery/*.test.ts`,
  `design/qa/check.mjs`.
- **Work**: pure reducer covering sections (5), per-section selection and filter, modes (NORMAL, FILTER, CMD, LOOK, INSERT,
  HELP, BOOT), inspector/reader flags, palette, motion (localStorage `no.motion` plus the media query), and the transient Modeline
  message. Key resolver for the full production keymap (DESIGN §7 + A1/A2/A3/A4): `g` leader with an 800ms timeout, and input-focus
  rules. Command table per A7, with subsequence fuzzy matching that returns highlight ranges. Route parse/build per SPEC 4.
  Row view models (lang codes per SPEC 5.3, `YYYY-MM-DD`, `<n>m`, `~` truncation). Guestbook hook: page 12, realtime insert,
  optimistic send, 30s cooldown, offline mode, errors returned as messages, nothing printed to the console. `check.mjs` implements every
  automated check in SPEC 6.2, plus the static bans and the placeholder grep from 6.3.
- **Done when**: `bun run test` runs at least 25 new assertions across model/fuzzy/state/keys/routes/palette and passes;
  `node design/qa/check.mjs` runs against the T1 stub, fails only on the visual assertions that need T3-T5 and prints a clear per-check table.

## T3. Sky port (three.js PS1 pipeline)
- **Deps**: T1 (can run in parallel with T2)
- **Lane**: visual
- **Model**: opus, medium
- **Files**: `src/orrery/sky/{Sky,shaders,textures}.ts`, `src/console/SkyFallback.tsx`, a temporary harness route
  `/__sky` (remove it in T4).
- **Work**: port the mock's sky into a TS class: every §6 object, the full pipeline, 30fps cap, the 12-frame retarget, the
  8-frame 72° section turn across **5 regions** (A3), Lissajous idle, pointer parallax, tear, perf step-down, `document.hidden`
  and IntersectionObserver pause, the reduced-motion single-frame mode, and `setPalette()` re-reading the CSS tokens. API per SPEC 5.1,
  including `project(id)` for the HUD and an `onFrame` callback. Drop the `ps1`/`scan` toggles and `res 360`. Import three as an
  npm module through a dynamic `import()`. If the import or the context fails, render the ASCII + Bayer fallback and report `gl:none`.
- **Done when**: `/__sky` at 1440x900 looks like `design/mock/shots/palette-*.png` for all four palettes; the 4:3 band at
  390 wide renders at 120px internal height; the reduced-motion screenshots 1s apart are identical; the no-WebGL init script shows the
  fallback with no errors; the `three` chunk is separate in `dist/assets`.

## T4. Console shell UI
- **Deps**: T2, T3
- **Lane**: visual
- **Model**: opus, medium
- **Files**: `src/console/*.tsx` (Console, Pane, StatusBar, Modeline, HandleBlock, IndexRail, SectionPane, ProjectList,
  NoteList, LinkTable, NowBlock, Inspector, HudLayer, CommandLine, HelpOverlay, KeyBar, KeyChip, BootScreen,
  PaletteSwitcher), `src/styles/orrery.css` (full port of the mock CSS), `src/App.tsx`.
- **Work**: build the persistent shell from SPEC 5 and DESIGN §3/§7/§8/§9 at all three breakpoints, using real content and the four
  palettes with swatches. Includes: the boot sequence (sessionStorage-gated, `:boot` replays it), the scanline wipe and title decode, KeyChip
  flash, the Inspector docking in 8px snaps with the leader line and reticle, LOOK mode, `y` yank, the HelpOverlay keymap generated from the T2
  keymap, and URL sync. Section `05 LOG` renders a placeholder pane here; T5 fills it. Remove `/__sky`.
- **Done when**: `check.mjs` passes checks 1-4, 6, 7, 9 and 10 for the section routes (`/`, `/projects`, `/writings`, `/links`,
  `/now`, `/guestbook`); desktop and mobile screenshots read as the mock with real content; no row shows a placeholder.

## T5. Reader, LOG and 404
- **Deps**: T4
- **Lane**: visual
- **Model**: opus, medium
- **Files**: `src/reader/*.tsx` (Reader, PostReader, DossierReader, CvReader, AboutReader, NotFoundReader, CodeBlock,
  Alert, PostImage), `src/console/LogPane.tsx`, `src/styles/orrery.css` (reader + log sections), `src/console/Console.tsx`.
- **Work**: Reader per A4 at all breakpoints, with markdown via react-markdown + remark-gfm. Restyle CodeBlock (palette-token syntax theme; copy
  reports `yanked code` in the Modeline), Alert and PostImage. Build the dossier, the CV (every section from the old page, plus `> cv.pdf`) and
  About (the full manifesto). LOG pane per A3, including the INSERT form. 404 per A4, with no `console.error`. Per-route
  `document.title`.
- **Done when**: `check.mjs` passes every check for every route in SPEC 6.2; a long post (`/writings/the-price-of-progress`)
  reads cleanly at 1440 and at 390 (screenshots); the LOG offline state shows when the `VITE_SUPABASE_*` vars are unset.

## T6. QA sweep and cleanup
- **Deps**: T5
- **Lane**: logic
- **Model**: opus, medium
- **Files**: any file touched above (fixes only), `design/qa/check.mjs`.
- **Work**: run the full SPEC 6 suite from a clean `bun install`. Fix any failures. Remove dead CSS selectors and unused exports
  (`rg` each `src/console`/`src/reader` export for references). Confirm the bundle has three in its own chunk and that no deleted dependency
  is still in `bun.lock`. Write a short QA summary for the coordinator, covering the commands run, the screenshot paths, and the manual checks
  left for the owner.
- **Done when**: every command in SPEC 6.1 exits 0, `check.mjs` shows all checks green, and the SPEC 6.3 grep is empty.
