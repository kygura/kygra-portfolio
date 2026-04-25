import crypto from "node:crypto";
import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import { cleanupPostImages, deleteAllPostImages, syncMarkdownImagesToBlob } from "./_lib/images.js";
import {
  deletePageIndex,
  deletePathIfExists,
  findPostByPageId,
  findSlugByPageIdIndex,
  getPostPath,
  normalizeNotionId,
  normalizeSlug,
  putPageIndex,
  putPublicBlob,
  serializeFrontmatter,
} from "./_lib/posts.js";

const notion = new Client({ auth: process.env.NOTION_SECRET });
const n2m = new NotionToMarkdown({ notionClient: notion });

export const config = {
  api: {
    bodyParser: false,
  },
};

function verifySignature(rawBody, signature, secret) {
  if (!signature || !secret) {
    return false;
  }

  const expectedSignature = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")}`;

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}

function extractTitle(property) {
  return property?.title?.map((item) => item.plain_text).join("").trim() ?? "";
}

function extractRichText(property) {
  return property?.rich_text?.map((item) => item.plain_text).join("").trim() ?? "";
}

function extractSelect(property) {
  return property?.select?.name ?? "";
}

function extractMultiSelect(property) {
  return property?.multi_select?.map((item) => item.name).filter(Boolean) ?? [];
}

function extractNumber(property) {
  return typeof property?.number === "number" ? property.number : 0;
}

function extractCheckbox(property) {
  return Boolean(property?.checkbox);
}

function extractDate(property) {
  return property?.date?.start ?? "";
}

function extractSlug(properties, fallbackTitle) {
  const explicitSlug =
    extractRichText(properties?.Slug) ||
    extractRichText(properties?.slug) ||
    extractTitle(properties?.Slug) ||
    extractTitle(properties?.slug);

  return normalizeSlug(explicitSlug || fallbackTitle);
}

function estimateReadTime(markdown) {
  const words = String(markdown ?? "")
    .replace(/[`*_>#-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.ceil(words / 200));
}

function extractPageId(payload) {
  return payload?.entity?.id ?? payload?.page?.id ?? payload?.data?.page_id ?? null;
}

function isTargetDatabaseParent(parent, databaseId) {
  const targetId = normalizeNotionId(databaseId);

  if (!targetId) {
    return true;
  }

  return [
    parent?.database_id,
    parent?.data_source_id,
    parent?.id,
  ].some((value) => normalizeNotionId(value) === targetId);
}

async function deletePublishedAssets(slug) {
  if (!slug) {
    return;
  }

  await deletePathIfExists(getPostPath(slug));
  await deleteAllPostImages(slug);
}

async function syncNotionPage(pageId, eventType) {
  const existingPost = await findPostByPageId(pageId);
  const indexedSlug = existingPost?.post.slug ?? await findSlugByPageIdIndex(pageId);

  if (eventType === "page.deleted") {
    if (indexedSlug) {
      await deletePublishedAssets(indexedSlug);
      await deletePageIndex(pageId);
      return { slug: indexedSlug, published: false, deleted: true };
    }

    return { slug: null, published: false, deleted: false };
  }

  let page;

  try {
    page = await notion.pages.retrieve({ page_id: pageId });
  } catch (error) {
    if (indexedSlug) {
      await deletePublishedAssets(indexedSlug);
      await deletePageIndex(pageId);
      return { slug: indexedSlug, published: false, deleted: true };
    }

    throw error;
  }

  if (!isTargetDatabaseParent(page.parent, process.env.NOTION_DATABASE_ID) || page.in_trash || page.archived) {
    if (indexedSlug) {
      await deletePublishedAssets(indexedSlug);
      await deletePageIndex(pageId);
      return { slug: indexedSlug, published: false, deleted: true };
    }

    return { slug: null, published: false, skipped: true };
  }

  const properties = page.properties ?? {};
  const title = extractTitle(properties.Title ?? properties.Name ?? properties.title) || page.id;
  const slug = extractSlug(properties, title || pageId) || normalizeSlug(pageId);
  const published = extractCheckbox(properties.Published ?? properties.published);

  if (!published) {
    await deletePublishedAssets(indexedSlug ?? slug);
    await deletePageIndex(pageId);
    return { slug, published: false };
  }

  if (indexedSlug && indexedSlug !== slug) {
    await deletePublishedAssets(indexedSlug);
  }

  const markdownBlocks = await n2m.pageToMarkdown(pageId);
  const markdownBody = String(n2m.toMarkdownString(markdownBlocks).parent ?? "").trim();
  const description = extractRichText(properties.Description ?? properties.description);
  const date = extractDate(properties.Date ?? properties.date);
  const type = extractSelect(properties.Type ?? properties.type);
  const category = extractSelect(properties.Category ?? properties.category);
  const tags = extractMultiSelect(properties.Tags ?? properties.tags);
  const readTime = extractNumber(
    properties["Read Time"] ?? properties.readTime ?? properties["Read time"],
  ) || estimateReadTime(markdownBody);
  const syncedImages = await syncMarkdownImagesToBlob(markdownBody, { postSlug: slug });

  const frontmatter = serializeFrontmatter({
    title,
    description,
    date,
    type,
    category,
    tags,
    readTime,
    notionPageId: page.id,
    published: true,
  });
  const markdownContent = `${frontmatter}\n\n${syncedImages.markdown.trim()}\n`;

  await putPublicBlob(getPostPath(slug), markdownContent, "text/markdown; charset=utf-8");
  await putPageIndex(page.id, slug);
  await cleanupPostImages(slug, syncedImages.pathnames);

  return { slug, published: true };
}

async function readRawBody(request) {
  if (!request) {
    return "";
  }

  if (typeof request.body === "string") {
    return request.body;
  }

  if (Buffer.isBuffer(request.body)) {
    return request.body.toString("utf8");
  }

  const chunks = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!process.env.NOTION_SECRET) {
      throw new Error("NOTION_SECRET is not configured");
    }

    const rawBody = await readRawBody(request);
    const payload = rawBody ? JSON.parse(rawBody) : {};

    if (payload?.verification_token) {
      return response.status(200).json({ ok: true });
    }

    const signature = request.headers["x-notion-signature"];

    if (!verifySignature(rawBody, signature, process.env.WEBHOOK_SECRET)) {
      return response.status(401).json({ error: "Invalid signature" });
    }

    const pageId = extractPageId(payload);

    if (!pageId) {
      return response.status(200).json({ ok: true, skipped: true });
    }

    const result = await syncNotionPage(pageId, payload?.type);
    return response.status(200).json({ ok: true, ...result });
  } catch (error) {
    console.error("Failed to process Notion webhook", error);
    return response.status(500).json({
      error: error instanceof Error ? error.message : "Failed to process Notion webhook",
    });
  }
}
