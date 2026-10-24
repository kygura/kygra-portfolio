/** A small pixel heart for the petting effect: one SVG path per palette key, in a 7x6 view. */
const ROWS = [".aa.aa.", "aAaaaaa", "aaaaaaa", ".aaaaa.", "..aaa..", "...a..."];

export const HEART_FILL: Record<string, string> = {
  a: "var(--accent)",
  A: "color-mix(in srgb, var(--accent) 45%, #ffffff)",
};

export const HEART: [string, string][] = Object.entries(
  ROWS.reduce<Record<string, string>>((d, row, y) => {
    [...row].forEach((c, x) => {
      if (c !== ".") d[c] = (d[c] ?? "") + `M${x} ${y}h1v1h-1z`;
    });
    return d;
  }, {}),
);
