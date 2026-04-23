import crypto from "node:crypto";
import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import { waitUntil } from "@vercel/functions";

const {
  NOTION_SECRET,
  NOTION_DATABASE_ID,
  GITHUB_TOKEN,
  GITHUB_OWNER = "kygura",
  GITHUB_REPO = "kygra-portfolio",
  GITHUB_BRANCH = "master",
  WEBHOOK_SECRET,
} = process.env;

const notion = NOTION_SECRET ? new Client({ auth: NOTION_SECRET }) : null;
const n2m = notion ? new NotionToMarkdown({ notionClient: notion }) : null;

function getHeader(req, name) {
  const value = req.headers?.[name] ?? req.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function sendJson(res, statusCode, body) {
  res.status(statusCode).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function escapeYamlString(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, " ");
}

function slugify(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function extractPlainText(property) {
  if (!property) return "";

  if (property.type === "title") {
    return property.title.map((item) => item.plain_text).join("").trim();
  }

  if (property.type === "rich_text") {
    return property.rich_text.map((item) => item.plain_text).join("").trim();
  }

  return "";
}

function getProperty(page, name, type) {
  const property = page.properties?.[name];
  return property?.type === type ? property : null;
}

function getDateValue(page) {
  return getProperty(page, "Date", "date")?.date?.start?.slice(0, 10) ?? "";
}

function getSelectValue(page, name) {
  return getProperty(page, name, "select")?.select?.name ?? "";
}

function getTagsValue(page) {
  return getProperty(page, "Tags", "multi_select")?.multi_select?.map((tag) => tag.name) ?? [];
}

function getNumberValue(page, name) {
  return getProperty(page, name, "number")?.number ?? 0;
}

function getCheckboxValue(page, name) {
  return getProperty(page, name, "checkbox")?.checkbox ?? false;
}

function getSlug(page, title) {
  const slugProperty =
    getProperty(page, "Slug", "rich_text") ??
    getProperty(page, "Slug", "title") ??
    getProperty(page, "Slug", "formula");

  let slugValue = "";

  if (slugProperty?.type === "formula") {
    const formula = slugProperty.formula;
    if (formula.type === "string") {
      slugValue = formula.string ?? "";
    }
  } else {
    slugValue = extractPlainText(slugProperty);
  }

  return slugify(slugValue || title);
}

function buildMarkdownFile(frontmatter, body) {
  const tags = frontmatter.tags.join(", ");
  return `---
title: "${escapeYamlString(frontmatter.title)}"
description: "${escapeYamlString(frontmatter.description)}"
date: "${escapeYamlString(frontmatter.date)}"
type: "${escapeYamlString(frontmatter.type)}"
category: "${escapeYamlString(frontmatter.category)}"
tags: [${tags}]
readTime: ${frontmatter.readTime}
---

${body.trim()}
`;
}

function verifySignature(rawBody, signature) {
  if (!WEBHOOK_SECRET || !signature) return false;

  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  const normalized = signature.replace(/^sha256=/, "");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(normalized, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

function getPageId(payload) {
  return payload?.entity?.id ?? payload?.page?.id ?? null;
}

function logBackgroundError(error) {
  console.error("notion-webhook background job failed", error);
}

function enqueueBackgroundJob(job) {
  const guardedJob = Promise.resolve(job).catch(logBackgroundError);

  try {
    waitUntil(guardedJob);
    return;
  } catch {
    guardedJob.catch(() => {});
  }
}

async function fetchGitHubFile(path) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(GITHUB_BRANCH)}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "kygra-notion-webhook",
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`GitHub file lookup failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return {
    sha: data.sha,
    content: data.content ? Buffer.from(data.content, "base64").toString("utf8") : "",
  };
}

async function upsertGitHubFile(path, content, title) {
  const existingFile = await fetchGitHubFile(path);
  if (existingFile?.content === content) {
    return;
  }

  const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(path)}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "kygra-notion-webhook",
    },
    body: JSON.stringify({
      message: `publish: ${title}`,
      content: Buffer.from(content, "utf8").toString("base64"),
      branch: GITHUB_BRANCH,
      ...(existingFile?.sha ? { sha: existingFile.sha } : {}),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub publish failed: ${response.status} ${errorText}`);
  }
}

async function deleteGitHubFile(path, slug) {
  const existingFile = await fetchGitHubFile(path);
  if (!existingFile?.sha) {
    return;
  }

  const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(path)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "kygra-notion-webhook",
    },
    body: JSON.stringify({
      message: `unpublish: ${slug}`,
      sha: existingFile.sha,
      branch: GITHUB_BRANCH,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub delete failed: ${response.status} ${errorText}`);
  }
}

function validateEnv() {
  const required = [
    ["NOTION_SECRET", NOTION_SECRET],
    ["NOTION_DATABASE_ID", NOTION_DATABASE_ID],
    ["GITHUB_TOKEN", GITHUB_TOKEN],
    ["WEBHOOK_SECRET", WEBHOOK_SECRET],
  ];

  const missing = required.filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

async function processWebhook(payload) {
  validateEnv();

  const pageId = getPageId(payload);
  if (!pageId) {
    return;
  }

  const page = await notion.pages.retrieve({ page_id: pageId });

  const parentDatabaseId = page.parent?.type === "database_id" ? page.parent.database_id : null;
  if (NOTION_DATABASE_ID && parentDatabaseId && parentDatabaseId !== NOTION_DATABASE_ID) {
    return;
  }

  const title = extractPlainText(getProperty(page, "Title", "title"));
  const description = extractPlainText(getProperty(page, "Description", "rich_text"));
  const date = getDateValue(page);
  const type = getSelectValue(page, "Type");
  const category = getSelectValue(page, "Category");
  const tags = getTagsValue(page);
  const readTime = getNumberValue(page, "Read Time");
  const slug = getSlug(page, title);
  const postPath = `src/posts/${slug}.md`;
  const isPublished = getCheckboxValue(page, "Published");

  if (!isPublished) {
    await deleteGitHubFile(postPath, slug);
    return;
  }

  const mdBlocks = await n2m.pageToMarkdown(pageId);
  const body = n2m.toMarkdownString(mdBlocks);
  const markdownContent = typeof body === "string" ? body : body.parent ?? "";

  const fileContent = buildMarkdownFile(
    {
      title,
      description,
      date,
      type,
      category,
      tags,
      readTime,
    },
    markdownContent,
  );

  await upsertGitHubFile(postPath, fileContent, title);
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method === "GET") {
    return sendJson(res, 200, { challenge: req.query?.challenge ?? null });
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const rawBody = await getRawBody(req);
    const signature = getHeader(req, "x-notion-signature");

    if (!verifySignature(rawBody, signature)) {
      return sendJson(res, 401, { error: "Invalid signature" });
    }

    const payload = rawBody ? JSON.parse(rawBody) : {};
    enqueueBackgroundJob(processWebhook(payload));
    return sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: error.message });
  }
}
