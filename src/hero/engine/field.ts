/** Sheet 06 · Field: a living survey surface. Contours and a draped grid ride a
 *  drifting scalar field, a few thousand particles flow along it, and the
 *  pointer plays it: hover swells it, a press dents it, a drag drags the
 *  contours with it, and a tap sends a wavefront out from the touch point
 *  that the source answers when it arrives. */
import * as THREE from "three";
import type { PsxKit, SceneDef } from "./psx";

// Marching-squares edge pairs per cell case (edges: 0 top, 1 right, 2 bottom, 3 left).
const MS: Record<number, [number, number][]> = {
  1: [[3, 2]], 2: [[2, 1]], 3: [[3, 1]], 4: [[0, 1]], 5: [[0, 1], [3, 2]], 6: [[0, 2]], 7: [[0, 3]],
  8: [[0, 3]], 9: [[0, 2]], 10: [[0, 3], [2, 1]], 11: [[0, 1]], 12: [[3, 1]], 13: [[2, 1]], 14: [[3, 2]],
};

interface Pulse { x: number; z: number; r: number; a0: number; age: number }
interface Wake { x: number; z: number; dx: number; dz: number; s: number }

const PULSE_C = 18;      // wavefront speed, world units / s
const PULSE_LIFE = 6;    // s
const PULSE_W = 2.4;     // wavefront half-width
const MAX_PULSES = 8;
const MAX_WAKE = 28;
const RING_SEGS = 72;
const NP = 1500;         // particles

