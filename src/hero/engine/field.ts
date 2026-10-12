/** Sheet 06 · Field: a living relief. A damped wave sim rides on a slow
 *  procedural terrain, contoured every frame. Drift particles stream along the
 *  isolines like a wind map. A click sends a pulse out from where it lands,
 *  dragging warps the ground under the pointer, and the cursor leaves a faint wake. */
import * as THREE from "three";
import type { PsxKit, SceneDef, TouchPoint } from "./psx";
import { MS } from "./topo";

export function buildField(k: PsxKit): SceneDef {
  const { mesh, psx, M, tex, view, U } = k;
  const PIVOT = new THREE.Vector3(0, -1, 0);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 400);
  const sky = k.skyDome(0.25, 0.7, 0.35, 0.55);
  scene.add(sky);

  /* ---- lattice: every field below lives on the same W×W grid ---- */
  const S = 120, N = 90, half = S / 2, cs = S / N, W = N + 1, WW = W * W;
  const hg = new Float32Array(WW); // composed height
  let u = new Float32Array(WW), up = new Float32Array(WW); // wave, now and previous
  const dx = new Float32Array(WW), dz = new Float32Array(WW), blur = new Float32Array(WW); // warp displacement
  const damp = new Float32Array(WW);
  // Sponge border so pulses die out off-frame instead of bouncing back.
  for (let z = 0; z < W; z++) for (let x = 0; x < W; x++) {
    const e = Math.min(x, z, N - x, N - z);
    damp[z * W + x] = e < 10 ? 0.9 + 0.088 * (e / 10) : 0.988;
  }

  const base = (x: number, z: number, t: number) => {
    const a = x * 0.085, b = z * 0.085;
    return 1.8 * Math.sin(a * 1.3 + t * 0.035) * Math.cos(b * 1.1 - t * 0.03) + 1.2 * Math.sin((a - b) * 0.8 + 2.1 + t * 0.02) +
      3.0 * Math.exp(-((x + 10) * (x + 10) + (z - 2) * (z - 2)) * 0.012) - 2.4 * Math.exp(-((x - 12) * (x - 12) + (z + 9) * (z + 9)) * 0.016) +
      0.4 * Math.sin(a * 2.7 + b * 3.3 - t * 0.06);
  };
  const cell = (v: number) => Math.max(0, Math.min(N - 1e-4, (v + half) / cs));
  const hAt = (x: number, z: number) => {
    const fx = cell(x), fz = cell(z), ix = fx | 0, iz = fz | 0, tx = fx - ix, tz = fz - iz, i = iz * W + ix;
    return (hg[i] * (1 - tx) + hg[i + 1] * tx) * (1 - tz) + (hg[i + W] * (1 - tx) + hg[i + W + 1] * tx) * tz;
  };

  /* ---- ground: indexed plane, vertex i ↔ grid node i ---- */
  const tgeo = new THREE.PlaneGeometry(S, S, N, N);
  tgeo.rotateX(-Math.PI / 2);
  const tpos = tgeo.attributes.position;
  const ground = mesh(tgeo, psx({ map: tex.tPlain, tint: "#3f4a4c", uv: 1, hypso: 1, amb: "#2c363e", sun: "#a9a594" }), scene);
  ground.frustumCulled = false;

  const lineBuf = (size: number, mat: THREE.Material) => {
    const arr = new Float32Array(size);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const l = new THREE.LineSegments(g, mat);
    l.frustumCulled = false;
    scene.add(l);
    return { arr, g };
  };
  const minor = lineBuf(N * N * 12 * 3, M.lBoneDim), index = lineBuf(N * N * 4 * 3, M.lAccent);
  const ticks = lineBuf(11 * 11 * 4 * 3, M.lDeep), rings = lineBuf(24 * 96 * 2 * 3, M.lAccent), reticle = lineBuf(24 * 2 * 3, M.lAccent);

  /* ---- drift particles: a head dot plus a short streak behind it ---- */
  const P = 1400, R0 = 46;
  const px = new Float32Array(P), pz = new Float32Array(P), life = new Float32Array(P);
  const headPos = new Float32Array(P * 3), headCol = new Float32Array(P * 3);
  const streakPos = new Float32Array(P * 6), streakCol = new Float32Array(P * 6);
  const spawn = (i: number) => {
    const a = k.rnd() * Math.PI * 2, r = Math.sqrt(k.rnd()) * R0;
    px[i] = Math.cos(a) * r; pz[i] = Math.sin(a) * r; life[i] = 3 + k.rnd() * 6;
  };
  for (let i = 0; i < P; i++) { spawn(i); life[i] *= k.rnd(); }
  const headG = new THREE.BufferGeometry();
  headG.setAttribute("position", new THREE.BufferAttribute(headPos, 3));
  headG.setAttribute("color", new THREE.BufferAttribute(headCol, 3));
  const heads = new THREE.Points(headG, new THREE.PointsMaterial({ size: 1, sizeAttenuation: false, vertexColors: true }));
  heads.frustumCulled = false;
  scene.add(heads);
  const streakG = new THREE.BufferGeometry();
  streakG.setAttribute("position", new THREE.BufferAttribute(streakPos, 3));
  streakG.setAttribute("color", new THREE.BufferAttribute(streakCol, 3));
  const streaks = new THREE.LineSegments(streakG, new THREE.LineBasicMaterial({ vertexColors: true }));
  streaks.frustumCulled = false;
  scene.add(streaks);

  /* ---- sources: springs that breathe a pulse on their own cycle ---- */
  const sources = [
    { x: -10, z: 2, period: 7, phase: 0.5, last: -1, name: "A" },
    { x: 13, z: -8, period: 9.5, phase: 4.2, last: -1, name: "B" },
    { x: 3, z: 16, period: 12, phase: 8.1, last: -1, name: "C" },
  ];
  const glyphG = new THREE.OctahedronGeometry(0.45, 0);
  const glyphs = sources.map((s) => mesh(glyphG, M.glyph, scene, s.x, 0, s.z));

  /* ---- interaction state ---- */
  const pulses: { x: number; z: number; t0: number; strong: boolean }[] = [];
  let aim: TouchPoint | null = null, aimS = 0, lastAim: TouchPoint | null = null;
  let nowS = performance.now() / 1000, acc = 0, maxU = 0, maxD = 0, nPulses = 0;
  const STEP = 1 / 30, C2 = 0.09, RING_V = Math.sqrt(C2) * cs / STEP;

  const stamp = (x: number, z: number, sig: number, fn: (i: number, g: number) => void) => {
    const r = Math.ceil((sig * 3) / cs), cx = Math.round((x + half) / cs), cz = Math.round((z + half) / cs), s2 = 1 / (2 * sig * sig);
    for (let iz = Math.max(1, cz - r); iz <= Math.min(N - 1, cz + r); iz++)
      for (let ix = Math.max(1, cx - r); ix <= Math.min(N - 1, cx + r); ix++) {
        const ox = -half + ix * cs - x, oz = -half + iz * cs - z;
        fn(iz * W + ix, Math.exp(-(ox * ox + oz * oz) * s2));
      }
  };
  // A raised bump released at rest spreads as a ring.
  const kick = (x: number, z: number, amp: number, sig: number) =>
    stamp(x, z, sig, (i, g) => { u[i] += amp * g; up[i] += amp * g; });
  const pulse = (x: number, z: number, amp: number, strong: boolean) => {
    kick(x, z, amp, 2.4);
    pulses.push({ x, z, t0: nowS, strong });
    if (pulses.length > 12) pulses.shift();
    nPulses++;
  };

  const touch: NonNullable<SceneDef["touch"]> = {
    ground: hAt,
    aim(p) {
      if (p && lastAim) {
        // The cursor leaves a light wake proportional to its speed.
        const sp = Math.hypot(p.x - lastAim.x, p.z - lastAim.z);
        if (sp > 0.05) kick(p.x, p.z, Math.min(0.35, sp * 0.06), 1.8);
      }
      aim = p;
      lastAim = p;
    },
    tap(p) { pulse(p.x, p.z, 3.4, true); },
    drag(p, mx, mz) {
      const len = Math.hypot(mx, mz);
      if (len < 1e-4) return;
      // Push the ground along the drag; the base relief is resampled through this displacement.
      stamp(p.x, p.z, 6.5, (i, g) => {
        dx[i] += mx * g * 1.3; dz[i] += mz * g * 1.3;
        const m = Math.hypot(dx[i], dz[i]);
        if (m > 18) { dx[i] *= 18 / m; dz[i] *= 18 / m; }
      });
      kick(p.x, p.z, Math.min(0.8, len * 0.12), 2.2);
      for (let i = 0; i < P; i++) {
        const ox = px[i] - p.x, oz = pz[i] - p.z, g = Math.exp(-(ox * ox + oz * oz) / 80);
        if (g > 0.02) { px[i] += mx * g; pz[i] += mz * g; }
      }
      maxD = Math.max(maxD, 0.5);
    },
    busy: () => maxU > 0.01 || maxD > 0.02 || pulses.length > 0,
  };

  /* ---- simulation ---- */
  const stepWave = () => {
    let m = 0;
    for (let z = 1; z < N; z++) for (let x = 1; x < N; x++) {
      const i = z * W + x, c = u[i];
      const v = (2 * c - up[i] + C2 * (u[i - 1] + u[i + 1] + u[i - W] + u[i + W] - 4 * c)) * damp[i];
      up[i] = v;
      if (v > m) m = v; else if (-v > m) m = -v;
    }
    const s = u; u = up; up = s;
    maxU = m;
  };
  const relaxWarp = (dt: number) => {
    if (maxD <= 0.02) return;
    const keep = Math.pow(0.74, dt);
    let m = 0;
    for (const f of [dx, dz]) {
      blur.set(f);
      for (let z = 1; z < N; z++) for (let x = 1; x < N; x++) {
        const i = z * W + x;
        f[i] = (blur[i] * 0.6 + (blur[i - 1] + blur[i + 1] + blur[i - W] + blur[i + W]) * 0.1) * keep;
        const a = Math.abs(f[i]);
        if (a > m) m = a;
      }
    }
    maxD = m;
    if (m <= 0.02) { dx.fill(0); dz.fill(0); maxD = 0; }
  };

  let lo = 0, hi = 0;
  const compose = (t: number) => {
    lo = 1e9; hi = -1e9;
    const warped = maxD > 0;
    for (let z = 0; z < W; z++) for (let x = 0; x < W; x++) {
      const i = z * W + x, wx = -half + x * cs, wz = -half + z * cs;
      const h = (warped ? base(wx - dx[i], wz - dz[i], t) : base(wx, wz, t)) + u[i];
      hg[i] = h;
      tpos.setY(i, h);
      if (h < lo) lo = h;
      if (h > hi) hi = h;
    }
    tpos.needsUpdate = true;
    tgeo.computeVertexNormals();
  };

  const LV0 = -8, LSTEP = 0.6, NLV = 28;
  const contours = () => {
    let nm = 0, ni = 0;
    const A = minor.arr, B = index.arr;
    const put = (out: Float32Array, n: number, e: number, x: number, y: number, a: number, b: number, c: number, d: number, l: number) => {
      let qx: number, qy: number;
      if (e === 0) { qx = x + (l - a) / (b - a); qy = y; }
      else if (e === 1) { qx = x + 1; qy = y + (l - b) / (c - b); }
      else if (e === 2) { qx = x + (l - d) / (c - d); qy = y + 1; }
      else { qx = x; qy = y + (l - a) / (d - a); }
      out[n] = -half + qx * cs; out[n + 1] = l + 0.1; out[n + 2] = -half + qy * cs;
    };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const a = hg[y * W + x], b = hg[y * W + x + 1], c = hg[(y + 1) * W + x + 1], d = hg[(y + 1) * W + x];
      const mn = Math.min(a, b, c, d), mx = Math.max(a, b, c, d);
      // Only the levels that cross this cell.
      const l0 = Math.max(0, Math.ceil((mn - LV0) / LSTEP)), l1 = Math.min(NLV - 1, Math.floor((mx - LV0) / LSTEP));
      for (let lv = l0; lv <= l1; lv++) {
        const l = LV0 + lv * LSTEP, s = MS[(a > l ? 8 : 0) | (b > l ? 4 : 0) | (c > l ? 2 : 0) | (d > l ? 1 : 0)];
        if (!s) continue;
        const isIdx = (lv + 3) % 5 === 0;
        for (let j = 0; j < s.length; j++) {
          if (isIdx) {
            if (ni + 6 > B.length) continue;
            put(B, ni, s[j][0], x, y, a, b, c, d, l); put(B, ni + 3, s[j][1], x, y, a, b, c, d, l); ni += 6;
          } else {
            if (nm + 6 > A.length) continue;
            put(A, nm, s[j][0], x, y, a, b, c, d, l); put(A, nm + 3, s[j][1], x, y, a, b, c, d, l); nm += 6;
          }
        }
      }
    }
    minor.g.setDrawRange(0, nm / 3); minor.g.attributes.position.needsUpdate = true;
    index.g.setDrawRange(0, ni / 3); index.g.attributes.position.needsUpdate = true;
  };

  // Survey crosses every 10 m, draped on the live surface.
  const drapeTicks = () => {
    const A = ticks.arr;
    let n = 0;
    for (let gz = -50; gz <= 50; gz += 10) for (let gx = -50; gx <= 50; gx += 10) {
      const y = hAt(gx, gz) + 0.15;
      A[n++] = gx - 0.8; A[n++] = y; A[n++] = gz; A[n++] = gx + 0.8; A[n++] = y; A[n++] = gz;
      A[n++] = gx; A[n++] = y; A[n++] = gz - 0.8; A[n++] = gx; A[n++] = y; A[n++] = gz + 0.8;
    }
    ticks.g.setDrawRange(0, n / 3); ticks.g.attributes.position.needsUpdate = true;
  };

  // Range rings: dashed circles riding the wavefront, dissolving as they age.
  const RING_LIFE = 3.2, SEG = 96;
  const drawRings = () => {
    const A = rings.arr;
    let n = 0;
    for (let p = pulses.length - 1; p >= 0; p--) if (nowS - pulses[p].t0 > RING_LIFE) pulses.splice(p, 1);
    for (const p of pulses) {
      const age = nowS - p.t0, f = age / RING_LIFE;
      for (const lag of p.strong ? [1, 0.72] : [1]) {
        const r = Math.max(0.4, RING_V * age * lag);
        for (let s = 0; s < SEG; s++) {
          const hsh = Math.sin(s * 12.9898 + p.t0 * 78.233) * 43758.5453;
          if (hsh - Math.floor(hsh) < f * (p.strong ? 1 : 1.3) || n + 6 > A.length) continue;
          const a0 = (s / SEG) * Math.PI * 2, a1 = ((s + 0.7) / SEG) * Math.PI * 2;
          const x0 = p.x + Math.cos(a0) * r, z0 = p.z + Math.sin(a0) * r, x1 = p.x + Math.cos(a1) * r, z1 = p.z + Math.sin(a1) * r;
          A[n++] = x0; A[n++] = hAt(x0, z0) + 0.2; A[n++] = z0;
          A[n++] = x1; A[n++] = hAt(x1, z1) + 0.2; A[n++] = z1;
        }
      }
    }
    rings.g.setDrawRange(0, n / 3); rings.g.attributes.position.needsUpdate = true;
  };

  const drawReticle = (dt: number) => {
    aimS += ((aim ? 1 : 0) - aimS) * (1 - Math.pow(0.002, dt));
    const A = reticle.arr;
    let n = 0;
    if (aim && aimS > 0.05) {
      const { x, z } = aim, r = 1.4 * aimS, y = hAt(x, z) + 0.25;
      for (let s = 0; s < 16; s++) {
        const a0 = (s / 16) * Math.PI * 2, a1 = ((s + 1) / 16) * Math.PI * 2;
        A[n++] = x + Math.cos(a0) * r; A[n++] = y; A[n++] = z + Math.sin(a0) * r;
        A[n++] = x + Math.cos(a1) * r; A[n++] = y; A[n++] = z + Math.sin(a1) * r;
      }
      for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        A[n++] = x + ox * r * 1.4; A[n++] = y; A[n++] = z + oz * r * 1.4;
        A[n++] = x + ox * r * 2.4; A[n++] = y; A[n++] = z + oz * r * 2.4;
      }
    }
    reticle.g.setDrawRange(0, n / 3); reticle.g.attributes.position.needsUpdate = true;
  };

  const bone = new THREE.Color("#d8d1bd");
  const drift = (dt: number) => {
    const ac = U.uAccent.value, fog = U.uFogColor.value;
    for (let i = 0; i < P; i++) {
      life[i] -= dt;
      if (life[i] <= 0 || px[i] * px[i] + pz[i] * pz[i] > R0 * R0 * 1.3) spawn(i);
      const ix = Math.max(1, Math.min(N - 1, Math.round((px[i] + half) / cs))), iz = Math.max(1, Math.min(N - 1, Math.round((pz[i] + half) / cs)));
      const j = iz * W + ix, k2 = 1 / (2 * cs);
      const gx = (hg[j + 1] - hg[j - 1]) * k2, gz = (hg[j + W] - hg[j - W]) * k2;
      const ux = (u[j + 1] - u[j - 1]) * k2, uz = (u[j + W] - u[j - W]) * k2;
      // Along the isolines (geostrophic drift), shoved outward by passing wavefronts.
      let vx = -gz * 3 - ux * 12, vz = gx * 3 - uz * 12;
      const sp = Math.hypot(vx, vz);
      if (sp > 8) { vx *= 8 / sp; vz *= 8 / sp; }
      px[i] += vx * dt; pz[i] += vz * dt;
      const y = hAt(px[i], pz[i]) + 0.25, s = Math.min(1, sp / 4);
      const fade = Math.min(1, life[i] * 1.5);
      const r = (bone.r + (ac.r - bone.r) * s) * fade, g = (bone.g + (ac.g - bone.g) * s) * fade, b = (bone.b + (ac.b - bone.b) * s) * fade;
      const o = i * 3, o2 = i * 6, tl = Math.min(1.6, sp * 0.2) / Math.max(sp, 1e-3);
      headPos[o] = px[i]; headPos[o + 1] = y; headPos[o + 2] = pz[i];
      headCol[o] = r; headCol[o + 1] = g; headCol[o + 2] = b;
      streakPos[o2] = px[i]; streakPos[o2 + 1] = y; streakPos[o2 + 2] = pz[i];
      streakPos[o2 + 3] = px[i] - vx * tl; streakPos[o2 + 4] = y; streakPos[o2 + 5] = pz[i] - vz * tl;
      streakCol[o2] = r * 0.7; streakCol[o2 + 1] = g * 0.7; streakCol[o2 + 2] = b * 0.7;
      streakCol[o2 + 3] = fog.r; streakCol[o2 + 4] = fog.g; streakCol[o2 + 5] = fog.b;
    }
    headG.attributes.position.needsUpdate = true; headG.attributes.color.needsUpdate = true;
    streakG.attributes.position.needsUpdate = true; streakG.attributes.color.needsUpdate = true;
  };

  let lastT = -1;
  return {
    scene, cam, fog: [50, 140], fov: [50, 64], limits: { pitch: [-0.85, 0.4], zoom: [0.6, 1.8] },
    labels: sources.slice(0, 2).map((s, j) => ({
      name: `Source ${s.name}`,
      sub: "",
      at: (v: THREE.Vector3) => { v.copy(glyphs[j].position); v.y += 1.1; },
      sub2: () => `${s.period} s`,
    })),
    touch,
    update(t) {
      const now = performance.now() / 1000, dt = Math.min(0.1, Math.max(0, now - nowS));
      nowS = now;
      // Springs fire on scene time, so they rest while motion is paused.
      if (t !== lastT) for (const s of sources) {
        const cyc = Math.floor((t + s.phase) / s.period);
        if (s.last >= 0 && cyc !== s.last) pulse(s.x, s.z, 1.4, false);
        s.last = cyc;
      }
      lastT = t;
      acc = Math.min(acc + dt, STEP * 4);
      while (acc >= STEP) { stepWave(); acc -= STEP; }
      relaxWarp(dt);
      compose(t);
      contours();
      drapeTicks();
      drawRings();
      drawReticle(dt);
      drift(dt);
      sources.forEach((s, j) => { glyphs[j].position.y = hAt(s.x, s.z) + 0.9 + Math.sin(t * 1.3 + j * 2) * 0.15; glyphs[j].rotation.y = t * 0.6 + j; });

      const a = 2.2 + t * 0.012 + view.px * 0.12 + view.yaw, r = 24;
      cam.position.set(Math.cos(a) * r, 36 - view.py * 4, Math.sin(a) * r);
      cam.lookAt(PIVOT);
      k.orbit(cam, PIVOT);
      sky.position.copy(cam.position);
    },
    readout() {
      return [
        ["Scale", "1:5 000"],
        ["Relief", `${((hi - lo) * 10).toFixed(0)} m`],
        ["Pulses", String(nPulses)],
        ["Brg", `${k.pad(Math.round(k.bearing(cam)), 3)}°`],
        ["Warp", `${(maxD * 10).toFixed(0)} m`],
      ];
    },
  };
}
