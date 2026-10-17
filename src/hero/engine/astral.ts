/** Sheet 03 · Astral: halo with orbiting glyphs, an armillary around the core, cored polyhedra, a star tetrahedron,
 *  a turning tesseract, a debris belt, a constellation, the watcher, a moon with a satellite, and a populated
 *  outer field: drifting polyhedra, asteroid clumps, star clusters, comets, a ringed planet, a gas giant and a twin world. */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { burst, pulse, type PsxKit, type SceneDef, type V3 } from "./psx";

export function buildAstral(k: PsxKit): SceneDef {
  const { rnd, facet, mesh, psx, M, tex, view, segs, circle, batcher } = k;
  const PIVOT = new THREE.Vector3(0, 2, 0);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 400);
  const sky = k.skyDome(1, 1, 0.6, 0.75);
  scene.add(sky);

  const halo = new THREE.Group();
  halo.rotation.set(Math.PI / 2 - 0.45, 0, 0.2);
  scene.add(halo);
  const spin = new THREE.Group();
  halo.add(spin);
  const HR = 11.5;
  const ticks: V3[] = [], dash: V3[] = [];
  for (let dg = 0; dg < 360; dg += 5) {
    const r2 = (dg * Math.PI) / 180, len = dg % 30 === 0 ? 1.5 : 0.55;
    ticks.push(new THREE.Vector3(Math.cos(r2) * HR, Math.sin(r2) * HR, 0), new THREE.Vector3(Math.cos(r2) * (HR + len), Math.sin(r2) * (HR + len), 0));
  }
  for (let di = 0; di < 96; di += 2) {
    const d1 = (di / 96) * Math.PI * 2, d2 = ((di + 1) / 96) * Math.PI * 2, IR = HR - 1.3;
    dash.push(new THREE.Vector3(Math.cos(d1) * IR, Math.sin(d1) * IR, 0), new THREE.Vector3(Math.cos(d2) * IR, Math.sin(d2) * IR, 0));
  }
  spin.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circle(HR, 144)), M.lAccent));
  spin.add(segs(ticks, M.lAccent));
  spin.add(segs(dash, M.lBone));

  const glyphG = new THREE.OctahedronGeometry(0.42, 0);
  const glyphs = Array.from({ length: 6 }, (_, gi) => {
    const m = new THREE.Mesh(glyphG, M.glyph);
    halo.add(m);
    return { m, off: (gi / 6) * Math.PI * 2, sp: 0.06 + (gi % 3) * 0.025, r: HR + (gi % 2 ? 0.9 : -0.6) };
  });
  const core = mesh(facet(new THREE.IcosahedronGeometry(1.6, 0), 0), M.solid, scene);
  const coreW = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.66, 0)), M.lBone);
  scene.add(coreW);

  // Armillary: three graduated rings gimballed around the core, each turning on its own axis.
  const armillary = [
    { r: 3.1, mat: M.lBone, tick: 12 },
    { r: 3.7, mat: M.lAccent, tick: 24 },
    { r: 4.3, mat: M.lDeep, tick: 36 },
  ].map((d, i) => {
    const g = new THREE.Group();
    g.rotation.set(i * 1.05, i * 0.7, 0);
    scene.add(g);
    const ring = new THREE.Group();
    g.add(ring);
    ring.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circle(d.r, 72)), d.mat));
    const tk: V3[] = [];
    for (let ti = 0; ti < d.tick; ti++) {
      const ta = (ti / d.tick) * Math.PI * 2, tl = ti % 3 ? 0.18 : 0.4;
      tk.push(new THREE.Vector3(Math.cos(ta) * d.r, Math.sin(ta) * d.r, 0), new THREE.Vector3(Math.cos(ta) * (d.r - tl), Math.sin(ta) * (d.r - tl), 0));
    }
    ring.add(segs(tk, d.mat));
    mesh(new THREE.OctahedronGeometry(0.16, 0), M.glyph, ring, d.r, 0, 0);
    return { ring, sp: (i % 2 ? -1 : 1) * (0.07 + i * 0.03) };
  });

  const polyRig = new THREE.Group();
  scene.add(polyRig);
  const polyDefs: [THREE.BufferGeometry, number, number, number, THREE.Material][] = [
    [new THREE.IcosahedronGeometry(2.6, 0), -16, 5, -6, M.lAccent],
    [new THREE.OctahedronGeometry(2.1, 0), 15, 7, -10, M.lBone],
    [new THREE.DodecahedronGeometry(1.9, 0), 13, -4, 7, M.lAccent],
    [new THREE.TetrahedronGeometry(2.1, 0), -13, -4, 6, M.lBone],
    [new THREE.IcosahedronGeometry(1.3, 1), 1, 14, 5, M.lDeep],
  ];
  const polys = polyDefs.map((p, idx) => {
    const g = new THREE.Group();
    g.position.set(p[1], p[2], p[3]);
    polyRig.add(g);
    const c = new THREE.Mesh(facet(p[0].clone(), 0), M.solid);
    c.scale.setScalar(0.93);
    g.add(c);
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(p[0]), p[4]));
    if (idx === 0) g.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.OctahedronGeometry(1.2, 0)), M.lAccent));
    return { g, sx: 0.05 + rnd() * 0.12, sy: 0.08 + rnd() * 0.15, bob: rnd() * 6, y: p[2] };
  });

  // Stella octangula: two interlocked tetrahedra, cored like the rest; tapped, they counter-turn.
  const stella = new THREE.Group();
  stella.position.set(8, -3, -15);
  scene.add(stella);
  const tetra = new THREE.TetrahedronGeometry(2.4, 0);
  const stellaHalves = [M.lAccent, M.lBone].map((lm, i) => {
    const g = new THREE.Group();
    if (i) g.rotation.set(0, Math.PI / 2, 0);
    stella.add(g);
    const c = new THREE.Mesh(facet(tetra.clone(), 0), M.solid);
    c.scale.setScalar(0.93);
    g.add(c);
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(tetra), lm));
    return g;
  });

  // Tesseract: the 16 corners of a 4-cube, turned in the XW and ZW planes and projected down to 3D each frame.
  const tess = new THREE.Group();
  tess.position.set(-3, -6, -13);
  scene.add(tess);
  const tv = Array.from({ length: 16 }, (_, i) => [i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1, i & 8 ? 1 : -1]);
  const te: [number, number][] = [];
  for (let i = 0; i < 16; i++) for (let b = 1; b < 16; b <<= 1) if (!(i & b)) te.push([i, i | b]);
  const tPos = new Float32Array(te.length * 6);
  const tGeo = new THREE.BufferGeometry();
  tGeo.setAttribute("position", new THREE.BufferAttribute(tPos, 3));
  const tLines = new THREE.LineSegments(tGeo, M.lAccent);
  tLines.frustumCulled = false;
  tess.add(tLines);
  const tNodes = tv.map(() => mesh(new THREE.OctahedronGeometry(0.13, 0), M.glyph, tess));
  const tp = tv.map(() => new THREE.Vector3());
  const turnTess = (a: number, b: number) => {
    const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
    tv.forEach(([x, y, z, w], i) => {
      const x1 = x * ca - w * sa, w1 = x * sa + w * ca;
      const z1 = z * cb - w1 * sb, w2 = z * sb + w1 * cb;
      const s = 1.7 / (3 - w2);
      tp[i].set(x1 * s * 2.4, y * s * 2.4, z1 * s * 2.4);
      tNodes[i].position.copy(tp[i]);
    });
    te.forEach(([i, j], n) => {
      tp[i].toArray(tPos, n * 6);
      tp[j].toArray(tPos, n * 6 + 3);
    });
    tGeo.attributes.position.needsUpdate = true;
  };

  // Debris belt: a tilted ring of rough faceted shards with a dashed guide orbit, turning as one body.
  const beltTilt = new THREE.Group();
  beltTilt.rotation.set(0.32, 0, -0.18);
  scene.add(beltTilt);
  const belt = new THREE.Group();
  beltTilt.add(belt);
  const shardGeos = [new THREE.TetrahedronGeometry(0.5, 0), new THREE.OctahedronGeometry(0.4, 0), new THREE.IcosahedronGeometry(0.35, 0)];
  const bb = batcher();
  for (let bi = 0; bi < 72; bi++) {
    const ba = (bi / 72) * Math.PI * 2 + rnd() * 0.05, br = 20 + rnd() * 3.5;
    const sg = facet(shardGeos[bi % 3].clone(), 0.18);
    bb.add(sg, bi % 11 ? M.solid : M.glyph, Math.cos(ba) * br, (rnd() - 0.5) * 1.2, Math.sin(ba) * br, rnd() * 6, rnd() * 6, rnd() * 6, 0.5 + rnd() * 0.8);
  }
  bb.flush(belt);
  const bd: V3[] = [];
  for (let di = 0; di < 120; di += 2) {
    const d1 = (di / 120) * Math.PI * 2, d2 = ((di + 1) / 120) * Math.PI * 2;
    bd.push(new THREE.Vector3(Math.cos(d1) * 21.7, 0, Math.sin(d1) * 21.7), new THREE.Vector3(Math.cos(d2) * 21.7, 0, Math.sin(d2) * 21.7));
  }
  belt.add(segs(bd, M.lDeep));

  const watcher = new THREE.Group();
  watcher.position.set(4, 8, -42);
  watcher.scale.setScalar(1.7);
  scene.add(watcher);
  const wl: V3[] = [];
  const arc = (cx: number, cy: number, r: number, a1: number, a2: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const u = a1 + ((a2 - a1) * i) / n, v = a1 + ((a2 - a1) * (i + 1)) / n;
      wl.push(new THREE.Vector3(cx + Math.cos(u) * r, cy + Math.sin(u) * r, 0), new THREE.Vector3(cx + Math.cos(v) * r, cy + Math.sin(v) * r, 0));
    }
  };
  arc(0, -6, 10, Math.PI * 0.2, Math.PI * 0.8, 18);
  arc(0, 6, 10, -Math.PI * 0.2, -Math.PI * 0.8, 18);
  arc(0, 0, 3, 0, Math.PI * 2, 20);
  arc(0, 0, 1.2, 0, Math.PI * 2, 10);
  for (let ry = 0; ry < 16; ry++) {
    const ru = (ry / 16) * Math.PI * 2, ro = ry % 4 ? 12 : 14;
    wl.push(new THREE.Vector3(Math.cos(ru) * 11, Math.sin(ru) * 11, 0), new THREE.Vector3(Math.cos(ru) * ro, Math.sin(ru) * ro, 0));
  }
  watcher.add(segs(wl, M.lAccent));

  const moonRig = new THREE.Group();
  moonRig.position.set(-30, 14, -30);
  scene.add(moonRig);
  const moon = mesh(facet(new THREE.IcosahedronGeometry(5, 1), 0.5), psx({ map: tex.tPlain, tint: "#d6d0be", fogAmt: 0.1, amb: "#7d8590" }), moonRig);
  const orbit = new THREE.Group();
  orbit.rotation.set(1.15, 0.3, 0);
  moonRig.add(orbit);
  orbit.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circle(8.5, 96)), M.lDeep));
  const sat = mesh(new THREE.OctahedronGeometry(0.5, 0), M.glyph, orbit);

  // ---- outer field: everything sits beyond the camera's furthest dolly (≈72 from the pivot), so nothing ever
  // passes through the lens, and every piece is placed by best-candidate sampling against what is already there,
  // so the field spreads evenly with clear gaps instead of clumping. All figures are low poly. ----
  const taken: { p: V3; r: number }[] = [];
  const claim = (p: V3, r: number) => { taken.push({ p: p.clone(), r }); return p; };
  const cand = new THREE.Vector3(), best = new THREE.Vector3();
  /** Pick, out of `tries` random spots in a band of the shell, the one with the most clearance from everything claimed. */
  const place = (r0: number, r1: number, el0: number, el1: number, size: number, tries = 24) => {
    let bestGap = -Infinity;
    for (let i = 0; i < tries; i++) {
      const az = rnd() * Math.PI * 2, el = el0 + rnd() * (el1 - el0), r = r0 + rnd() * (r1 - r0);
      cand.set(Math.cos(az) * Math.cos(el) * r, PIVOT.y + Math.sin(el) * r, Math.sin(az) * Math.cos(el) * r);
      let gap = Infinity;
      for (const o of taken) gap = Math.min(gap, cand.distanceTo(o.p) - o.r - size);
      if (gap > bestGap) { bestGap = gap; best.copy(cand); }
    }
    return claim(best, size);
  };
  // Fixed landmarks go in first so the sampled pieces keep clear of them.
  claim(moonRig.position, 13);
  claim(watcher.position, 26);
  const RINGED = claim(new THREE.Vector3(80, 20, -74), 22);
  const GIANT = claim(new THREE.Vector3(-118, 34, -50), 22);
  const TWIN = claim(new THREE.Vector3(-66, -16, 86), 16);
  const CONSTEL = claim(new THREE.Vector3(-64, 62, 92), 26);
  const deg = Math.PI / 180;

  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), s4 = new THREE.Vector3();

  // Drifting polyhedra: cored solids with edge wire, merged per material and turning slowly as one field.
  const drift = new THREE.Group();
  drift.position.copy(PIVOT);
  scene.add(drift);
  const driftShapes = [
    new THREE.IcosahedronGeometry(1, 0), new THREE.OctahedronGeometry(1, 0), new THREE.DodecahedronGeometry(1, 0),
    new THREE.TetrahedronGeometry(1, 0), new THREE.BoxGeometry(1.3, 1.3, 1.3),
  ];
  const driftLineMats = [M.lAccent, M.lBone, M.lDeep, M.lBoneDim];
  const driftSolids: THREE.BufferGeometry[] = [];
  const driftEdges = driftLineMats.map((): THREE.BufferGeometry[] => []);
  const local = new THREE.Vector3();
  for (let di = 0; di < 40; di++) {
    const sh = driftShapes[di % driftShapes.length], sc = 2 + rnd() * 3;
    local.copy(place(82, 135, -22 * deg, 48 * deg, sc * 1.6 + 5)).sub(PIVOT);
    m4.compose(local, q4.setFromEuler(e4.set(rnd() * 6, rnd() * 6, rnd() * 6)), s4.setScalar(sc));
    driftSolids.push(facet(sh.clone(), 0).scale(0.93, 0.93, 0.93).applyMatrix4(m4));
    driftEdges[di % driftLineMats.length].push(new THREE.EdgesGeometry(sh).applyMatrix4(m4));
  }
  const driftSolid = mergeGeometries(driftSolids);
  if (driftSolid) drift.add(new THREE.Mesh(driftSolid, M.solid));
  driftEdges.forEach((list, i) => {
    const g = mergeGeometries(list);
    if (g) drift.add(new THREE.LineSegments(g, driftLineMats[i]));
  });

  // Asteroid clumps and star clusters, batched into one mesh per material.
  const field = batcher();
  const cp = new THREE.Vector3();
  for (let ci = 0; ci < 5; ci++) {
    cp.copy(place(85, 120, -18 * deg, 20 * deg, 12)).sub(PIVOT);
    for (let ai = 0; ai < 12; ai++) {
      field.add(facet(shardGeos[ai % 3].clone(), 0.2), ai % 6 ? M.solid : M.glyph,
        cp.x + (rnd() - 0.5) * 14, cp.y + (rnd() - 0.5) * 6, cp.z + (rnd() - 0.5) * 14, rnd() * 6, rnd() * 6, rnd() * 6, 1.6 + rnd() * 2.6);
    }
  }
  const starG = new THREE.OctahedronGeometry(0.4, 0);
  for (let ci = 0; ci < 6; ci++) {
    cp.copy(place(120, 150, 12 * deg, 55 * deg, 14)).sub(PIVOT);
    for (let si = 0; si < 18; si++) {
      const g = () => (rnd() + rnd() + rnd() - 1.5) * 8;
      field.add(starG, M.glyph, cp.x + g(), cp.y + g(), cp.z + g(), rnd() * 3, rnd() * 3, 0, 0.8 + rnd() * 1.6);
    }
  }
  for (let si = 0; si < 120; si++) {
    cp.copy(place(110, 160, -15 * deg, 70 * deg, 2, 12)).sub(PIVOT);
    field.add(starG, M.glyph, cp.x, cp.y, cp.z, rnd() * 3, rnd() * 3, 0, 0.7 + rnd() * 1.1);
  }
  field.flush(drift);

  // Ringed planet: a low-poly world inside graduated polygon rings and a dashed outer band.
  const ringed = new THREE.Group();
  ringed.position.copy(RINGED);
  scene.add(ringed);
  const ringedBody = mesh(facet(new THREE.IcosahedronGeometry(9, 1), 0.4), psx({ map: tex.tPlain, tint: "#a7ae98", fogAmt: 0.12, amb: "#5f6a6e" }), ringed);
  const rings = new THREE.Group();
  rings.rotation.set(Math.PI / 2 - 0.35, 0.25, 0);
  ringed.add(rings);
  [[13, M.lBone], [14.4, M.lAccent], [16, M.lBoneDim]].forEach(([r, m]) =>
    rings.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circle(r as number, 32)), m as THREE.Material)));
  const rd: V3[] = [];
  for (let di = 0; di < 48; di += 2) {
    const d1 = (di / 48) * Math.PI * 2, d2 = ((di + 1) / 48) * Math.PI * 2;
    rd.push(new THREE.Vector3(Math.cos(d1) * 18, Math.sin(d1) * 18, 0), new THREE.Vector3(Math.cos(d2) * 18, Math.sin(d2) * 18, 0));
  }
  rings.add(segs(rd, M.lDeep));

  // Gas giant: a large low-poly sphere banded by polygon latitude lines, far out on the other flank.
  const giant = new THREE.Group();
  giant.position.copy(GIANT);
  giant.rotation.z = 0.3;
  scene.add(giant);
  const GR = 16;
  const giantBody = mesh(facet(new THREE.IcosahedronGeometry(GR, 1), 0.5), psx({ map: tex.tPlain, tint: "#6f7c76", fogAmt: 0.1, amb: "#4a5560" }), giant);
  const bands: V3[] = [];
  [-0.5, -0.2, 0.15, 0.45].forEach((lat) => {
    const y = Math.sin(lat) * GR * 1.08, br = Math.cos(lat) * GR * 1.08;
    for (let bi = 0; bi < 20; bi++) {
      const u = (bi / 20) * Math.PI * 2, v = ((bi + 1) / 20) * Math.PI * 2;
      bands.push(new THREE.Vector3(Math.cos(u) * br, y, Math.sin(u) * br), new THREE.Vector3(Math.cos(v) * br, y, Math.sin(v) * br));
    }
  });
  giant.add(segs(bands, M.lAccent));

  // Twin world: a small low-poly planet with two moons on crossed polygon orbits.
  const twin = new THREE.Group();
  twin.position.copy(TWIN);
  scene.add(twin);
  mesh(facet(new THREE.IcosahedronGeometry(5, 0), 0.3), psx({ map: tex.tPlain, tint: "#b9b29c", fogAmt: 0.12, amb: "#6c747c" }), twin);
  const twinMoons = [[8.5, 0.4, 0.2, 0.32], [12, -0.9, 0.6, -0.2]].map(([r, rx, rz, sp], i) => {
    const o = new THREE.Group();
    o.rotation.set(Math.PI / 2 + rx, 0, rz);
    twin.add(o);
    o.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circle(r, 24)), M.lDeep));
    const mm = i ? mesh(new THREE.OctahedronGeometry(0.8, 0), M.glyph, o) : mesh(facet(new THREE.IcosahedronGeometry(1.3, 0), 0.2), M.solid, o);
    return { mm, r, sp };
  });

  // Comets: glyph heads on wide tilted ellipses that never come inside the camera's reach, each dragging a line trail.
  const TRAIL = 18;
  const comets = Array.from({ length: 4 }, (_, i) => {
    const tilt = new THREE.Group();
    tilt.position.copy(PIVOT);
    tilt.rotation.set(0.25 + i * 0.35, i * 1.6, 0.15 - i * 0.2);
    scene.add(tilt);
    const head = mesh(new THREE.OctahedronGeometry(0.9, 0), M.glyph, tilt);
    const pos = new Float32Array(TRAIL * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const trail = new THREE.Line(geo, i % 2 ? M.lBone : M.lAccent);
    trail.frustumCulled = false;
    tilt.add(trail);
    return { head, pos, geo, a: 112 + i * 10, b: 90 + i * 8, c: 12 + i * 4, sp: 0.03 + i * 0.006, off: i * 1.9 };
  });
  const cometAt = (c: (typeof comets)[number], u: number, v: V3) => v.set(Math.cos(u) * c.a - c.c, 0, Math.sin(u) * c.b);
  const cv = new THREE.Vector3();

  // Constellation: a far figure of glyph stars joined by bone lines, always facing the centre.
  const constel = new THREE.Group();
  constel.position.copy(CONSTEL);
  constel.scale.setScalar(1.6);
  constel.lookAt(0, 0, 0);
  scene.add(constel);
  const stars: [number, number][] = [[-11, 4], [-6, 7], [-1, 5], [3, 8], [8, 6], [5, 0], [9, -5], [-2, -3], [-7, -6]];
  const starLinks: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [4, 5], [5, 6], [5, 7], [7, 8], [7, 2]];
  const cl: V3[] = [];
  starLinks.forEach(([a, b]) => cl.push(new THREE.Vector3(stars[a][0], stars[a][1], 0), new THREE.Vector3(stars[b][0], stars[b][1], 0)));
  constel.add(segs(cl, M.lBoneDim));
  const starMeshes = stars.map(([x, y], i) => mesh(new THREE.OctahedronGeometry(i % 3 ? 0.35 : 0.55, 0), M.glyph, constel, x, y, 0));

  const dir = new THREE.Vector3();

  // easter eggs: start times
  let tCore = -99, tWatch = -99, tSat = -99, tMoon = -99, tTess = -99, tStella = -99;

  return {
    scene, cam, fog: [60, 170], fov: [60, 72], limits: { pitch: [-0.7, 0.9], zoom: [0.5, 1.6] },
    labels: [
      { name: "Halo", sub: "r 11.5 · 360°", at: (v) => { v.set(HR + 1.6, 0, 0); halo.localToWorld(v); } },
      { name: "Watcher", sub: "fixed, faces observer", at: (v) => { v.set(0, 14, 0); watcher.localToWorld(v); } },
      { name: "Moon", sub: "1 satellite", at: (v) => { v.set(0, 6, 0); moonRig.localToWorld(v); } },
      { name: "Icosahedron", sub: "20 faces", at: (v) => { polys[0].g.getWorldPosition(v); v.y += 3.2; } },
      { name: "Tesseract", sub: "4D · 8 cells", at: (v) => { tess.getWorldPosition(v); v.y += 4.6; } },
    ],
    eggs: [
      {
        id: "astral-core", r: 38,
        at: (v) => { v.copy(core.position); },
        fire: (t) => { tCore = t; return "CORE \u00b7 twenty faces, none of them honest."; },
      },
      {
        id: "astral-watcher", r: 48,
        at: (v) => { v.copy(watcher.position); },
        fire: (t) => { tWatch = t; return "WATCHER \u00b7 blinked first. Probably."; },
      },
      {
        id: "astral-satellite", r: 30,
        at: (v) => { sat.getWorldPosition(v); },
        fire: (t) => { tSat = t; return "SATELLITE \u00b7 ping. No reply, as usual."; },
      },
      {
        id: "astral-tesseract", r: 34,
        at: (v) => { tess.getWorldPosition(v); },
        fire: (t) => { tTess = t; return "TESSERACT \u00b7 inside out, then back. Mostly."; },
      },
      {
        id: "astral-stella", r: 32,
        at: (v) => { stella.getWorldPosition(v); },
        fire: (t) => { tStella = t; return "STELLA \u00b7 two tetrahedra, one argument."; },
      },
      {
        id: "astral-moon", r: 46,
        at: (v) => { v.copy(moonRig.position); },
        fire: (t) => { tMoon = t; return "MOON \u00b7 tidally locked, as advertised."; },
      },
    ],
    update(t) {
      const a = 1.4 + t * 0.02 + view.px * 0.2 + view.yaw, r = 36;
      cam.position.set(Math.cos(a) * r, 3 + Math.sin(t * 0.09) * 2 - view.py * 4, Math.sin(a) * r);
      cam.lookAt(0, 2 - view.py * 2, 0);
      k.orbit(cam, PIVOT);
      sky.position.copy(cam.position);
      spin.rotation.z = t * 0.02;
      glyphs.forEach((g) => {
        const ga = g.off + t * g.sp;
        g.m.position.set(Math.cos(ga) * g.r, Math.sin(ga) * g.r, 0);
        g.m.rotation.set(t * 0.7, t * 0.5, 0);
      });
      const ec = burst(t - tCore, 7, 3.5);
      core.rotation.set(t * 0.1 + ec, t * 0.13 + ec * 0.7, 0);
      coreW.rotation.copy(core.rotation);
      armillary.forEach((a) => { a.ring.rotation.z = t * a.sp + ec * 0.4; });
      polyRig.rotation.y = t * 0.012;
      polys.forEach((p) => {
        p.g.rotation.x = t * p.sx;
        p.g.rotation.y = t * p.sy;
        p.g.position.y = p.y + Math.sin(t * 0.3 + p.bob) * 0.5;
      });
      const es = burst(t - tStella, 6, 3);
      stella.rotation.set(t * 0.05, t * 0.09, 0);
      stellaHalves[0].rotation.y = es;
      stellaHalves[1].rotation.y = Math.PI / 2 - es;
      stella.position.y = -3 + Math.sin(t * 0.25 + 1.3) * 0.5;
      turnTess(t * 0.23 + burst(t - tTess, 6, 3.5), t * 0.17);
      tess.rotation.set(t * 0.03, t * 0.05, 0);
      belt.rotation.y = t * 0.008;
      drift.rotation.y = -t * 0.004;
      ringedBody.rotation.y = t * 0.03;
      rings.rotation.z = t * 0.01;
      giantBody.rotation.y = t * 0.012;
      twinMoons.forEach((m, i) => { const u = t * m.sp + i * 2; m.mm.position.set(Math.cos(u) * m.r, Math.sin(u) * m.r, 0); m.mm.rotation.y = t; });
      comets.forEach((c) => {
        const u = t * c.sp + c.off;
        cometAt(c, u, c.head.position);
        c.head.rotation.set(t, t * 0.7, 0);
        for (let ti = 0; ti < TRAIL; ti++) cometAt(c, u - ti * 0.012, cv).toArray(c.pos, ti * 3);
        c.geo.attributes.position.needsUpdate = true;
      });
      starMeshes.forEach((m, i) => m.scale.setScalar(0.8 + 0.2 * Math.sin(t * 1.3 + i * 1.7)));
      watcher.lookAt(cam.position);
      watcher.rotateZ(t * 0.01);
      const ew = t - tWatch;
      watcher.scale.set(1.7, 1.7, 1.7);
      watcher.scale.y = 1.7 * (1 - 0.9 * Math.max(pulse(ew, 0.35), pulse(ew - 0.5, 0.35)));
      const em = t - tMoon;
      moon.rotation.y = t * 0.02 + burst(em, 3, 3);
      moonRig.position.y = 14 + 1.6 * pulse(em, 2.4);
      const sa = t * 0.25 + burst(t - tSat, 5, 3);
      sat.position.set(Math.cos(sa) * 8.5, Math.sin(sa) * 8.5, 0);
      sat.rotation.y = t;
    },
    readout() {
      const b = k.bearing(cam), ra = b / 15, h = Math.floor(ra), m = Math.floor((ra - h) * 60);
      cam.getWorldDirection(dir);
      const dec = (Math.asin(Math.max(-1, Math.min(1, dir.y))) * 180) / Math.PI;
      return [
        ["RA", `${k.pad(h)}h ${k.pad(m)}m`],
        ["Dec", `${dec < 0 ? "−" : "+"}${k.pad(Math.abs(dec).toFixed(1), 4)}°`],
        ["Epoch", "J2026.8"],
        ["Brg", `${k.pad(Math.round(b), 3)}°`],
        ["Field", "60′"],
      ];
    },
  };
}
