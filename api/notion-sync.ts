import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import getRawBody from "raw-body";
import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface NotionWebhookPayload {
  type: string;
  entity: { id: string };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function extractTitle(properties: Record<string, unknown>): string | null {
  // Notion pages can use "title" or "Name" as the title property key
  for (const key of ["title", "Name"]) {
    const prop = properties[key] as
      | { title?: Array<{ plain_text: string }> }
      | undefined;
    if (prop?.title && prop.title.length > 0) {
      return prop.title.map((t) => t.plain_text).join("");
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).end("Method Not Allowed");
  }

  // Read raw body for HMAC verification BEFORE res.end() so we have it
  let rawBody: Buffer;
  try {
    rawBody = await getRawBody(req, { limit: "1mb" });
  } catch (err) {
    console.error("❌ Failed to read body:", err);
    return res.status(400).end("Bad Request");
  }

  // Respond immediately to prevent Notion retries (processing continues async)
  res.status(200).end("OK");

  // --- Async processing starts here ---
  (async () => {
    try {
      // 1. Verify HMAC-SHA256 signature
      const sig = req.headers["x-notion-signature"] as string | undefined;
      const secret = process.env.NOTION_WEBHOOK_SECRET;

      if (!secret) {
        console.error("❌ NOTION_WEBHOOK_SECRET is not set");
        return;
      }

      const expected =
        "sha256=" +
        crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

      if (!sig || sig !== expected) {
        console.warn("❌ Signature mismatch — ignoring webhook");
        return;
      }

      // 2. Parse payload
      let payload: NotionWebhookPayload;
      try {
        payload = JSON.parse(rawBody.toString("utf8"));
      } catch {
        console.error("❌ Failed to parse webhook payload");
        return;
      }

      const { type, entity } = payload;
      if (type !== "page.created" && type !== "page.updated") {
        console.log(`ℹ️  Skipping event type: ${type}`);
        return;
      }

      const pageId = entity.id;
      console.log(`📝 Processing ${type} for page ${pageId}`);

      // 3. Fetch page from Notion
      const notionSecret = process.env.NOTION_SECRET;
      if (!notionSecret) {
        console.error("❌ NOTION_SECRET is not set");
        return;
      }

      const notion = new Client({ auth: notionSecret });
      const n2m = new NotionToMarkdown({ notionClient: notion });

      const page = await notion.pages.retrieve({ page_id: pageId });

      // @ts-expect-error – properties shape depends on database
      const properties = page.properties as Record<string, unknown>;

      // 4. Extract title — skip silently if none
      const title = extractTitle(properties);
      if (!title) {
        console.log(`ℹ️  Page ${pageId} has no title — skipping`);
        return;
      }

      // 5. Convert blocks to Markdown
      const mdBlocks = await n2m.pageToMarkdown(pageId);
      const { parent: markdownBody } = n2m.toMarkdownString(mdBlocks);

      // 6. Build slug and file content
      const slug = slugify(title);
      // @ts-expect-error – last_edited_time exists on page objects
      const date: string = page.last_edited_time ?? new Date().toISOString();
      const fileContent = [
        "---",
        `title: ${title}`,
        `date: ${date}`,
        `notionId: ${pageId}`,
        "---",
        "",
        markdownBody,
      ].join("\n");

      // 7. Commit to GitHub
      const githubToken = process.env.GITHUB_TOKEN;
      if (!githubToken) {
        console.error("❌ GITHUB_TOKEN is not set");
        return;
      }

      const filePath = `src/posts/${slug}.md`;
      const apiUrl = `https://api.github.com/repos/kygura/kygra-portfolio/contents/${filePath}`;
      const headers = {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "kygra-notion-sync/1.0",
      };

      // GET existing file to capture sha (404 = new file)
      let sha: string | undefined;
      const getRes = await fetch(apiUrl, { headers });
      if (getRes.ok) {
        const existing = (await getRes.json()) as { sha?: string };
        sha = existing.sha;
      } else if (getRes.status !== 404) {
        const text = await getRes.text();
        console.error(`❌ GitHub GET failed (${getRes.status}):`, text);
        return;
      }

      // PUT (create or update)
      const body: Record<string, unknown> = {
        message: `sync: update ${slug} from Notion`,
        content: Buffer.from(fileContent).toString("base64"),
      };
      if (sha) body.sha = sha;

      const putRes = await fetch(apiUrl, {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
      });

      if (!putRes.ok) {
        const text = await putRes.text();
        console.error(`❌ GitHub PUT failed (${putRes.status}):`, text);
        return;
      }

      console.log(`✅ Committed ${filePath} (${sha ? "updated" : "created"})`);
    } catch (err) {
      console.error("❌ Unexpected error in notion-sync:", err);
    }
  })();
}
