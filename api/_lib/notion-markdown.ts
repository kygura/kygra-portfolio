import type { MdBlock, MdStringObject } from "notion-to-md/build/types";

type NotionMarkdownSerializer = {
  toMarkdownString(markdownBlocks?: MdBlock[]): MdStringObject;
};

function sanitizeMarkdownBlocks(markdownBlocks: MdBlock[]): MdBlock[] {
  return markdownBlocks.map((block) => {
    const children = sanitizeMarkdownBlocks(Array.isArray(block.children) ? block.children : []);
    const sanitizedBlock: MdBlock = {
      ...block,
      parent: typeof block.parent === "string" ? block.parent : "",
      children:
        block.type === "quote"
          ? children.filter((child) => child.parent.trim() || child.children.length > 0)
          : children,
    };

    return sanitizedBlock;
  });
}

function flattenMarkdownBlocks(markdownBlocks: MdBlock[]): string {
  return markdownBlocks
    .flatMap((block) => [
      typeof block.parent === "string" ? block.parent : "",
      flattenMarkdownBlocks(Array.isArray(block.children) ? block.children : []),
    ])
    .map((value) => value.trim())
    .filter(Boolean)
    .join("\n\n");
}

export function notionMarkdownBlocksToString(
  markdownBlocks: MdBlock[],
  notionToMarkdown: NotionMarkdownSerializer,
): string {
  const sanitizedBlocks = sanitizeMarkdownBlocks(markdownBlocks);

  try {
    const result = notionToMarkdown.toMarkdownString(sanitizedBlocks);
    const markdown =
      result.parent ??
      Object.values(result)
        .map((value) => String(value).trim())
        .filter(Boolean)
        .join("\n\n");

    return String(markdown).trim();
  } catch (error) {
    console.warn("Falling back to flattened Notion markdown blocks", {
      message: error instanceof Error ? error.message : "Unknown markdown parse failure",
    });

    return flattenMarkdownBlocks(sanitizedBlocks).trim();
  }
}
