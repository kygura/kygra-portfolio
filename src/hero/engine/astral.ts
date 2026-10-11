/** Sheet 03 · Astral: the solar system inside the zodiac halo (a burning core
 *  for the sun, platonic solids for planets, Earth with its moon), and the
 *  watcher above it. The chapter opens beside Earth with the beam leaving it,
 *  pulls back to the whole system, and when the beam reaches the watcher the
 *  eye closes. */
import * as THREE from "three";
import type { PsxKit, SceneDef, V3 } from "./psx";

export function buildAstral(k: PsxKit): SceneDef {
  const { facet, mesh, psx, M, tex, view, segs, circle, U, ramp, ease } = k;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 400);
  const sky = k.skyDome(1, 1, 0.6, 0.75);
  scene.add(sky);

  // The halo's plane is the ecliptic: planets orbit in its local XY.
  const halo = new THREE.Group();
  halo.rotation.set(Math.PI / 2 + 0.45, 0, 0.2);
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

  // sun
  const core = mesh(facet(new THREE.IcosahedronGeometry(1.3, 0), 0), M.glyph, scene);
  const coreW = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.7, 0)), M.lBone);
  scene.add(coreW);

  // planets: cored platonic solids on their orbits, Earth third out
  // Phases are set so Earth's neighbours are across the system when the chapter opens beside it.
  const planetDefs: [THREE.BufferGeometry | null, number, number, THREE.Material][] = [
    [new THREE.OctahedronGeometry(0.5, 0), 3.0, 0.4, M.lBone],
    [new THREE.IcosahedronGeometry(0.62, 0), 4.6, 4.8, M.lAccent],
    [null, 6.4, 2.2, M.lDeep],
    [new THREE.DodecahedronGeometry(0.8, 0), 8.3, 5.6, M.lAccent],
    [new THREE.TetrahedronGeometry(0.85, 0), 9.9, 3.6, M.lBone],
  ];
  const planets = planetDefs.map(([g, r, off, lm], i) => {
    halo.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circle(r, 96)), M.lDeep));
    const p = new THREE.Group();
    halo.add(p);
    if (g) {
      const c = new THREE.Mesh(facet(g.clone(), 0), M.solid);
      c.scale.setScalar(0.93);
      p.add(c, new THREE.LineSegments(new THREE.EdgesGeometry(g), lm));
    }
    return { p, r, off, sp: 0.09 / Math.sqrt(r) + i * 0.002 };
  });
  const earth = planets[2];
  const globe = mesh(facet(new THREE.IcosahedronGeometry(0.55, 1), 0.04), psx({ map: tex.tPlain, tint: "#6f8f96", amb: "#46565e", fogAmt: 0.2 }), earth.p);
  const moonOrbit = new THREE.Group();
  earth.p.add(moonOrbit);
  moonOrbit.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circle(1.25, 48)), M.lDeep));
  const moon = mesh(facet(new THREE.IcosahedronGeometry(0.2, 0), 0.02), psx({ map: tex.tPlain, tint: "#d6d0be", fogAmt: 0.1, amb: "#7d8590" }), moonOrbit);

  // the watcher, above the system
  const watcher = new THREE.Group();
  watcher.position.set(4, 28, -34);
  watcher.scale.setScalar(1.5);
  scene.add(watcher);
  const lid = (cy: number, a1: number, a2: number) => {
    const pts: V3[] = [];
    for (let i = 0; i < 18; i++) {
      const u = a1 + ((a2 - a1) * i) / 18, v = a1 + ((a2 - a1) * (i + 1)) / 18;
      pts.push(new THREE.Vector3(Math.cos(u) * 10, cy + Math.sin(u) * 10, 0), new THREE.Vector3(Math.cos(v) * 10, cy + Math.sin(v) * 10, 0));
    }
    return segs(pts, M.lAccent);
  };
  const lidUp = lid(-6, Math.PI * 0.2, Math.PI * 0.8);
  const lidLo = lid(6, -Math.PI * 0.2, -Math.PI * 0.8);
  // Scaling the lids' y about the eye line closes them; the curves' ends sit on it.
  const lidUpPts = lidUp.geometry.attributes.position;
  for (let i = 0; i < lidUpPts.count; i++) lidUpPts.setY(i, lidUpPts.getY(i) + 6 - 10 * Math.sin(Math.PI * 0.2));
  const lidLoPts = lidLo.geometry.attributes.position;
  for (let i = 0; i < lidLoPts.count; i++) lidLoPts.setY(i, lidLoPts.getY(i) - 6 + 10 * Math.sin(Math.PI * 0.2));
  const iris = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circle(3, 20)), M.lAccent);
  const pupil = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circle(1.2, 10)), M.lAccent);
  const rayPts: V3[] = [];
  for (let ry = 0; ry < 16; ry++) {
    const ru = (ry / 16) * Math.PI * 2, ro = ry % 4 ? 12 : 14;
    rayPts.push(new THREE.Vector3(Math.cos(ru) * 11, Math.sin(ru) * 11, 0), new THREE.Vector3(Math.cos(ru) * ro, Math.sin(ru) * ro, 0));
  }
  const rays = segs(rayPts, M.lAccent);
  const lashPts: V3[] = [];
  for (let li = -3; li <= 3; li++) {
    const lx = li * 2.1;
    lashPts.push(new THREE.Vector3(lx, 0, 0), new THREE.Vector3(lx * 1.12, -1.4 + Math.abs(li) * 0.15, 0));
  }
  const lashes = segs(lashPts, M.lAccent);
  const eyeFace = new THREE.Group();
  eyeFace.add(lidUp, lidLo, iris, pupil, rays, lashes);
  watcher.add(eyeFace);

  // the beam, from Earth to the watcher, with a glyph riding its head
  const beamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(), transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
  const shaftG = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
  shaftG.translate(0, 0.5, 0);
  const beam = new THREE.Mesh(shaftG, beamMat);
  beam.frustumCulled = false;
  scene.add(beam);
  const beamLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), M.lAccent);
  beamLine.frustumCulled = false;
  scene.add(beamLine);
  const linePos = beamLine.geometry.attributes.position;
  const head = mesh(new THREE.OctahedronGeometry(0.45, 0), M.glyph, scene);

  const ePos = new THREE.Vector3(), wPos = new THREE.Vector3(), bDir = new THREE.Vector3(), hPos = new THREE.Vector3();
  const anchor = new THREE.Vector3(), look = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  // Wide framing: the system low in frame, the watcher high.
  const OUT = new THREE.Vector3(1, 0.7, 1.2).normalize();
  const WIDE_LOOK = new THREE.Vector3(2, 10, -8);
  const dir = new THREE.Vector3();
  let open = 1;

  return {
    scene, cam, fog: [60, 170], fov: [60, 72], dur: 16, still: 0.5,
    labels: [
      { name: "Halo", sub: "r 11.5 · 360°", at: (v) => { v.set(HR + 1.6, 0, 0); halo.localToWorld(v); } },
      { name: "Watcher", sub: "faces the signal", at: (v) => { v.set(0, 14, 0); watcher.localToWorld(v); } },
      { name: "Earth", sub: "1 moon", at: (v) => { globe.getWorldPosition(v); v.y += 1.2; } },
    ],
    update(t, p) {
      // 0–.5 pull back from Earth · beam .02–.55 · hit .55 · lids close .6–.76 · beam fades .7–.84
      const back = ease(ramp(p, 0, 0.5));
      const reach = ease(ramp(p, 0.02, 0.55));
      const hit = Math.max(0, 1 - Math.abs(p - 0.57) * 14);
      open = 1 - ease(ramp(p, 0.6, 0.76));
      const fade = ramp(p, 0.7, 0.84);

      spin.rotation.z = t * 0.02;
      glyphs.forEach((g) => {
        const ga = g.off + t * g.sp;
        g.m.position.set(Math.cos(ga) * g.r, Math.sin(ga) * g.r, 0);
        g.m.rotation.set(t * 0.7, t * 0.5, 0);
      });
      core.rotation.set(t * 0.1, t * 0.13, 0);
      coreW.rotation.set(-t * 0.06, t * 0.08, 0);
      // Orbits run on chapter time, so every loop opens on the same arrangement.
      const ct = p * 16;
      planets.forEach((pl) => {
        const pa = pl.off + ct * pl.sp;
        pl.p.position.set(Math.cos(pa) * pl.r, Math.sin(pa) * pl.r, 0);
        pl.p.rotation.set(t * 0.3, t * 0.2, 0);
      });
      globe.rotation.y = t * 0.4;
      moonOrbit.rotation.set(1.15, 0.3, t * 0.3);
      moon.position.set(1.25, 0, 0);
      halo.updateMatrixWorld();
      globe.getWorldPosition(ePos);

      // Camera: log pull-back from beside Earth out to the wide framing.
      const d = 5 * Math.pow(46 / 5, back);
      anchor.copy(ePos).multiplyScalar(1 - back);
      cam.position.copy(anchor).addScaledVector(OUT, d);
      cam.position.y += Math.sin(t * 0.09) * 1.5 * back - view.py * 4 * back;
      cam.position.x += view.px * 6 * back;
      watcher.getWorldPosition(wPos);
      look.copy(ePos).addScaledVector(bDir.copy(wPos).sub(ePos).normalize(), 2.5).lerp(WIDE_LOOK, back);
      cam.lookAt(look);
      sky.position.copy(cam.position);

      watcher.lookAt(cam.position);
      eyeFace.rotation.z = t * 0.01;
      lidUp.scale.y = lidLo.scale.y = Math.max(0.001, open);
      const dil = 1 + hit * 0.45;
      iris.scale.set(dil, Math.max(0.001, open * dil), 1);
      pupil.scale.set(dil * 1.3 - 0.3, Math.max(0.001, open * (dil * 1.3 - 0.3)), 1);
      iris.visible = pupil.visible = open > 0.04;
      rays.scale.setScalar(0.75 + 0.25 * open + hit * 0.15);
      rays.visible = open > 0.15;
      lashes.visible = open < 0.25;
      lashes.scale.y = Math.max(0.001, 1 - open / 0.25);

      // Beam: grows from Earth to the watcher, then thins out once the eye is shut.
      const len = ePos.distanceTo(wPos) * reach;
      bDir.copy(wPos).sub(ePos).normalize();
      beam.position.copy(ePos);
      beam.quaternion.setFromUnitVectors(UP, bDir);
      const w = 0.22 * (1 - fade) + hit * 0.25;
      beam.scale.set(w, Math.max(0.001, len), w);
      beam.visible = beamLine.visible = fade < 1 && reach > 0;
      beamMat.color.copy(U.uAccent.value);
      hPos.copy(ePos).addScaledVector(bDir, len);
      linePos.setXYZ(0, ePos.x, ePos.y, ePos.z);
      linePos.setXYZ(1, hPos.x, hPos.y, hPos.z);
      linePos.needsUpdate = true;
      head.position.copy(hPos);
      head.rotation.set(t * 2, t * 1.4, 0);
      head.visible = reach > 0 && reach < 1;
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
        ["Eye", open > 0.5 ? "open" : "closed"],
      ];
    },
  };
}
