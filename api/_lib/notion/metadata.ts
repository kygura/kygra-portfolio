/**
 * Extracts blog-post metadata from a Notion page object.
 */
import {
  notionPostMetadataSchema,
  normalizeSlug,
  type NotionPostMetadata,
} from "../../../content/posts.ts";

type NotionPage = {
  id: string;
  created_time?: string;
  last_edited_time?: string;
  properties?: Record<string, any>;
  parent?: {
    type?: string;
    data_source_id?: string;
    database_id?: string;
  };
};

// ---------------------------------------------------------------------------
// Property helpers
// ---------------------------------------------------------------------------

function readTitleProperty(props: Record<string, any>, ...keys: string[]): string {
  for (const key of keys) {
    const prop = props[key];
    if (!prop || prop.type !== "title") continue;
    const items: any[] = Array.isArray(prop.title) ? prop.title : [];
    const text = items.map((t) => (typeof t?.plain_text === "string" ? t.plain_text : "")).join("");
    if (text.trim()) return text.trim();
  }
  return "";
}

function readRichTextProperty(props: Record<string, any>, ...keys: string[]): string {
  for (const key of keys) {
    const prop = props[key];
    if (!prop || prop.type !== "rich_text") continue;
    const items: any[] = Array.isArray(prop.rich_text) ? prop.rich_text : [];
    const text = items.map((t) => (typeof t?.plain_text === "string" ? t.plain_text : "")).join("");
    if (text.trim()) return text.trim();
  }
  return "";
}

function readCheckboxProperty(props: Record<string, any>, ...keys: string[]): boolean {
  for (const key of keys) {
    const prop = props[key];
    if (!prop || prop.type !== "checkbox") continue;
    return Boolean(prop.checkbox);
  }
  return false;
}

function readDateProperty(props: Record<string, any>, ...keys: string[]): string {
  for (const key of keys) {
    const prop = props[key];
    if (!prop || prop.type !== "date") continue;
    const start = prop.date?.start;
    if (typeof start === "string" && start.trim()) return start.trim();
  }
  return "";
}

function readMultiSelectProperty(props: Record<string, any>, ...keys: string[]): string[] {
  for (const key of keys) {
    const prop = props[key];
    if (!prop || prop.type !== "multi_select") continue;
    const items: any[] = Array.isArray(prop.multi_select) ? prop.multi_select : [];
    return items
      .map((item) => (typeof item?.name === "string" ? item.name.trim() : ""))
      .filter((name) => name.length > 0);
  }
  return [];
}

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

export function extractPostMetadata(page: NotionPage): NotionPostMetadata {
  const props = page.properties ?? {};

  // title
  const rawTitle = readTitleProperty(props, "Title", "Name", "title") || page.id;

  // date
  const rawDate =
    readDateProperty(props, "Publication Date", "Date", "date") ||
    (page.created_time ?? "");

  // tags
  const tags = readMultiSelectProperty(props, "Keywords", "Tags", "tags");

  // published
  const published = readCheckboxProperty(props, "Published", "published");

  // slug
  const rawSlug = readRichTextProperty(props, "Slug", "slug");
  const slugBase = rawSlug || rawTitle;
  const slug = normalizeSlug(slugBase) || normalizeSlug(page.id);

  // excerpt
  const excerpt = readRichTextProperty(props, "Description", "description");

  // createdTime / lastEditedTime
  const createdTime =
    page.created_time?.trim() ||
    page.last_edited_time?.trim() ||
    new Date(0).toISOString();

  const lastEditedTime =
    page.last_edited_time?.trim() ||
    page.created_time?.trim() ||
    createdTime;

  return notionPostMetadataSchema.parse({
    pageId: page.id,
    title: rawTitle,
    slug,
    excerpt,
    date: rawDate,
    tags,
    published,
    createdTime,
    lastEditedTime,
  });
}

export function getPageDataSourceId(page: NotionPage): string | null {
  const parent = page.parent;
  if (!parent) return null;
  if (parent.type === "data_source_id") return parent.data_source_id ?? null;
  if (parent.type === "database_id") return parent.database_id ?? null;
  return null;
}
