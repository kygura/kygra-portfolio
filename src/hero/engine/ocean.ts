/** Sheet 01 · Ocean: endless swell, drowned skyscrapers (tilted, bent, toppled) gone green, palm islands, wing-sail ships, two low suns. */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { PsxKit, SceneDef } from "./psx";

interface TowerSpec {
  x: number; z: number; w: number; d: number; h: number; n: number;
  /** World-axis lean [x, z] in radians, applied after yaw. */
  lean?: [number, number];
  /** Extra rotation at every joint [x, z]: the tower curves. */
  bend?: [number, number];
  twist?: number;
  yaw?: number;
  green?: number;
  base?: number;
  broken?: boolean;
}

export function buildOcean(k: PsxKit): SceneDef {
  const { rnd, facet, mesh, psx, M, tex, view } = k;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(64, 16 / 9, 0.1, 400);
  const sky = k.skyDome(0, 0.3, 1.7);
  scene.add(sky);

  // Both suns sit low to the north, a big one right and a small one left; the key light rakes in from the big one.
  const SUN_A = new THREE.Vector3(0.3, 0.022, -1).normalize();
  const SUN_B = new THREE.Vector3(-0.4, 0.06, -1).normalize();
  const light = new THREE.Vector3(0.62, 0.48, -0.42).normalize();

  const warm = "#f6cf98", amb = "#6a7a7e";
  const mWater = psx({ map: tex.tWater, tint: "#9cbcbc", amb: "#4a626c", sun: "#e6c49a" });
  const mFacade = psx({ map: tex.tFacade, tint: "#c4c2b4", moss: 0.9, sun: warm, amb });
  const mFacade2 = psx({ map: tex.tFacade, tint: "#a3aaa2", moss: 1, sun: warm, amb });
  const mConcrete = psx({ map: tex.tStone, tint: "#a8a698", moss: 0.95, uv: 1.5, sun: warm, amb });
  const mSand = psx({ map: tex.tSand, tint: "#ffffff", uv: 2, sun: warm, amb });
  const mGrass = psx({ map: tex.tGround, tint: "#c4d2a0", moss: 0.55, uv: 2, sun: warm, amb });
  const mFoam = psx({ map: tex.tPlain, tint: "#d7e0da", sun: warm, amb: "#7a8a8e" });
  const mTrunk = psx({ map: tex.tBark, tint: "#b8a088", sun: warm, amb });
  const mPalm = [
    psx({ map: tex.tLeaf, tint: "#a9c47c", uv: 1.5, sun: warm, amb }),
    psx({ map: tex.tLeaf, tint: "#8cb070", uv: 1.5, sun: warm, amb }),
  ];
  const mVine = [...M.leaf, ...mPalm];
  const mHull = psx({ map: tex.tPlain, tint: "#e2e0d8", sun: warm, amb: "#6a7880" });
  const mDeck = psx({ map: tex.tPlain, tint: "#3a4448", sun: warm, amb });
  const mSail = psx({ map: tex.tPlain, tint: "#d6dcd8", sun: warm, amb: "#6a7880", side: THREE.DoubleSide });
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];

  /* ---- swell ---- */
  const wave = (x: number, z: number, t: number) =>
    0.32 * Math.sin(x * 0.21 + t * 0.9) + 0.24 * Math.sin(z * 0.17 - t * 0.7 + x * 0.05) + 0.12 * Math.sin((x + z) * 0.53 + t * 1.6);

  // Radial grid, dense near the camera, 400 m across: the far edge sits well past the fog, so the sea reads as endless.
  const N = 72, HALF = 200, OZ = 6;
  const gc = Array.from({ length: N + 1 }, (_, i) => {
    const u = (i / N) * 2 - 1;
    return Math.sign(u) * u * u * HALF;
  });
  const H = new Float32Array((N + 1) * (N + 1));
  const oPos = new Float32Array(N * N * 18), oNor = new Float32Array(N * N * 18), oUv = new Float32Array(N * N * 12);
  const corner = (i: number, j: number) => [gc[i], gc[j] + OZ, i * (N + 1) + j] as const;
  let w = 0;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const quad = [corner(i, j), corner(i, j + 1), corner(i + 1, j), corner(i + 1, j), corner(i, j + 1), corner(i + 1, j + 1)];
    for (const [x, z] of quad) {
      oPos[w * 3] = x; oPos[w * 3 + 2] = z;
      oUv[w * 2] = x / 7; oUv[w * 2 + 1] = z / 7;
      w++;
    }
  }
  const oceanGeo = new THREE.BufferGeometry();
  oceanGeo.setAttribute("position", new THREE.BufferAttribute(oPos, 3));
  oceanGeo.setAttribute("normal", new THREE.BufferAttribute(oNor, 3));
  oceanGeo.setAttribute("uv", new THREE.BufferAttribute(oUv, 2));
  const ocean = mesh(oceanGeo, mWater, scene);
  ocean.frustumCulled = false;
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), nn = new THREE.Vector3();
  const swell = (t: number) => {
    for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
      const x = gc[i], z = gc[j] + OZ, r = Math.hypot(x, z - 20);
      H[i * (N + 1) + j] = wave(x, z, t) * (r < 120 ? 1 : Math.max(0.2, 1 - (r - 120) / 120));
    }
    let v = 0;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const ids = [i * (N + 1) + j, i * (N + 1) + j + 1, (i + 1) * (N + 1) + j, (i + 1) * (N + 1) + j, i * (N + 1) + j + 1, (i + 1) * (N + 1) + j + 1];
      for (let tri = 0; tri < 2; tri++) {
        const b = (v + tri * 3) * 3;
        for (let q = 0; q < 3; q++) oPos[b + q * 3 + 1] = H[ids[tri * 3 + q]];
        ab.set(oPos[b + 3] - oPos[b], oPos[b + 4] - oPos[b + 1], oPos[b + 5] - oPos[b + 2]);
        ac.set(oPos[b + 6] - oPos[b], oPos[b + 7] - oPos[b + 1], oPos[b + 8] - oPos[b + 2]);
        nn.crossVectors(ab, ac).normalize();
        if (nn.y < 0) nn.negate();
        for (let q = 0; q < 3; q++) { oNor[b + q * 3] = nn.x; oNor[b + q * 3 + 1] = nn.y; oNor[b + q * 3 + 2] = nn.z; }
      }
      v += 6;
    }
    oceanGeo.attributes.position.needsUpdate = true;
    oceanGeo.attributes.normal.needsUpdate = true;
  };

  /* ---- static world: built as loose meshes, merged per material at the end ---- */
  const world = new THREE.Group();
  scene.add(world);

  const unitBox = facet(new THREE.BoxGeometry(1, 1, 1), 0);
  const clumpG = [facet(new THREE.IcosahedronGeometry(1, 0), 0.3), facet(new THREE.DodecahedronGeometry(1, 0), 0.3)];
  const foam = (parent: THREE.Object3D, x: number, z: number, r: number) => {
    const g = new THREE.RingGeometry(r, r + 0.7, 14, 1);
    g.rotateX(-Math.PI / 2);
    mesh(facet(g, 0.15), mFoam, parent, x, 0.12, z);
  };
  const clump = (parent: THREE.Object3D, x: number, y: number, z: number, s: number) => {
    const m = mesh(pick(clumpG), pick(mVine), parent, x, y, z, rnd() * 3, rnd() * 3, rnd() * 3);
    m.scale.set(s, s * (0.55 + rnd() * 0.3), s);
  };

  // Faces of a box mapped in its own units so windows stay one size on every tower.
  const facadeBox = (bw: number, bh: number, bd: number) => {
    const g = new THREE.BoxGeometry(bw, bh, bd, 1, 2, 1);
    g.translate(0, bh / 2, 0);
    const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
      if (ax > 0.5) uv.setXY(i, p.getZ(i) / 6, p.getY(i) / 6);
      else if (ay > 0.5) uv.setXY(i, p.getX(i) / 6, p.getZ(i) / 6);
      else uv.setXY(i, p.getX(i) / 6, p.getY(i) / 6);
    }
    return facet(g, 0.05);
  };

  /* ---- palms ---- */
  const trunkG = facet(new THREE.CylinderGeometry(0.11, 0.16, 0.75, 5), 0.02);
  const frondG = (() => {
    const g = new THREE.ConeGeometry(0.34, 2.3, 3);
    g.translate(0, 1.15, 0);
    g.rotateZ(-Math.PI / 2);
    g.scale(1, 0.22, 1);
    return facet(g, 0.04);
  })();
  const nutG = facet(new THREE.DodecahedronGeometry(0.14, 0), 0.03);
  const palm = (parent: THREE.Object3D, x: number, y: number, z: number, s: number) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rnd() * Math.PI * 2;
    g.scale.setScalar(s);
    parent.add(g);
    let px = 0, py = 0, th = 0.05 + rnd() * 0.25;
    const curve = 0.06 + rnd() * 0.08;
    for (let i = 0; i < 6; i++) {
      mesh(trunkG, mTrunk, g, px + Math.sin(th) * 0.37, py + Math.cos(th) * 0.37, 0, 0, 0, -th);
      px += Math.sin(th) * 0.72;
      py += Math.cos(th) * 0.72;
      th += curve;
    }
    const lm = pick(mPalm);
    for (let f = 0; f < 7; f++) mesh(frondG, lm, g, px, py, 0, 0, (f / 7) * Math.PI * 2 + rnd() * 0.4, -0.35 - rnd() * 0.35);
    for (let c = 0; c < 3; c++) mesh(nutG, mTrunk, g, px + Math.cos(c * 2.1) * 0.16, py - 0.16, Math.sin(c * 2.1) * 0.16);
  };

  /* ---- islands ---- */
  const islandG = (r: number) => {
    const g = new THREE.CylinderGeometry(r, r * 1.3, 1.6, 10, 1);
    return facet(g, r * 0.12);
  };
  const island = (x: number, z: number, r: number, palms = Math.max(1, Math.round(r * 0.9))) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rnd() * 6;
    world.add(g);
    mesh(islandG(r), mSand, g, 0, -0.35, 0);
    const top = facet(new THREE.IcosahedronGeometry(r * 0.8, 1), r * 0.1);
    mesh(top, mGrass, g, 0, 0.35, 0).scale.set(1, 0.32 + rnd() * 0.15, 1);
    foam(g, 0, 0, r * 1.25);
    for (let p = 0; p < palms; p++) {
      const a = rnd() * Math.PI * 2, rr = rnd() * r * 0.65;
      palm(g, Math.cos(a) * rr, 0.6 + 0.2 * (1 - rr / r) * r * 0.4, Math.sin(a) * rr, 0.9 + rnd() * 0.6);
    }
    for (let b = 0; b < Math.round(r * 1.4); b++) {
      const a = rnd() * Math.PI * 2, rr = rnd() * r * 0.75;
      clump(g, Math.cos(a) * rr, 0.6, Math.sin(a) * rr, 0.4 + rnd() * 0.6);
    }
    for (let s = 0; s < 3; s++) {
      const a = rnd() * Math.PI * 2, sc = 0.3 + rnd() * 0.5;
      mesh(clumpG[1], M.stone2, g, Math.cos(a) * r * 1.05, 0.1, Math.sin(a) * r * 1.05, rnd() * 3, rnd() * 3, rnd() * 3).scale.setScalar(sc);
    }
    return palms;
  };

  /* ---- drowned towers ---- */
  const overgrow = (seg: THREE.Object3D, bw: number, bh: number, bd: number, amt: number) => {
    const n = Math.round(amt * (bw + bd) * bh * 0.13);
    for (let q = 0; q < n; q++) {
      const f = Math.floor(rnd() * 4), vine = rnd() < 0.55;
      const pw = vine ? 0.3 + rnd() * 0.35 : 0.9 + rnd() * 2.2;
      const ph = vine ? 2 + rnd() * bh * 0.7 : 0.8 + rnd() * 2.6;
      const y = vine ? bh - ph / 2 + 0.2 : ph / 2 + rnd() * Math.max(0, bh - ph);
      const side = f < 2 ? bw : bd, along = (rnd() - 0.5) * Math.max(0, side - pw), off = (f < 2 ? bd : bw) / 2 + 0.08;
      const m = mesh(unitBox, pick(mVine), seg, 0, y, 0, 0, 0, (rnd() - 0.5) * 0.08);
      if (f < 2) { m.position.set(along, y, f ? -off : off); m.scale.set(pw, ph, 0.18); }
      else { m.position.set(f === 2 ? off : -off, y, along); m.scale.set(0.18, ph, pw); }
    }
  };
  const roofG = new Map<string, THREE.BufferGeometry>();
  const slab = (sw: number, sh: number, sd: number) => {
    const key = `${sw}|${sh}|${sd}`;
    if (!roofG.has(key)) roofG.set(key, facet(new THREE.BoxGeometry(sw, sh, sd), 0.08));
    return roofG.get(key)!;
  };
  const tower = (s: TowerSpec) => {
    const root = new THREE.Group();
    root.rotation.order = "ZXY";
    root.position.set(s.x, s.base ?? -6, s.z);
    root.rotation.set(s.lean?.[0] ?? 0, s.yaw ?? rnd() * Math.PI, s.lean?.[1] ?? 0);
    world.add(root);
    const segH = s.h / s.n, green = s.green ?? 1;
    const geo = facadeBox(s.w, segH, s.d), mat = rnd() < 0.5 ? mFacade : mFacade2;
    let parent: THREE.Object3D = root;
    for (let i = 0; i < s.n; i++) {
      const seg = new THREE.Group();
      if (i) {
        seg.position.y = segH;
        seg.rotation.set(s.bend?.[0] ?? 0, s.twist ?? 0, s.bend?.[1] ?? 0);
      }
      parent.add(seg);
      mesh(geo, mat, seg);
      if (i) {
        // Joint ledge hides the wedge a bend opens, and makes a terrace for growth.
        mesh(slab(s.w + 0.7, 0.55, s.d + 0.7), mConcrete, seg);
        for (let c = 0; c < 2 + rnd() * 3; c++) clump(seg, (rnd() - 0.5) * s.w, 0.4, (rnd() - 0.5) * s.d, 0.5 + rnd() * 0.7);
      }
      overgrow(seg, s.w, segH, s.d, green * (i < s.n / 2 ? 1.25 : 0.7));
      parent = seg;
    }
    const top = new THREE.Group();
    top.position.y = segH;
    parent.add(top);
    if (s.broken) {
      for (let b = 0; b < 5; b++) {
        const bh = 0.6 + rnd() * 2.4;
        mesh(slab(0.9, 1, 0.9), mConcrete, top, (rnd() - 0.5) * s.w * 0.8, bh / 2, (rnd() - 0.5) * s.d * 0.8, (rnd() - 0.5) * 0.4, 0, (rnd() - 0.5) * 0.4).scale.y = bh;
      }
    } else {
      mesh(slab(s.w + 0.3, 0.4, s.d + 0.3), mConcrete, top, 0, 0.2, 0);
      if (rnd() < 0.45) mesh(slab(0.16, 1, 0.16), mConcrete, top, s.w * 0.25, 2.4, -s.d * 0.2).scale.y = 4.8;
    }
    for (let c = 0; c < 3 + green * 4; c++) clump(top, (rnd() - 0.5) * s.w, 0.5, (rnd() - 0.5) * s.d, 0.6 + rnd() * 1.1);
    for (let p = 0; p < Math.round(1 + rnd() * 2 * green); p++) palm(top, (rnd() - 0.5) * s.w * 0.6, 0.4, (rnd() - 0.5) * s.d * 0.6, 0.8 + rnd() * 0.4);
    // vines spilling over the roof edge
    for (let v = 0; v < 4 + green * 4; v++) {
      const f = Math.floor(rnd() * 4), len = 2 + rnd() * segH * 0.8, off = (f < 2 ? s.d : s.w) / 2 + 0.1, along = (rnd() - 0.5) * (f < 2 ? s.w : s.d);
      const m = mesh(unitBox, pick(mVine), top, 0, -len / 2 + 0.3, 0);
      if (f < 2) { m.position.x = along; m.position.z = f ? -off : off; m.scale.set(0.35 + rnd() * 0.4, len, 0.2); }
      else { m.position.z = along; m.position.x = f === 2 ? off : -off; m.scale.set(0.2, len, 0.35 + rnd() * 0.4); }
    }
    if (!s.lean || Math.abs(s.lean[0]) + Math.abs(s.lean[1]) < 0.6) foam(world, s.x, s.z, Math.max(s.w, s.d) * 0.72);
    return top;
  };

  const towers: TowerSpec[] = [
    { x: -19, z: -18, w: 5, d: 5, h: 34, n: 4, lean: [0, 0.23], yaw: 0.3 },
    { x: -4, z: -31, w: 6, d: 4, h: 48, n: 6, bend: [0, -0.085], yaw: 0.1 },
    { x: 10, z: -17, w: 4.5, d: 4.5, h: 30, n: 5, twist: 0.14 },
    { x: 21, z: -40, w: 7, d: 5, h: 38, n: 3, lean: [0, -0.16], broken: true },
    { x: -26, z: -48, w: 5, d: 5, h: 54, n: 7, bend: [0.05, 0.04], lean: [0, -0.08] },
    { x: 30, z: -15, w: 4, d: 6, h: 22, n: 3, lean: [0.1, -0.32], green: 1.6 },
    { x: 2, z: -48, w: 5, d: 5, h: 36, n: 3, lean: [0, -1.32], yaw: 0, base: -3.2, green: 1.8, broken: true },
    { x: -40, z: -26, w: 4, d: 4, h: 30, n: 4, bend: [0, 0.09] },
    { x: 43, z: -60, w: 8, d: 6, h: 62, n: 5, bend: [0, 0.05] },
    { x: -12, z: -76, w: 6, d: 6, h: 66, n: 6, bend: [-0.03, -0.04] },
    { x: 15, z: -79, w: 5, d: 4, h: 46, n: 4, lean: [0.14, 0.1] },
    { x: -56, z: -60, w: 6, d: 5, h: 40, n: 3, lean: [0, 0.12], broken: true },
    { x: 58, z: -33, w: 5, d: 5, h: 28, n: 3, bend: [0, 0.13] },
    { x: -29, z: -7, w: 4, d: 4, h: 12, n: 2, lean: [0.12, 0.1], green: 2.2, broken: true },
  ];
  const tops = towers.map(tower);
  const leanDeg = Math.round((towers[0].lean![1] * 180) / Math.PI);

  let atollPalms = 0;
  [
    [-7, -9, 4], [7, -5, 2.6], [16, -30, 5], [-20, -36, 7], [28, -6, 2.5], [-36, -16, 4], [38, -47, 5],
    [-4, -64, 7], [52, -21, 3], [-48, -40, 4], [25, -66, 6], [-31, -71, 5], [65, -72, 7], [-63, -25, 6],
    [-44, 14, 4], [42, 12, 3.5], [-70, -2, 5], [74, -6, 4],
  ].forEach(([x, z, r], i) => {
    const n = island(x, z, r, i === 3 ? 9 : undefined);
    if (i === 3) atollPalms = n;
  });

  // Merge every static mesh into one geometry per material: ~1.5k meshes become a dozen draws.
  world.updateMatrixWorld(true);
  const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const loose = new Set<THREE.BufferGeometry>();
  world.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    loose.add(m.geometry);
    const g = m.geometry.clone().applyMatrix4(m.matrixWorld);
    const mat = m.material as THREE.Material;
    if (!byMat.has(mat)) byMat.set(mat, []);
    byMat.get(mat)!.push(g);
  });
  const labelAt = {
    tower: tops[0].localToWorld(new THREE.Vector3(0, 3, 0)),
    atoll: new THREE.Vector3(-20, 6.5, -36),
  };
  scene.remove(world);
  loose.forEach((g) => g.dispose());
  byMat.forEach((gs, mat) => {
    const merged = mergeGeometries(gs, false);
    gs.forEach((g) => g.dispose());
    if (merged) mesh(merged, mat, scene);
  });

  /* ---- wing-sail ships ---- */
  const hullGeo = (len: number, beam: number, ht: number) => {
    const s = new THREE.Shape();
    s.moveTo(-len / 2, ht * 0.15);
    s.lineTo(len * 0.3, 0);
    s.lineTo(len / 2, ht * 0.95);
    s.lineTo(len * 0.4, ht);
    s.lineTo(-len / 2, ht);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: beam, bevelEnabled: false });
    g.translate(0, 0, -beam / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) / (len / 2), y = p.getY(i) / ht;
      const taper = x > 0 ? 1 - x * x * 0.9 : 1 - Math.pow(-x, 3) * 0.3;
      p.setZ(i, p.getZ(i) * taper * (0.45 + 0.55 * y));
    }
    return facet(g, 0);
  };
  const sailGeo = (h: number, c: number) => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(c, 0);
    s.quadraticCurveTo(c * 0.95, h * 0.6, c * 0.32, h);
    s.lineTo(0, h * 0.96);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: false, curveSegments: 4 });
    g.translate(-c * 0.3, 0, -0.07);
    return facet(g, 0);
  };
  const mastG = facet(new THREE.CylinderGeometry(0.07, 0.09, 1, 4), 0);
  const beaconG = new THREE.OctahedronGeometry(0.22, 0);
  const rig = (g: THREE.Group, x: number, y: number, h: number, c: number) => {
    mesh(sailGeo(h, c), mSail, g, x, y, 0, 0, 0.32, 0);
    mesh(mastG, mDeck, g, x, y + (h + 0.6) / 2, 0).scale.y = h + 0.6;
    mesh(beaconG, M.glyph, g, x, y + h + 0.5, 0);
  };
  const strip = (g: THREE.Group, len: number, beam: number, y: number) => mesh(unitBox, M.glyph, g, 0, y, 0).scale.set(len, 0.07, beam);
  const trimaran = () => {
    const g = new THREE.Group();
    mesh(hullGeo(7, 1.1, 0.9), mHull, g);
    mesh(hullGeo(4.6, 0.5, 0.55), mHull, g, 0.3, 0.05, 2.4);
    mesh(hullGeo(4.6, 0.5, 0.55), mHull, g, 0.3, 0.05, -2.4);
    mesh(unitBox, mDeck, g, 1.1, 0.72, 0).scale.set(0.3, 0.14, 5);
    mesh(unitBox, mDeck, g, -0.9, 0.72, 0).scale.set(0.3, 0.14, 5);
    mesh(unitBox, mDeck, g, -1.6, 1.1, 0).scale.set(1.6, 0.4, 0.7);
    strip(g, 5.4, 0.62, 0.42);
    rig(g, 0.5, 0.9, 8.5, 2.6);
    return g;
  };
  const clipper = () => {
    const g = new THREE.Group();
    mesh(hullGeo(11, 1.6, 1.3), mHull, g);
    mesh(unitBox, mDeck, g, -3.9, 1.6, 0).scale.set(2.2, 0.7, 0.9);
    strip(g, 8.4, 1.0, 0.6);
    rig(g, 3.1, 1.3, 7, 2.3);
    rig(g, 0.1, 1.3, 9.8, 3);
    rig(g, -2.5, 1.3, 7.4, 2.4);
    return g;
  };
  const SPAN = 115;
  const ships = [
    { g: trimaran(), z: 6, x0: -40, sp: 1.6, dir: 1 },
    { g: clipper(), z: -22, x0: 40, sp: 1.2, dir: -1 },
    { g: trimaran(), z: -55, x0: -50, sp: 1.4, dir: 1 },
    { g: clipper(), z: -88, x0: 30, sp: 1, dir: -1 },
  ];
  for (const s of ships) {
    s.g.scale.setScalar(1.3);
    s.g.rotation.order = "YXZ";
    s.g.rotation.y = s.dir > 0 ? 0 : Math.PI;
    scene.add(s.g);
  }
  const shipX = (s: (typeof ships)[number], t: number) => {
    const span = SPAN * 2, raw = s.x0 + s.dir * s.sp * t + SPAN;
    return ((raw % span) + span) % span - SPAN;
  };

  /* ---- two suns, banded halos, glitter path ---- */
  const sunRig = (dir: THREE.Vector3, r: number, core: string, halo: string) => {
    const g = new THREE.Group();
    scene.add(g);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 16), new THREE.MeshBasicMaterial({ color: core }));
    g.add(disc);
    [1.5, 2.3, 3.6].forEach((f, i) => {
      const m = new THREE.Mesh(
        new THREE.CircleGeometry(r * f, 20),
        new THREE.MeshBasicMaterial({ color: halo, transparent: true, opacity: [0.26, 0.14, 0.07][i], depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      m.position.z = -0.5 - i * 0.5;
      g.add(m);
    });
    return { g, dir };
  };
  const suns = [sunRig(SUN_A, 16, "#fff3d0", "#ffc47a"), sunRig(SUN_B, 9, "#ffcaa0", "#ff8a5e")];

  const NG = 220, gp = new Float32Array(NG * 3);
  const glints = Array.from({ length: NG }, (_, i) => ({ s: i % 3 === 2 ? 1 : 0, d: 8 + Math.pow(rnd(), 1.6) * 150, l: rnd() * 2 - 1, ph: rnd() * 40 }));
  const glintGeo = new THREE.BufferGeometry();
  glintGeo.setAttribute("position", new THREE.BufferAttribute(gp, 3));
  const glintPts = new THREE.Points(glintGeo, new THREE.PointsMaterial({ color: "#ffe2aa", size: 1, sizeAttenuation: false }));
  glintPts.frustumCulled = false;
  scene.add(glintPts);

  const shipLabel = ships[1];
  return {
    scene, cam, fog: [18, 105], fov: [64, 74], light,
    labels: [
      { name: "Leaning tower", sub: `${leanDeg}° off plumb`, at: (v) => { v.copy(labelAt.tower); } },
      { name: "Atoll", sub: `palm stand · ${atollPalms} trees`, at: (v) => { v.copy(labelAt.atoll); } },
      {
        name: "Wing-sail clipper", sub: "", at: (v) => { v.copy(shipLabel.g.position).y += 12; },
        sub2: () => `${(shipLabel.sp * 9.7 * (1 + 0.04 * Math.sin(k.U.uTime.value * 0.4))).toFixed(1)} kn`,
      },
    ],
    update(t) {
      const a = Math.PI / 2 + Math.sin(t * 0.035) * 0.5 + view.px * 0.1, r = 38 + Math.sin(t * 0.05) * 2;
      const cx = Math.cos(a) * r, cz = Math.sin(a) * r - 6;
      cam.position.set(cx, 5.2 + Math.sin(t * 0.6) * 0.22 - view.py * 0.6, cz);
      cam.lookAt(cx * 0.3 + view.px * 4, 6.2 - view.py * 1.5, -40);
      cam.rotateZ(Math.sin(t * 0.5) * 0.012);
      sky.position.copy(cam.position);
      swell(t);
      for (const s of ships) {
        const x = shipX(s, t), z = s.z;
        s.g.position.set(x, wave(x, z, t) * 0.8 - 0.2, z);
        s.g.rotation.z = (wave(x + 2, z, t) - wave(x - 2, z, t)) * 0.12 * s.dir;
        s.g.rotation.x = (wave(x, z + 1.5, t) - wave(x, z - 1.5, t)) * 0.16 * s.dir;
      }
      for (const s of suns) {
        s.g.position.copy(cam.position).addScaledVector(s.dir, 185);
        s.g.lookAt(cam.position);
      }
      for (let i = 0; i < NG; i++) {
        const G = glints[i], dir = suns[G.s].dir, spread = (0.5 + G.d * 0.05) * (G.s ? 0.6 : 1);
        const x = cam.position.x + dir.x * G.d - dir.z * G.l * spread, z = cam.position.z + dir.z * G.d + dir.x * G.l * spread;
        const on = Math.sin(t * 6 + G.ph) > 0.35;
        gp[i * 3] = x;
        gp[i * 3 + 1] = on ? wave(x, z, t) + 0.08 : -40;
        gp[i * 3 + 2] = z;
      }
      glintGeo.attributes.position.needsUpdate = true;
    },
    readout() {
      const p = cam.position, t = k.U.uTime.value;
      return [
        ["Lat", k.dms(-8.4172 - p.z * 0.00009, "N", "S", 2)],
        ["Lon", k.dms(-142.6031 + p.x * 0.00013, "E", "W", 3)],
        ["Swell", `${(1.1 + 0.25 * Math.sin(t * 0.3)).toFixed(1)} m`],
        ["Brg", `${k.pad(Math.round(k.bearing(cam)), 3)}°`],
        ["Grid", k.gridRef(p.x, p.z, 40)],
      ];
    },
  };
}