export function buildField(k: PsxKit): SceneDef {
  const { mesh, psx, M, tex, view, U, lineMat } = k;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 400);
  const sky = k.skyDome(0, 0.25, 0.5);
  scene.add(sky);

  const S = 120, N = 80, half = S / 2, cs = S / N, W = N + 1, GS = 4, RELIEF = 0.6;
  const SRC = { x: 5, z: -3 };
  const hg = new Float32Array(W * W);

  /* ---- interaction state ---- */
  const pulses: Pulse[] = [];
  const wake: Wake[] = [];
  const echoes: number[] = [];       // seconds until the source answers a tap
  const cur = { x: 0, z: 0 };        // pointer, world
  const sm = { x: 0, z: 0 };         // smoothed pointer for the swell / dent
  const pv = { x: 0, z: 0 };         // pointer velocity, world units / s
  const downAt = { x: 0, z: 0, t: 0 };
  const last = { x: 0, z: 0, t: 0, wx: 0, wz: 0 };
  let inside = false, down = false, hover = 0, hold = 0, clock = 0, lastK = -1;

  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  const ndc = new THREE.Vector2();
  const toWorld = (x: number, y: number) => {
    ndc.set(x, y);
    ray.setFromCamera(ndc, cam);
    if (!ray.ray.intersectPlane(plane, hit)) return false;
    cur.x = Math.max(-half, Math.min(half, hit.x));
    cur.z = Math.max(-half, Math.min(half, hit.z));
    return true;
  };

  const spawn = (x: number, z: number, a0: number) => {
    pulses.push({ x, z, r: 0, a0, age: 0 });
    if (pulses.length > MAX_PULSES) pulses.shift();
  };

  /* ---- the field ---- */
  const sample = (x: number, z: number, t: number) => {
    let wx = x, wz = z;
    for (let i = 0; i < wake.length; i++) {
      const w = wake[i], ex = x - w.x, ez = z - w.z, d2 = ex * ex + ez * ez;
      if (d2 < 520) {
        const f = w.s * Math.exp(-d2 / 98) * 1.7;
        wx -= w.dx * f;
        wz -= w.dz * f;
      }
    }
    const u = wx * 0.11, v = wz * 0.1;
    const dx = wx - SRC.x, dz = wz - SRC.z;
    let h =
      2.0 * Math.sin(u * 1.1 + t * 0.05) * Math.cos(v * 0.95 - t * 0.04) +
      1.2 * Math.sin((u + v) * 0.75 + 1.3 + t * 0.03) +
      0.4 * Math.sin(u * 3.1 - v * 2.3 + t * 0.07) +
      3.2 * Math.exp(-(dx * dx + dz * dz) * 0.018);
    if (hover > 0.001) {
      const hx = x - sm.x, hz = z - sm.z;
      h += 0.9 * hover * Math.exp(-(hx * hx + hz * hz) / 60);
    }
    if (hold > 0.001) {
      const hx = x - sm.x, hz = z - sm.z;
      h -= 2.2 * hold * Math.exp(-(hx * hx + hz * hz) / 44);
    }
    for (let i = 0; i < pulses.length; i++) {
      const p = pulses[i], ex = x - p.x, ez = z - p.z, d2 = ex * ex + ez * ez;
      const lo = p.r - PULSE_W * 3, hi = p.r + PULSE_W * 3;
      if (d2 < hi * hi && (lo < 0 || d2 > lo * lo)) {
        const q = Math.sqrt(d2) - p.r;
        h += p.a0 * Math.exp(-p.age * 0.45) * Math.cos(q * 1.35) * Math.exp(-(q * q) / (PULSE_W * PULSE_W));
      }
    }
    return h;
  };

  /* ---- surface, contours, survey grid ---- */
  const tg = new THREE.PlaneGeometry(S, S, N, N);
  tg.rotateX(-Math.PI / 2);
  const tgeo = tg.toNonIndexed();
  tg.dispose();
  const tpos = tgeo.attributes.position;
  const vmap = new Int32Array(tpos.count);
  for (let i = 0; i < tpos.count; i++) {
    vmap[i] = Math.round((tpos.getZ(i) + half) / cs) * W + Math.round((tpos.getX(i) + half) / cs);
  }
  const terrain = mesh(tgeo, psx({ map: tex.tPlain, tint: "#4f5b5a", uv: 1, hypso: 1, amb: "#38444c", sun: "#b9b4a2" }), scene);
  terrain.frustumCulled = false;

  const LV0 = -6, LSTEP = 0.5, NLV = 26;
  const minPos = new Float32Array(70000 * 3);
  const idxPos = new Float32Array(24000 * 3);
  const gridPos = new Float32Array(2 * (Math.floor(N / GS) + 1) * N * 2 * 3);
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
    out[n] = -half + qx * cs; out[n + 1] = l * RELIEF + 0.12; out[n + 2] = -half + qy * cs;
    cnt[ci] = n + 3;
  };
  const even = (n: number) => (n / 3) & ~1;
  const heightAt = (x: number, z: number) => {
    const ix = Math.max(0, Math.min(N, Math.round((x + half) / cs)));
    const iz = Math.max(0, Math.min(N, Math.round((z + half) / cs)));
    return hg[iz * W + ix];
  };

  const srcMesh = mesh(new THREE.ConeGeometry(0.5, 1.1, 3), M.glyph, scene, SRC.x, 0, SRC.z);
  let lo = 0, hi = 0;

  const rebuild = (t: number) => {
    lo = 1e9; hi = -1e9;
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      const h = sample(-half + x * cs, -half + y * cs, t);
      hg[y * W + x] = h;
      if (h < lo) lo = h;
      if (h > hi) hi = h;
    }
    for (let i = 0; i < tpos.count; i++) tpos.setY(i, hg[vmap[i]] * RELIEF);
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
    gMin.setDrawRange(0, even(cnt[0])); gMin.attributes.position.needsUpdate = true;
    gIdx.setDrawRange(0, even(cnt[1])); gIdx.attributes.position.needsUpdate = true;
    let n = 0;
    const yo = 0.06;
    for (let gl = 0; gl <= N; gl += GS) for (let sg = 0; sg < N; sg++) {
      gridPos[n++] = -half + gl * cs; gridPos[n++] = hg[sg * W + gl] * RELIEF + yo; gridPos[n++] = -half + sg * cs;
      gridPos[n++] = -half + gl * cs; gridPos[n++] = hg[(sg + 1) * W + gl] * RELIEF + yo; gridPos[n++] = -half + (sg + 1) * cs;
      gridPos[n++] = -half + sg * cs; gridPos[n++] = hg[gl * W + sg] * RELIEF + yo; gridPos[n++] = -half + gl * cs;
      gridPos[n++] = -half + (sg + 1) * cs; gridPos[n++] = hg[gl * W + sg + 1] * RELIEF + yo; gridPos[n++] = -half + gl * cs;
    }
    gGrid.setDrawRange(0, n / 3); gGrid.attributes.position.needsUpdate = true;
    srcMesh.position.y = heightAt(SRC.x, SRC.z) * RELIEF + 0.9;
  };

  /* ---- wavefront rings (one fading loop per live pulse) ---- */
  const rings = Array.from({ length: MAX_PULSES }, () => {
    const col = new THREE.Color();
    const pos = new Float32Array(RING_SEGS * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const line = new THREE.LineLoop(g, lineMat({ value: col }, 140));
    line.frustumCulled = false;
    line.visible = false;
    scene.add(line);
    return { col, pos, g, line };
  });
  const placeRings = () => {
    for (let i = 0; i < rings.length; i++) {
      const ring = rings[i], p = pulses[i];
      ring.line.visible = Boolean(p) && p.r > 0.5;
      if (!p || !ring.line.visible) continue;
      for (let s = 0; s < RING_SEGS; s++) {
        const a = (s / RING_SEGS) * Math.PI * 2;
        const x = Math.max(-half, Math.min(half, p.x + Math.cos(a) * p.r));
        const z = Math.max(-half, Math.min(half, p.z + Math.sin(a) * p.r));
        ring.pos[s * 3] = p.x + Math.cos(a) * p.r;
        ring.pos[s * 3 + 1] = heightAt(x, z) * RELIEF + 0.35;
        ring.pos[s * 3 + 2] = p.z + Math.sin(a) * p.r;
      }
      ring.g.attributes.position.needsUpdate = true;
      ring.col.copy(U.uAccent.value).lerp(U.uFogColor.value, Math.min(1, (p.age / PULSE_LIFE) ** 1.5));
    }
  };

  /* ---- particles: flow along the contours, shoved by pulses and the pointer ---- */
  const pp = new Float32Array(NP * 3), pc = new Float32Array(NP * 3);
  const px = new Float32Array(NP), pz = new Float32Array(NP), vx = new Float32Array(NP), vz = new Float32Array(NP);
  const age = new Float32Array(NP), span = new Float32Array(NP);
  const reseed = (i: number, scatter: boolean) => {
    const a = k.rnd() * Math.PI * 2, r = Math.sqrt(k.rnd()) * 50;
    px[i] = Math.cos(a) * r; pz[i] = Math.sin(a) * r;
    vx[i] = 0; vz[i] = 0;
    span[i] = 4 + k.rnd() * 6;
    age[i] = scatter ? k.rnd() * span[i] : 0;
  };
  for (let i = 0; i < NP; i++) reseed(i, true);
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute("position", new THREE.BufferAttribute(pp, 3));
  pgeo.setAttribute("color", new THREE.BufferAttribute(pc, 3));
  const moteMat = new THREE.PointsMaterial({ color: U.uAccent.value.clone(), size: 1, sizeAttenuation: false, vertexColors: true });
  const motes = new THREE.Points(pgeo, moteMat);
  motes.frustumCulled = false;
  scene.add(motes);

  const stepParticles = (dt: number) => {
    const ease = Math.min(1, dt * 2.5);
    for (let i = 0; i < NP; i++) {
      age[i] += dt;
      const bx = px[i], bz = pz[i];
      if (age[i] > span[i] || bx * bx + bz * bz > 3200) { reseed(i, false); continue; }
      const ix = Math.max(1, Math.min(N - 1, Math.floor((bx + half) / cs)));
      const iz = Math.max(1, Math.min(N - 1, Math.floor((bz + half) / cs)));
      const gx = (hg[iz * W + ix + 1] - hg[iz * W + ix - 1]) / (2 * cs);
      const gz = (hg[(iz + 1) * W + ix] - hg[(iz - 1) * W + ix]) / (2 * cs);
      // along the contour, with a slow downhill drift so nothing circles forever
      vx[i] += (-gz * 9 - gx * 3 - vx[i]) * ease;
      vz[i] += (gx * 9 - gz * 3 - vz[i]) * ease;
      for (let j = 0; j < pulses.length; j++) {
        const p = pulses[j], ex = bx - p.x, ez = bz - p.z, d = Math.sqrt(ex * ex + ez * ez) + 1e-3, q = d - p.r;
        if (q > -PULSE_W * 1.6 && q < PULSE_W * 1.6) {
          const f = p.a0 * Math.exp(-p.age * 0.45) * Math.exp(-(q * q) / (PULSE_W * PULSE_W)) * 30 * dt;
          vx[i] += (ex / d) * f;
          vz[i] += (ez / d) * f;
        }
      }
      if (down) {
        const ex = bx - sm.x, ez = bz - sm.z, d2 = ex * ex + ez * ez;
        if (d2 < 150) {
          const f = Math.exp(-d2 / 60) * 6 * dt;
          vx[i] += pv.x * f;
          vz[i] += pv.z * f;
        }
      }
      px[i] = bx + vx[i] * dt;
      pz[i] = bz + vz[i] * dt;
      const f = age[i] / span[i], sp = Math.sqrt(vx[i] * vx[i] + vz[i] * vz[i]);
      const b = Math.pow(Math.sin(Math.PI * f), 0.7) * Math.min(1, 0.4 + sp * 0.12);
      pc[i * 3] = pc[i * 3 + 1] = pc[i * 3 + 2] = b;
      pp[i * 3] = px[i];
      pp[i * 3 + 1] = heightAt(px[i], pz[i]) * RELIEF + 0.3;
      pp[i * 3 + 2] = pz[i];
    }
    pgeo.attributes.position.needsUpdate = true;
    pgeo.attributes.color.needsUpdate = true;
  };

  /* ---- frame ---- */
  let lastT = -1, acc = 0;
  const busy = () =>
    down || hold > 0.002 || hover > 0.002 || pulses.length > 0 || wake.length > 0 || echoes.length > 0;

  return {
    scene, cam, fog: [60, 160], fov: [50, 64], moteMat,
    labels: [
      { name: "Source", sub: "", at: (v) => { v.set(SRC.x, srcMesh.position.y + 1.2, SRC.z); }, sub2: () => (pulses.length ? `${pulses.length} wavefront${pulses.length > 1 ? "s" : ""}` : "quiet") },
      { name: "Live field", sub: "tap · pulse   drag · warp", at: (v) => { v.set(-20, 1, 12); } },
    ],
    pointer(e) {
      const now = performance.now();
      if (e.kind === "leave" || e.kind === "cancel") {
        inside = false;
        if (e.kind === "cancel") down = false;
        return;
      }
      if (!toWorld(e.x, e.y)) return;
      if (e.kind === "down") {
        if (!inside) { sm.x = cur.x; sm.z = cur.z; }
        inside = true; down = true;
        downAt.x = cur.x; downAt.z = cur.z; downAt.t = now;
        last.wx = cur.x; last.wz = cur.z; last.t = now;
        pv.x = 0; pv.z = 0;
      } else if (e.kind === "move") {
        if (!inside) { sm.x = cur.x; sm.z = cur.z; }
        inside = e.touch ? down : true;
        const dtm = Math.max(0.008, (now - last.t) / 1000);
        if (down) {
          const mx = cur.x - last.wx, mz = cur.z - last.wz, len = Math.hypot(mx, mz);
          pv.x += (Math.max(-45, Math.min(45, mx / dtm)) - pv.x) * 0.35;
          pv.z += (Math.max(-45, Math.min(45, mz / dtm)) - pv.z) * 0.35;
          if (len > 1.1) {
            const c = len > 5 ? 5 / len : 1;
            wake.push({ x: cur.x, z: cur.z, dx: mx * c, dz: mz * c, s: 1 });
            if (wake.length > MAX_WAKE) wake.shift();
            last.wx = cur.x; last.wz = cur.z;
          }
        }
        last.t = now;
      } else if (e.kind === "up") {
        const wasClick = down && now - downAt.t < 450 && Math.hypot(cur.x - downAt.x, cur.z - downAt.z) < 3;
        down = false;
        if (e.touch) inside = false;
        if (wasClick) {
          spawn(downAt.x, downAt.z, 2.4);
          const d = Math.hypot(downAt.x - SRC.x, downAt.z - SRC.z);
          if (d > 6) echoes.push(d / PULSE_C);
        }
      }
    },
    busy,
    update(t, dt = 0) {
      clock += dt;
      hover += ((inside && !down ? 1 : 0) - hover) * Math.min(1, dt * 5);
      hold += ((down ? 1 : 0) - hold) * Math.min(1, dt * 7);
      const sk = Math.min(1, dt * 10);
      sm.x += (cur.x - sm.x) * sk;
      sm.z += (cur.z - sm.z) * sk;
      const damp = Math.exp(-dt * 5);
      pv.x *= damp; pv.z *= damp;

      for (let i = wake.length - 1; i >= 0; i--) {
        wake[i].s *= Math.exp(-dt / 1.5);
        if (wake[i].s < 0.03) wake.splice(i, 1);
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.age += dt;
        p.r += PULSE_C * dt;
        if (p.age > PULSE_LIFE) pulses.splice(i, 1);
      }
      for (let i = echoes.length - 1; i >= 0; i--) {
        echoes[i] -= dt;
        if (echoes[i] <= 0) { echoes.splice(i, 1); spawn(SRC.x, SRC.z, 1.5); }
      }
      // The source breathes on its own while the sheet is in motion.
      const kk = Math.floor(t / 7);
      if (kk !== lastK) { lastK = kk; spawn(SRC.x, SRC.z, 1.1); }

      const a = 0.25 * Math.sin(t * 0.04) + view.px * 0.1;
      cam.position.set(Math.sin(a) * 6 + view.px * 4, 38 - view.py * 3, 25 + Math.cos(a) * 3);
      cam.lookAt(0, 0, 0);
      sky.position.copy(cam.position);

      acc += dt;
      const want = busy() || Math.abs(t - lastT) > 0.06 || lastT < 0;
      if (want && (acc >= 0.033 || lastT < 0)) {
        rebuild(t);
        lastT = t;
        acc = 0;
      }
      srcMesh.rotation.y = t * 0.8;
      srcMesh.scale.setScalar(1 + 0.25 * Math.sin(clock * 3) * (pulses.length ? 1 : 0.3));
      placeRings();
      stepParticles(Math.min(dt, 0.05));
    },
    readout() {
      return [
        ["Field", "live · 0.5 m CI"],
        ["Fronts", String(pulses.length)],
        ["Warp", `${Math.round(Math.min(1, wake.length / 12 + hold) * 100)}%`],
        ["Brg", `${k.pad(Math.round(k.bearing(cam)), 3)}°`],
        ["Relief", `${((hi - lo) * 10).toFixed(0)} m`],
      ];
    },
  };
}
