import crypto from "node:crypto";
import sharp from "sharp";
import { deleteByPrefix, deletePathIfExists, listBlobsByPrefix, putPublicBlob } from "./posts.js";

const MARKDOWN_IMAGE_REGEX = /!\[([^\]]*)\]\((\S+?)(?:\s+"([^"]*)")?\)/g;
const MAX_IMAGE_WIDTH = 1600;

function mimeToExtension(contentType) {
  const mime = String(contentType ?? "").split(";")[0].trim().toLowerCase();

  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/svg+xml":
      return "svg";
    case "image/avif":
      return "avif";
    default:
      return "";
  }
}

export function extractMarkdownImageUrls(markdown) {
  return Array.from(String(markdown ?? "").matchAll(MARKDOWN_IMAGE_REGEX)).map((match) => ({
    alt: match[1] ?? "",
    url: match[2] ?? "",
    title: match[3] ?? "",
    fullMatch: match[0],
  }));
}

export function isNotionHostedImageUrl(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    return (
      hostname.includes("secure.notion-static.com") ||
      hostname.includes("notion-static.com") ||
      hostname.includes("prod-files-secure.s3.") ||
      hostname.includes(".amazonaws.com")
    );
  } catch {
    return false;
  }
}

export async function downloadRemoteImage(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download image: ${url}`);
  }

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type"),
  };
}

export function inferImageExtension(url, contentType) {
  const mimeExtension = mimeToExtension(contentType);

  if (mimeExtension) {
    return mimeExtension;
  }

  try {
    const pathname = new URL(url).pathname;
    const extension = pathname.split(".").pop()?.toLowerCase() ?? "";
    return extension.replace(/[^a-z0-9]/g, "") || "jpg";
  } catch {
    return "jpg";
  }
}

export async function compressImage(buffer, contentType, sourceUrl) {
  const inputExtension = inferImageExtension(sourceUrl, contentType);
  const image = sharp(buffer, {
    animated: true,
    failOnError: false,
  });
  const metadata = await image.metadata();

  if (metadata.format === "gif" || metadata.pages > 1) {
    return {
      buffer,
      contentType: contentType || "image/gif",
      extension: inputExtension || "gif",
    };
  }

  if (metadata.format === "svg") {
    return {
      buffer,
      contentType: contentType || "image/svg+xml",
      extension: inputExtension || "svg",
    };
  }

  let pipeline = sharp(buffer, {
    failOnError: false,
  }).rotate();

  if (metadata.width && metadata.width > MAX_IMAGE_WIDTH) {
    pipeline = pipeline.resize({
      width: MAX_IMAGE_WIDTH,
      withoutEnlargement: true,
    });
  }

  if (metadata.hasAlpha) {
    return {
      buffer: await pipeline.png({
        compressionLevel: 9,
        palette: true,
        quality: 80,
      }).toBuffer(),
      contentType: "image/png",
      extension: "png",
    };
  }

  return {
    buffer: await pipeline.jpeg({
      quality: 72,
      mozjpeg: true,
      progressive: true,
    }).toBuffer(),
    contentType: "image/jpeg",
    extension: "jpg",
  };
}

export function buildImageBlobPath(postSlug, imageBuffer, extension) {
  const digest = crypto.createHash("sha1").update(imageBuffer).digest("hex").slice(0, 16);
  return `images/${postSlug}/${digest}.${extension}`;
}

export function rewriteMarkdownImageUrls(markdown, replacements) {
  return String(markdown ?? "").replace(MARKDOWN_IMAGE_REGEX, (fullMatch, alt, url, title = "") => {
    const replacementUrl = replacements.get(url);

    if (!replacementUrl) {
      return fullMatch;
    }

    if (title) {
      return `![${alt}](${replacementUrl} "${title}")`;
    }

    return `![${alt}](${replacementUrl})`;
  });
}

export async function syncMarkdownImagesToBlob(markdown, { postSlug }) {
  const matches = extractMarkdownImageUrls(markdown);
  const sourceUrls = [...new Set(matches.map((match) => match.url).filter(isNotionHostedImageUrl))];
  const replacements = new Map();
  const pathnames = [];

  await Promise.all(
    sourceUrls.map(async (sourceUrl) => {
      const downloaded = await downloadRemoteImage(sourceUrl);
      const compressed = await compressImage(downloaded.buffer, downloaded.contentType, sourceUrl);
      const pathname = buildImageBlobPath(postSlug, compressed.buffer, compressed.extension);
      const uploaded = await putPublicBlob(pathname, compressed.buffer, compressed.contentType);

      replacements.set(sourceUrl, uploaded.url);
      pathnames.push(pathname);
    }),
  );

  return {
    markdown: rewriteMarkdownImageUrls(markdown, replacements),
    pathnames,
  };
}

export async function cleanupPostImages(postSlug, keepPathnames = []) {
  const prefix = `images/${postSlug}/`;
  const keepSet = new Set(keepPathnames);
  const blobs = await listBlobsByPrefix(prefix);

  await Promise.all(
    blobs
      .filter((blob) => !keepSet.has(blob.pathname))
      .map((blob) => deletePathIfExists(blob.pathname)),
  );
}

export async function deleteAllPostImages(postSlug) {
  return deleteByPrefix(`images/${postSlug}/`);
}
