import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import getRawBody from "raw-body";
import crypto from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const notion = new Client({ auth: process.env.NOTION_SECRET });
const n2m = new NotionToMarkdown({ notionClient: notion });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Immediately respond to Notion to prevent retries
  res.status(200).json({ received: true });

  // 2. Process asynchronously
  try {
    // Determine the signature to verify against depending on whether a secret was provided.
    // Locally, we might not have it yet during testing/registration.
    const webhookSecret = process.env.NOTION_WEBHOOK_SECRET;
    
    // Parse the payload depending on the content type
    let bodyObj;
    let rawBodyBuffer;

    if (req.headers["content-type"]?.includes("application/json")) {
        rawBodyBuffer = await getRawBody(req);
        
        // Verify signature if a secret is configured and a signature is provided
        if (webhookSecret) {
            const sig = req.headers["x-notion-signature"];
            if (sig) {
                const expected =
                  "sha256=" +
                  crypto
                    .createHmac("sha256", webhookSecret)
                    .update(rawBodyBuffer)
                    .digest("hex");
        
                if (sig !== expected) {
                    console.error("Signature verification failed", { expected, sig });
                    return; // Ignore invalid payload in the background
                }
            } else {
                 console.warn("No x-notion-signature header found in request, skipping verification.");
            }
        }

        try {
            bodyObj = JSON.parse(rawBodyBuffer.toString('utf8'));
        } catch (e) {
            console.error("Failed to parse JSON body", e);
            return;
        }
    } else {
        // Fallback for Vercel parsed bodies (though getRawBody usually avoids this)
        bodyObj = req.body;
    }

    if (!bodyObj || !bodyObj.type || !bodyObj.data) {
        // Initial setup payload without data, or unexpected format
        console.log("Received payload without standard data format:", bodyObj);
        return;
    }

    const { type, data } = bodyObj;
    
    // The payload format for page events usually includes a 'data' array or object
    // Depending on the version it might just be directly on the body or in the 'source'
    
    // Some events might just pass the page directly or inside a workspace/page struct
    // Re-checking standard Notion webhook payload shape
    const pageObj = data && data.type === 'page' ? data.page : (bodyObj.type.startsWith('page.') ? bodyObj.data : null);

    if (type !== "page.created" && type !== "page.updated") {
      console.log(`Ignoring event type: ${type}`);
      return;
    }
    
    // In typical Notion webhooks the entity ID is usually bodyObj.source.id or data.id depending on structure
    // Let's rely on standard page fetches to grab the actual page attributes
    // According to docs, `page` or `entity` might hold the ID. Let's handle both.
    const pageId = bodyObj.data?.id || (bodyObj.entity && bodyObj.entity.id);

    if (!pageId) {
      console.log("No valid page ID found in payload.");
      return;
    }

    console.log(`Processing ${type} for page ${pageId}`);

    // Fetch full page to get properties
    const page = await notion.pages.retrieve({ page_id: pageId }) as any;
    
    // Extract title (handles variations in property naming)
    const titlePropertyItem = Object.values(page.properties).find(
        (prop: any) => prop.type === "title"
    ) as any;
    
    const title = titlePropertyItem?.title?.map((t: any) => t.plain_text).join("") || "";

    if (!title) {
        console.log("Page has no title. Skipping sync.");
        return;
    }

    // Convert Notion blocks to Markdown
    const mdblocks = await n2m.pageToMarkdown(pageId);
    const mdString = n2m.toMarkdownString(mdblocks);

    // Provide a default empty parent so typescript doesn't scream
    const markdownContent = mdString.parent || mdString as unknown as string;

    // Generate slug
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    // Prepare Markdown content with frontmatter
    const lastEditedStr = page.last_edited_time || new Date().toISOString();
    const fileContent = `---
title: ${title}
date: ${lastEditedStr}
notionId: ${pageId}
---

${markdownContent}
`;

    // Commit to GitHub
    await pushToGitHub(slug, fileContent);

  } catch (err) {
    console.error("Error processing Notion webhook:", err);
  }
}

async function pushToGitHub(slug: string, content: string) {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  if (!GITHUB_TOKEN) {
    throw new Error("Missing GITHUB_TOKEN environment variable");
  }

  const repoOwner = "kygura";
  const repoName = "kygra-portfolio";
  const path = `src/posts/${slug}.md`;
  const githubApiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`;

  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Notion-Sync-Integration",
  };

  let existingSha = undefined;

  // Check if file exists to get it's SHA (required for updating)
  try {
    const res = await fetch(githubApiUrl, { headers });
    if (res.status === 200) {
      const data = await res.json();
      existingSha = data.sha;
    }
  } catch (e) {
    console.log("File does not exist yet or error checking: ", e);
  }

  const bodyContent = {
    message: `sync: update ${slug} from Notion`,
    content: Buffer.from(content).toString("base64"),
    ...(existingSha && { sha: existingSha }),
  };

  const putRes = await fetch(githubApiUrl, {
    method: "PUT",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bodyContent),
  });

  if (!putRes.ok) {
    const errorBody = await putRes.text();
    throw new Error(`GitHub API failed: ${putRes.status} ${errorBody}`);
  }

  console.log(`✅ successfully committed ${path} to GitHub`);
}
