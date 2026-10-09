// Pure content -> row view models (SPEC 3, 5.3; DESIGN A3/A6). Row models carry both the
// display strings (already cut with `~`) and the full values for the Inspector/Reader.
// `text` on every row is the lowercase haystack the `/` filter searches.

import type { PostSummary } from "../../content/posts.ts";
import type { Project } from "../lib/project-schema.ts";
import type { SiteLink, SiteLinkKind } from "../content/site.ts";
import { resolvePostTags } from "../lib/postTagFallbacks.ts";

// ---------------------------------------------------------------- formatting

/** Vim-style hard cut: `n` chars max, the last one replaced by `~`. */
export function truncate(s: string, n: number): string {
  const chars = [...s];
  if (n <= 0) return "";
  return chars.length > n ? chars.slice(0, n - 1).join("") + "~" : s;
}

/** Column widths in characters (mock rows at the 46ch stack). */
export const COL = {
  projectName: 26,
  noteTitle: 22,
  inspectorStack: 24,
  linkLeader: 18,
  logName: 10,
  logMessage: 18,
} as const;

const LANG: Record<string, string> = {
  typescript: "ts",
  javascript: "js",
  python: "py",
  solidity: "sol",
  go: "go",
  rust: "rs",
  c: "c",
  react: "tsx",
  "maplibre gl js": "gl",
};

/** SPEC 5.3: short lowercase code for the first stack entry; `--` when empty. */
export function langCode(stack?: readonly string[] | null): string {
  const first = stack?.[0]?.trim();
  if (!first) return "--";
  const known = LANG[first.toLowerCase()];
  if (known) return known;
  const letters = first.toLowerCase().replace(/[^a-z]/g, "").slice(0, 4);
  return letters || "--";
}

const NO_DATE = "----------";

/** `YYYY-MM-DD` (UTC). Accepts ISO strings or plain dates; anything else -> dashes. */
export function formatDate(value: string | null | undefined): string {
  const s = String(value ?? "").trim();
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  if (m) return m[1];
  if (!s) return NO_DATE;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? NO_DATE : d.toISOString().slice(0, 10);
}

/** `<n>m` read time. */
export function formatReadTime(minutes: number | null | undefined): string {
  const n = Math.round(Number(minutes));
  return Number.isFinite(n) && n > 0 ? `${n}m` : "--m";
}

/** `label ......` padded with dots to `width` (LinkTable). */
export const dotLeader = (label: string, width: number = COL.linkLeader): string => `${label} `.padEnd(width, ".");

const haystack = (...parts: (string | null | undefined)[]): string =>
  parts.filter(Boolean).join(" ").toLowerCase();

/** Case-insensitive substring filter (the mock's `/`). Empty query matches everything. */
export const matchesFilter = (row: { text: string }, query: string): boolean =>
  !query || row.text.includes(query.toLowerCase());

// ---------------------------------------------------------------- projects

export interface ProjectRow {
  key: string;
  text: string;
  slug: string;
  /** Display name, cut to COL.projectName. */
  name: string;
  title: string;
  year: string;
  lang: string;
  /** Inspector `type` row (the project subtitle). */
  type: string;
  status: string;
  /** Inspector `stack`, comma list cut to COL.inspectorStack. */
  stack: string;
  summary: string;
  src: string | null;
  live: string | null;
  /** Reader path, `/projects/<slug>`. */
  dossier: string;
  /** What `O` opens: live, else src, else null. */
  primary: string | null;
}

const linkHref = (p: Project, label: string): string | null => p.links.find((l) => l.label === label)?.href ?? null;

