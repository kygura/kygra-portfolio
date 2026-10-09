/**
 * Notion image processing: download, compress, store next to the built site,
 * and rewrite markdown URLs to the stable copies. Notion's own file URLs are
 * pre-signed and expire after about an hour, so they can never ship as-is.
 */

import { createHash } from "node:crypto";
import sharp from "sharp";

// ---------------------------------------------------------------------------
// Dependency-injection interface
// ---------------------------------------------------------------------------

export interface ImageDeps {
  fetchImpl: typeof fetch;
  /** Persist one image; returns the URL the markdown should reference. */
  put: (pathname: string, body: Buffer, contentType: string) => Promise<{ url: string; pathname: string }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MARKDOWN_IMAGE_RE = /!\[([^\]]*)\]\((\S+?)(?:\s+"([^"]*)")?\)/g;

export function isNotionImage(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return (
      hostname.includes("notion-static.com") ||
      hostname.includes("prod-files-secure.s3") ||
      hostname.includes(".amazonaws.com")
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// processPostImages
// ---------------------------------------------------------------------------

export async function processPostImages(
  markdown: string,
  slug: string,
  deps: ImageDeps,
): Promise<{ markdown: string; pathnames: string[] }> {
  // Collect unique Notion image URLs from the markdown.
  const uniqueUrls = new Set<string>();
  for (const match of markdown.matchAll(MARKDOWN_IMAGE_RE)) {
    const url = match[2];
    if (isNotionImage(url)) {
      uniqueUrls.add(url);
    }
  }

  if (uniqueUrls.size === 0) {
    return { markdown, pathnames: [] };
  }

  const mapping = new Map<string, string>();
  const collectedPathnames: string[] = [];

  await Promise.all(
    Array.from(uniqueUrls).map(async (url) => {
      try {
        const res = await deps.fetchImpl(url);
        if (!res.ok) {
          // Skip on HTTP failure — keep original URL.
          return;
        }

        const raw = Buffer.from(new Uint8Array(await res.arrayBuffer()));

        const contentTypeHeader = res.headers.get("content-type") ?? "application/octet-stream";
        // Strip parameters like "; charset=utf-8"
        const baseContentType = contentTypeHeader.split(";")[0].trim();

        let finalBuffer: Buffer;
        let ext: string;
        let finalContentType: string;

        try {
          const meta = await sharp(raw).metadata();
          const fmt = meta.format ?? "";

          if (fmt === "gif" || fmt === "svg") {
            // Pass through unchanged.
            finalBuffer = raw;
            ext = fmt;
            finalContentType = fmt === "gif" ? "image/gif" : "image/svg+xml";
          } else {
            const hasAlpha = meta.hasAlpha ?? false;
            if (hasAlpha) {
              finalBuffer = await sharp(raw)
                .rotate()
                .resize({ width: 1600, withoutEnlargement: true })
                .png()
                .toBuffer();
              ext = "png";
              finalContentType = "image/png";
            } else {
              finalBuffer = await sharp(raw)
                .rotate()
                .resize({ width: 1600, withoutEnlargement: true })
                .jpeg({ quality: 72, mozjpeg: true })
                .toBuffer();
              ext = "jpg";
              finalContentType = "image/jpeg";
            }
          }
        } catch {
          // sharp failed — fall back to raw buffer.
          finalBuffer = raw;
          // Best-effort extension from content-type.
          const ctExt = baseContentType.split("/")[1] ?? "bin";
          ext = ctExt === "jpeg" ? "jpg" : ctExt;
          finalContentType = baseContentType;
        }

        const hash = createHash("sha1").update(finalBuffer).digest("hex").slice(0, 16);
        const filename = `${hash}.${ext}`;
        const pathname = `${slug}/${filename}`;

        const uploaded = await deps.put(pathname, finalBuffer, finalContentType);

        mapping.set(url, uploaded.url);
        collectedPathnames.push(pathname);
      } catch {
        // Per-image failure — skip, keep original URL.
      }
    }),
  );

  // Rewrite markdown.
  const rewritten = markdown.replace(
    MARKDOWN_IMAGE_RE,
    (full, alt: string, url: string, title: string | undefined) => {
      if (!mapping.has(url)) return full;
      const newUrl = mapping.get(url)!;
      return title ? `![${alt}](${newUrl} "${title}")` : `![${alt}](${newUrl})`;
    },
  );

  return { markdown: rewritten, pathnames: collectedPathnames };
}
