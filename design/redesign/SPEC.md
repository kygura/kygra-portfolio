# SPEC: apply the Sheet 01 design to the portfolio

## What this build does

Replaces the current "cartographic" visual system of the site with the Sheet 01 design (see `DESIGN-PROPOSAL.md` for the direction and `mock.html` for the look). It is a restyle, not a rewrite: routes, data loading, Notion sync, the guestbook backend, the terminal, and the hero's contour-field animation all stay. What changes is tokens, fonts, layout primitives, page composition, navigation chrome, and a keyboard layer.

## Stack

Unchanged: Vite, React 18, TypeScript, Tailwind, shadcn primitives, react-router, next-themes (class strategy, `.dark` on `<html>`), framer-motion where it still earns its place. No new dependencies.

## Scope

In:
- Palette tokens remapped to the Sheet palette (Hangar dark default, Codex paper light), four selectable accents via a `data-accent` attribute on `<html>`, persisted in localStorage.
- Fonts: Barlow Condensed (display), IBM Plex Mono (UI and short copy), Newsreader (long prose, italic marginalia). Instrument Serif removed.
- Layout primitives: plate, session heading, ledger table, title block, marginalia, key hints.
- Navigation rebuilt as the sheet top bar; a fixed key bar at the bottom on fine-pointer devices; a help overlay; a keyboard hook.
- Hero keeps the contour canvas, retinted; the name is reset in the display face with a title block.
- Home composition: hero, frontispiece plate with the manifesto, selected work catalogue, notes ledger.
- Every routed page restyled with the primitives.
- Generated SVG plates as a React component.
- Removal of components the brief rules out: custom cursor, scroll progress bar, page transition fade, magnetic nav, Lenis smooth scroll, paper grain, and dead code (SoundtrackPlayer, PostCell, MagneticButton, canvas-grid and project-tile CSS).

Out:
- Any change to `api/`, `scripts/`, `content/`, the Notion pipeline, Supabase schema, or the CV's content.
- Three.js. The hero stays canvas 2D.
- New pages or new data.

## Keyboard contract

Global, ignored while an input, textarea, or the terminal has focus, and ignored with modifier keys:

| Key | Action |
|---|---|
| `j` / `k` | scroll down / up by about a third of the viewport |
| `1` to `5` | go to Home, Writings, Software, Guestbook, CV |
| `g` | scroll to top |
| `t` | cycle accent (swordfish, session, hammerhead, gate) |
| `b` | toggle base (hangar / codex) |
| `?` | toggle the help overlay; `Esc` closes it |
| `:` | open the terminal (in addition to the existing Ctrl+K and backtick) |

The footer's `a` / `d` quote keys stay.

## Done definition

All of these pass from a clean checkout of the branch:

```
npm run typecheck
npm run lint        # no errors outside api/ (api/ has 20 pre-existing errors not in scope)
npm run build
npm test
```

And a headless Chromium screenshot of `/`, `/projects`, `/writings`, `/cv` at 1280 and 390 wide shows the Sheet layout with no horizontal overflow, the contour hero still animating, and the key bar present at 1280 only.
