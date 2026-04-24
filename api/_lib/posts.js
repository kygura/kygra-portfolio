import { del, list, put } from "@vercel/blob";

const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/;

function normalizeIdentifier(input) {
  return String(input ?? "").replace(/-/g, "").trim().toLowerCase();
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function parseFrontmatterValue(rawValue) {
  const trimmedValue = rawValue.trim();

  if (!trimmedValue) {
    return "";
  }

  if (trimmedValue.startsWith("[") && trimmedValue.endsWith("]")) {
    try {
      const parsedArray = JSON.parse(trimmedValue);
      return Array.isArray(parsedArray) ? parsedArray : [];
    } catch {
      const innerValue = trimmedValue.slice(1, -1).trim();

      if (!innerValue) {
        return [];
      }

      return innerValue
        .split(",")
        .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
        .filter(Boolean);
    }
  }

  if (trimmedValue === "true") {
    return true;
  }

  if (trimmedValue === "false") {
    return false;
  }

  const numericValue = Number(trimmedValue);

  if (!Number.isNaN(numericValue) && trimmedValue !== "") {
    return numericValue;
  }

  if (
    (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
    (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))
  ) {
    try {
      return JSON.parse(trimmedValue.replace(/^'/, '"').replace(/'$/, '"'));
    } catch {
      return trimmedValue.replace(/^['"]|['"]$/g, "");
    }
  }

  return trimmedValue;
}

function serializeFrontmatterValue(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => JSON.stringify(String(item))).join(", ")}]`;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(String(value ?? ""));
}

export function getBlobToken() {
  const token = process.env.NOTION_SYNC_READ_WRITE_TOKEN;

  if (!token) {
    throw new Error("NOTION_SYNC_READ_WRITE_TOKEN is not configured");
  }

  return token;
}

export function normalizeSlug(input) {
  return String(input ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeNotionId(input) {
  return normalizeIdentifier(input);
}

export function getPostPath(slug) {
  return `posts/${normalizeSlug(slug)}.md`;
}

export function getPageIndexPath(pageId) {
  return `page-index/${normalizeIdentifier(pageId)}.json`;
}

export function parseFrontmatter(markdown) {
  const match = String(markdown ?? "").match(FRONTMATTER_REGEX);

  if (!match) {
    return { data: {}, content: String(markdown ?? "") };
  }

  const [, rawFrontmatter, content] = match;
  const data = {};

  for (const line of rawFrontmatter.split("\n")) {
    const colonIndex = line.indexOf(":");

    if (colonIndex < 1) {
      continue;
    }

    const key = line.slice(0, colonIndex).trim();
    const rawValue = line.slice(colonIndex + 1);
    data[key] = parseFrontmatterValue(rawValue);
  }

  return { data, content };
}

export function serializeFrontmatter(data) {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  const lines = entries.map(([key, value]) => `${key}: ${serializeFrontmatterValue(value)}`);

  return `---\n${lines.join("\n")}\n---`;
}

export function buildPostRecord(slug, data, content = "") {
  return {
    slug,
    title: typeof data.title === "string" && data.title ? data.title : slug,
    excerpt: typeof data.description === "string" ? data.description : "",
    date: typeof data.date === "string" && data.date ? data.date : "1970-01-01",
    category: typeof data.category === "string" && data.category ? data.category : "General",
    tags: toArray(data.tags).map((tag) => String(tag)),
    content,
    readTime: Number(data.readTime) || 10,
  };
}

export async function listBlobsByPrefix(prefix) {
  const blobs = [];
  let cursor;
  let hasMore = true;

  while (hasMore) {
    const response = await list({
      prefix,
      cursor,
      token: getBlobToken(),
    });

    blobs.push(...response.blobs);
    hasMore = Boolean(response.hasMore);
    cursor = response.cursor;
  }

  return blobs;
}

export async function getBlobByPath(pathname) {
  const blobs = await listBlobsByPrefix(pathname);
  return blobs.find((blob) => blob.pathname === pathname) ?? null;
}

export async function fetchMarkdownBlob(pathname) {
  const blob = await getBlobByPath(pathname);

  if (!blob) {
    return null;
  }

  const response = await fetch(blob.url);

  if (!response.ok) {
    throw new Error(`Failed to fetch blob content for ${pathname}`);
  }

  return {
    blob,
    markdown: await response.text(),
  };
}

export async function fetchTextBlob(pathname) {
  const blobRecord = await fetchMarkdownBlob(pathname);
  return blobRecord ? blobRecord.markdown : null;
}

export async function fetchPostFromBlob(pathname) {
  const blobRecord = await fetchMarkdownBlob(pathname);

  if (!blobRecord) {
    return null;
  }

  const { data, content } = parseFrontmatter(blobRecord.markdown);
  const slug = pathname.replace(/^posts\//, "").replace(/\.md$/, "");

  return {
    pathname,
    blob: blobRecord.blob,
    markdown: blobRecord.markdown,
    data,
    content,
    post: buildPostRecord(slug, data, content),
  };
}

export async function listPublishedPostsFromBlob() {
  const blobs = await listBlobsByPrefix("posts/");

  const posts = await Promise.all(
    blobs
      .filter((blob) => blob.pathname.endsWith(".md"))
      .map(async (blob) => {
        const record = await fetchPostFromBlob(blob.pathname);

        if (!record || record.data.published === false) {
          return null;
        }

        const { post } = record;

        return {
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          date: post.date,
          category: post.category,
          tags: post.tags,
          readTime: post.readTime,
        };
      }),
  );

  return posts
    .filter(Boolean)
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
}

export async function findPostByPageId(pageId) {
  const normalizedPageId = normalizeIdentifier(pageId);

  if (!normalizedPageId) {
    return null;
  }

  const indexedSlug = await findSlugByPageIdIndex(pageId);

  if (indexedSlug) {
    const indexedRecord = await fetchPostFromBlob(getPostPath(indexedSlug));

    if (indexedRecord) {
      return indexedRecord;
    }
  }

  const blobs = await listBlobsByPrefix("posts/");

  for (const blob of blobs) {
    if (!blob.pathname.endsWith(".md")) {
      continue;
    }

    const record = await fetchPostFromBlob(blob.pathname);

    if (!record) {
      continue;
    }

    if (normalizeIdentifier(record.data.notionPageId) === normalizedPageId) {
      return record;
    }
  }

  return null;
}

export async function findSlugByPageIdIndex(pageId) {
  const pathname = getPageIndexPath(pageId);
  const raw = await fetchTextBlob(pathname);

  if (!raw) {
    return null;
  }

  try {
    const data = JSON.parse(raw);
    return typeof data.slug === "string" ? normalizeSlug(data.slug) : null;
  } catch {
    return null;
  }
}

export async function putPageIndex(pageId, slug) {
  return putPublicBlob(
    getPageIndexPath(pageId),
    JSON.stringify({ pageId: normalizeIdentifier(pageId), slug: normalizeSlug(slug) }),
    "application/json; charset=utf-8",
  );
}

export async function deletePageIndex(pageId) {
  return deletePathIfExists(getPageIndexPath(pageId));
}

export async function deletePathIfExists(pathname) {
  const blob = await getBlobByPath(pathname);

  if (!blob) {
    return false;
  }

  await del(blob.url, {
    token: getBlobToken(),
  });

  return true;
}

export async function deleteByPrefix(prefix) {
  const blobs = await listBlobsByPrefix(prefix);

  if (!blobs.length) {
    return 0;
  }

  await del(
    blobs.map((blob) => blob.url),
    {
      token: getBlobToken(),
    },
  );

  return blobs.length;
}

export async function putPublicBlob(pathname, body, contentType) {
  await deletePathIfExists(pathname);

  return put(pathname, body, {
    access: "public",
    addRandomSuffix: false,
    contentType,
    token: getBlobToken(),
  });
}
