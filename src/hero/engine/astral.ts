/** Act 02 · Eye: satellite view of a small solar system. The column of light
 *  leaves the third planet, crosses the dark and reaches a giant eye above
 *  the ecliptic, which opens as it lands. */
import * as THREE from "three";
import type { PsxKit, SceneDef, V3 } from "./psx";

export function buildAstral(k: PsxKit): SceneDef {
  const { facet, mesh, psx, M, tex, view, segs, circle, ramp, ease, U } = k;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 400);
  const sky = k.skyDome(0.4, 1, 0.3, 0.9);
  scene.add(sky);

  /* ---- sun ---- */
  const sun = mesh(facet(new THREE.IcosahedronGeometry(2.6, 1), 0.25), M.glyph, scene);
  const sunW = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(3.4, 0)), M.lBone);
  scene.add(sunW);

  /* ---- planets: [orbit radius, size, tint, speed, phase] ---- */
  const defs: [number, number, string, number, number][] = [
    [6, 0.45, "#a39d8c", 0.9, 0.4],
    [9, 0.7, "#c8b48a", 0.6, 2.2],
    [13, 0.85, "#7f9a92", 0.4, 0.9],
    [18, 0.6, "#b0745a", 0.32, 4.1],
    [26, 1.8, "#bfa98a", 0.18, 2.9],
    [33, 1.3, "#8fa6ae", 0.12, 5.3],
  ];
  const EARTH = 2;
  const planets = defs.map(([r, size, tint, sp, ph], i) => {
    const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circle(r, 128)), i === EARTH ? M.lAccent : M.lBoneDim);
    ring.rotation.x = -Math.PI / 2;
    scene.add(ring);
    const m = mesh(
      facet(new THREE.IcosahedronGeometry(size, 1), size * 0.12),
      psx({ map: tex.tPlain, tint, fogAmt: 0, amb: "#2c333a", sun: "#e6dac0", uv: 2 }),
      scene,
    );
    if (i === 4) {
      const band = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circle(size * 1.9, 32)), M.lBone);
      band.rotation.x = -Math.PI / 2 + 0.35;
      m.add(band);
    }
    return { m, r, sp, ph };
  });
  const earth = planets[EARTH].m;

  /* ---- the eye, far above the ecliptic ---- */
  const EYE = new THREE.Vector3(-8, 46, -92);
  const eye = new THREE.Group();
  eye.position.copy(EYE);
  eye.scale.setScalar(3.6);
  scene.add(eye);
  const lEye = k.lineMat(U.uAccent, 420);
  const arc = (out: V3[], cx: number, cy: number, r: number, a1: number, a2: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const u = a1 + ((a2 - a1) * i) / n, v = a1 + ((a2 - a1) * (i + 1)) / n;
      out.push(new THREE.Vector3(cx + Math.cos(u) * r, cy + Math.sin(u) * r, 0), new THREE.Vector3(cx + Math.cos(v) * r, cy + Math.sin(v) * r, 0));
    }
    return out;
  };
  const lids = new THREE.Group();
  eye.add(lids);
  lids.add(segs(arc(arc([], 0, -6, 10, Math.PI * 0.2, Math.PI * 0.8, 18), 0, 6, 10, -Math.PI * 0.2, -Math.PI * 0.8, 18), lEye));
  const iris = new THREE.Group();
  eye.add(iris);
  const disc = (r: number, mat: THREE.Material) => mesh(new THREE.CircleGeometry(r, 14), mat, iris);
  disc(3, psx({ map: tex.tPlain, tint: "#1d2428", fogAmt: 0, amb: "#2a3238", side: THREE.DoubleSide }));
  const pupil = disc(1.25, psx({ map: tex.tPlain, tint: "#000000", emit: 1, fogAmt: 0, side: THREE.DoubleSide }));
  pupil.position.z = 0.05;
  iris.add(segs(arc(arc([], 0, 0, 3, 0, Math.PI * 2, 20), 0, 0, 1.25, 0, Math.PI * 2, 10), lEye));
  const rays = new THREE.Group();
  eye.add(rays);
  const rl: V3[] = [];
  for (let ry = 0; ry < 16; ry++) {
    const ru = (ry / 16) * Math.PI * 2, ro = ry % 4 ? 12 : 14;
    rl.push(new THREE.Vector3(Math.cos(ru) * 11, Math.sin(ru) * 11, 0), new THREE.Vector3(Math.cos(ru) * ro, Math.sin(ru) * ro, 0));
  }
  rays.add(segs(rl, lEye));

  /* ---- the column of light, earth → eye ---- */
  const core = k.beam(0.16, 1.8, 3);
  const glow = k.beam(0.5, 0.35, 3);
  const packet = new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 0), M.glyph);
  scene.add(core, glow, packet);
  const UP = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3(), tmp = new THREE.Vector3(), look = new THREE.Vector3();
  const A = new THREE.Vector3(), W = new THREE.Vector3(24, 30, 46), C = new THREE.Vector3(12, 18, 26), D = new THREE.Vector3();
  let dist = 1;

  return {
    scene, cam, fog: [60, 170], fov: [55, 70],
    dur: 15, key: 10.5, flash: 0,
    labels: [
      { name: "Sun", sub: "G-type", at: (v) => { v.set(0, 4.5, 0); } },
      { name: "Third planet", sub: "origin of signal", at: (v) => { earth.getWorldPosition(v); v.y += 2; } },
      { name: "Watcher", sub: "eye opens", at: (v) => { v.set(0, 15, 0); eye.localToWorld(v); } },
    ],
    update(t, p) {
      sun.rotation.set(t * 0.05, t * 0.07, 0);
      sunW.rotation.set(-t * 0.03, t * 0.04, 0);
      planets.forEach((pl) => {
        const a = pl.ph + t * pl.sp * 0.05;
        pl.m.position.set(Math.cos(a) * pl.r, 0, Math.sin(a) * pl.r);
        pl.m.rotation.y = t * 0.3;
      });

      // Beam leaves the planet and lands on the eye at 9 s.
      dir.subVectors(EYE, earth.position);
      dist = dir.length();
      dir.normalize();
      const L = 4 + (dist - 4) * ease(Math.min(1, Math.max(0, (p - 0.5) / 8.5)));
      for (const b of [core, glow]) {
        b.position.copy(earth.position);
        b.quaternion.setFromUnitVectors(UP, dir);
        b.scale.y = L;
      }
      packet.visible = p < 9;
      packet.position.copy(earth.position).addScaledVector(dir, L);
      packet.rotation.set(t * 2, t * 1.4, 0);

      const hit = ramp(p, 9, 9.7);
      eye.lookAt(earth.position);
      lids.scale.y = 0.22 + 0.78 * hit;
      iris.scale.y = Math.min(1, lids.scale.y * 1.4);
      pupil.scale.setScalar(1 - 0.45 * hit);
      rays.scale.setScalar(1 + 0.2 * hit + 0.03 * Math.sin(t * 2));
      rays.rotation.z = t * 0.02;
      this.flash = 0.4 * (1 - ramp(p, 0, 1.4)) + (p > 9 ? 0.5 * (1 - ramp(p, 9, 10.8)) : 0);

      // Close on the planet → wide system → frame the eye → push in.
      A.copy(earth.position).add(tmp.set(2.6, 1.2, 3.4));
      look.copy(earth.position).addScaledVector(dir, 3);
      const u1 = ease(Math.min(1, Math.max(0, (p - 1.2) / 6.3)));
      const u2 = ease(Math.min(1, Math.max(0, (p - 7.2) / 3.6)));
      const u3 = ease(Math.min(1, Math.max(0, (p - 10.5) / 4.5)));
      cam.position.lerpVectors(A, W, u1);
      look.lerp(tmp.set(0, 0, 0), u1);
      cam.position.lerp(C, u2);
      look.lerp(EYE, u2);
      D.copy(C).sub(EYE).setLength(62).add(EYE);
      cam.position.lerp(D, u3);
      cam.position.x += view.px * 2;
      cam.position.y -= view.py * 2;
      cam.lookAt(look);
      sky.position.copy(cam.position);
    },
    readout() {
      const b = k.bearing(cam), ra = b / 15, h = Math.floor(ra), m = Math.floor((ra - h) * 60);
      cam.getWorldDirection(tmp);
      const dec = (Math.asin(Math.max(-1, Math.min(1, tmp.y))) * 180) / Math.PI;
      return [
        ["RA", `${k.pad(h)}h ${k.pad(m)}m`],
        ["Dec", `${dec < 0 ? "−" : "+"}${k.pad(Math.abs(dec).toFixed(1), 4)}°`],
        ["Epoch", "J2026.8"],
        ["Brg", `${k.pad(Math.round(b), 3)}°`],
        ["Range", `${(dist * 0.1).toFixed(1)} AU`],
      ];
    },
  };
}
