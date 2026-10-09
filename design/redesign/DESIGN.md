# DESIGN: Sheet 01 implementation brief

Read `DESIGN-PROPOSAL.md` for the direction and open `mock.html` for the look. This file maps the design onto the existing code. Implementers follow it; gaps go back to the lead, not to improvisation.

## 1. Tokens

Keep the existing token names so untouched CSS keeps working, and change their values. Add the new ones. All live in `src/styles/tokens.css`, imported first from `src/index.css`.

Base A, Hangar (default, `:root` and `.dark`):

```
--bg-primary:      #0f1114
--bg-secondary:    #171a1e
--bg-elevated:     #1d2126
--text-primary:    #e6dfcc
--text-secondary:  #8c8778
--draft-ink:       #b8976a      /* drafting ink: figure numbers, title blocks, dimension lines */
--rule:            #2b3037      /* 1px rules */
--border-subtle:   #2b3037
--border-muted:    #3a4048
--accent:          var(--accent-session)  /* overridden by data-accent, see below */
--accent-ink:      #0f1114      /* text on accent */
--accent-amber:    var(--accent)          /* legacy alias, keeps old CSS coherent */
--accent-terracotta: #d6392c              /* swordfish, fixed, for live/danger states */
--accent-sage:     #5a9d7c                /* hammerhead, fixed */
```

Base B, Codex paper (`.light` or `:root:not(.dark)` whichever next-themes produces; verify in `main.tsx`):

```
--bg-primary: #ece3cd  --bg-secondary: #e3d8bb  --bg-elevated: #f2ead6
--text-primary: #1b1a17  --text-secondary: #665f4c
--draft-ink: #7a5a2c  --rule: #c6b893  --border-subtle: #c6b893  --border-muted: #a8996f
--accent-ink: #ece3cd  --accent-terracotta: #b9281c  --accent-sage: #2f6d50
```

Accents, set by `html[data-accent="..."]`; default `session`:

| name | hangar | codex |
|---|---|---|
| swordfish | #d6392c | #d6392c |
| session | #e9b32b | #b9850e |
| hammerhead | #5a9d7c | #2f6d50 |
| gate | #5d7fd6 | #5d7fd6 |

`--accent` resolves to the active one. Tailwind's `accent` color token (hsl form in `tailwind.config.ts`) stays as is for shadcn; new code uses `var(--accent)` directly.

Legacy aliases (`--black`, `--cream`, `--yellow` and friends) are removed together with the CSS that used them.

## 2. Type

Google Fonts link in `index.html`: Barlow Condensed 500/700, IBM Plex Mono 400/500 plus italic 400, Newsreader 400/500 plus italic 400/500. Remove Instrument Serif.

Tailwind `fontFamily`: `display` = Barlow Condensed; `mono` = IBM Plex Mono; `body` and `serif` = Newsreader; `sans` = IBM Plex Mono.

Roles:
- Display (headlines, catalogue titles, session headings): Barlow Condensed 700, uppercase, letter-spacing .04em, line-height 1. Site h1 clamp(34px, 4.6vw, 60px). Catalogue row titles 20px.
- Chrome and short copy (nav, labels, tables, lists, footer, buttons, form fields): IBM Plex Mono 14px, line-height 1.55. Labels 11px uppercase, letter-spacing .12em.
- Long prose (post bodies, project overview, CV paragraphs, manifesto): Newsreader 18px, line-height 1.6, measure 64ch.
- Marginalia: Newsreader italic 18px in `--draft-ink`.

## 3. Primitives (`src/styles/primitives.css`)

Plain CSS classes, no Tailwind plugin. Names are the contract; pages compose them.

