# Notion → Blog Webhook Pipeline — Design

Date: 2026-05-31
Status: Approved (pending spec review)

## Problem

The blog's writings page shows no posts and throws a parsing error on the
writings index. Investigation found:

1. **Broken build.** Every file under `api/_lib/` was deleted from the working
   tree, but `api/notion/webhook.ts`, `api/notion/sync.ts`, `api/posts.ts`, and
   `api/post/[slug].ts` still import from it. The API cannot type-check or run, so
   `/api/posts` fails.
2. **Fallback crashes.** When the API fails, the frontend falls back to
   `src/posts/localFallback.ts`. That module throws during parsing, producing the
   "parsing error" on the writings index — a second failure stacked on the first.
3. **Wrong property names.** The previous extractor read `Date`, `Tags`, and
   `Description`. The real Notion database ("Publications") exposes `Title`,
   `Publication Date`, `Keywords`, and `Published`. Dates silently fell back to
   created-time and tags were always empty.
4. **Data-source ID.** The `@notionhq/client` v5 query API needs a data-source ID
   (`32d143f2-8260-8074-a5f6-000b8c4de005`), distinct from the database ID stored
   in env. The pipeline must resolve it correctly.

There are 9 published posts out of 27 pages, so the data exists — the failure is
entirely in the pipeline.

## Goals

- A clean, from-scratch pipeline. Do not resurrect the deleted `_lib` files.
- A runtime Notion webhook that receives page events and renders updates to the
  blog without a redeploy.
- A build-time fallback: a static snapshot of posts compiled into the JS bundle
  so the writings page always renders even if the API/Blob is unavailable.
- Faithful rendering of the author's Notion content (the part that was "failing
  to parse"), via a custom block renderer.

## Non-goals

- No Supabase or git-commit storage (runtime store is Vercel Blob).
- No CMS/admin UI. Notion remains the authoring surface.
- No migration of unrelated systems (projects pipeline is untouched).

## Architecture

```
Notion "Publications" DB
   │  page.created / page.properties_updated / page.content_updated /
   │  page.deleted / page.undeleted  (+ one-time verification handshake)
   ▼
POST /api/notion/webhook
   ├─ handshake: body has {verification_token} → echo + log (operator stores it)
   ├─ verify X-Notion-Signature == "sha256=" + HMAC_SHA256(verification_token, rawBody)  [timing-safe]
   ├─ parse event → entity.id (pageId)
   └─ dispatch → syncPageById(pageId)
        1. retrieve page; confirm it belongs to our data source
        2. extract metadata: Title, slug, Publication Date, Keywords→tags, Published
        3. if unpublished / trashed / not-found → delete post + manifest + index; return
        4. fetch ALL blocks recursively (blocks.children.list, paginated)
        5. render blocks → markdown (custom renderer)
        6. download Notion-hosted images → re-upload to Blob (stable URLs) → rewrite md
        7. write posts/<slug>.md; upsert posts-manifest.json; write index/<pageId>.json
   ▼
Vercel Blob:  posts/<slug>.md · posts-manifest.json · index/<pageId>.json
   ▲                                       ▲
GET /api/post/[slug]                   GET /api/posts (manifest, sorted)
   ▲                                       ▲
src/hooks/useMarkdownPosts → fetch API; on ANY failure → bundled localFallback (never throws)
   ▲
Build time: scripts/sync-notion-posts.ts → same lib → writes src/posts/*.md + regenerates localFallback.ts
```

Two independent guarantees:
- **Live path:** webhook → Blob → API → frontend.
- **Static path:** build-time snapshot baked into the bundle; used whenever the
  live path fails. It must never throw at import time.

## Module layout

Fresh modules replace the deleted `_lib`. Each has one responsibility and a small,
testable surface.

