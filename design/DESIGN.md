# SMALL PRESS — design brief for kygra.*

## Concept

The site is a self-published periodical. Not a product, not a landing page: a numbered issue of a small-press catalogue that one person prints on a risograph in two inks (black and a hot red) on uncoated cream stock and mails out when they feel like it. Every page is a spread from that catalogue. Projects are listed the way a record label lists its back catalogue (number, title, year, format, availability); writing is listed like a table of contents; the about page is a colophon-length biography; the footer is an actual colophon. The page is set hard-left with a wide rag on the right, running heads in the margin like a bound book, rules instead of boxes, tabular lists instead of cards, and a thin layer of paper grain and ink misregistration that tells you a human ran it off a machine. Nothing is centered unless it is a title on a cover. There are no cards, no shadows, no gradients, no icons unless they are 88x31 badges.

## Type system

- Display: **Syne** (ExtraBold 800). Wide, blunt, slightly too much personality. Used by record labels and art collectives, never by SaaS. Headlines, project numbers, the masthead.
- Text: **Newsreader** (400/500, italic 400). An editorial serif with optical sizes; reads like a small-press journal, not a blog. All body copy, intros, post bodies.
- Meta: **IBM Plex Mono** (400/500). Typewriter edge, true tabular figures. Dates, tags, table columns, running heads, nav, footer, anything that behaves like data.

Scale (desktop / mobile): masthead 96/56px, h1 56/36px, h2 32/26px, h3 22/20px, body 19/17px at line-height 1.5, meta 13px at line-height 1.4, uppercase meta letter-spaced 0.08em. Measure for prose is 64ch. Headings are tight (-0.02em) and set in black with the loud ink as a 2px misregistered ghost behind them.

## Color tokens

Light ("paper"):
- --paper #F3EFE4 (cream uncoated stock)
- --ink #141311 (black ink, text)
- --ink-mute #6B665C (secondary text, 4.97:1 on paper)
- --loud #C1272D (the one red ink; links, numbers, rules of emphasis; 5.08:1 on paper)
- --loud-tint #F0D4D0 (red at low coverage, for highlights and marks)
- --rule #141311 (all rules are ink, 1px or 2px, never gray)
- --paper-2 #E9E2D0 (a second sheet, for inset blocks and table stripes)

Dark ("black paper", not slate):
- --paper #121110
- --ink #E8E2D4
- --ink-mute #A39D90 (7.4:1)
- --loud #FF5A4E (6.1:1 on black paper)
- --loud-tint #3A1A18
- --rule #E8E2D4
- --paper-2 #1C1A17

Dark mode is a second print run with white ink on black stock. Same layout, same grain. It follows prefers-color-scheme and can be forced with a toggle in the masthead.

## Layout grid

Desktop (≥900px): a page block of max 1180px pinned to the LEFT with 40px side gutters; it does not center. Inside, a two-column grid: a 176px margin column, 48px gutter, and a fluid main column. The margin column holds running heads, section numbers, dates and side notes (marginalia), sticky while the section scrolls. The main column holds everything else and sets prose at 64ch, so the right side of the page has air. Tables span the full main column.

Mobile (<900px): the margin column collapses above the main column as a one-line running head; marginalia become small caps labels above their section. Gutters go to 16px, the masthead wraps, tables become stacked rows where each row is a block with number and title on the first line and meta on the second. No horizontal scroll ever.

Every page starts with a Masthead (name, issue number, date, nav) and ends with a Colophon. A thin Ticker (marquee) runs under the masthead on the home page only.

## Pages

**Home.** Masthead with the name set very large in Syne and the issue line "No. 04 · Autumn 2026 · printed in two colours". Ticker with what is happening now. Then, in the main column, a short run of real prose (3–5 sentences, who this is and what they do; no tagline, no buttons). Below it a "Now" block in the margin column and a three-part front page in the main column: "Selected work" as an IndexTable (six rows: number, title, year, tags, repo/live links), "Recent writing" as a numbered list with dates, and "Elsewhere" as a plain list of links. Then a BadgeRow (88x31 slots), a WebringSlot, and the Colophon.

**Projects index.** Running head "Catalogue". A full IndexTable of every project, sorted newest first, with a filter row of tags set as plain text links (not pills). Each row: catalogue number (KY-012 style), title, year, format tag(s), status (live/archived/wip), links. Rows are 1px ruled; hovering tints the row with --loud-tint.

**Project page.** Running head shows the catalogue number and year in the margin, sticky. H1 title with misregistered ghost. A SpecTable immediately under it: two-column definition rows for Year, Stack, Role, Status, Repo, Live, License. Then prose (the write-up), then optional images set full-width of the main column with a 2px ink border and a mono caption, then a "Changelog" list with dates, then Prev/Next catalogue links as a ruled pair.

**Writing index.** Running head "Contents". A table of contents: number, title in Newsreader italic, date in mono, optional one-line standfirst. Grouped by year with the year as a margin heading. Posts come from Notion so the table reads whatever metadata exists; missing fields leave the column empty rather than breaking the grid.

