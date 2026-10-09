// Pure route parse/build (SPEC 4, DESIGN A5). The URL is the source of truth for the
// active section and the Reader; the shell feeds `parseRoute(location.pathname)` into
// the store and turns section/reader intents back into paths with the builders below.

export const SECTIONS = ["projects", "notes", "links", "now", "log"] as const;
export type Section = (typeof SECTIONS)[number];

export type ReaderKind = "post" | "dossier" | "cv" | "about" | "404";

export interface Route {
  /** null keeps the current section (only `/about`). */
  section: Section | null;
  reader: ReaderKind | null;
  /** Decoded slug for `post` and `dossier` readers, otherwise null. */
  slug: string | null;
  /** Set when the path is an alias that must be replaced (`/artifacts` -> `/`). */
  redirect?: string;
}

export interface SectionMeta {
  id: Section;
  /** `01`..`05` */
  num: string;
  /** Pane title, `01 PROJECTS`. */
  title: string;
  /** StatusBar tab, `1:proj`. */
  tab: string;
  /** Second key of the `g` chord (`gp`, `gw`, `gc`, `gn`, `gb`). */
  chord: string;
  path: string;
}

export const SECTION_META: Record<Section, SectionMeta> = {
  projects: { id: "projects", num: "01", title: "01 PROJECTS", tab: "1:proj", chord: "p", path: "/projects" },
  notes: { id: "notes", num: "02", title: "02 NOTES", tab: "2:notes", chord: "w", path: "/writings" },
  links: { id: "links", num: "03", title: "03 LINKS", tab: "3:links", chord: "c", path: "/links" },
  now: { id: "now", num: "04", title: "04 NOW", tab: "4:now", chord: "n", path: "/now" },
  log: { id: "log", num: "05", title: "05 LOG", tab: "5:log", chord: "b", path: "/guestbook" },
};

export const sectionIndex = (s: Section): number => SECTIONS.indexOf(s);

/** Section `delta` steps away from `s`, wrapping through all five. */
export function stepSection(s: Section, delta: number): Section {
  const n = SECTIONS.length;
  return SECTIONS[(((sectionIndex(s) + delta) % n) + n) % n];
}

export const sectionPath = (s: Section): string => SECTION_META[s].path;

export function readerPath(kind: Exclude<ReaderKind, "404">, slug?: string | null): string {
  switch (kind) {
    case "post":
      return `/writings/${encodeURIComponent(slug ?? "")}`;
    case "dossier":
      return `/projects/${encodeURIComponent(slug ?? "")}`;
    case "cv":
      return "/cv";
    case "about":
      return "/about";
  }
}

const route = (section: Section | null, reader: ReaderKind | null = null, slug: string | null = null): Route => ({
  section,
  reader,
  slug,
});

const NOT_FOUND: Route = route("projects", "404");

export function parseRoute(pathname: string): Route {
  const clean = (pathname.split(/[?#]/)[0] || "/").replace(/\/{2,}/g, "/");
  const parts = clean.split("/").filter(Boolean);
  if (parts.length === 0) return route("projects");

  const head = parts[0].toLowerCase();
  if (parts.length === 1) {
    switch (head) {
      case "projects":
        return route("projects");
      case "writings":
        return route("notes");
      case "links":
        return route("links");
      case "now":
        return route("now");
      case "guestbook":
        return route("log");
      case "cv":
        return route("links", "cv");
      case "about":
        return route(null, "about");
      case "artifacts":
        return { ...route("projects"), redirect: "/" };
    }
    return NOT_FOUND;
  }

  if (parts.length === 2 && (head === "projects" || head === "writings")) {
    let slug: string;
    try {
      slug = decodeURIComponent(parts[1]);
    } catch {
      return NOT_FOUND;
    }
    return head === "projects" ? route("projects", "dossier", slug) : route("notes", "post", slug);
  }

  return NOT_FOUND;
}

/** Inverse of `parseRoute` for every route it can produce (404 has no canonical path). */
export function buildPath(r: Route, current: Section = "projects"): string {
  if (r.reader && r.reader !== "404") return readerPath(r.reader, r.slug);
  return sectionPath(r.section ?? current);
}
