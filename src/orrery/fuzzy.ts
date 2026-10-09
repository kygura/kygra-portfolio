// Subsequence fuzzy matching for the CommandLine (DESIGN §7). Same algorithm as the
// mock: greedy left-to-right, score = sum of skipped characters (lower is better).

export interface FuzzyMatch {
  score: number;
  /** Matched character indices in the candidate. */
  indices: number[];
  /** The same indices merged into half-open `[start, end)` ranges for highlighting. */
  ranges: [number, number][];
}

export function toRanges(indices: number[]): [number, number][] {
  const out: [number, number][] = [];
  for (const i of indices) {
    const last = out[out.length - 1];
    if (last && last[1] === i) last[1] = i + 1;
    else out.push([i, i + 1]);
  }
  return out;
}

export function fuzzy(query: string, text: string): FuzzyMatch | null {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  const indices: number[] = [];
  let from = 0;
  let last = -1;
  let score = 0;
  for (const ch of q) {
    const k = t.indexOf(ch, from);
    if (k < 0) return null;
    indices.push(k);
    score += k - last - 1;
    last = k;
    from = k + 1;
  }
  return { score, indices, ranges: toRanges(indices) };
}

export interface Ranked<T> {
  item: T;
  match: FuzzyMatch;
}

/** Matches every item, drops misses, sorts by score (stable, so ties keep table order). */
export function rank<T>(query: string, items: readonly T[], key: (item: T) => string, limit = Infinity): Ranked<T>[] {
  const out: Ranked<T>[] = [];
  for (const item of items) {
    const match = fuzzy(query, key(item));
    if (match) out.push({ item, match });
  }
  return out.sort((a, b) => a.match.score - b.match.score).slice(0, limit);
}

/** Splits `text` into plain/highlighted runs for rendering matched characters in `--acc`. */
export function segments(text: string, ranges: [number, number][]): { text: string; hit: boolean }[] {
  const out: { text: string; hit: boolean }[] = [];
  let at = 0;
  for (const [s, e] of ranges) {
    if (s > at) out.push({ text: text.slice(at, s), hit: false });
    out.push({ text: text.slice(s, e), hit: true });
    at = e;
  }
  if (at < text.length) out.push({ text: text.slice(at), hit: false });
  return out;
}
