/** Sheet 03 · Astral: halo with orbiting glyphs, cored polyhedra, the watcher, a moon with a satellite. */
import * as THREE from "three";
import type { PsxKit, SceneDef, V3 } from "./psx";

export function buildAstral(k: PsxKit): SceneDef {
  const { rnd, facet, mesh, psx, M, tex, view, segs, circle } = k;
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
  const dir = new THREE.Vector3();

  return {
    scene, cam, fog: [60, 170], fov: [60, 72],
    labels: [
      { name: "Halo", sub: "r 11.5 · 360°", at: (v) => { v.set(HR + 1.6, 0, 0); halo.localToWorld(v); } },
      { name: "Watcher", sub: "fixed, faces observer", at: (v) => { v.set(0, 14, 0); watcher.localToWorld(v); } },
      { name: "Moon", sub: "1 satellite", at: (v) => { v.set(0, 6, 0); moonRig.localToWorld(v); } },
      { name: "Icosahedron", sub: "20 faces", at: (v) => { polys[0].g.getWorldPosition(v); v.y += 3.2; } },
    ],
    update(t) {
      const a = 1.4 + t * 0.02 + view.px * 0.2, r = 36;
      cam.position.set(Math.cos(a) * r, 3 + Math.sin(t * 0.09) * 2 - view.py * 4, Math.sin(a) * r);
      cam.lookAt(0, 2 - view.py * 2, 0);
      sky.position.copy(cam.position);
      spin.rotation.z = t * 0.02;
      glyphs.forEach((g) => {
        const ga = g.off + t * g.sp;
        g.m.position.set(Math.cos(ga) * g.r, Math.sin(ga) * g.r, 0);
        g.m.rotation.set(t * 0.7, t * 0.5, 0);
      });
      core.rotation.set(t * 0.1, t * 0.13, 0);
      coreW.rotation.copy(core.rotation);
      polyRig.rotation.y = t * 0.012;
      polys.forEach((p) => {
        p.g.rotation.x = t * p.sx;
        p.g.rotation.y = t * p.sy;
        p.g.position.y = p.y + Math.sin(t * 0.3 + p.bob) * 0.5;
      });
      watcher.lookAt(cam.position);
      watcher.rotateZ(t * 0.01);
      moon.rotation.y = t * 0.02;
      const sa = t * 0.25;
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