- `.sheet`: page wrapper. max-width 1240px, side gutter `var(--page-gutter)`, bottom padding leaves room for the key bar (`padding-bottom: 72px` on fine-pointer devices).
- `.plate`: a section. `border-top` and `border-bottom` 1px `--rule`. No background, no radius, no shadow.
- `.session`: section heading row. Flex, baseline aligned, gap 14px. Children: `.session__num` (11px uppercase `--draft-ink`, e.g. "Plate II", the roman numeral in `--accent`), `h2` (display 26px), `.session__hint` (11px `--text-secondary`, right aligned, flex 1 pushes it).
- `.ledger`: full-width table, border-collapse. `td` padding 12px 18px, `border-bottom` 1px `--rule`, last row no border. `td.ledger__fig` (11px `--draft-ink`, nowrap, tabular numerals), `td.ledger__title` (display title in a `b` block plus a muted one-liner in a `span`), `td.ledger__meta` (11px uppercase `--text-secondary`, nowrap, links without underline, hover `--accent`). Row hover tints with `color-mix(in srgb, var(--accent) 7%, transparent)`. Below 860px the meta column hides and the figure column stacks above the title.
- `.titleblock`: 4-column grid, `border-top` 1px `--rule`; cells `border-right` 1px `--rule`, padding 8px 10px, 11px; label in `b` as 10px uppercase `--draft-ink` on its own line.
- `.marg`: Newsreader italic 18px `--draft-ink`, max-width 34ch.
- `.eyebrow`: 11px uppercase letter-spacing .14em `--draft-ink`.
- `kbd`: mono 11px, 1px border `--text-secondary` with a 2px bottom, padding 0 5px, no radius, background `--bg-secondary`, margin-right 6px.
- `.keybar`: fixed bottom bar, `--bg-primary`, 1px `--rule` top, padding 6px 16px plus `env(safe-area-inset-bottom)`, 11px `--text-secondary`, items `white-space: nowrap`. Hidden on `(pointer: coarse)` and below 860px.
- `.help`: fixed overlay, backdrop `color-mix(in srgb, var(--bg-primary) 88%, transparent)`, centered `.help__box` (`--bg-secondary`, 1px `--draft-ink`, padding 24px 28px, max-width 520px) with a definition list of bindings.
- `.prose`: Newsreader long-form container (replaces `prose-minimal`): 18px, 1.6, 64ch, headings in display, code in mono on `--bg-secondary` with a 2px left rule in `--draft-ink`, images with a 1px `--rule` border and a mono caption, links underlined with `--draft-ink`, hover `--accent`.
- Links everywhere: `text-decoration: underline`, `text-decoration-color: var(--draft-ink)`, `text-underline-offset: 3px`; hover and focus-visible swap the underline to `--accent`. Focus ring: 2px solid `--accent`, offset 2px, never removed.
- Buttons: mono 12px uppercase, 1px border `--text-primary`, no radius, transparent; `.btn--primary` fills with `--accent` and `--accent-ink`. shadcn `Button` keeps working but new UI prefers these.

Remove from `index.css`: paper grain pseudo-element, `cursor: none`, all `canvas-*`, `project-tile*`, `project-tooltip*`, `project-visual*`, `manifesto__*` (rewritten), `.d/.d2/.df` keyframes, `smear`, `vtReveal` and the view-transition theme reveal. Keep `.hero*` rules (edited per section 5) and the `prose` markdown rules (renamed into `.prose`).

## 4. Navigation and keyboard layer

`src/components/Navigation.tsx`:
- Sticky top bar, `--bg-primary` when scrolled, 1px `--rule` bottom. No magnetism, no framer-motion.
- Left: stamp "N.CA" in display 20px uppercase letter-spacing .08em, then "SHEET · REV 2026" in 12px `--text-secondary` (hidden under 640px).
- Middle: nav items as `<kbd>n</kbd>LABEL` links, uppercase 12px letter-spacing .08em: 1 Home, 2 Writings, 3 Software, 4 Guestbook, 5 CV. Active item gets `--accent` text and the kbd border in `--accent`.
- Right: clock (unchanged logic, tabular numerals), base toggle button labelled HANGAR / CODEX (plain `setTheme`, no view transition), accent swatch button: a 12px square filled with `--accent`, title "Accent (t)", click cycles.

`src/hooks/useKeyboardNav.ts`: one `keydown` listener implementing the contract in `SPEC.md`. Export `ACCENTS`, `cycleAccent()`, `setAccent()` helpers that write `document.documentElement.dataset.accent` and localStorage key `accent` (reads wrapped in try/catch). Also exports a tiny `openHelp` state via a module-level event or a context; simplest acceptable: the hook returns `{ helpOpen, setHelpOpen }` and `Layout` renders `HelpOverlay`. Initial accent read happens once in `main.tsx` before render to avoid a flash.

