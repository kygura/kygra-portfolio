// Procedural canvas textures, generated at boot (DESIGN section 6): 64x64 noise and checker, an 8x8 star sprite and
// a 32x128 glyph strip of random Silkscreen characters for the monolith. Nearest filtering, no mipmaps, repeat wrap.
import { CanvasTexture, NearestFilter, RepeatWrapping } from "three";

export interface SkyTextures {
  noise: CanvasTexture;
  chk: CanvasTexture;
  star: CanvasTexture;
  gly: CanvasTexture;
}

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+/<>=?";

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d") as CanvasRenderingContext2D];
}

function texture(c: HTMLCanvasElement): CanvasTexture {
  const t = new CanvasTexture(c);
  t.minFilter = t.magFilter = NearestFilter;
  t.generateMipmaps = false;
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

function gray(w: number, h: number, f: (x: number, y: number) => number): CanvasTexture {
  const [c, g] = canvas(w, h);
  const d = g.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const v = f(i % w, (i / w) | 0) * 255;
    d.data.set([v, v, v, 255], i * 4);
  }
  g.putImageData(d, 0, 0);
  return texture(c);
}

/** `rnd` is the scene's seeded generator; call order matches the mock so the sky looks the same. */
export function makeTextures(rnd: () => number): SkyTextures {
  const noise = gray(64, 64, () => 0.55 + rnd() * 0.45);
  const chk = gray(64, 64, (x, y) => (((x >> 3) ^ (y >> 3)) & 1 ? 0.9 : 0.5) * (0.85 + rnd() * 0.15));
  const star = gray(8, 8, (x, y) => (((x == 3 || x == 4) && y > 0 && y < 7) || ((y == 3 || y == 4) && x > 0 && x < 7) ? 1 : 0));
  const [c, g] = canvas(32, 128);
  g.fillStyle = "rgb(58,58,58)";
  g.fillRect(0, 0, 32, 128);
  g.fillStyle = "rgb(176,176,176)";
  g.font = "8px Silkscreen, monospace";
  g.textBaseline = "top";
  for (let r = 0; r < 16; r++)
    for (let k = 0; k < 4; k++) if (rnd() < 0.8) g.fillText(GLYPHS[(rnd() * GLYPHS.length) | 0], k * 8 + 1, r * 8);
  return { noise, chk, star, gly: texture(c) };
}
