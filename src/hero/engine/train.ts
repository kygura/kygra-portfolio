/** Train: a lateral profile of a night train running on rails just under the surface of a still, dreamlike sea, past a drowned field of sharp, edged towers and floating debris, under one pale low sun. */
import * as THREE from "three";
import { burst, pulse, type PsxKit, type SceneDef } from "./psx";

/** Folds x into [-L/2, L/2): the world scrolls past the train and every band repeats every L metres. */
const wrap = (x: number, L: number) => x - Math.floor((x + L / 2) / L) * L;

export function buildTrain(k: PsxKit): SceneDef {
  const { rnd, facet, wallUV, mesh, psx, M, tex, U, view } = k;
  const { add, flush } = k.batcher();
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 520);
  const sky = k.skyDome(0, 0.35, 2.4, 0.15);
  scene.add(sky);

  // How fast the world slides past the train, m/s. Slow: it should feel like drifting.
  const SPEED = 5.5;
  let s = 0;

  // Glassy water: a long low swell, barely moving.
  const wave = (x: number, z: number, t: number) =>
    0.05 * Math.sin(x * 0.18 + z * 0.05 + t * 0.45) +
    0.035 * Math.sin(z * 0.23 - x * 0.07 - t * 0.37) +
    0.015 * Math.sin((x + z) * 0.55 + t * 0.9);

  const mat = {
    water: psx({ map: tex.tWater, tint: "#c8dcdc", amb: "#62808a", sun: "#dccfbe" }),
    dark: psx({ map: tex.tPlain, tint: "#262d31", amb: "#3a4248" }),
    body: psx({ map: tex.tPlain, tint: "#dad3c2", amb: "#6c767a", sun: "#dccfb8" }),
    band: psx({ map: tex.tPlain, tint: "#566a78", amb: "#4c5a62" }),
    roof: psx({ map: tex.tPlain, tint: "#5a6266", amb: "#48525a" }),
    glass: psx({ map: tex.tPlain, tint: "#1c2428", amb: "#2c363c", sun: "#8ea0a8" }),
    win: psx({ map: tex.tPlain, tint: "#000000", emit: 0.9, fogAmt: 0.2 }),
    tower: [
      psx({ map: tex.tStone, tint: "#a3a9aa", amb: "#4e5c66", sun: "#cbc2ae", fogAmt: 0.85 }),
      psx({ map: tex.tGlass, tint: "#8d9ba8", amb: "#4a5862", sun: "#bab29e", fogAmt: 0.85 }),
      psx({ map: tex.tPlain, tint: "#3d464c", amb: "#3c464c", sun: "#9aa0a0", fogAmt: 0.85 }),
    ],
    debris: psx({ map: tex.tStone, tint: "#8e938c", amb: "#4a565c", sun: "#c4bca8", moss: 0.25 }),
  };

  /* ---- sea: a grid denser near the camera, displaced every frame ---- */
  const WN = 72, WH = 420, WCX = 0, WCZ = 18;
  const warp = (u: number) => Math.sign(u) * Math.pow(Math.abs(u), 1.8) * WH;
  const wg = new THREE.PlaneGeometry(2, 2, WN, WN);
  wg.rotateX(-Math.PI / 2);
  const wp0 = wg.attributes.position;
  for (let i = 0; i < wp0.count; i++) wp0.setXYZ(i, WCX + warp(wp0.getX(i)), 0, WCZ + warp(wp0.getZ(i)));
  const water = facet(wg);
  const wpos = water.attributes.position, wuv = water.attributes.uv;
  const wx = new Float32Array(wpos.count), wz = new Float32Array(wpos.count);
  for (let i = 0; i < wpos.count; i++) {
    wx[i] = wpos.getX(i);
    wz[i] = wpos.getZ(i);
  }
  mesh(water, mat.water, scene).frustumCulled = false;

  /* ---- track: two rails awash, sleepers sliding past under them ---- */
  const RAIL_Y = 0.06, GAUGE = 0.72;
  const railPts: THREE.Vector3[] = [];
  for (const z of [-GAUGE, GAUGE]) railPts.push(new THREE.Vector3(-260, RAIL_Y, z), new THREE.Vector3(260, RAIL_Y, z));
  scene.add(k.segs(railPts, M.lBoneDim));
  const SLEEPER = 1.4, sleeperPts: THREE.Vector3[] = [];
  for (let x = -140; x <= 140; x += SLEEPER) sleeperPts.push(new THREE.Vector3(x, RAIL_Y - 0.01, -1.05), new THREE.Vector3(x, RAIL_Y - 0.01, 1.05));
  const sleepers = k.segs(sleeperPts, M.lDeep);
  scene.add(sleepers);

  /* ---- the train: a locomotive and three cars heading +x, each its own group so it can sway ---- */
  const CAR = 9, LOCO = 10, GAP = 0.7;
  const train = new THREE.Group();
  train.position.y = RAIL_Y;
  scene.add(train);
  const car = (len: number, x: number, loco: boolean) => {
    const g = new THREE.Group();
    g.position.x = x;
    train.add(g);
    const box = (w: number, h: number, d: number) => facet(new THREE.BoxGeometry(w, h, d));
    // Underframe, bogies and wheels.
    add(box(len - 0.6, 0.45, 2.0), mat.dark, 0, 0.82, 0);
    for (const bx of [-(len / 2 - 1.9), len / 2 - 1.9]) {
      add(box(2.4, 0.42, 1.7), mat.dark, bx, 0.5, 0);
      for (const wx of [-0.7, 0.7]) for (const wz of [-0.82, 0.82]) {
        add(facet(new THREE.CylinderGeometry(0.4, 0.4, 0.16, 8).rotateX(Math.PI / 2)), mat.dark, bx + wx, 0.4, wz);
      }
    }
    // Body: a loco's nose leans back into a raked windscreen.
    const body = new THREE.BoxGeometry(len, 2.2, 2.5, 1, 1, 1);
    if (loco) {
      const p = body.attributes.position;
      for (let i = 0; i < p.count; i++) if (p.getX(i) > 0 && p.getY(i) > 0) p.setX(i, p.getX(i) - 1.6);
    }
    add(facet(body), mat.body, 0, 2.15, 0);
    add(box(loco ? len - 0.4 : len + 0.02, 0.2, 2.52), mat.band, loco ? -0.2 : 0, 1.45, 0);
    // Lit windows down both sides; the loco keeps its cab dark.
    const xa = -len / 2 + 1.3, xb = len / 2 - (loco ? 3.6 : 1.3), n = Math.max(1, Math.round((xb - xa) / 1.35));
    for (let i = 0; i < n; i++) add(box(0.85, 0.66, 2.54), mat.win, xa + ((i + 0.5) * (xb - xa)) / n, 2.4, 0);
    if (loco) {
      add(box(0.12, 0.9, 2.3), mat.glass, len / 2 - 1.12, 2.7, 0, 0, 0, 0.63);
      add(box(0.2, 0.22, 0.5), mat.win, len / 2 - 0.1, 1.25, 0);
      add(box(len - 2.6, 0.3, 2.0), mat.roof, -0.9, 3.4, 0);
    } else {
      add(box(len - 0.3, 0.32, 2.1), mat.roof, 0, 3.4, 0);
      add(box(1.6, 0.2, 1.0), mat.roof, -len * 0.22, 3.65, 0);
    }
    flush(g);
    return g;
  };
  const cars: THREE.Group[] = [];
  let cx = 18.5 - LOCO / 2;
  cars.push(car(LOCO, cx, true));
  cx -= LOCO / 2 + GAP + CAR / 2;
  for (let i = 0; i < 3; i++) {
    cars.push(car(CAR, cx, false));
    cx -= CAR + GAP;
  }
  // Pantograph on the loco roof, touching nothing: there is no wire out here.
  const panto = k.segs([
    [-2.4, 3.55, -0.6], [-1.6, 4.5, 0], [-1.6, 4.5, 0], [-0.8, 3.55, 0.6],
    [-2.4, 3.55, 0.6], [-1.6, 4.5, 0], [-1.6, 4.5, 0], [-0.8, 3.55, -0.6],
    [-2.3, 4.55, -0.7], [-0.9, 4.55, -0.7], [-2.3, 4.55, 0.7], [-0.9, 4.55, 0.7],
    [-1.6, 4.5, -0.7], [-1.6, 4.5, 0.7],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z)), M.lBone);
  cars[0].add(panto);
  const NOSE = cars[0].position.x + LOCO / 2;
  const headFlare = k.flare(scene, NOSE + 0.2, RAIL_Y + 1.25, 0, 2.4);

  /* ---- drowned towers: shards, blades and broken stumps in three depth bands ---- */
  const L = 480;
  let tall = { x: 0, y: 0, z: -200 };
  const tower = (x: number, z: number, h: number, w: number) => {
    const m = mat.tower[Math.floor(rnd() * 3)], kind = rnd();
    const lean = (rnd() - 0.5) * 0.22, ry = rnd() * Math.PI, rz = (rnd() - 0.5) * 0.22;
    let top = h;
    if (kind < 0.35) {
      // a plain shard: three or four faces closing to a point
      add(facet(new THREE.CylinderGeometry(0, w * 0.6, h + 4, rnd() > 0.5 ? 3 : 4, 1), w * 0.08), m, x, h / 2 - 2, z, lean, ry, rz);
    } else if (kind < 0.65) {
      // a blade: a thin slab with its top cut off on a steep slant
      const g = new THREE.BoxGeometry(w, h + 4, w * 0.35);
      const p = g.attributes.position, cut = h * (0.15 + rnd() * 0.25) * (rnd() > 0.5 ? 1 : -1);
      for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setY(i, p.getY(i) + (p.getX(i) / w) * cut);
      top = h + Math.abs(cut) / 2;
      add(wallUV(facet(g), 1 / 12), m, x, h / 2 - 2, z, lean * 0.5, ry, rz * 0.5);
    } else if (kind < 0.85) {
      // a broken stump with a jagged crown and a spire stood on it
      const g = new THREE.CylinderGeometry(w * 0.4, w * 0.55, h * 0.6 + 4, 4, 3);
      const p = g.attributes.position, hh = (h * 0.6 + 4) / 2;
      for (let i = 0; i < p.count; i++) if (p.getY(i) > hh - 0.1) p.setY(i, p.getY(i) + (rnd() - 0.3) * w * 1.4);
      add(wallUV(facet(g, w * 0.05), 1 / 12), m, x, h * 0.3 - 2, z, lean * 0.4, ry, 0);
      add(facet(new THREE.CylinderGeometry(0, w * 0.18, h * 0.55, 3)), mat.tower[2], x + w * 0.1, h * 0.6 + h * 0.2, z, lean, ry, rz);
    } else {
      // twin needles leaning apart
      for (const sgn of [-1, 1]) {
        add(facet(new THREE.CylinderGeometry(0, w * 0.3, h + 4, 4)), m, x + sgn * w * 0.4, h / 2 - 2, z, lean, ry, sgn * (0.06 + rnd() * 0.1));
      }
    }
    if (h > 50 && rnd() > 0.5) add(facet(new THREE.BoxGeometry(w * 0.5, 0.5, w * 0.5)), M.glyph, x, h * 0.72, z, 0, ry, 0);
    if (top > tall.y && z < -120) tall = { x, y: top, z };
  };
  for (let i = 0; i < 46; i++) tower((rnd() - 0.5) * L, -150 - rnd() * 130, 20 + rnd() * 60 * rnd(), 6 + rnd() * 9);
  for (let i = 0; i < 30; i++) tower((rnd() - 0.5) * L, -45 - rnd() * 100, 10 + rnd() * 34, 3 + rnd() * 6);
  for (let i = 0; i < 16; i++) tower((rnd() - 0.5) * L, -12 - rnd() * 30, 6 + rnd() * 20, 1.5 + rnd() * 3);

  /* ---- debris lying in the water: tilted slabs, beams, a capsized spire, low wreckage in front ---- */
  for (let i = 0; i < 70; i++) {
    const x = (rnd() - 0.5) * L, z = -9 - rnd() * 90, kind = rnd();
    if (kind < 0.4) {
      const w = 1 + rnd() * 4;
      add(facet(new THREE.BoxGeometry(w, w * 0.15, w * 0.8), 0.1), mat.debris, x, 0, z, (rnd() - 0.5) * 1.2, rnd() * 3, (rnd() - 0.5) * 1.2);
    } else if (kind < 0.75) {
      const l = 3 + rnd() * 6;
      add(facet(new THREE.BoxGeometry(l, 0.3, 0.3)), mat.dark, x, 0.3, z, rnd(), rnd() * 3, (rnd() - 0.2) * 0.9);
    } else {
      const h = 4 + rnd() * 8;
      add(facet(new THREE.CylinderGeometry(0, 0.8, h, 3)), mat.tower[Math.floor(rnd() * 3)], x, 0.4, z, 0, rnd() * 3, Math.PI / 2 - 0.15 + rnd() * 0.3);
    }
  }
  for (let i = 0; i < 14; i++) {
    // Low enough to sit under the line from the camera to the rails.
    const x = (rnd() - 0.5) * L, z = 12 + rnd() * 12, w = 0.5 + rnd() * 1.1;
    add(facet(new THREE.BoxGeometry(w, 0.25, w * 0.6), 0.06), rnd() > 0.5 ? mat.debris : mat.dark, x, 0.05, z, (rnd() - 0.5) * 0.8, rnd() * 3, (rnd() - 0.5) * 0.8);
  }
  const towers = new THREE.Group();
  flush(towers);
  const bands = [-1, 0, 1].map((i) => {
    const g = i === 0 ? towers : towers.clone();
    scene.add(g);
    return { g, i };
  });

  /* ---- things that float: shards hanging point-down in the air, flotsam riding the swell ---- */
  const LF = 200;
  const hung = Array.from({ length: 12 }, (_, i) => {
    const h = 3 + rnd() * 9, w = 0.6 + rnd() * 1.6;
    const m = mesh(facet(new THREE.CylinderGeometry(w, 0, h, rnd() > 0.5 ? 3 : 4), w * 0.08), mat.tower[i % 3], scene);
    return { m, x0: (rnd() - 0.5) * LF, y: 9 + rnd() * 16 + h / 2, z: -16 - rnd() * 50, ph: rnd() * 6.28, sp: 0.05 + rnd() * 0.12, h };
  });
  const big = hung.reduce((a, b) => (b.h > a.h ? b : a));
  const flot = Array.from({ length: 22 }, () => {
    const w = 0.3 + rnd() * 0.9, kind = rnd();
    const g = kind < 0.5 ? new THREE.BoxGeometry(w, w, w) : kind < 0.8 ? new THREE.BoxGeometry(w * 2.6, 0.12, w * 0.5) : new THREE.OctahedronGeometry(w * 0.7);
    const m = mesh(facet(g, 0.04), kind < 0.8 ? mat.debris : mat.tower[2], scene);
    return { m, x0: (rnd() - 0.5) * LF, z: rnd() > 0.3 ? -3 - rnd() * 22 : 3 + rnd() * 6, ph: rnd() * 6.28, rx: rnd() * 3, rz: rnd() * 3, lift: kind > 0.8 ? 0.6 + rnd() * 3 : 0 };
  });

  /* ---- mist: two thin drifting layers just over the water ---- */
  const mc = document.createElement("canvas");
  mc.width = mc.height = 64;
  const g2 = mc.getContext("2d");
  if (!g2) throw new Error("2d canvas unavailable");
  for (let i = 0; i < 22; i++) {
    const x = rnd() * 64, y = rnd() * 64, r = 8 + rnd() * 18;
    for (const ox of [-64, 0, 64]) for (const oy of [-64, 0, 64]) {
      const gr = g2.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      gr.addColorStop(0, "rgba(255,255,255,0.5)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g2.fillStyle = gr;
      g2.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    }
  }
  const mistTex = new THREE.CanvasTexture(mc);
  mistTex.wrapS = mistTex.wrapT = THREE.RepeatWrapping;
  const MIST = 360, MREP = 6;
  const mists = [0.35, 1.4].map((h, i) => {
    const t = mistTex.clone();
    t.needsUpdate = true;
    t.repeat.set(MREP, MREP);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(MIST, MIST).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: "#d6dcdc", map: t, transparent: true, opacity: 0.2 - i * 0.07, depthWrite: false, side: THREE.DoubleSide }),
    );
    m.position.set(0, h, -60);
    m.renderOrder = 2;
    scene.add(m);
    return { t, drift: 0.002 + i * 0.002 };
  });

  /* ---- one big pale sun low on the horizon, glitter running from it to the camera ---- */
  const sun = k.sunDisc(scene, 34, 30, -400, 30, "#f7efe4", "#e7b4c2");
  const CAMX = 0, CAMY = 3.8, CAMZ = 40;
  const NG = 160, gp = new Float32Array(NG * 3), gBase: number[] = [];
  for (let i = 0; i < NG; i++) {
    const dx = sun.position.x - CAMX, dz = sun.position.z - CAMZ, l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l;
    const d = 6 + Math.pow(rnd(), 0.6) * 300, w = (rnd() - 0.5) * (0.6 + d * 0.08);
    gBase.push(CAMX + ux * d - uz * w, CAMZ + uz * d + ux * w);
  }
  const glintGeo = new THREE.BufferGeometry();
  glintGeo.setAttribute("position", new THREE.BufferAttribute(gp, 3));
  const glintMat = new THREE.PointsMaterial({ color: "#ffe6d0", size: 1, sizeAttenuation: false });
  const glints = new THREE.Points(glintGeo, glintMat);
  glints.frustumCulled = false;
  scene.add(glints);

  /* ---- wake: foam left behind at every bogie, spreading as it falls astern ---- */
  const bogies: number[] = [];
  cars.forEach((c, i) => {
    const len = i === 0 ? LOCO : CAR;
    bogies.push(c.position.x - (len / 2 - 1.9), c.position.x + (len / 2 - 1.9));
  });
  const NF = 220, fp = new Float32Array(NF * 3), FOAM_T = 3.2;
  const foam = Array.from({ length: NF }, (_, i) => ({ b: bogies[i % bogies.length], side: i % 2 ? 1 : -1, ph: rnd() * FOAM_T, j: rnd() }));
  const foamGeo = new THREE.BufferGeometry();
  foamGeo.setAttribute("position", new THREE.BufferAttribute(fp, 3));
  const foamPts = new THREE.Points(foamGeo, new THREE.PointsMaterial({ color: "#e4ece8", size: 1, sizeAttenuation: false }));
  foamPts.frustumCulled = false;
  scene.add(foamPts);

  /* ---- motes drifting in the air, in the accent ---- */
  const NM = 110, mp = new Float32Array(NM * 3), mBase = new Float32Array(NM * 3);
  for (let i = 0; i < NM; i++) {
    mBase[i * 3] = (rnd() - 0.5) * 90;
    mBase[i * 3 + 1] = 0.6 + rnd() * 16;
    mBase[i * 3 + 2] = -30 + rnd() * 44;
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute("position", new THREE.BufferAttribute(mp, 3));
  const moteMat = new THREE.PointsMaterial({ color: U.uAccent.value.clone(), size: 1, sizeAttenuation: false });
  const motes = new THREE.Points(moteGeo, moteMat);
  motes.frustumCulled = false;
  scene.add(motes);

  // easter eggs: start times
  let tHorn = -99, tSun = -99, tShard = -99;

  return {
    scene, cam, fog: [22, 230], fov: [42, 64], limits: { pitch: [-0.16, 0.32], zoom: [0.75, 2.2], yaw: 0.55 }, moteMat,
    labels: [
      { name: "Night train", sub: "never arrives", at: (v) => { v.set(NOSE - 4, RAIL_Y + 5, 0); } },
      { name: "Drowned spires", sub: "edged, adrift", at: (v) => { v.set(tall.x + bands[1].g.position.x, tall.y + 4, tall.z); } },
    ],
    eggs: [
      {
        id: "train-horn", r: 46,
        at: (v) => { v.set(NOSE - 2, RAIL_Y + 2.2, 0).applyMatrix4(train.matrixWorld); },
        fire: (t) => { tHorn = t; },
      },
      {
        id: "train-sun", r: 50,
        at: (v) => { v.copy(sun.position); },
        fire: (t) => { tSun = t; },
      },
      {
        id: "train-shard", r: 34,
        at: (v) => { v.copy(big.m.position); },
        fire: (t) => { tShard = t; },
      },
    ],
    update(t) {
      s = t * SPEED;

      for (let i = 0; i < wpos.count; i++) {
        wpos.setY(i, wave(wx[i] + s, wz[i], t));
        wuv.setXY(i, (wx[i] + (s % 600)) / 6, wz[i] / 6);
      }
      wpos.needsUpdate = true;
      wuv.needsUpdate = true;
      water.computeVertexNormals();

      sleepers.position.x = -(s % SLEEPER);
      const bx = wrap(-s, L);
      for (const b of bands) b.g.position.x = bx + b.i * L;
      for (const m of mists) m.t.offset.set(((s * MREP) / MIST + t * m.drift) % 1, (t * m.drift * 0.5) % 1);

      // The train hums along: each car rocks a little on its own.
      const eh = t - tHorn;
      cars.forEach((c, i) => {
        c.position.y = 0.025 * Math.sin(t * 2.1 + i * 1.3) + 0.08 * pulse(eh - i * 0.12, 0.6);
        c.rotation.x = 0.006 * Math.sin(t * 1.4 + i * 0.9);
        c.rotation.z = 0.003 * Math.sin(t * 1.7 + i * 2.1);
      });
      (mat.win.uniforms.uEmit as { value: number }).value = 0.9 + 0.05 * Math.sin(t * 3.1) + 0.6 * pulse(eh, 1.2);
      headFlare.g.visible = eh > 0 && eh < 1.4;
      headFlare.mat.opacity = 0.85 * pulse(eh, 1.4);
      headFlare.g.lookAt(cam.position);

      foam.forEach((f, i) => {
        const age = (t + f.ph) % FOAM_T, x = f.b - age * SPEED, z = f.side * (1.15 + age * (0.35 + f.j * 0.3));
        fp[i * 3] = x;
        fp[i * 3 + 1] = Math.sin(t * 5 + i) > -0.2 ? wave(x + s, z, t) + 0.05 : -9;
        fp[i * 3 + 2] = z;
      });
      foamGeo.attributes.position.needsUpdate = true;

      const es = t - tShard;
      for (const h of hung) {
        h.m.position.set(wrap(h.x0 - s, LF), h.y + Math.sin(t * 0.4 + h.ph) * 0.6, h.z);
        h.m.rotation.set(Math.sin(t * 0.21 + h.ph) * 0.12, h.ph + t * h.sp + (h === big ? burst(es, 9, 3) : 0), Math.sin(t * 0.17 + h.ph) * 0.1);
      }
      for (const f of flot) {
        const x = wrap(f.x0 - s, LF);
        f.m.position.set(x, wave(x + s, f.z, t) + f.lift + (f.lift ? Math.sin(t * 0.5 + f.ph) * 0.3 : 0.02), f.z);
        f.m.rotation.set(f.rx + Math.sin(t * 0.6 + f.ph) * 0.12, f.ph + (f.lift ? t * 0.2 : 0), f.rz + Math.sin(t * 0.5 + f.ph) * 0.1);
      }

      for (let i = 0; i < NM; i++) {
        mp[i * 3] = wrap(mBase[i * 3] - s * 0.85 + Math.sin(t * 0.3 + i) * 0.6, 90);
        mp[i * 3 + 1] = mBase[i * 3 + 1] + Math.sin(t * 0.25 + i * 0.7) * 0.8;
        mp[i * 3 + 2] = mBase[i * 3 + 2];
      }
      moteGeo.attributes.position.needsUpdate = true;

      const esn = t - tSun;
      sun.scale.setScalar(1 + 0.3 * pulse(esn, 1.6));
      for (let i = 0; i < NG; i++) {
        const x = gBase[i * 2], z = gBase[i * 2 + 1], on = Math.sin(t * 1.9 + i * 1.73) > 0.45 - 0.8 * pulse(esn, 1.6);
        gp[i * 3] = x;
        gp[i * 3 + 1] = on ? wave(x + s, z, t) + 0.04 : -9;
        gp[i * 3 + 2] = z;
      }
      glintGeo.attributes.position.needsUpdate = true;

      // Side on, keeping pace with the train; the camera drifts slowly fore and aft along it.
      const x = CAMX + Math.sin(t * 0.045) * 5 + view.px * 2;
      cam.position.set(x, CAMY + Math.sin(t * 0.5) * 0.04 - view.py * 0.4, CAMZ + Math.sin(t * 0.03) * 1.2);
      cam.lookAt(x * 0.7, 4.6 - view.py * 1.5, 0);
      k.look(cam);
      sky.position.copy(cam.position);
      sun.lookAt(cam.position);
    },
    readout() {
      const p = cam.position;
      return [
        ["Lat", k.dms(-31.0447 - p.z * 0.00009, "N", "S", 2)],
        ["Lon", k.dms(-171.2205 + (p.x + s) * 0.00013, "E", "W", 3)],
        ["Elev", `${p.y.toFixed(1)} m`],
        ["Brg", `${k.pad(Math.round(k.bearing(cam)), 3)}°`],
        ["Grid", k.gridRef(wrap(p.x + s, 80), p.z, 40)],
      ];
    },
  };
}
