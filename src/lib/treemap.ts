export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The worst aspect ratio in a row of areas laid along a side of this length. */
function worst(areas: number[], sum: number, side: number): number {
  const s2 = side * side;
  const sum2 = sum * sum;
  return Math.max(...areas.map((a) => Math.max((s2 * a) / sum2, sum2 / (s2 * a))));
}

/**
 * Squarified treemap (Bruls, Huizing & van Wijk): fills `rect` with one
 * rectangle per value, areas proportional, keeping each as close to square
 * as the order allows. Values should be positive and sorted largest first;
 * the result is in the same order.
 */
export function squarify(values: number[], rect: Rect): Rect[] {
  const total = values.reduce((sum, v) => sum + v, 0);
  if (!total || rect.w <= 0 || rect.h <= 0) return values.map(() => ({ ...rect, w: 0, h: 0 }));

  const scale = (rect.w * rect.h) / total;
  const areas = values.map((v) => v * scale);
  const out: Rect[] = [];
  let { x, y, w, h } = rect;
  let i = 0;

  while (i < areas.length) {
    const side = Math.min(w, h);
    let sum = areas[i];
    let ratio = worst([areas[i]], sum, side);
    let j = i + 1;
    while (j < areas.length) {
      const next = worst(areas.slice(i, j + 1), sum + areas[j], side);
      if (next > ratio) break;
      ratio = next;
      sum += areas[j];
      j += 1;
    }

    // The row runs along the short side; its thickness eats into the long one.
    const thickness = sum / side;
    let offset = 0;
    for (let k = i; k < j; k++) {
      const length = areas[k] / thickness;
      out.push(w >= h ? { x, y: y + offset, w: thickness, h: length } : { x: x + offset, y, w: length, h: thickness });
      offset += length;
    }
    if (w >= h) {
      x += thickness;
      w -= thickness;
    } else {
      y += thickness;
      h -= thickness;
    }
    i = j;
  }
  return out;
}
