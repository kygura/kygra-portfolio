/** Sheet 02 · Ruins: column ring round a lake, a tower floating over the water,
 *  collapsed arch, fallen head, trees, motes, moon. Midway through, the tower's
 *  lantern charges and fires a beam straight up, and the camera pulls back and
 *  away along it into the sky. */
import * as THREE from "three";
import type { PsxKit, SceneDef } from "./psx";

export function buildRuins(k: PsxKit, accentHex: string): SceneDef {
  const { rnd, facet, mesh, psx, M, tex, view, U, ramp, ease, lerp } = k;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(64, 16 / 9, 0.1, 320);
  const sky = k.skyDome(0, 1, 1);
  scene.add(sky);

  const ground = (x: number, z: number) => {
    const r = Math.sqrt(x * x + z * z);
    let h = 1.1 * Math.sin(x * 0.16 + 1.3) * Math.cos(z * 0.14) + 0.55 * Math.sin(x * 0.41 + z * 0.27) + 0.25 * Math.sin(x * 1.1 - z * 0.9);
    h += Math.max(0, r - 13) * 0.34 + Math.max(0, r - 26) * 0.55;
    const f = Math.min(1, Math.max(0, (r - 5) / 8));
    const bowl = Math.max(0, 1 - (r * r) / 19) * 0.7;
    return h * f * f - 0.1 * (1 - f) - bowl;
  };
  const tg = new THREE.PlaneGeometry(100, 100, 56, 56);
  tg.rotateX(-Math.PI / 2);
  const tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) tp.setY(i, ground(tp.getX(i), tp.getZ(i)));
  mesh(facet(tg, 0), psx({ map: tex.tGround, uv: 24 }), scene);

  // paving: a broken rim round the lake
  const slab = facet(new THREE.BoxGeometry(1.12, 0.22, 1.12), 0.06);
  for (let sx = -4; sx <= 4; sx++) for (let sz = -4; sz <= 4; sz++) {
    const sr = Math.hypot(sx, sz);
    if (sr > 4.6 || sr < 3.7 || rnd() < 0.22) continue;
    mesh(slab, rnd() > 0.5 ? M.stone : M.stone2, scene, sx * 1.2, ground(sx * 1.2, sz * 1.2) + 0.02, sz * 1.2,
      (rnd() - 0.5) * 0.12, (rnd() - 0.5) * 0.2, (rnd() - 0.5) * 0.12);
  }

  // lake
  const lakeG = new THREE.CircleGeometry(4.5, 14);
  lakeG.rotateX(-Math.PI / 2);
  const lakeMat = psx({ map: tex.tPlain, tint: "#26363a", amb: "#2c3a40", sun: "#6f8a90", uv: 3 });
  mesh(lakeG, lakeMat, scene, 0, -0.06, 0);

  // the tower, floating over the water
  const tower = new THREE.Group();
  scene.add(tower);
  const root = new THREE.ConeGeometry(1.9, 3.2, 7, 2);
  root.rotateX(Math.PI);
  mesh(facet(root, 0.35), M.stone2, tower, 0, 2.7, 0);
  mesh(facet(new THREE.CylinderGeometry(1.1, 1.35, 3.2, 8, 2), 0.1), M.stone, tower, 0, 5.9, 0);
  mesh(facet(new THREE.CylinderGeometry(1.0, 1.1, 2.9, 8, 2), 0.1), M.stone2, tower, 0.05, 8.95, 0, 0.03, 0.4, -0.02);
  mesh(facet(new THREE.CylinderGeometry(1.6, 1.15, 0.5, 8), 0.08), M.stone, tower, 0, 10.6, 0);
  const pillar = facet(new THREE.BoxGeometry(0.2, 1.7, 0.2), 0.03);
  for (let pi = 0; pi < 4; pi++) {
    const pa = (pi / 4) * Math.PI * 2 + 0.4;
    mesh(pillar, M.stone, tower, Math.cos(pa) * 1.05, 11.7, Math.sin(pa) * 1.05, 0, -pa);
  }
  const lanternMat = psx({ map: tex.tPlain, tint: "#1a1d1c", emit: 0.3, fogAmt: 0.3 });
  const lantern = mesh(new THREE.OctahedronGeometry(0.62, 0), lanternMat, tower, 0, 11.7, 0);
  mesh(facet(new THREE.ConeGeometry(1.8, 1.7, 8), 0.1), M.stone2, tower, 0, 13.4, 0);
  const debris = Array.from({ length: 7 }, (_, di) => {
    const sz = 0.18 + rnd() * 0.3;
    const m = mesh(facet(new THREE.DodecahedronGeometry(sz, 0), sz * 0.3), M.stone2, tower);
    return { m, a: (di / 7) * Math.PI * 2, r: 2.1 + rnd() * 0.9, y: 1.4 + rnd() * 2.4, sp: 0.15 + rnd() * 0.2 };
  });
  const LANTERN_Y = 11.7;

  // the beam: an additive shaft with a brighter core, grown from the lantern
  const beamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(accentHex), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const coreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffffff"), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
  const shaftG = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
  shaftG.translate(0, 0.5, 0);
  const beam = new THREE.Group();
  scene.add(beam);
  const shaft = mesh(shaftG, beamMat, beam);
  const shaftCore = mesh(shaftG, coreMat, beam);
  shaft.frustumCulled = shaftCore.frustumCulled = false;
  const BEAM_LEN = 300;

  // column ring
  const heights = [5.4, 3.1, 4.7, 0, 1.4, 5.8, 2.3, 4.1, 0.9, 3.6];
  const tallest = new THREE.Vector3();
  const plinth = facet(new THREE.BoxGeometry(1.5, 0.5, 1.5), 0.08);
  const capital = facet(new THREE.BoxGeometry(1.6, 0.42, 1.6), 0.1);
  heights.forEach((h, i) => {
    const a = (i / heights.length) * Math.PI * 2 + 0.2, x = Math.cos(a) * 7, z = Math.sin(a) * 7, y = ground(x, z);
    mesh(plinth, M.stone2, scene, x, y + 0.2, z, 0, a, 0);
    if (!h) return;
    const col = facet(new THREE.CylinderGeometry(0.52, 0.62, h, 7, Math.max(1, Math.round(h / 1.4))), 0.12);
    mesh(col, M.stone, scene, x, y + 0.45 + h / 2, z, (rnd() - 0.5) * 0.08, rnd() * 3, (rnd() - 0.5) * 0.08);
    if (h > 5) mesh(capital, M.stone, scene, x, y + 0.66 + h, z, 0, a, 0);
    if (i === 5) tallest.set(x, y + 1.6 + h, z);
  });
  const drum = facet(new THREE.CylinderGeometry(0.55, 0.55, 1.3, 7, 1), 0.12);
  for (let d = 0; d < 4; d++) {
    const fa = (3 / 10) * Math.PI * 2 + 0.2;
    const fx = Math.cos(fa) * 7 + d * 1.35 * Math.cos(fa + 1.3);
    const fz = Math.sin(fa) * 7 + d * 1.35 * Math.sin(fa + 1.3);
    mesh(drum, M.stone, scene, fx, ground(fx, fz) + 0.45, fz, 0, -(fa + 1.3), Math.PI / 2 + (rnd() - 0.5) * 0.2);
  }

  // north arch
  const AZ = -11.5, AY = ground(0, AZ);
  const pier = facet(new THREE.BoxGeometry(1.3, 5.6, 1.4), 0.12);
  mesh(pier, M.stone, scene, -3.2, AY + 2.8, AZ);
  mesh(pier, M.stone2, scene, 3.2, AY + 2.1, AZ, 0, 0, 0.03);
  const vous = facet(new THREE.BoxGeometry(0.95, 0.75, 1.4), 0.1);
  for (let vi = 0; vi <= 6; vi++) {
    const th = Math.PI - (vi / 10) * Math.PI;
    mesh(vous, M.stone, scene, Math.cos(th) * 3.2, AY + 5.6 + Math.sin(th) * 3.2, AZ, 0, 0, th - Math.PI / 2);
  }
  for (let fb = 0; fb < 6; fb++) {
    const bx = 2 + rnd() * 3, bz = AZ + 1 + rnd() * 3;
    mesh(vous, M.stone2, scene, bx, ground(bx, bz) + 0.3, bz, rnd() * 3, rnd() * 3, rnd() * 3);
  }
  [[4.6, 1], [3.8, 1], [3.0, 1]].forEach((s, i) => {
    mesh(facet(new THREE.BoxGeometry(s[0], 0.32, s[1]), 0.06), M.stone2, scene, 0, ground(0, -8.2) + 0.1 + i * 0.3, -8.2 - i * 0.8);
  });
  const wallG = facet(new THREE.BoxGeometry(3, 1.4, 0.7, 3, 1, 1), 0.18);
  [[-2.2, 1.2], [-1.6, 0.8], [0.8, 1.6], [1.4, 0.9], [2.6, 1.1], [4.1, 1.4]].forEach((w) => {
    const a = w[0], x = Math.cos(a) * 10, z = Math.sin(a) * 10;
    mesh(wallG, M.stone2, scene, x, ground(x, z) + w[1] * 0.35, z, 0, -a + Math.PI / 2, (rnd() - 0.5) * 0.1).scale.y = w[1];
  });

  // fallen head
  const head = new THREE.Group();
  const HX = 7.6, HZ = 1.6;
  head.position.set(HX, ground(HX, HZ) + 0.9, HZ);
  head.rotation.set(0.12, -0.65, 0.5);
  scene.add(head);
  const skull = new THREE.IcosahedronGeometry(2.2, 1);
  skull.scale(1, 1.25, 1.05);
  mesh(facet(skull, 0.35), M.head, head);
  const nose = new THREE.ConeGeometry(0.45, 1.3, 4);
  nose.rotateX(Math.PI / 2);
  mesh(facet(nose, 0.05), M.head, head, 0, -0.15, 2.3);
  mesh(facet(new THREE.BoxGeometry(2.6, 0.35, 0.7), 0.1), M.head, head, 0, 0.7, 1.9, -0.2);
  const eye = facet(new THREE.BoxGeometry(0.62, 0.3, 0.4), 0.04);
  mesh(eye, M.socket, head, -0.62, 0.36, 2.05);
  mesh(eye, M.socket, head, 0.62, 0.36, 2.05);
  mesh(facet(new THREE.BoxGeometry(1.0, 0.18, 0.4), 0.04), M.socket, head, 0, -1.05, 1.95);
  mesh(facet(new THREE.CylinderGeometry(2.05, 2.2, 0.5, 9, 1, true), 0.1),
    psx({ map: tex.tStone, tint: "#a9a28c", moss: 0.6, side: THREE.DoubleSide }), head, 0, 2.2, 0, 0.12);

  // rubble
  for (let st = 0; st < 46; st++) {
    const ra = rnd() * Math.PI * 2, rr = 3 + rnd() * 16, x0 = Math.cos(ra) * rr, z0 = Math.sin(ra) * rr, sc = 0.25 + rnd() * 0.7;
    mesh(facet(new THREE.DodecahedronGeometry(sc, 0), sc * 0.35), rnd() > 0.4 ? M.stone2 : M.stone, scene,
      x0, ground(x0, z0) + sc * 0.4, z0, rnd() * 3, rnd() * 3, rnd() * 3);
  }

  // trees
  const trunkG = facet(new THREE.CylinderGeometry(0.22, 0.38, 2.4, 5), 0.08);
  const coneG = [
    facet(new THREE.ConeGeometry(1.8, 2.6, 6), 0.3),
    facet(new THREE.ConeGeometry(1.35, 2.1, 6), 0.25),
    facet(new THREE.ConeGeometry(0.85, 1.7, 5), 0.2),
  ];
  const branchG = facet(new THREE.CylinderGeometry(0.06, 0.12, 1.6, 4), 0.05);
  const tree = (x: number, z: number, s: number) => {
    const g = new THREE.Group();
    g.position.set(x, ground(x, z) - 0.1, z);
    g.rotation.y = rnd() * 6;
    g.scale.setScalar(s);
    scene.add(g);
    mesh(trunkG, M.bark, g, 0, 1.2, 0);
    if (rnd() < 0.12) {
      mesh(branchG, M.bark, g, 0.4, 2.2, 0, 0, 0, -0.8);
      mesh(branchG, M.bark, g, -0.3, 2.5, 0.2, 0.5, 0, 0.9);
      return;
    }
    const lm = M.leaf[Math.floor(rnd() * 3)];
    mesh(coneG[0], lm, g, 0, 2.7, 0, 0, rnd());
    mesh(coneG[1], lm, g, 0, 3.9, 0, 0, rnd());
    mesh(coneG[2], lm, g, 0, 4.9, 0, 0, rnd());
  };
  for (let tr = 0; tr < 64; tr++) {
    const ta = rnd() * Math.PI * 2, trr = 19.5 + rnd() * 18;
    tree(Math.cos(ta) * trr, Math.sin(ta) * trr, 1 + rnd() * 1.3);
  }
  [[2.5, 11], [3.4, 10.5], [5.6, 11.5], [-0.4, 12]].forEach((p) => tree(Math.cos(p[0]) * p[1], Math.sin(p[0]) * p[1], 0.75 + rnd() * 0.3));

  // motes
  const NM = 90, mp = new Float32Array(NM * 3);
  for (let i = 0; i < NM; i++) {
    const ma = rnd() * 6.28, mr = rnd() * 14;
    mp[i * 3] = Math.cos(ma) * mr;
    mp[i * 3 + 1] = 0.5 + rnd() * 5;
    mp[i * 3 + 2] = Math.sin(ma) * mr;
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute("position", new THREE.BufferAttribute(mp, 3));
  const moteMat = new THREE.PointsMaterial({ color: new THREE.Color(accentHex), size: 1, sizeAttenuation: false });
  scene.add(new THREE.Points(moteGeo, moteMat));
  const moteBase = mp.slice();
  const moon = mesh(facet(new THREE.IcosahedronGeometry(6, 1), 0.5), M.moon, scene, -55, 34, -80);

  return {
    scene, cam, fog: [12, 50], fov: [64, 74], moteMat, dur: 17, still: 0.62,
    labels: [
      { name: "Tower", sub: "suspended, no footing", at: (v) => { v.set(0, 14.6, 0); tower.localToWorld(v); } },
      { name: "Colossus head", sub: "fallen", at: (v) => { v.set(0, 3.2, 0); head.localToWorld(v); } },
      { name: "North arch", sub: "4 of 11 voussoirs lost", at: (v) => { v.set(-3.2, AY + 9.4, AZ); } },
      { name: "Column ring", sub: "9 of 10 standing", at: (v) => { v.copy(tallest); } },
    ],
    update(t, p) {
      // 0–.45 orbit · .42–.56 lantern charges · .55 beam fires · .6→ pull back along the beam
      const charge = ease(ramp(p, 0.42, 0.56));
      const fire = ramp(p, 0.55, 0.62);
      const away = ease(ramp(p, 0.6, 1));

      const a = 1.25 + t * 0.022 + view.px * 0.12 + away * 0.5;
      const r = lerp(15.5 + Math.sin(t * 0.07) * 1.1, 58, away), x = Math.cos(a) * r, z = Math.sin(a) * r;
      cam.position.set(x, lerp(ground(x, z) + 2.6 + Math.sin(t * 0.11) * 0.35, 64, away) - view.py * 0.6, z);
      cam.lookAt(0, lerp(6.2, 150, away * away) - view.py * 1.2, 0);

      tower.position.y = Math.sin(t * 0.6) * 0.25;
      tower.rotation.y = t * 0.05;
      debris.forEach((d) => {
        const da = d.a + t * d.sp;
        d.m.position.set(Math.cos(da) * d.r, d.y + Math.sin(t * 0.8 + d.a) * 0.2, Math.sin(da) * d.r);
        d.m.rotation.set(t * d.sp, t * 0.3, 0);
      });
      const flicker = 0.85 + 0.15 * Math.sin(t * 9.0);
      lanternMat.uniforms.uEmit.value = (0.3 + 0.7 * charge) * (fire > 0 ? 1 : flicker) + Math.max(0, 1 - Math.abs(p - 0.555) * 40) * 0.6;
      lakeMat.uniforms.uEmit.value = 0.06 * charge + 0.18 * Math.min(1, fire * 3) * (1 - away * 0.6);
      lantern.rotation.y = t * (0.5 + 3 * charge);

      beam.visible = fire > 0;
      beam.position.set(0, tower.position.y + LANTERN_Y, 0);
      const len = BEAM_LEN * fire * fire;
      shaft.scale.set(0.42, len, 0.42);
      shaftCore.scale.set(0.16, len, 0.16);
      beamMat.color.copy(U.uAccent.value);
      sky.position.copy(cam.position);
      moon.rotation.y = t * 0.01;
      // motes are drawn up toward the lantern while it charges
      const pull = charge * (1 - away);
      for (let i = 0; i < NM; i++) {
        mp[i * 3 + 1] = lerp(moteBase[i * 3 + 1] + ((t * 0.12 + i * 0.37) % 3), LANTERN_Y - 1 + ((t * 0.9 + i * 0.37) % 3), pull * 0.7);
        mp[i * 3] = lerp(moteBase[i * 3] + Math.sin(t * 0.3 + i) * 0.3, 0, pull * 0.6);
        mp[i * 3 + 2] = lerp(moteBase[i * 3 + 2], 0, pull * 0.6);
      }
      moteGeo.attributes.position.needsUpdate = true;
    },
    readout() {
      const p = cam.position;
      return [
        ["Lat", k.dms(47.2023 - p.z * 0.00009, "N", "S", 2)],
        ["Lon", k.dms(8.5288 + p.x * 0.00013, "E", "W", 3)],
        ["Elev", `${Math.round(212 + p.y * 3.1)} m`],
        ["Brg", `${k.pad(Math.round(k.bearing(cam)), 3)}°`],
        ["Grid", k.gridRef(p.x, p.z, 20)],
      ];
    },
  };
}