| File | Responsibility |
|---|---|
| `content/posts.ts` | Shared zod schemas, types, and helpers: `normalizeSlug`, `estimateReadTime`, `createExcerpt`, `markdownToPlainText`, `sortPostsByDateDesc`. Reused, lightly trimmed. |
| `api/_lib/env.ts` | Central env getters. Resolves data-source ID: prefer `NOTION_DATA_SOURCE_ID`; else derive from `NOTION_DATABASE_ID` by retrieving the database and reading `data_sources[0].id` (cached per process). Blob token: `BLOB_READ_WRITE_TOKEN` ?? `NOTION_SYNC_READ_WRITE_TOKEN`. |
| `api/_lib/notion/client.ts` | `getNotionClient()` factory. |
| `api/_lib/notion/metadata.ts` | `extractPostMetadata(page)` → `{pageId, title, slug, excerpt, date, tags, published, createdTime, lastEditedTime}`. Uses real property names; prefers optional `Slug`/`Description` if present, else auto-derives. |
| `api/_lib/notion/blocks.ts` | `fetchAllBlocks(blockId)` — recursive, paginated `blocks.children.list`; attaches children to each block. |
| `api/_lib/notion/richtext.ts` | `renderRichText(richText[])` → markdown string (bold, italic, strikethrough, inline code, links, inline equations), with correct annotation nesting. |
| `api/_lib/notion/render.ts` | `renderBlocksToMarkdown(blocks)` → markdown. Handles every supported block type; groups list items; maps callouts to GFM alerts. |
| `api/_lib/notion/images.ts` | `processImages(markdown, slug)` — find Notion/S3 image URLs, download, optionally compress with `sharp`, upload to Blob with content-hash filenames, rewrite markdown to Blob URLs; returns kept pathnames. `deletePostImages(slug)`. |
| `api/_lib/store.ts` | Blob persistence: `getPostPath`, `readPost`, `writePost`, `deletePost`, `readManifest`, `upsertManifestEntry`, `removeManifestEntry`, `writeManifest`, `readIndex`, `writeIndex`, `deleteIndex`, `listIndex`, plus `serializeFrontmatter`/`parseFrontmatter`. |
| `api/_lib/sync.ts` | Orchestration: `syncPageById(pageId)`, `fullSync()`, `deletePost(pageId, fallbackSlug)`. Handles slug changes (delete old slug's blob/manifest/images) and duplicate-slug detection. |
| `api/notion/webhook.ts` | POST handler: handshake, signature verification, event parsing, dispatch. |
| `api/notion/sync.ts` | POST handler: Bearer-auth (`NOTION_SYNC_TRIGGER_SECRET`) → `fullSync()`. |
| `api/posts.ts` | GET → `readManifest()` sorted, with cache headers. |
| `api/post/[slug].ts` | GET → `readPost(slug)` → `{...summary, content}` or 404. |
| `scripts/sync-notion-posts.ts` | Build-time: run `fullSync()`-equivalent against Notion, write `src/posts/<slug>.md`, regenerate `src/posts/localFallback.ts`. Reuses the lib. |
| `src/posts/localFallback.ts` | Generated snapshot. Parses bundled `?raw` markdown defensively; **never throws at import**; skips malformed files. |

`api/notion/index.ts` re-exports the webhook handler so the function also responds
at `/api/notion`. Canonical webhook URL: `/api/notion/webhook`.

## Custom renderer coverage

Rich text (`richtext.ts`): bold `**`, italic `_`, strikethrough `~~`, inline code
`` ` ``, links `[text](url)`, inline equation `$…$`. Annotations combine in a
stable order; code text is not further escaped.

Blocks (`render.ts`):
- `paragraph`, `heading_1/2/3`
- `bulleted_list_item`, `numbered_list_item` — consecutive items grouped; nested
  children indented two spaces per level
- `to_do` — `- [ ]` / `- [x]`
- `toggle` — rendered as `<details><summary>…</summary>…</details>`
- `quote` — `> …` (children flattened into the quote)
- `callout` — mapped to a GFM alert (`> [!NOTE]` / `[!TIP]` / `[!WARNING]` /
  `[!IMPORTANT]` / `[!CAUTION]`) chosen from the callout emoji; default `[!NOTE]`.
  `Post.tsx` already renders these alerts.
- `code` — fenced block with language
- `divider` — `---`
- `image` — `![alt](url)`; caption appended as italic line if present
- `bookmark`, `embed`, `video`, `file`, `pdf`, `link_preview` — rendered as a
  markdown link (caption/title as text)
- `equation` — block `$$…$$`
- `table` + `table_row` — GFM table (first row as header)
- `column_list` / `column` — children flattened in order
- `synced_block`, `child_page`, `child_database`, unknown types — children
  rendered if present; otherwise skipped without error

Blocks with `has_children` are fetched recursively in `blocks.ts` so the renderer
always has the full tree.

## Metadata extraction

From the real "Publications" schema:
- `title` ← `Title` (title)
- `date` ← `Publication Date` (date.start); fallback `created_time`
- `tags` ← `Keywords` (multi_select names)
- `published` ← `Published` (checkbox)
- `slug` ← normalized optional `Slug` rich_text if present, else normalized title
- `excerpt` ← optional `Description` rich_text if present, else first ~220 chars
  of rendered content

Auto-derive is the default; optional `Slug`/`Description` are honored only if the
author adds them later. Renaming a title changes the slug; the old slug's blob,
manifest entry, and images are cleaned up by `sync.ts` slug-change handling.

## Webhook verification

Notion's subscription flow sends a one-time `POST` with body
`{ "verification_token": "<token>" }` and no signature. The handler detects this
shape, returns `200` echoing the token, and logs it so the operator can set
`NOTION_WEBHOOK_VERIFICATION_TOKEN`.

Subsequent events include header `X-Notion-Signature: sha256=<hex>` where the hex
is `HMAC_SHA256(verification_token, rawBody)`. The handler recomputes it over the
**raw** request body and compares with `crypto.timingSafeEqual`. Mismatch → `401`.

Event handling:
- Supported types: `page.created`, `page.properties_updated`,
  `page.content_updated`, `page.deleted`, `page.undeleted`.
- Unsupported types → `200 {ignored:true}` (no retry).
- Missing `entity.id` → `200 {ignored:true}`.
- Sync failure → `500` so Notion retries (honors `attempt_number`).
- Sync is idempotent: writing by slug overwrites; delete is safe if absent.

## Read endpoints

- `GET /api/posts` → `readManifest()` → `sortPostsByDateDesc` → JSON array of
  summaries. `Cache-Control: s-maxage=300, stale-while-revalidate=86400`.
- `GET /api/post/[slug]` → `readPost(slug)`; parse frontmatter; return
  `{slug, title, excerpt, date, tags, readTime, content}`; `404` if missing.

## Frontend

`useMarkdownPosts.ts` (kept): fetch `/api/posts` and `/api/post/:slug`; on any
error or 404 fall back to `localFallbackSummaries` / `localFallbackPosts`.
`Post.tsx` (kept) renders markdown via `react-markdown` + `remark-gfm`, with the
existing callout-alert, code-block, and image components.

The only frontend change required: ensure `localFallback.ts` is import-safe.

## Environment variables

| Var | Purpose |
|---|---|
| `NOTION_SECRET` | Notion integration token |
| `NOTION_DATA_SOURCE_ID` | Data-source ID for v5 query API; if absent, derived from `NOTION_DATABASE_ID` |
| `NOTION_DATABASE_ID` | Database ID (fallback source for the data-source ID) |
| `NOTION_WEBHOOK_VERIFICATION_TOKEN` | HMAC key for signature verification (from handshake; replaces the ad-hoc `WEBHOOK_SECRET`) |
| `NOTION_SYNC_TRIGGER_SECRET` | Bearer secret for the manual full-sync endpoint |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token; `NOTION_SYNC_READ_WRITE_TOKEN` accepted as fallback |

A `.env.example` documents these. The build-time script loads `.env.local` (with
`.env` as a secondary fallback) so local builds work without changing CI.

## Error handling & resilience

- Every env getter throws a clear, named error if missing.
- `localFallback.ts` never throws at import: malformed frontmatter or files are
  skipped; an empty snapshot yields empty arrays, not an exception.
- Image processing failures degrade gracefully: the original Notion URL is kept
  rather than aborting the whole sync.
- `fullSync` reports per-page failures without aborting the batch and detects
  duplicate published slugs.

## Testing (`node --test`, `api/**/*.test.ts`)

- `richtext.test.ts` — annotation combinations, links, inline equations, escaping.
- `render.test.ts` — fixture Notion blocks → expected markdown for each block
  type, including nested lists, callout→alert, tables, code fences.
- `metadata.test.ts` — extraction against the real property names (`Publication
  Date`, `Keywords`, `Published`, `Title`); slug/excerpt auto-derive; optional
  `Slug`/`Description` precedence.
- `store.test.ts` — frontmatter serialize/parse round-trip; manifest upsert/remove
  (Blob client mocked).
- `webhook.test.ts` — handshake echo; valid/invalid signature; unsupported event
  ignored; missing entity ignored.
- `localFallback` import-safety check — importing with malformed content does not
  throw and yields a valid (possibly empty) snapshot.

## Rollout

1. Implement lib + handlers + tests; `tsc -p tsconfig.api.json` and `node --test`
   pass.
2. Set env vars in Vercel (and `.env.local` locally).
3. Run the manual full-sync endpoint (or build-time script) to populate Blob and
   the snapshot.
4. Create the Notion webhook subscription pointing at `/api/notion/webhook`;
   complete the handshake; store `NOTION_WEBHOOK_VERIFICATION_TOKEN`.
5. Edit a published Notion page; confirm the update appears on the blog.
