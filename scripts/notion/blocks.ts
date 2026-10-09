import { iteratePaginatedAPI, type Client } from "@notionhq/client";
import { getNotionClient } from "./client.ts";
import type { NotionBlock } from "./types.ts";

/**
 * Recursively fetch a block's children, attaching each block's own children so
 * the renderer receives the complete tree. Pagination is handled by the SDK's
 * `iteratePaginatedAPI`; the list method is wrapped in an arrow to preserve
 * `this` binding.
 */
export async function fetchAllBlocks(
  blockId: string,
  client: Client = getNotionClient(),
): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];

  for await (const block of iteratePaginatedAPI(
    (args: { block_id: string; start_cursor?: string }) =>
      client.blocks.children.list(args),
    { block_id: blockId },
  )) {
    const normalized = block as unknown as NotionBlock;
    normalized.children = normalized.has_children
      ? await fetchAllBlocks(normalized.id, client)
      : [];
    blocks.push(normalized);
  }

  return blocks;
}