`src/components/KeyBar.tsx`: renders the `.keybar` legend from the same binding table the help overlay uses (single source of truth, `src/lib/keybindings.ts`). Right side shows the current accent name.

`src/components/HelpOverlay.tsx`: `.help` with the binding table, closes on click, `Esc`, or `?`.

`Layout.tsx`: Navigation, main, Footer, KeyBar, HelpOverlay. Drops PageTransition. `App.tsx` drops SmoothScroll, CustomCursor, ScrollProgress; keeps TerminalHost. TerminalHost also opens on `:`.

Terminal (`Terminal.tsx`): keep behaviour; replace the three themed palettes with one that reads the tokens (bg `--bg-secondary`, text `--text-primary`, prompt `--accent`, rule `--rule`), mono, no blur, no radius. Delete the `theme` command and its localStorage key, or leave the command returning "one theme on this sheet". Keep it short.

Footer (`Footer.tsx`): becomes the colophon. Three columns on desktop, stacked on phones:
1. Status: a 8px `--accent` square, "building · last build {date from `import.meta.env.VITE_BUILD_DATE` or build time via `new Date().toISOString().slice(0,10)` at module load}", then a row of 88x31 badges drawn in CSS (`keyboard first`, `no tracking`, `built with vite`) in mono 9px uppercase.
2. The quote carousel, unchanged in behaviour, restyled: Newsreader italic 18px, prev/next as `<kbd>a</kbd> <kbd>d</kbd>` text controls, no framer-motion (a plain swap is fine).
3. Colophon: "Set in Barlow Condensed, IBM Plex Mono, Newsreader. Built with React and Vite. No analytics." plus links to GitHub and the guestbook.

## 5. Hero (`CartographicHero.tsx` and its CSS)

Keep the contour field, pointer ripples, scroll parallax, quality tiers. Change:
- Palette constants: DAY = bg [236,227,205], ink [27,26,23], accent [185,133,14]; NIGHT = bg [15,17,20], ink [230,223,204], accent [233,179,43]. The CSS variables it sets on its own element keep their local names (`--bg`, `--ink`, `--soft`, `--line`, `--vig`, `--accent`): they are scoped to `.hero` and do not collide with the global tokens. Read the active accent from `getComputedStyle(document.documentElement).getPropertyValue('--accent')` at theme change so the picker retints the contours; fall back to the constants.
- Name: Barlow Condensed 700 uppercase, clamp(72px, 16vw, 240px), line-height .9, keep the per-letter tracking-on-scroll mechanism. Eyebrow above it: "Fig. 1 — General arrangement" in `.eyebrow`. Tagline below in mono 14px `--text-secondary`.
- Title block: a `.titleblock` pinned to the bottom of the stage above the scroll cue, four cells: Drawn "N. Cerrato", Checked "—", Scale "1 : 1", Sheet "01". On phones the title block drops to two columns.
- Remove the vignette gradient. Keep the scroll cue but as text "scroll ↓" in 11px mono.
- Remove `cartoNameReveal` clip animation and `cartoFadeUp`; the hero is complete at rest.

## 6. Home (`Home.tsx`, `Manifesto.tsx`, new `Plate.tsx`)

Order inside `.sheet`:
1. Hero (full bleed, outside `.sheet`).
2. Frontispiece plate: two columns (1fr 1fr, stacks under 860px). Left: `<Plate name="switch" />` with the caption cell. Right: the manifesto text (existing paragraphs, blockquote, closer) set as `.prose` with the heading "On software craft" as a `.session` (Plate I). No typewriter, no in-view fades. Keep the CTA as a text link with `<kbd>3</kbd>`.
3. Session "Plate II · Selected work" with hint "full catalogue → /projects", then a `.ledger` of the six projects from `projectDossiers`: figure column `Fig. 2` onward, title and summary, meta = techStack first three joined with " · " plus links (repo, live) as labels.
4. Session "Plate III · Notes" with hint "all writings → /writings", a `.ledger` of the latest four posts from `useMarkdownPosts` (date | title + excerpt | first tag). Loading state: three rows with an em dash. Error: one row "notes unavailable".

