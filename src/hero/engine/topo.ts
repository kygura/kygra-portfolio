/** Sheet 01 · Topo: a ping on a contour-drawn world map, then a zoom that tilts
 *  to isometric as the local relief rises: marching-squares contours, index
 *  contours every 2.5 m, a draped 5 m survey grid, trig points, a sweep, and
 *  the lake with the tower over it at the centre. */
import * as THREE from "three";
import type { PsxKit, SceneDef, V3 } from "./psx";

// Marching-squares edge pairs per cell case (edges: 0 top, 1 right, 2 bottom, 3 left).
const MS: Record<number, [number, number][]> = {
  1: [[3, 2]], 2: [[2, 1]], 3: [[3, 1]], 4: [[0, 1]], 5: [[0, 1], [3, 2]], 6: [[0, 2]], 7: [[0, 3]],
  8: [[0, 3]], 9: [[0, 2]], 10: [[0, 3], [2, 1]], 11: [[0, 1]], 12: [[3, 1]], 13: [[2, 1]], 14: [[3, 2]],
};

// The pinged site: the same coordinates the ruins sheet reads out.
const TLAT = 47.2023, TLON = 8.5288;
// Map degrees → world units at the end of the zoom (tile is 40 units ≈ 2°).
const Z0 = 0.7, Z1 = 20;

