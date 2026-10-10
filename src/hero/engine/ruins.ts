/** Sheet 01 · Ruins: plaza, column ring, collapsed arch, fallen head, trees, motes, moon. */
import * as THREE from "three";
import type { PsxKit, SceneDef } from "./psx";

export function buildRuins(k: PsxKit, accentHex: string): SceneDef {
  const { rnd, facet, mesh, psx, M, tex, view } = k;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(64, 16 / 9, 0.1, 320);
  const sky = k.skyDome(0, 1, 1);
  scene.add(sky);

  const ground = (x: number, z: number) => {
    const r = Math.sqrt(x * x + z * z);
    let h = 1.1 * Math.sin(x * 0.16 + 1.3) * Math.cos(z * 0.14) + 0.55 * Math.sin(x * 0.41 + z * 0.27) + 0.25 * Math.sin(x * 1.1 - z * 0.9);
    h += Math.max(0, r - 13) * 0.34 + Math.max(0, r - 26) * 0.55;
    const f = Math.min(1, Math.max(0, (r - 5) / 8));
    return h * f * f - 0.1 * (1 - f);
  };
  const tg = new THREE.PlaneGeometry(100, 100, 56, 56);
  tg.rotateX(-Math.PI / 2);
  const tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) tp.setY(i, ground(tp.getX(i), tp.getZ(i)));
  mesh(facet(tg, 0), psx({ map: tex.tGround, uv: 24 }), scene);

  // paving
  const slab = facet(new THREE.BoxGeometry(1.12, 0.22, 1.12), 0.06);
  for (let sx = -4; sx <= 4; sx++) for (let sz = -4; sz <= 4; sz++) {
    if (Math.hypot(sx, sz) > 4.6 || rnd() < 0.22) continue;
    mesh(slab, rnd() > 0.5 ? M.stone : M.stone2, scene, sx * 1.2, ground(sx * 1.2, sz * 1.2) + 0.02, sz * 1.2,
      (rnd() - 0.5) * 0.12, (rnd() - 0.5) * 0.2, (rnd() - 0.5) * 0.12);
  }

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
    scene, cam, fog: [12, 50], fov: [64, 74], moteMat,
    labels: [
      { name: "Colossus head", sub: "fallen", at: (v) => { v.set(0, 3.2, 0); head.localToWorld(v); } },
      { name: "North arch", sub: "4 of 11 voussoirs lost", at: (v) => { v.set(-3.2, AY + 9.4, AZ); } },
      { name: "Column ring", sub: "9 of 10 standing", at: (v) => { v.copy(tallest); } },
    ],
    update(t) {
      const a = 1.25 + t * 0.022 + view.px * 0.12, r = 15.5 + Math.sin(t * 0.07) * 1.1, x = Math.cos(a) * r, z = Math.sin(a) * r;
      cam.position.set(x, ground(x, z) + 2.6 + Math.sin(t * 0.11) * 0.35 - view.py * 0.6, z);
      cam.lookAt(0, 4.4 - view.py * 1.2, 0);
      sky.position.copy(cam.position);
      moon.rotation.y = t * 0.01;
      for (let i = 0; i < NM; i++) {
        mp[i * 3 + 1] = moteBase[i * 3 + 1] + ((t * 0.12 + i * 0.37) % 3);
        mp[i * 3] = moteBase[i * 3] + Math.sin(t * 0.3 + i) * 0.3;
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