export function projectRow(p: Project): ProjectRow {
  const stackList = p.techStack ?? [];
  // project-schema derives these two labels from the YAML `live` / `repo` fields.
  const live = linkHref(p, "Live demo");
  const src = linkHref(p, "GitHub");
  return {
    key: p.slug,
    text: haystack(p.title, p.year, langCode(stackList), p.subtitle, p.status, stackList.join(" ")),
    slug: p.slug,
    name: truncate(p.title, COL.projectName),
    title: p.title,
    year: p.year,
    lang: langCode(stackList),
    type: p.subtitle,
    status: p.status.toLowerCase(),
    stack: truncate(stackList.join(","), COL.inspectorStack) || "--",
    summary: p.summary,
    src,
    live,
    dossier: `/projects/${p.slug}`,
    primary: live ?? src,
  };
}

export const projectRows = (ps: readonly Project[]): ProjectRow[] => ps.map(projectRow);

// ---------------------------------------------------------------- notes

export interface NoteRow {
  key: string;
  text: string;
  slug: string;
  date: string;
  /** Display title, cut to COL.noteTitle. */
  label: string;
  title: string;
  read: string;
  tags: string[];
  excerpt: string;
  /** Reader path, `/writings/<slug>`. */
  path: string;
}

export function noteRow(p: PostSummary): NoteRow {
  const tags = resolvePostTags({ slug: p.slug, tags: p.tags ?? [] });
  return {
    key: p.slug,
    text: haystack(p.title, ...tags),
    slug: p.slug,
    date: formatDate(p.date),
    label: truncate(p.title, COL.noteTitle),
    title: p.title,
    read: formatReadTime(p.readTime),
    tags,
    excerpt: p.excerpt ?? "",
    path: `/writings/${p.slug}`,
  };
}

/** Rows in the order given (posts arrive date-desc from `sortPostsByDateDesc`). */
export const noteRows = (ps: readonly PostSummary[]): NoteRow[] => ps.map(noteRow);

// ---------------------------------------------------------------- links

export interface LinkRow {
  key: string;
  text: string;
  id: SiteLink["id"];
  label: string;
  /** `label ......` */
  leader: string;
  handle: string;
  href: string;
  kind: SiteLinkKind;
}

export const linkRows = (ls: readonly SiteLink[]): LinkRow[] =>
  ls.map((l) => ({
    key: l.id,
    text: haystack(l.label, l.handle),
    id: l.id,
    label: l.label,
    leader: dotLeader(l.label),
    handle: l.handle,
    href: l.href,
    kind: l.kind,
  }));

// ---------------------------------------------------------------- now + fortune

export interface NowRow {
  key: string;
  text: string;
  item: string;
}

export const nowRows = (items: readonly string[]): NowRow[] =>
  items.slice(0, 3).map((item, i) => ({ key: `now-${i}`, text: item.toLowerCase(), item }));

export interface Quote {
  text: string;
  /** The line after `<br>` (rendered dim on its own line), or null. */
  translation: string | null;
}

export function parseQuote(raw: string): Quote {
  const [text, ...rest] = raw.split(/<br\s*\/?>/i).map((s) => s.trim());
  const translation = rest.filter(Boolean).join(" ");
  return { text, translation: translation || null };
}

/** Random quote index for a fortune (re)roll; -1 when there are no quotes. Pure given `rand`. */
export const pickQuote = (count: number, rand: () => number = Math.random): number =>
  count > 0 ? Math.min(count - 1, Math.floor(rand() * count)) : -1;

// ---------------------------------------------------------------- log (guestbook)

export const LOG_PAGE = 12;
export const LOG_MAX = 280;
export const LOG_NAME_MAX = 32;
export const LOG_COOLDOWN_MS = 30_000;
export const LOG_DEFAULT_NAME = "anon";

export interface LogEntry {
  id: string;
  name: string;
  message: string;
  created_at: string;
  /** Optimistic entry not yet confirmed by the server. */
  pending?: boolean;
}

/** Characters as the visitor sees them (code points), for the `n/280` counter. */
export const charCount = (s: string): number => [...s].length;

// C0 controls except tab/newline, plus DEL.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f]/g;

