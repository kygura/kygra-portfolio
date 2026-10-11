/** Sheet 01 · Ocean: endless swell, overgrown drowned towers, palm islands, a moored wing-sail ship, twin suns. */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { PsxKit, SceneDef, V3 } from "./psx";

type Kind = "box" | "cyl" | "taper";

export function buildOcean(k: PsxKit): SceneDef {
  const { rnd, facet, mesh, psx, M, tex, view } = k;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(64, 16 / 9, 0.1, 320);
  const sky = k.skyDome(0, 0.3, 2.2);
  scene.add(sky);

  const wave = (x: number, z: number, t: number) =>
    0.26 * Math.sin(x * 0.19 + z * 0.05 + t * 0.85) +
    0.17 * Math.sin(z * 0.23 - x * 0.07 - t * 0.66) +
    0.08 * Math.sin((x + z) * 0.47 + t * 1.5);

  const mat = {
    water: psx({ map: tex.tWater, tint: "#a6c9cc", amb: "#46606c", sun: "#c9c2a8" }),
    foam: psx({ map: tex.tPlain, tint: "#d4e2dc", amb: "#7d8c90" }),
    sand: psx({ map: tex.tSand, uv: 3 }),
    grass: psx({ map: tex.tGround, tint: "#d0dca8", moss: 0.5, uv: 2 }),
    glass: psx({ map: tex.tGlass, tint: "#c3cfcf", moss: 0.9 }),
    glass2: psx({ map: tex.tGlass, tint: "#a9b9c4", moss: 0.9 }),
    trunk: psx({ map: tex.tBark, tint: "#b8a488" }),
    frond: psx({ map: tex.tLeaf, tint: "#a8c47c", uv: 1.5 }),
    wood: psx({ map: tex.tBark, tint: "#9c8a74", uv: 2 }),
    hull: psx({ map: tex.tPlain, tint: "#dcd8cb", amb: "#6d7c84" }),
    sail: psx({ map: tex.tPlain, tint: "#e9e4d4", amb: "#7a8890" }),
  };

  /* ---- batching: static parts merge into one mesh per material per parent ---- */
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler();
  const pv = new THREE.Vector3(), sv = new THREE.Vector3();
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) => {
    m4.compose(pv.set(x, y, z), q.setFromEuler(eu.set(rx, ry, rz)), sv.set(s, s, s));
    const list = batches.get(m) ?? [];
    list.push(geo.clone().applyMatrix4(m4));
    batches.set(m, list);
  };
  const flush = (parent: THREE.Object3D) => {
    for (const [m, list] of batches) {
      const merged = mergeGeometries(list);
      if (merged) mesh(merged, m, parent);
    }
    batches.clear();
  };
  // Cylinder from a to b (geometry already in place).
  const up = new THREE.Vector3(0, 1, 0);
  const seg = (a: V3, b: V3, r0: number, r1: number, n = 5) => {
    const g = new THREE.CylinderGeometry(r1, r0, a.distanceTo(b) * 1.08, n, 1);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, b.clone().sub(a).normalize()));
    g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    return facet(g, 0.03);
  };
  // World-space facade UVs so window rows line up across every tower face.
  const wallUV = (g: THREE.BufferGeometry, s: number) => {
    const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
      const u = ay > 0.7 || az >= ax ? p.getX(i) : p.getZ(i);
      uv.setXY(i, u * s, (ay > 0.7 ? p.getZ(i) : p.getY(i)) * s);
    }
    return g;
  };

  /* ---- ocean: a grid denser near the camera, displaced every frame ---- */
  const WN = 72, WH = 170, WCX = 10, WCZ = -18;
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
    wuv.setXY(i, wx[i] / 6, wz[i] / 6);
  }
  mesh(water, mat.water, scene).frustumCulled = false;

  /* ---- palms ---- */
  const frondG = new THREE.ConeGeometry(0.42, 3.0, 4);
  frondG.scale(0.22, 1, 1);
  frondG.translate(0, 1.5, 0);
  const frond = facet(frondG, 0.04);
  const nut = facet(new THREE.IcosahedronGeometry(0.18, 0), 0.03);
  const palm = (x: number, y: number, z: number, s: number) => {
    const H = 4.2 + rnd() * 2.2, lean = 0.6 + rnd() * 1.4, n = 6, ry = rnd() * Math.PI * 2;
    const xf = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(up, ry), new THREE.Vector3(s, s, s));
    const P = (i: number) => new THREE.Vector3(lean * (i / n) ** 2, (H * i) / n, 0);
    for (let i = 0; i < n; i++) {
      const g = seg(P(i), P(i + 1), 0.22 - i * 0.014, 0.21 - (i + 1) * 0.014);
      g.applyMatrix4(xf);
      add(g, mat.trunk);
    }
    const top = P(n).applyMatrix4(xf);
    for (let f = 0; f < 8; f++) {
      const a = ry + (f / 8) * Math.PI * 2 + rnd() * 0.3, droop = f % 2 ? 0.2 : 0.55 + rnd() * 0.25;
      const g = frond.clone().rotateZ(-Math.PI / 2 - droop).rotateY(a);
      add(g, mat.frond, top.x, top.y, top.z, 0, 0, 0, s);
    }
    for (let c = 0; c < 3; c++) {
      const a = c * 2.1;
      add(nut, mat.trunk, top.x + Math.cos(a) * 0.22 * s, top.y - 0.2 * s, top.z + Math.sin(a) * 0.22 * s, 0, 0, 0, s);
    }
  };

  /* ---- drowned towers ---- */
  const blob = [0, 1, 2].map((i) => facet(new THREE.IcosahedronGeometry(1, 0), 0.25 + i * 0.05));
  const leaf = () => M.leaf[Math.floor(rnd() * 3)];
  const towers: [number, number, number, number, Kind, number, number, THREE.Material][] = [
    [0, 0, 5.2, 27, "taper", 0, 0, mat.glass],
    [-7.5, 4, 4.4, 21, "box", 0.04, -0.05, M.stone],
    [6.5, 6, 3.8, 18, "cyl", 0, 0, mat.glass],
    [-3.5, -7.5, 3.6, 14, "box", -0.06, 0.08, mat.glass2],
    [9.5, -2.5, 3.2, 11, "box", 0.03, 0.02, M.stone],
    [-13, -3, 4, 16, "cyl", 0, 0.05, mat.glass2],
    [2, 12, 5.5, 23, "box", 0, 0, mat.glass],
    [-9.5, 13, 3.4, 13, "taper", 0.1, 0.06, M.stone],
    [13.5, 9.5, 3, 9, "box", -0.04, 0, mat.glass2],
    [-1, 22, 6, 19, "cyl", 0, 0, M.stone],
  ];
  const BASE = -3;
  let spireTop = 0;
  towers.forEach(([x, z, w, h, kind, tx, tz, clad]) => {
    const g = new THREE.Group();
    g.position.set(x, BASE, z);
    g.rotation.set(tx, rnd() * 0.6, tz);
    scene.add(g);
    const d = kind === "box" ? w * 0.85 : w;
    const rb = kind === "taper" ? w * 0.75 : w / 2, rt = kind === "taper" ? w * 0.3 : w / 2;
    // Distance from the axis to the facade at angle a, height y; plus its outward normal.
    const surf = (a: number, y: number): [number, number, number] => {
      const c = Math.cos(a), s = Math.sin(a);
      if (kind !== "box") {
        const r = (rb + (rt - rb) * (y / h)) * (kind === "taper" ? 0.78 : 1);
        return [r, c, s];
      }
      const tX = w / 2 / Math.max(1e-3, Math.abs(c)), tZ = d / 2 / Math.max(1e-3, Math.abs(s));
      return tX < tZ ? [tX, Math.sign(c), 0] : [tZ, 0, Math.sign(s)];
    };

    let body: THREE.BufferGeometry;
    if (kind === "box") body = new THREE.BoxGeometry(w, h, d, 1, Math.ceil(h / 3), 1);
    else if (kind === "cyl") body = new THREE.CylinderGeometry(rt, rb * 1.05, h, 8, Math.ceil(h / 3));
    else body = new THREE.CylinderGeometry(rt, rb, h, 4, Math.ceil(h / 3)).rotateY(Math.PI / 4);
    body.translate(0, h / 2, 0);
    add(wallUV(facet(body, 0.04), 1 / 8), clad);

    // lit bands, every six units above the waterline
    for (let y = 9; y < h - 1; y += 6) {
      if (kind === "box") add(facet(new THREE.BoxGeometry(w + 0.08, 0.14, d + 0.08)), M.glyph, 0, y, 0);
      else if (kind === "cyl") add(facet(new THREE.CylinderGeometry(rb + 0.05, rb + 0.05, 0.14, 8)), M.glyph, 0, y, 0);
    }

    // crown
    if (kind === "box") {
      add(wallUV(facet(new THREE.BoxGeometry(w * 0.6, 2.2, d * 0.55)), 1 / 8), clad === M.stone ? mat.glass2 : clad, 0, h + 1.1, -d * 0.1);
      add(facet(new THREE.CylinderGeometry(0.05, 0.09, 4, 4)), M.solid, w * 0.15, h + 4.2, -d * 0.1);
      add(facet(new THREE.BoxGeometry(0.2, 0.2, 0.2)), M.glyph, w * 0.15, h + 6.2, -d * 0.1);
    } else if (kind === "cyl") {
      add(facet(new THREE.CylinderGeometry(rb + 0.25, rb + 0.25, 0.5, 8)), M.stone2, 0, h, 0);
      add(facet(new THREE.CylinderGeometry(rb + 0.3, rb + 0.3, 0.12, 8)), M.glyph, 0, h + 0.3, 0);
      const dome = new THREE.IcosahedronGeometry(rb * 0.85, 1);
      dome.scale(1, 0.5, 1);
      add(facet(dome, 0.05), mat.glass2, 0, h + 0.2, 0);
    } else {
      add(facet(new THREE.ConeGeometry(rt * 1.05, h * 0.25, 4).rotateY(Math.PI / 4), 0.05), clad, 0, h + h * 0.125, 0);
      add(facet(new THREE.CylinderGeometry(0.04, 0.08, 3, 4)), M.solid, 0, h * 1.25 + 1.4, 0);
      add(facet(new THREE.BoxGeometry(0.22, 0.22, 0.22)), M.glyph, 0, h * 1.25 + 2.9, 0);
      if (x === 0 && z === 0) spireTop = BASE + h * 0.85;
    }

    // overgrowth: roof canopy, facade clumps, hanging vines, waterline thicket
    const roofY = kind === "taper" ? h + 0.2 : h + 0.25;
    const roofR = kind === "taper" ? rt * 0.6 : Math.min(w, d) * 0.42;
    for (let c = 0; c < 6; c++) {
      const a = rnd() * 6.28, r = rnd() * roofR, s = 0.55 + rnd() * 0.75;
      add(blob[c % 3], leaf(), Math.cos(a) * r, roofY + s * 0.3, Math.sin(a) * r, rnd() * 3, rnd() * 3, 0, s);
    }
    if (kind !== "taper") palm(roofR * 0.4, roofY, -roofR * 0.3, 0.45 + rnd() * 0.15);
    for (let c = 0; c < h * 0.9; c++) {
      const a = rnd() * 6.28, y = 3 + Math.pow(rnd(), 0.7) * (h - 3), [r, nx, nz] = surf(a, y), s = 0.45 + rnd() * 0.8;
      add(blob[c % 3], leaf(), Math.cos(a) * r + nx * s * 0.3, y, Math.sin(a) * r + nz * s * 0.3, rnd() * 3, rnd() * 3, 0, s);
    }
    if (kind !== "taper") {
      for (let v = 0; v < h * 0.45; v++) {
        const a = rnd() * 6.28, top = h * (0.35 + rnd() * 0.65), L = Math.min(2 + rnd() * 6, top - 2.5);
        const [r, nx, nz] = surf(a, top);
        const vg = facet(new THREE.BoxGeometry(0.4 + rnd() * 0.8, L, 0.18, 1, 3, 1), 0.14);
        add(vg, leaf(), Math.cos(a) * r + nx * 0.12, top - L / 2, Math.sin(a) * r + nz * 0.12, 0, Math.atan2(nx, nz), 0);
      }
    }
    for (let c = 0; c < 7; c++) {
      const a = (c / 7) * 6.28 + rnd() * 0.5, [r, nx, nz] = surf(a, 3), s = 0.6 + rnd() * 0.6;
      add(blob[c % 3], leaf(), Math.cos(a) * r + nx * 0.4, 2.7 + rnd() * 0.8, Math.sin(a) * r + nz * 0.4, rnd() * 3, rnd() * 3, 0, s);
    }
    flush(g);
  });

  /* ---- islands ---- */
  const foams: { m: THREE.Mesh; x: number; z: number }[] = [];
  const rock = facet(new THREE.DodecahedronGeometry(1, 0), 0.3);
  const island = (x: number, z: number, r: number, h: number, np: number) => {
    add(facet(new THREE.CylinderGeometry(r * 0.78, r * 1.2, h + 2.5, 11, 2), r * 0.12), mat.sand, x, (h + 2.5) / 2 - 2.5, z, 0, rnd() * 6, 0);
    const cap = new THREE.IcosahedronGeometry(r * 0.8, 1);
    cap.scale(1, 0.32, 1);
    add(facet(cap, r * 0.08), mat.grass, x, h, z, 0, rnd() * 6, 0);
    const capY = (dd: number) => h + 0.256 * r * Math.sqrt(Math.max(0, 1 - (dd / (0.8 * r)) ** 2)) - 0.2;
    for (let p = 0; p < np; p++) {
      const a = rnd() * 6.28, dd = rnd() * r * 0.5;
      palm(x + Math.cos(a) * dd, capY(dd), z + Math.sin(a) * dd, 0.8 + rnd() * 0.45);
    }
    for (let b = 0; b < 2 + Math.round(r * 0.6); b++) {
      const a = rnd() * 6.28, dd = rnd() * r * 0.65, s = 0.5 + rnd() * 0.7;
      add(blob[b % 3], leaf(), x + Math.cos(a) * dd, capY(dd) + s * 0.2, z + Math.sin(a) * dd, rnd() * 3, rnd() * 3, 0, s);
    }
    for (let s = 0; s < 3; s++) {
      const a = rnd() * 6.28, sc = 0.3 + rnd() * 0.5;
      add(rock, M.stone2, x + Math.cos(a) * r * 1.15, sc * 0.2, z + Math.sin(a) * r * 1.15, rnd() * 3, rnd() * 3, rnd() * 3, sc);
    }
    const ring = new THREE.RingGeometry(r * 1.02, r * 1.28, 14);
    ring.rotateX(-Math.PI / 2);
    foams.push({ m: mesh(facet(ring, 0.06), mat.foam, scene, x, 0.1, z), x, z });
  };
  ([
    // x, z, radius, height, palms
    [20, -8, 4.5, 1.6, 3], [-20, -22, 5, 2.2, 4], [-24, 8, 6, 2.8, 5], [24, 14, 4, 1.4, 2],
    [34, -20, 3, 1.0, 2], [-6, -24, 3.5, 1.4, 3], [-30, 18, 7, 3, 5], [-40, -30, 7, 3, 6],
    [10, 40, 8, 3.5, 6], [-48, 34, 9, 4, 7], [55, 22, 6, 2.5, 4], [40, 60, 7, 3, 4],
    [-20, 55, 6, 2, 3], [70, -40, 8, 3, 5], [-75, -10, 10, 4, 6],
    [4, -22, 1.6, 0.6, 1], [-30, -22, 1.8, 0.7, 1], [30, 2, 1.5, 0.6, 1],
  ] as [number, number, number, number, number][]).forEach((i) => island(...i));

  /* ---- pier off the dock island ---- */
  const PZ = -11.2;
  add(facet(new THREE.BoxGeometry(9.5, 0.2, 1.5, 9, 1, 1), 0.03), mat.wood, 12.4, 1.15, PZ);
  const post = facet(new THREE.CylinderGeometry(0.14, 0.16, 3.4, 5), 0.03);
  for (let i = 0; i < 5; i++) for (const side of [-0.7, 0.7]) add(post, mat.wood, 8 + i * 1.9, -0.6, PZ + side, 0, 0, (rnd() - 0.5) * 0.08);
  add(facet(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 4)), M.solid, 9, 2.3, PZ + 0.6);
  add(facet(new THREE.BoxGeometry(0.22, 0.22, 0.22)), M.glyph, 9, 3.45, PZ + 0.6);
  flush(scene);

  /* ---- wing-sail ship, moored alongside ---- */
  const ship = new THREE.Group();
  const SX = 11.6, SZ = -13.6;
  ship.position.set(SX, 0, SZ);
  ship.rotation.y = 0.04;
  scene.add(ship);
  const hullG = new THREE.BoxGeometry(10, 1.6, 2.6, 10, 2, 2);
  const hp = hullG.attributes.position;
  for (let i = 0; i < hp.count; i++) {
    const x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i), f = (x + 5) / 10;
    let wz = f < 0.35 ? Math.sqrt(f / 0.35) : 1 - Math.max(0, f - 0.85) * 1.2;
    wz = Math.max(wz, 0.06) * (y < 0 ? 0.55 : 1);
    hp.setXYZ(i, x, y + (y > 0 ? 0.45 * (1 - f) ** 3 : 0), z * wz);
  }
  add(facet(hullG, 0.03), mat.hull);
  add(facet(new THREE.BoxGeometry(5.5, 0.06, 2.4)), mat.wood, 1, 0.83, 0);
  for (const s of [-1, 1]) add(facet(new THREE.BoxGeometry(5, 0.12, 0.04)), M.glyph, 1, 0.45, s * 1.32);
  add(wallUV(facet(new THREE.BoxGeometry(2.2, 0.9, 1.7)), 1 / 3), mat.glass2, 3.1, 1.25, 0);
  add(facet(new THREE.BoxGeometry(2.5, 0.1, 1.9)), mat.hull, 3.1, 1.75, 0);
  const sails: [number, number][] = [[-2, 8.5], [0.7, 7.2]];
  sails.forEach(([sx, sh]) => {
    const g = new THREE.CylinderGeometry(0.32, 0.55, sh, 8, 3);
    g.scale(1.9, 1, 0.32);
    g.translate(0, sh / 2, 0);
    add(facet(g, 0.02), mat.sail, sx, 0.8, 0, 0, 0.35, 0);
    add(facet(new THREE.BoxGeometry(0.16, 0.16, 0.16)), M.glyph, sx, 0.88 + sh, 0);
  });
  add(facet(new THREE.CylinderGeometry(0.06, 0.08, 2.6, 5)), M.solid, 4.5, 2.1, 0);
  flush(ship);
  // vertical-axis wind turbine on the stern
  const rotor = new THREE.Group();
  rotor.position.set(4.5, 2.7, 0);
  ship.add(rotor);
  for (let b = 0; b < 3; b++) {
    const a = (b / 3) * Math.PI * 2;
    add(facet(new THREE.BoxGeometry(0.06, 1.4, 0.32)), mat.sail, Math.cos(a) * 0.45, 0, Math.sin(a) * 0.45, 0, -a, 0.12);
  }
  for (const y of [-0.72, 0.72]) add(facet(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 6)), M.stone2, 0, y, 0);
  flush(rotor);
  // mooring lines, re-strung every frame as the hull rides the swell
  const cleats = [new THREE.Vector3(-3.2, 0.85, 1.0), new THREE.Vector3(4.2, 0.85, 1.1)];
  const bollards = [new THREE.Vector3(8, 1.3, PZ - 0.7), new THREE.Vector3(15.6, 1.3, PZ - 0.7)];
  const lineGeo = new THREE.BufferGeometry().setFromPoints([...cleats, ...bollards]);
  lineGeo.setIndex([0, 2, 1, 3]);
  const lines = new THREE.LineSegments(lineGeo, M.lBoneDim);
  lines.frustumCulled = false;
  scene.add(lines);

  /* ---- twin suns on the horizon ---- */
  const sunDisc = (x: number, y: number, z: number, r: number, core: string, glow: string) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    scene.add(g);
    g.add(new THREE.Mesh(new THREE.CircleGeometry(r, 14), new THREE.MeshBasicMaterial({ color: core })));
    [[1.55, 0.32], [2.6, 0.14], [5, 0.035]].forEach(([s, o], i) => {
      const halo = new THREE.Mesh(
        new THREE.CircleGeometry(r * s, 14),
        new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      halo.position.z = -0.5 - i * 0.5;
      g.add(halo);
    });
    return g;
  };
  const sunA = sunDisc(-126.3, 30, 64.9, 14, "#fff3d2", "#ffc874");
  const sunB = sunDisc(-135.4, 13, 38.2, 9, "#ffd0ae", "#ff8a5c");

  // glitter on the swell along the line to the suns
  const NG = 160, gp = new Float32Array(NG * 3), gBase: number[] = [];
  for (let i = 0; i < NG; i++) {
    const [gdx, gdz] = i % 3 ? [-0.829, 0.559] : [-0.91, 0.415], s = 6 + Math.pow(rnd(), 0.6) * 110, w = (rnd() - 0.5) * (0.6 + s * 0.14);
    gBase.push(14.7 + gdx * s - gdz * w, -30 + gdz * s + gdx * w);
  }
  const glintGeo = new THREE.BufferGeometry();
  glintGeo.setAttribute("position", new THREE.BufferAttribute(gp, 3));
  const glints = new THREE.Points(glintGeo, new THREE.PointsMaterial({ color: "#ffe0a0", size: 1, sizeAttenuation: false }));
  glints.frustumCulled = false;
  scene.add(glints);

  // gulls
  const gullGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.6, 0.22, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.6, 0.22, 0),
  ]);
  const gulls = Array.from({ length: 7 }, (_, i) => {
    const l = new THREE.LineSegments(gullGeo, M.lBone);
    scene.add(l);
    return { l, r: 7 + rnd() * 10, y: 16 + rnd() * 9, sp: (0.12 + rnd() * 0.1) * (i % 3 ? 1 : -1), ph: rnd() * 6.28 };
  });

  const tmpV = new THREE.Vector3();
  return {
    scene, cam, fog: [25, 120], fov: [64, 74],
    labels: [
      { name: "Drowned spire", sub: "canopy reclaimed", at: (v) => { v.set(0, spireTop, 0); } },
      { name: "Wing-ship", sub: "moored · 2 sails", at: (v) => { v.set(-2, 9.6, 0); ship.localToWorld(v); } },
      { name: "Twin suns", sub: "binary, setting", at: (v) => { v.copy(sunA.position).y += 16; } },
    ],
    update(t) {
      for (let i = 0; i < wpos.count; i++) wpos.setY(i, wave(wx[i], wz[i], t));
      wpos.needsUpdate = true;
      water.computeVertexNormals();
      for (const f of foams) f.m.position.y = wave(f.x, f.z, t) + 0.08;

      ship.position.y = wave(SX, SZ, t) * 0.7 - 0.3;
      ship.rotation.x = Math.sin(t * 0.8) * 0.025;
      ship.rotation.z = (wave(SX - 3, SZ, t) - wave(SX + 3, SZ, t)) * 0.05;
      rotor.rotation.y = t * 2.6;
      ship.updateMatrixWorld();
      const lp = lineGeo.attributes.position;
      cleats.forEach((c, i) => { tmpV.copy(c); ship.localToWorld(tmpV); lp.setXYZ(i, tmpV.x, tmpV.y, tmpV.z); });
      lp.needsUpdate = true;

      for (let i = 0; i < NG; i++) {
        const x = gBase[i * 2], z = gBase[i * 2 + 1], on = Math.sin(t * 2.7 + i * 1.73) > 0.35;
        gp[i * 3] = x;
        gp[i * 3 + 1] = on ? wave(x, z, t) + 0.06 : -9;
        gp[i * 3 + 2] = z;
      }
      glintGeo.attributes.position.needsUpdate = true;

      for (const g of gulls) {
        const a = g.ph + t * g.sp;
        g.l.position.set(Math.cos(a) * g.r, g.y + Math.sin(t * 0.5 + g.ph) * 0.8, 6 + Math.sin(a) * g.r);
        g.l.rotation.y = -a + (g.sp > 0 ? 0 : Math.PI);
        g.l.scale.y = Math.sin(t * 6 + g.ph * 3);
      }

      const a = -1.09 + Math.sin(t * 0.035) * 0.18 + view.px * 0.12, r = 34 + Math.sin(t * 0.05) * 2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      cam.position.set(x, 3.4 + wave(x, z, t) * 0.45 - view.py * 0.6, z);
      cam.lookAt(0, 8 - view.py * 1.2, 0);
      cam.rotateZ(Math.sin(t * 0.7) * 0.012);
      sky.position.copy(cam.position);
      sunA.lookAt(cam.position);
      sunB.lookAt(cam.position);
    },
    readout() {
      const p = cam.position;
      return [
        ["Lat", k.dms(-8.9142 - p.z * 0.00009, "N", "S", 2)],
        ["Lon", k.dms(-140.1027 + p.x * 0.00013, "E", "W", 3)],
        ["Elev", `${p.y.toFixed(1)} m`],
        ["Brg", `${k.pad(Math.round(k.bearing(cam)), 3)}°`],
        ["Grid", k.gridRef(p.x, p.z, 40)],
      ];
    },
  };
}