const hash2 = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const vnoise = (x: number, y: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
/** Invented continents, with land guaranteed around the site. */
const land = (lon: number, lat: number) => {
  let f = 0, amp = 0.5, fr = 1 / 38;
  for (let o = 0; o < 4; o++) {
    f += vnoise(lon * fr + 31.7, lat * fr - 12.3) * amp;
    amp *= 0.5;
    fr *= 2.1;
  }
  const dl = (lon - TLON) ** 2 + (lat - TLAT) ** 2;
  return f - 0.5 + 0.3 * Math.exp(-dl / 140) - 0.12 * Math.max(0, (Math.abs(lat) - 70) / 20);
};

export function buildTopo(k: PsxKit): SceneDef {
  const { mesh, psx, M, tex, view, U, ramp, ease, lerp } = k;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 400);
  const sky = k.skyDome(0, 0.35, 0.6);
  scene.add(sky);

  /* ---- world map: coastlines, two inland contours, 15° graticule ---- */
  const map = new THREE.Group();
  scene.add(map);
  const mapCol = [new THREE.Color("#d8d1bd"), new THREE.Color("#9ea596"), new THREE.Color()];
  const mapMat = mapCol.map(() => k.lineMat({ value: new THREE.Color() }, 400));
  {
    const D = 1.5, GW = 360 / D + 1, GH = 180 / D + 1;
    const g = new Float32Array(GW * GH);
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) g[y * GW + x] = land(-180 + x * D, 90 - y * D);
    const at = (lon: number, lat: number) => new THREE.Vector3(lon - TLON, 0, TLAT - lat);
    const lines: V3[][] = [[], []];
    [0, 0.09].forEach((l, li) => {
      for (let y = 0; y < GH - 1; y++) for (let x = 0; x < GW - 1; x++) {
        const a = g[y * GW + x], b = g[y * GW + x + 1], c = g[(y + 1) * GW + x + 1], d = g[(y + 1) * GW + x];
        const s = MS[(a > l ? 8 : 0) | (b > l ? 4 : 0) | (c > l ? 2 : 0) | (d > l ? 1 : 0)];
        if (!s) continue;
        const edge = (e: number) => {
          let qx: number, qy: number;
          if (e === 0) { qx = x + (l - a) / (b - a); qy = y; }
          else if (e === 1) { qx = x + 1; qy = y + (l - b) / (c - b); }
          else if (e === 2) { qx = x + (l - d) / (c - d); qy = y + 1; }
          else { qx = x; qy = y + (l - a) / (d - a); }
          return at(-180 + qx * D, 90 - qy * D);
        };
        for (const [e0, e1] of s) lines[li].push(edge(e0), edge(e1));
      }
    });
    const grat: V3[] = [];
    for (let lo = -180; lo <= 180; lo += 15) grat.push(at(lo, -90), at(lo, 90));
    for (let la = -90; la <= 90; la += 15) grat.push(at(-180, la), at(180, la));
    map.add(k.segs(lines[0], mapMat[0]), k.segs(lines[1], mapMat[1]), k.segs(grat, mapMat[2]));
  }

  /* ---- the ping: expanding rings and a crosshair, held at a constant screen size ---- */
  const ping = new THREE.Group();
  scene.add(ping);
  const pingFlat = new THREE.Group();
  pingFlat.rotation.x = -Math.PI / 2;
  ping.add(pingFlat);
  const ringGeo = new THREE.BufferGeometry().setFromPoints(k.circle(1, 48));
  const rings = [0, 1, 2].map(() => {
    const m = k.lineMat({ value: new THREE.Color() }, 400);
    const l = new THREE.LineLoop(ringGeo, m);
    pingFlat.add(l);
    return { l, m };
  });
  const crossMat = k.lineMat({ value: new THREE.Color() }, 400);
  const cross: V3[] = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    cross.push(new THREE.Vector3(dx * 0.35, dy * 0.35, 0), new THREE.Vector3(dx * 1.6, dy * 1.6, 0));
  }
  pingFlat.add(k.segs(cross, crossMat));

  /* ---- local tile: the existing relief, scaled into the map at the site ---- */
  const tile = new THREE.Group();
  scene.add(tile);
  const S = 40, N = 40, half = S / 2, cs = S / N, W = N + 1;
  const hg = new Float32Array(W * W);
  const field = (x: number, z: number, t: number) => {
    const u = x * 0.12, v = z * 0.12;
    return 2.0 * Math.sin(u * 1.1 + t * 0.05) * Math.cos(v * 0.9 - t * 0.04) + 1.1 * Math.sin((u + v) * 0.7 + 1.3 + t * 0.03) +
      3.4 * Math.exp(-((x - 6) * (x - 6) + (z + 4) * (z + 4)) * 0.014) - 2.2 * Math.exp(-((x + 8) * (x + 8) + (z - 7) * (z - 7)) * 0.02) -
      2.8 * Math.exp(-(x * x + z * z) * 0.03) + 0.35 * Math.sin(u * 3.1 - v * 2.3 + t * 0.07);
  };
  const tg = new THREE.PlaneGeometry(S, S, N, N);
  tg.rotateX(-Math.PI / 2);
  const tgeo = tg.toNonIndexed();
  tg.dispose();
  const tpos = tgeo.attributes.position;
  const vmap = new Int32Array(tpos.count);
  for (let i = 0; i < tpos.count; i++) {
    vmap[i] = Math.round((tpos.getZ(i) + half) / cs) * W + Math.round((tpos.getX(i) + half) / cs);
  }
  const terrain = mesh(tgeo, psx({ map: tex.tPlain, tint: "#5d6967", uv: 1, sweep: 0.4, hypso: 1, amb: "#3e4a52", sun: "#c9c2ae" }), tile);
  terrain.frustumCulled = false;

  const lakeG = new THREE.CircleGeometry(4.2, 10);
  lakeG.rotateX(-Math.PI / 2);
  const lake = mesh(lakeG, psx({ map: tex.tPlain, tint: "#3a5258", amb: "#2c3a40", sun: "#7d9aa0", sweep: 0.6 }), tile);
  const towerG = new THREE.OctahedronGeometry(0.5, 0);
  towerG.scale(1, 3.2, 1);
  const tower = mesh(towerG, M.glyph, tile);

  const LV0 = -5, LSTEP = 0.5, NLV = 24;
  const minPos = new Float32Array(N * N * 4 * 8 * 3);
  const idxPos = new Float32Array(N * N * 4 * 4 * 3);
  const gridPos = new Float32Array(2 * 9 * N * 2 * 3);
  const lineBuf = (arr: Float32Array, mat: THREE.Material) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const l = new THREE.LineSegments(g, mat);
    l.frustumCulled = false;
    tile.add(l);
    return g;
  };
  const gMin = lineBuf(minPos, M.lBoneDim), gIdx = lineBuf(idxPos, M.lAccent), gGrid = lineBuf(gridPos, M.lDeep);
  const cnt = [0, 0];
  const ep = (out: Float32Array, ci: number, e: number, x: number, y: number, a: number, b: number, c: number, d: number, l: number) => {
    let tt: number, qx: number, qy: number;
    const n = cnt[ci];
    if (n + 3 > out.length) return;
    if (e === 0) { tt = (l - a) / (b - a); qx = x + tt; qy = y; }
    else if (e === 1) { tt = (l - b) / (c - b); qx = x + 1; qy = y + tt; }
    else if (e === 2) { tt = (l - d) / (c - d); qx = x + tt; qy = y + 1; }
    else { tt = (l - a) / (d - a); qx = x; qy = y + tt; }
    out[n] = -half + qx * cs; out[n + 1] = l + 0.12; out[n + 2] = -half + qy * cs;
    cnt[ci] = n + 3;
  };
  const trig = [new THREE.Vector3(6, 0, -4), new THREE.Vector3(-13, 0, -12)];
  const trigG = new THREE.ConeGeometry(0.42, 0.85, 3);
  const trigM = trig.map((p) => mesh(trigG, M.glyph, tile, p.x, 0, p.z));
  let lo = 0, hi = 0, lastT = -1, lastH = -1, lakeY = 0;

  /** `hs` scales the relief: 0 is the flat map, 1 the full survey. */
  const rebuild = (t: number, hs: number) => {
    lo = 1e9; hi = -1e9;
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      const h = field(-half + x * cs, -half + y * cs, t) * hs;
      hg[y * W + x] = h;
      if (h < lo) lo = h;
      if (h > hi) hi = h;
    }
    for (let i = 0; i < tpos.count; i++) tpos.setY(i, hg[vmap[i]]);
    tpos.needsUpdate = true;
    tgeo.computeVertexNormals();
    cnt[0] = 0; cnt[1] = 0;
    for (let lv = 0; lv < NLV; lv++) {
      const l = LV0 + lv * LSTEP, isIdx = Math.round(l / LSTEP) % 5 === 0, out = isIdx ? idxPos : minPos, ci = isIdx ? 1 : 0;
      if (l < lo || l > hi) continue;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const a = hg[y * W + x], b = hg[y * W + x + 1], c = hg[(y + 1) * W + x + 1], d = hg[(y + 1) * W + x];
        const s = MS[(a > l ? 8 : 0) | (b > l ? 4 : 0) | (c > l ? 2 : 0) | (d > l ? 1 : 0)];
        if (!s) continue;
        for (let i = 0; i < s.length; i++) {
          ep(out, ci, s[i][0], x, y, a, b, c, d, l);
          ep(out, ci, s[i][1], x, y, a, b, c, d, l);
        }
      }
    }
    gMin.setDrawRange(0, cnt[0] / 3); gMin.attributes.position.needsUpdate = true;
    gIdx.setDrawRange(0, cnt[1] / 3); gIdx.attributes.position.needsUpdate = true;
    let n = 0;
    for (let gl = 0; gl <= N; gl += 5) for (let sg = 0; sg < N; sg++) {
      gridPos[n++] = -half + gl * cs; gridPos[n++] = hg[sg * W + gl] + 0.14; gridPos[n++] = -half + sg * cs;
      gridPos[n++] = -half + gl * cs; gridPos[n++] = hg[(sg + 1) * W + gl] + 0.14; gridPos[n++] = -half + (sg + 1) * cs;
      gridPos[n++] = -half + sg * cs; gridPos[n++] = hg[gl * W + sg] + 0.14; gridPos[n++] = -half + gl * cs;
      gridPos[n++] = -half + (sg + 1) * cs; gridPos[n++] = hg[gl * W + sg + 1] + 0.14; gridPos[n++] = -half + gl * cs;
    }
    gGrid.setDrawRange(0, n / 3); gGrid.attributes.position.needsUpdate = true;
    trig.forEach((p, j) => { p.y = field(p.x, p.z, t) * hs + 0.55; trigM[j].position.y = p.y; });
    // Water sits just under the lowest point of the basin rim, so the rim hides the disc's edge.
    let rim = 1e9;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      rim = Math.min(rim, field(Math.cos(a) * 4.2, Math.sin(a) * 4.2, t));
    }
    lakeY = rim * hs - 0.06;
    lake.position.y = lakeY;
  };

  const elev = (p: THREE.Vector3) => `${Math.round(400 + p.y * 10)} m`;
  const fog = new THREE.Color();
  let hs = 1, camD = 41;

  return {
    scene, cam, fog: [42, 95], fov: [50, 64], dur: 15, still: 0.96,
    labels: [
      { name: "Signal", sub: "47°12′N 8°31′E", at: (v) => { v.set(0, 1.5, 0); } },
      { name: "Tower", sub: "over standing water", at: (v) => { tower.getWorldPosition(v); v.y += 2; } },
      { name: "Trig point", sub: "", at: (v) => { v.copy(trig[0]); tile.localToWorld(v); v.y += 1.2; }, sub2: () => elev(trig[0]) },
    ],
    update(t, p) {
      const zoom = ease(ramp(p, 0.18, 0.82));
      const tilt = ease(ramp(p, 0.35, 0.9));
      hs = ease(ramp(p, 0.5, 0.88));

      // Exponential zoom about the site, which stays at the origin.
      const z = Z0 * Math.pow(Z1 / Z0, zoom);
      map.scale.setScalar(z);
      tile.scale.setScalar(z / Z1);

      const el = lerp(1.535, 0.63, tilt);
      const a = Math.PI / 2 + 0.6 * tilt + Math.sin(t * 0.05) * 0.04 + view.px * 0.15;
      camD = lerp(62, 41, zoom);
      cam.position.set(Math.cos(el) * Math.cos(a) * camD, Math.sin(el) * camD - view.py * 4 * tilt, Math.cos(el) * Math.sin(a) * camD);
      cam.lookAt(0, -1.5 * tilt, 0);
      sky.position.copy(cam.position);

      // Map lines sink into the fog as the survey takes over.
      fog.copy(U.uFogColor.value);
      mapCol[2].copy(U.uAccent2.value);
      const mf = ramp(zoom, 0.72, 0.95);
      map.visible = mf < 1;
      mapMat.forEach((m, i) => (m.uniforms.uColor.value as THREE.Color).copy(mapCol[i]).lerp(fog, mf));

      const pf = ramp(p, 0.3, 0.55);
      ping.visible = pf < 1;
      ping.scale.setScalar(camD * 0.07);
      ping.position.y = 0.05;
      rings.forEach((r, i) => {
        const ph = (t * 0.45 + i / 3) % 1;
        r.l.scale.setScalar(0.4 + ph * 2.6);
        (r.m.uniforms.uColor.value as THREE.Color).copy(U.uAccent.value).lerp(fog, Math.max(ph, pf));
      });
      (crossMat.uniforms.uColor.value as THREE.Color).copy(U.uAccent.value).lerp(fog, pf);

      terrain.visible = lake.visible = hs > 0.001;
      if (Math.abs(t - lastT) > 0.03 || lastT < 0 || hs !== lastH) { rebuild(t, hs); lastT = t; lastH = hs; }
      tower.scale.setScalar(Math.max(0.001, hs));
      tower.position.y = lakeY + 2.6 * hs + Math.sin(t * 0.6) * 0.2;
      tower.rotation.y = t * 0.4;
    },
    readout() {
      return [
        ["Scale", hs < 0.5 ? "1:40 000 000" : "1:2 500"],
        ["CI", "0.5 m · index 2.5 m"],
        ["Relief", `${((hi - lo) * 10).toFixed(0)} m`],
        ["Brg", `${k.pad(Math.round(k.bearing(cam)), 3)}°`],
        ["Grid", hs < 0.5 ? "15°" : "5 m"],
      ];
    },
  };
}
