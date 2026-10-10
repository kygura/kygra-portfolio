// Pure helpers for Reader prose (DESIGN A4): GitHub-style callouts and heading levels.
// Alias-free so `node --test` can run prose.test.ts.

export const CALLOUTS = ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"] as const;
export type CalloutType = (typeof CALLOUTS)[number];

const MARKER = /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i;

/** `[!NOTE] text` -> "NOTE"; anything else -> null. Leading whitespace is allowed. */
export function calloutType(text: string): CalloutType | null {
  const m = MARKER.exec(text);
  return m ? (m[1].toUpperCase() as CalloutType) : null;
}

/** Drops the `[!TYPE]` marker (and the whitespace after it) from the start of `text`. */
export const stripCallout = (text: string): string => text.replace(MARKER, "");

/** WARNING and CAUTION render in `--glitch`, the rest in `--acc2`. */
export const calloutTone = (t: CalloutType): "warn" | "info" => (t === "WARNING" || t === "CAUTION" ? "warn" : "info");

/** Level of the Reader's own title (`h2`: the page `h1` is the HandleBlock, section panes are `h2`). */
export const READER_TITLE_LEVEL = 2;

/**
 * Offset added to markdown heading levels so the shallowest heading in `md` lands one level under
 * the Reader title (h3) and the outline never skips a level. ATX headings inside fenced code are ignored.
 */
export function headingShift(md: string): number {
  let min = 7;
  let fence: string | null = null;
  for (const line of md.split("\n")) {
    const f = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (f) {
      if (!fence) fence = f[1][0];
      else if (f[1][0] === fence) fence = null;
      continue;
    }
    if (fence) continue;
    const h = /^\s{0,3}(#{1,6})(?:\s|$)/.exec(line);
    if (h) min = Math.min(min, h[1].length);
  }
  return min > 6 ? 0 : READER_TITLE_LEVEL + 1 - min;
}

/** Markdown heading `level` after `shift`, clamped to h3..h6. */
export const shiftedLevel = (level: number, shift: number): number =>
  Math.max(READER_TITLE_LEVEL + 1, Math.min(6, level + shift));
