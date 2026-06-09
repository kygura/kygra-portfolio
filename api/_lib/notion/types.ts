/**
 * Shared block shape used across the Notion pipeline. The Notion SDK returns
 * richly-typed block objects; we widen them to an index-signature record and
 * attach a fully-fetched `children` array so the renderer always has the whole
 * tree without re-querying.
 */
export interface NotionBlock {
  id: string;
  type: string;
  has_children?: boolean;
  children: NotionBlock[];
  [key: string]: unknown;
}