**Post page.** Running head with the date and reading time. Title, standfirst in italic, a rule, then the post body at 64ch with drop-cap-free paragraphs, mono code blocks on --paper-2 with a 2px left ink rule, images bordered as on project pages, footnotes rendered as a numbered list at the end. "Synced from Notion on {date}" in mono at the bottom.

**About.** Running head "Colophon-length bio". One long column of prose with marginalia for dates (a short timeline in the margin column). A portrait, if any, is small, bordered, and sits in the margin column, never a hero. A "Now" block and a "Uses" list in ruled definition rows.

**Contact.** Running head "Correspondence". Email as a visible, copyable link set large in mono. A ruled list of every link (GitHub, Bandcamp, Are.na, Mastodon, RSS). A GuestbookSlot or ChangelogSlot: either a list of site changes with dates or a place for signed notes. No form by default.

## Interaction and motion

Links are always visibly links: --loud text, 1px underline with 2px offset in --loud; on hover the underline thickens to 2px and the text stays. Links inside tables are mono and uppercase. Headings that are links lose the underline and gain the ghost on hover. Table rows highlight with --loud-tint on hover and focus-within. Buttons do not exist; anything clickable is a link or a ruled text control.

The Ticker scrolls left continuously at ~40s per loop, pauses on hover, and duplicates its content for a seamless loop. The misregistration ghost shifts by 1px on hover of its heading, like the press jumping. Paper grain is a fixed full-viewport pseudo-element using an SVG turbulence filter at ~6% opacity in multiply blend (light) and screen (dark); it is purely decorative and ignored by assistive tech. There are no entrance reveals, no fades, no parallax. Under prefers-reduced-motion the ticker stops and renders as a static line, and the ghost does not move.

## Component boundaries

- **Masthead**: name, issue line, primary nav, theme toggle.
- **Ticker**: marquee of short items; accepts an array of strings.
- **RunningHeader**: margin-column sticky label (section name, number, date).
- **Marginalia**: small notes in the margin column beside a section.
- **PageGrid**: the two-column frame that places RunningHeader and content.
- **Prose**: typographic container for Newsreader body copy, code, images, footnotes.
- **IndexTable**: ruled catalogue table used for projects (desktop table, mobile stacked rows).
- **ContentsList**: numbered table of contents used for writing.
- **SpecTable**: definition rows (project specs, uses list).
- **TagLink**: plain mono uppercase link used for tags and filters.
- **LinkList**: ruled list of external links (Elsewhere, Contact).
- **NowBlock**: dated "now" note.
- **BadgeRow**: row of 88x31 slots with alt text.
- **WebringSlot**: prev / random / next ring links.
- **ChangelogSlot** / **GuestbookSlot**: dated entries.
- **PrevNext**: ruled pair of catalogue neighbours.
- **Colophon**: fonts, inks, stack, last updated, copyright-free statement, RSS link.
- **Grain**: the decorative paper layer (one element, aria-hidden).

## Accessibility

Contrast on light paper: ink 16.3:1, loud 5.08:1, ink-mute 4.97:1; all pass AA for body text, ink passes AAA. On black paper: ink 15.2:1, loud 6.1:1, ink-mute 7.4:1. Loud-tint is never used as a text color. Links are identifiable by underline, not color alone. Focus is a 2px solid --loud outline with 2px offset on every interactive element, never removed. Tables use real table markup with scope on headers; the mobile stacked variant keeps table semantics with display changes only. The ticker is aria-hidden and its content is also present in the NowBlock. Heading order is strict per page. Skip link to main is the first focusable element. Target size for links in tables is at least 24px tall through row padding. Grain and ghost text are aria-hidden and the ghost is a CSS text-shadow, not duplicated DOM text.

## Mapping to the existing site (added after the blind design pass)

The current app has these routes: `/`, `/projects`, `/projects/:slug`, `/writings`, `/writings/:slug`, `/artifacts`, `/guestbook`, `/cv`, and a 404. They map onto the brief as follows.

- `/` becomes the Front page: Masthead, Ticker, Marginalia with NowBlock, Prose intro, Selected work IndexTable, Recent writing ContentsList, Elsewhere LinkList, BadgeRow, WebringSlot, Colophon.
- `/projects` is the full Catalogue IndexTable; `/projects/:slug` is the project page with SpecTable, Notes, ChangelogSlot and PrevNext.
- `/writings` is the Contents page; `/writings/:slug` is the post page in Prose at 64ch with a RunningHeader.
- `/artifacts` becomes a second catalogue section for prints and non-software work, same IndexTable with a different format column.
- `/guestbook` keeps its own page and is linked from the Colophon; GuestbookSlot on the front page shows the latest three entries.
- `/cv` is set as a plain ruled document in Prose plus SpecTable rows; no new components.
- Components that leave: CustomCursor, MagneticButton, SmoothScroll, ScrollProgress, PageTransition, CartographicHero, SoundtrackPlayer, Terminal. They are the parts that read as generic AI-era portfolio tells.