`src/components/Plate.tsx`: `({ name: "gears" | "crank" | "switch" | "worm", className? })`. Imports the SVG files from `src/plates/*.svg?raw` and injects with `dangerouslySetInnerHTML` inside a `div.plate-img` (color `--draft-ink`; `.acc` strokes `--accent`; `.lbl` 9px mono fill `--draft-ink`). Copy the four SVGs from `design/redesign/plates/` into `src/plates/`. Each SVG already carries `role="img"` and an `aria-label`.

## 7. Pages

All pages render inside `.sheet` and start with a `.session` heading. The `( 01 — WRITINGS )` eyebrows go; the plate numeral carries that information.

- `/projects` (Projects.tsx): session "Catalogue"; `.ledger` with figure number (`Fig. n`), title linking to the detail page with the subtitle as the one-liner, meta = status + techStack first two + repo/live labels. No cards, no accent bar, no stagger.
- `/projects/:slug` (ProjectDetail.tsx): session with the figure number as `session__num`; h1 display 48px; `.titleblock` with Year, Status, Stack (joined), Links (as labels); then two columns (2fr 1fr, stack under 860px): `.prose` overview paragraphs left, a `<Plate name=...>` right chosen by index modulo four, plus a `.marg` note with the subtitle. Back link "← catalogue" as a kbd-hinted link above the session. Missing dossier state stays, restyled as a plate.
- `/writings` (Writings.tsx): session "Contents"; tag filter as a row of mono uppercase text links, active in `--accent`, no pills; `.ledger` rows: date (tabular) | title (display) + excerpt | readTime and up to two tags. Loading, error, empty states as single ledger rows.
- `/writings/:slug` (Post.tsx): two columns (176px margin column, 48px gap, 1fr), stack under 860px. Margin column, sticky on desktop: date, read time, tags, "← contents" link, each as a label/value pair in 11px. Main: h1 display 48px with `text-wrap: balance`, then the markdown body in `.prose` (existing renderers: CodeBlock, PostImage, Alert; keep them, retint to tokens). Fix the `inline` code detection: react-markdown v10 does not pass `inline`; treat code as inline when the `node` has no `className` starting with `language-` and the parent is not `pre`. Keep it to the minimal change that makes code spans inline again.
- `/artifacts` (Artifacts.tsx): session "Artifacts" and one `.plate` with a single ledger row "No figures filed yet."
- `/guestbook` (Guestbook.tsx): session "Guestbook" with hint "signed notes · newest first". The form becomes a `.titleblock`-styled row: Name cell, Note cell (textarea), Sign cell (button). Keep all logic (Supabase, optimistic insert, cooldown, counter, Ctrl+Enter). Entries as `.ledger` rows: date | name in display 18px + message in mono. Skeletons are ledger rows with em dashes. Load more as a text button with `<kbd>m</kbd>`? No: plain text button, no new key.
- `/cv` (CV.tsx): session "Curriculum"; header as a `.titleblock` (Location, Email, Web, GitHub); sections (Summary, Projects, Education, Skills, Languages) each a `.session` plus `.prose` or a two-column definition list in mono; the Download PDF control is a `.btn`. Content strings unchanged.
- 404 (NotFound.tsx): inside `Layout`; session "Sheet not found"; h1 "404" display; one line; link home with `<kbd>1</kbd>`.

## 8. Motion

Allowed: the hero field, the ripple on pointer, scroll parallax in the hero, hover underline swaps, the ledger row tint. Everything else is static. `prefers-reduced-motion` freezes the hero to a still frame (already implemented) and that is all it needs to do now.

## 9. Accessibility

Contrast on Hangar: bone on ink 13.9:1, text-secondary 5.1:1, draft ink 6.6:1, session accent 9.4:1. On Codex: text 14.6:1, text-secondary 5.6:1, draft ink 5.9:1, ochre accent 4.6:1 (large text and strokes only; body links stay in text color with an accent underline). Focus visible everywhere. Tables use real table markup with `scope` on headers where there are headers. The key bar is `aria-hidden`; the help overlay is a `role="dialog"` with a label and is reachable through a visible "?" button in the nav on touch devices.
