/** Sheet 02 · Topo: shifting relief with marching-squares contours, index
 *  contours every 2.5 m, a draped 5 m survey grid, trig points and a sweep. */
import * as THREE from "three";
import type { PsxKit, SceneDef } from "./psx";

// Marching-squares edge pairs per cell case (edges: 0 top, 1 right, 2 bottom, 3 left).
const MS: Record<number, [number, number][]> = {
  1: [[3, 2]], 2: [[2, 1]], 3: [[3, 1]], 4: [[0, 1]], 5: [[0, 1], [3, 2]], 6: [[0, 2]], 7: [[0, 3]],
  8: [[0, 3]], 9: [[0, 2]], 10: [[0, 3], [2, 1]], 11: [[0, 1]], 12: [[3, 1]], 13: [[2, 1]], 14: [[3, 2]],
};

export function buildTopo(k: PsxKit): SceneDef {
  const { mesh, psx, M, tex, view, U } = k;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 400);
  const sky = k.skyDome(0, 0.35, 0.6);
  scene.add(sky);

  const S = 40, N = 40, half = S / 2, cs = S / N, W = N + 1;
  const hg = new Float32Array(W * W);
  const field = (x: number, z: number, t: number) => {
    const u = x * 0.12, v = z * 0.12;
    return 2.0 * Math.sin(u * 1.1 + t * 0.05) * Math.cos(v * 0.9 - t * 0.04) + 1.1 * Math.sin((u + v) * 0.7 + 1.3 + t * 0.03) +
      3.4 * Math.exp(-((x - 6) * (x - 6) + (z + 4) * (z + 4)) * 0.014) - 2.2 * Math.exp(-((x + 8) * (x + 8) + (z - 7) * (z - 7)) * 0.02) +
      0.35 * Math.sin(u * 3.1 - v * 2.3 + t * 0.07);
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
  const terrain = mesh(tgeo, psx({ map: tex.tPlain, tint: "#5d6967", uv: 1, sweep: 0.4, hypso: 1, amb: "#3e4a52", sun: "#c9c2ae" }), scene);
  terrain.frustumCulled = false;

  const LV0 = -5, LSTEP = 0.5, NLV = 24;
  const minPos = new Float32Array(N * N * 4 * 8 * 3);
  const idxPos = new Float32Array(N * N * 4 * 4 * 3);
  const gridPos = new Float32Array(2 * 9 * N * 2 * 3);
  const lineBuf = (arr: Float32Array, mat: THREE.Material) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const l = new THREE.LineSegments(g, mat);
    l.frustumCulled = false;
    scene.add(l);
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
  const trigM = trig.map((p) => mesh(trigG, M.glyph, scene, p.x, 0, p.z));
  let lo = 0, hi = 0, lastT = -1;

  const rebuild = (t: number) => {
    lo = 1e9; hi = -1e9;
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      const h = field(-half + x * cs, -half + y * cs, t);
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
    trig.forEach((p, j) => { p.y = field(p.x, p.z, t) + 0.55; trigM[j].position.y = p.y; });
  };

  const elev = (p: THREE.Vector3) => `${Math.round(400 + p.y * 10)} m`;

  return {
    scene, cam, fog: [42, 95], fov: [50, 64],
    labels: [
      { name: "Trig point", sub: "", at: (v) => { v.copy(trig[0]); v.y += 1.2; }, sub2: () => elev(trig[0]) },
      { name: "Trig point", sub: "", at: (v) => { v.copy(trig[1]); v.y += 1.2; }, sub2: () => elev(trig[1]) },
      { name: "Hollow", sub: "closed depression", at: (v) => { v.set(-8, field(-8, 7, U.uTime.value) + 0.6, 7); } },
    ],
    update(t) {
      const a = 0.9 + t * 0.03 + view.px * 0.15, r = 33;
      cam.position.set(Math.cos(a) * r, 24 - view.py * 4, Math.sin(a) * r);
      cam.lookAt(0, -1.5, 0);
      sky.position.copy(cam.position);
      if (Math.abs(t - lastT) > 0.03 || lastT < 0) { rebuild(t); lastT = t; }
    },
    readout() {
      return [
        ["Scale", "1:2 500"],
        ["CI", "0.5 m · index 2.5 m"],
        ["Relief", `${((hi - lo) * 10).toFixed(0)} m`],
        ["Brg", `${k.pad(Math.round(k.bearing(cam)), 3)}°`],
        ["Grid", "5 m"],
      ];
    },
  };
}
