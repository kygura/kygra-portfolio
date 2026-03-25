import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";

// ── helpers ─────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Safe property reader — returns undefined instead of throwing */
function getProp(page: any, name: string) {
  return page.properties?.[name];
}

function getTitle(page: any): string {
  const prop =
    getProp(page, "Name") ??
    getProp(page, "Title") ??
    getProp(page, "title");
  if (!prop) return "Untitled";
  const rich = prop.title ?? prop.rich_text;
  if (!rich?.length) return "Untitled";
  return rich.map((r: any) => r.plain_text).join("");
}

function getRichText(page: any, ...names: string[]): string | undefined {
  for (const name of names) {
    const prop = getProp(page, name);
    if (!prop) continue;
    const rt = prop.rich_text;
    if (rt?.length) return rt.map((r: any) => r.plain_text).join("");
  }
  return undefined;
}

function getDate(page: any, ...names: string[]): string | undefined {
  for (const name of names) {
    const prop = getProp(page, name);
    if (prop?.date?.start) return prop.date.start;
  }
  // Fallback to page last_edited_time
  return page.last_edited_time?.substring(0, 10);
}

function getSelect(page: any, ...names: string[]): string | undefined {
  for (const name of names) {
    const prop = getProp(page, name);
    if (prop?.select?.name) return prop.select.name;
  }
  return undefined;
}

function getMultiSelect(page: any, ...names: string[]): string[] {
  for (const name of names) {
    const prop = getProp(page, name);
    if (prop?.multi_select?.length) {
      return prop.multi_select.map((s: any) => s.name);
    }
  }
  return [];
}

function getNumber(page: any, ...names: string[]): number | undefined {
  for (const name of names) {
    const prop = getProp(page, name);
    if (prop?.number != null) return prop.number;
  }
  return undefined;
}

function getCheckbox(page: any, ...names: string[]): boolean {
  for (const name of names) {
    const prop = getProp(page, name);
    if (prop?.type === "checkbox") return prop.checkbox === true;
  }
  return true; // default: treat as published if property doesn't exist
}

function buildFrontmatter(fields: Record<string, any>): string {
  const lines = ["---"];
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      lines.push(`${k}: [${v.map((t) => `"${t}"`).join(", ")}]`);
    } else {
      lines.push(`${k}: "${v}"`);
    }
  }
  lines.push("---", "");
  return lines.join("\n");
}

// ── GitHub file commit ───────────────────────────────────────────────────────

async function upsertGitHubFile(
  repo: string,
  branch: string,
  path: string,
  content: string,
  token: string
): Promise<{ action: "created" | "updated" | "skipped"; sha?: string }> {
  const encoded = Buffer.from(content, "utf8").toString("base64");
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;
  const headers = {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };

  // Check if file exists to get its SHA
  let existingSha: string | undefined;
  const getRes = await fetch(`${apiUrl}?ref=${branch}`, { headers });
  if (getRes.status === 200) {
    const existing = await getRes.json();
    if (existing.content) {
      const existingContent = Buffer.from(
        existing.content.replace(/\n/g, ""),
        "base64"
      ).toString("utf8");
      if (existingContent === content) {
        return { action: "skipped", sha: existing.sha };
      }
    }
    existingSha = existing.sha;
  }

  const body: any = {
    message: existingSha
      ? `chore: update notion post ${path}`
      : `chore: add notion post ${path}`,
    content: encoded,
    branch,
  };
  if (existingSha) body.sha = existingSha;

  const putRes = await fetch(apiUrl, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });

  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`GitHub API error ${putRes.status}: ${err}`);
  }

  const data = await putRes.json();
  return {
    action: existingSha ? "updated" : "created",
    sha: data.content?.sha,
  };
}

// ── main handler ─────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret (skip check if CRON_SECRET is not set — dev mode)
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = req.headers["authorization"] ?? "";
    const provided = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;
    if (provided !== secret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const notionSecret = process.env.NOTION_SECRET;
  const databaseId = process.env.NOTION_DATABASE_ID;
  const githubToken = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO ?? "kygura/kygra-portfolio";
  
  const branch = process.env.GITHUB_BRANCH ?? "master" // or main;

  if (!notionSecret || !databaseId || !githubToken) {
    return res.status(500).json({
      error: "Missing environment variables: NOTION_SECRET, NOTION_DATABASE_ID, GITHUB_TOKEN",
    });
  }

  const notion = new Client({ auth: notionSecret });
  const n2m = new NotionToMarkdown({ notionClient: notion });

  const results: { slug: string; action: string }[] = [];
  const errors: { slug: string; error: string }[] = [];

  try {
    // Query all pages that are marked published (or all, if no Published prop)
    const dbResponse = await notion.databases.query({
      database_id: databaseId,
      page_size: 100,
    });

    console.log(`[sync-notion] Found ${dbResponse.results.length} pages`);

    for (const page of dbResponse.results as any[]) {
      const pageId = page.id;

      try {
        // Skip unpublished pages if a Published/Publish checkbox exists
        const published = getCheckbox(page, "Published", "Publish", "Live");
        if (!published) {
          console.log(`[sync-notion] Skipping unpublished page ${pageId}`);
          continue;
        }

        const title = getTitle(page);
        const rawSlug = getRichText(page, "Slug", "slug");
        const slug = rawSlug ? slugify(rawSlug) : slugify(title);

        if (!slug) {
          console.warn(`[sync-notion] Skipping page with empty slug: ${pageId}`);
          continue;
        }

        const description = getRichText(
          page,
          "Description",
          "Excerpt",
          "Summary",
          "description"
        );
        const date = getDate(page, "Publication Date", "Date", "Published Date", "Created");
        const category = getSelect(page, "Category", "Type", "category");
        const tags = getMultiSelect(page, "Keywords", "Tags", "Tag", "tags");
        const readTime = getNumber(page, "Read Time", "ReadTime", "readTime");

        // Convert Notion blocks to Markdown
        const mdBlocks = await n2m.pageToMarkdown(pageId);
        const mdContent = n2m.toMarkdownString(mdBlocks)?.parent ?? "";

        // Build frontmatter with only the fields we actually have
        const frontmatter = buildFrontmatter({
          title,
          ...(description ? { description } : {}),
          ...(date ? { date } : {}),
          ...(category ? { category } : {}),
          ...(tags.length ? { tags } : {}),
          ...(readTime != null ? { readTime } : {}),
        });

        const fileContent = frontmatter + mdContent;
        const filePath = `src/posts/${slug}.md`;

        const { action, sha: _sha } = await upsertGitHubFile(
          repo,
          branch,
          filePath,
          fileContent,
          githubToken
        );

        console.log(`[sync-notion] ${action}: ${filePath}`);
        results.push({ slug, action });
      } catch (pageErr: any) {
        const title = getTitle(page);
        console.error(`[sync-notion] Error processing "${title}":`, pageErr.message);
        errors.push({ slug: page.id, error: pageErr.message });
      }
    }
  } catch (err: any) {
    console.error("[sync-notion] Fatal error:", err.message);
    return res.status(500).json({ error: err.message });
  }

  return res.status(200).json({
    processed: results.length,
    results,
    errors,
  });
}