export type SignCheck = { ok: true; name: string; message: string } | { ok: false; error: string };

/**
 * UX validation for a guestbook write (trim, strip control chars, length limits) so the visitor
 * gets an instant Modeline error. Not a security boundary: the anon key is public, so the database
 * must enforce the same rules itself (see supabase/guestbook_hardening.sql).
 */
export function validateSign(name: string, message: string): SignCheck {
  const n = String(name ?? "").replace(CONTROL, "").trim();
  const m = String(message ?? "").replace(CONTROL, "").trim();
  if (!m) return { ok: false, error: "E: empty message" };
  if (charCount(m) > LOG_MAX) return { ok: false, error: `E: ${LOG_MAX} chars max` };
  if (charCount(n) > LOG_NAME_MAX) return { ok: false, error: `E: name ${LOG_NAME_MAX} chars max` };
  return { ok: true, name: n || LOG_DEFAULT_NAME, message: m };
}

/** Milliseconds left before the next send is allowed. */
export const cooldownLeft = (lastSentAt: number | null, now: number): number =>
  lastSentAt == null ? 0 : Math.max(0, lastSentAt + LOG_COOLDOWN_MS - now);

const time = (e: LogEntry): number => {
  const t = Date.parse(e.created_at);
  return Number.isNaN(t) ? 0 : t;
};

/** Union by id (incoming wins), newest first. */
export function mergeEntries(current: readonly LogEntry[], incoming: readonly LogEntry[]): LogEntry[] {
  const byId = new Map<string, LogEntry>();
  for (const e of current) byId.set(e.id, e);
  for (const e of incoming) byId.set(e.id, e);
  return [...byId.values()].sort((a, b) => time(b) - time(a));
}

/** Id prefix of optimistic entries not yet confirmed by the server. */
export const LOG_LOCAL = "local-";

/** A realtime row replaces the local optimistic copy of the same message (or is dropped if already held). */
export function withIncoming(current: LogEntry[], row: LogEntry): LogEntry[] {
  if (current.some((e) => e.id === row.id)) return current;
  const local = current.find((e) => e.id.startsWith(LOG_LOCAL) && e.name === row.name && e.message === row.message);
  return mergeEntries(local ? current.filter((e) => e !== local) : current, [row]);
}

/** The insert came back: swap the optimistic entry `tempId` for the server row, whichever arrived first. */
export function confirmEntry(current: readonly LogEntry[], tempId: string, row: LogEntry): LogEntry[] {
  const rest = current.filter((e) => e.id !== tempId);
  return rest.some((e) => e.id === row.id) ? rest : mergeEntries(rest, [row]);
}

export type LogRow =
  | { kind: "sign"; key: "sign"; text: string; offline: boolean }
  | { kind: "more"; key: "more"; text: string }
  | {
      kind: "entry";
      key: string;
      text: string;
      date: string;
      /** Display strings, cut to COL.logName / COL.logMessage. */
      name: string;
      message: string;
      fullName: string;
      fullMessage: string;
      pending: boolean;
    };

/** `+ sign` first, entries newest first, `+ more` last while more pages exist (A3). */
export function logRows(entries: readonly LogEntry[], o: { online: boolean; hasMore: boolean }): LogRow[] {
  const rows: LogRow[] = [{ kind: "sign", key: "sign", text: "+ sign", offline: !o.online }];
  if (!o.online) return rows;
  for (const e of entries) {
    rows.push({
      kind: "entry",
      key: e.id,
      text: haystack(e.name, e.message),
      date: formatDate(e.created_at),
      name: truncate(e.name, COL.logName),
      message: truncate(e.message.replace(/\s+/g, " "), COL.logMessage),
      fullName: e.name,
      fullMessage: e.message,
      pending: Boolean(e.pending),
    });
  }
  if (o.hasMore) rows.push({ kind: "more", key: "more", text: "+ more" });
  return rows;
}
