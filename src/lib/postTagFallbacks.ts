import type { PostSummary } from "../../content/posts";

const SLUG_TAG_FALLBACKS: Record<string, string[]> = {
  "thaumazein": ["philosophy"],
  "100m": ["personal"],
  "always-against": ["philosophy", "politics"],
  "outsourced-spirituality": ["philosophy", "spirituality"],
  "the-perpetual-i": ["philosophy", "identity"],
  "the-game-of-democracy": ["philosophy", "politics"],
  "the-price-of-progress": ["philosophy", "modernity"],
  "conditioned-by-freedom": ["philosophy", "freedom"],
  "a-philosophy-of-pragmatic-sovereignity": ["philosophy"],
  "on-the-state-of-things": ["philosophy", "modernity"],
  "quantum-history": ["philosophy", "history"],
  "the-movement-of-the-world": ["philosophy", "history"],
};

export function resolvePostTags(post: Pick<PostSummary, "slug" | "tags">): string[] {
  if (post.tags.length > 0) return post.tags;
  return SLUG_TAG_FALLBACKS[post.slug] ?? [];
}
