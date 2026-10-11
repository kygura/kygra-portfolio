/** Sheet 04 · Ruins: a misty stone circle and shrine in old forest, a floating ward crystal, runes, wisps and light shafts. */
import * as THREE from "three";
import type { PsxKit, SceneDef } from "./psx";

export function buildRuins(k: PsxKit): SceneDef {
  const { rnd, facet, mesh, psx, M, tex, view, U } = k;
  const { add, flush } = k.batcher();
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(64, 16 / 9, 0.1, 260);
  const sky = k.skyDome(0, 0.6, 1.2, 0.2);
  scene.add(sky);

  const ground = (x: number, z: number) => {
    const r = Math.sqrt(x * x + z * z);
    let h = 0.9 * Math.sin(x * 0.16 + 1.3) * Math.cos(z * 0.14) + 0.45 * Math.sin(x * 0.41 + z * 0.27) + 0.2 * Math.sin(x * 1.1 - z * 0.9);
    h += Math.max(0, r - 15) * 0.28 + Math.max(0, r - 30) * 0.5;
    const f = Math.min(1, Math.max(0, (r - 6) / 8));
    return h * f * f - 0.1 * (1 - f);
  };
  const tg = new THREE.PlaneGeometry(130, 130, 64, 64);
  tg.rotateX(-Math.PI / 2);
  const tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) tp.setY(i, ground(tp.getX(i), tp.getZ(i)));
  mesh(facet(tg, 0), psx({ map: tex.tGround, uv: 30, moss: 0.4, amb: "#4a5a5c" }), scene);

  const mat = {
    rock: psx({ map: tex.tStone, tint: "#a9ab9c", moss: 1, amb: "#56666a" }),
    rock2: psx({ map: tex.tStone, tint: "#868c84", moss: 1, uv: 1.5, amb: "#56666a" }),
    bark: psx({ map: tex.tBark, tint: "#8c7c6c", moss: 0.6, amb: "#4f5c5c" }),
    canopy: [
      psx({ map: tex.tLeaf, tint: "#7d9a6c", uv: 1.5, amb: "#4a5a5a" }),
      psx({ map: tex.tLeaf, tint: "#5f7d60", uv: 1.5, amb: "#4a5a5a" }),
      psx({ map: tex.tLeaf, tint: "#8f9c70", uv: 1.5, amb: "#4a5a5a" }),
    ],
    stem: psx({ map: tex.tPlain, tint: "#c9c2a8", amb: "#6a7476" }),
  };
  const leaf = () => mat.canopy[Math.floor(rnd() * 3)];
  const blob = [0, 1, 2].map((i) => facet(new THREE.IcosahedronGeometry(1, 0), 0.25 + i * 0.05));

  /* ---- plaza and shrine ---- */
  const slab = facet(new THREE.BoxGeometry(1.1, 0.2, 1.1), 0.07);
  for (let sx = -5; sx <= 5; sx++) for (let sz = -5; sz <= 5; sz++) {
    if (Math.hypot(sx, sz) > 5.2 || Math.hypot(sx, sz) < 2.2 || rnd() < 0.25) continue;
    add(slab, rnd() > 0.5 ? mat.rock : mat.rock2, sx * 1.15, ground(sx * 1.15, sz * 1.15) + 0.02, sz * 1.15,
      (rnd() - 0.5) * 0.14, (rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.14);
  }
  [[2.6, 0.35], [2.0, 0.35], [1.4, 0.35]].forEach(([r, h], i) => {
    add(facet(new THREE.CylinderGeometry(r, r + 0.1, h, 8), 0.08), i % 2 ? mat.rock2 : mat.rock, 0, h / 2 + i * h, 0, 0, i * 0.2);
  });
  add(facet(new THREE.BoxGeometry(1.3, 0.9, 0.9), 0.08), mat.rock, 0, 1.5, 0, 0, 0.3);
  add(facet(new THREE.BoxGeometry(1.5, 0.12, 1.1), 0.04), mat.rock2, 0, 2.0, 0, 0, 0.3);
  for (let s = 0; s < 4; s++) {
    const a = 0.3 + (s / 4) * Math.PI * 2;
    add(facet(new THREE.BoxGeometry(0.5, 0.06, 0.04)), M.glyph, Math.cos(a) * 0.66, 1.5, Math.sin(a) * 0.66, 0, -a + Math.PI / 2, 0);
  }

  /* ---- stone circle: nine monoliths, two down, one trilithon ---- */
  const SR = 8.2;
  const circleTop: THREE.Vector3[] = [];
  const heights = [3.6, 4.4, 0, 3.9, 4.0, 2.4, 0, 3.8, 4.2];
  heights.forEach((h, i) => {
    const a = (i / heights.length) * Math.PI * 2 + 0.15, x = Math.cos(a) * SR, z = Math.sin(a) * SR, y = ground(x, z);
    const w = 1.1 + rnd() * 0.3;
    if (!h) {
      add(facet(new THREE.BoxGeometry(w, 3.4, 0.7, 1, 3, 1), 0.12), mat.rock2, x + Math.cos(a) * 1.4, y + 0.3, z + Math.sin(a) * 1.4, Math.PI / 2 - 0.1, -a, 0.2);
      return;
    }
    add(facet(new THREE.BoxGeometry(w, h, 0.75, 1, Math.ceil(h / 1.2), 1), 0.14), i % 2 ? mat.rock : mat.rock2, x, y + h / 2 - 0.2, z,
      (rnd() - 0.5) * 0.1, -a + Math.PI / 2, (rnd() - 0.5) * 0.12);
    // rune strip on the inner face
    add(facet(new THREE.BoxGeometry(0.16, h * 0.55, 0.04)), M.glyph, x - Math.cos(a) * 0.4, y + h * 0.5, z - Math.sin(a) * 0.4, 0, -a + Math.PI / 2, 0);
    circleTop.push(new THREE.Vector3(x, y + h, z));
  });
  {
    const a0 = (3 / 9) * Math.PI * 2 + 0.15, a1 = (4 / 9) * Math.PI * 2 + 0.15, am = (a0 + a1) / 2;
    add(facet(new THREE.BoxGeometry(SR * 0.76, 0.6, 0.8, 3, 1, 1), 0.12), mat.rock, Math.cos(am) * SR * 0.97, ground(Math.cos(am) * SR, Math.sin(am) * SR) + 4.05, Math.sin(am) * SR * 0.97, 0, -am + Math.PI / 2, 0.06);
  }

  /* ---- collapsed arch on the north path ---- */
  const AZ = -13, AY = ground(0, AZ);
  add(facet(new THREE.BoxGeometry(1.2, 5.2, 1.3), 0.12), mat.rock, -2.9, AY + 2.6, AZ);
  add(facet(new THREE.BoxGeometry(1.2, 3.6, 1.3), 0.12), mat.rock2, 2.9, AY + 1.8, AZ, 0, 0, 0.04);
  const vous = facet(new THREE.BoxGeometry(0.9, 0.7, 1.3), 0.1);
  for (let vi = 0; vi <= 5; vi++) {
    const th = Math.PI - (vi / 10) * Math.PI;
    add(vous, mat.rock, Math.cos(th) * 2.9, AY + 5.2 + Math.sin(th) * 2.9, AZ, 0, 0, th - Math.PI / 2);
  }
  for (let fb = 0; fb < 5; fb++) {
    const bx = 1.5 + rnd() * 3, bz = AZ + 1 + rnd() * 3;
    add(vous, mat.rock2, bx, ground(bx, bz) + 0.3, bz, rnd() * 3, rnd() * 3, rnd() * 3);
  }

  /* ---- trees ---- */
  const trunkG = facet(new THREE.CylinderGeometry(0.2, 0.36, 2.6, 5), 0.08);
  const coneG = [
    facet(new THREE.ConeGeometry(1.8, 2.8, 6), 0.3),
    facet(new THREE.ConeGeometry(1.35, 2.3, 6), 0.25),
    facet(new THREE.ConeGeometry(0.85, 1.9, 5), 0.2),
  ];
  const conifer = (x: number, z: number, s: number) => {
    const y = ground(x, z) - 0.1, lm = leaf(), ry = rnd() * 6;
    add(trunkG, mat.bark, x, y + 1.3 * s, z, 0, ry, 0, s);
    add(coneG[0], lm, x, y + 2.9 * s, z, 0, ry, 0, s);
    add(coneG[1], lm, x, y + 4.2 * s, z, 0, ry + 1, 0, s);
    add(coneG[2], lm, x, y + 5.3 * s, z, 0, ry + 2, 0, s);
  };
  const tallTrunk = facet(new THREE.CylinderGeometry(0.22, 0.42, 6, 6, 2), 0.1);
  const broadleaf = (x: number, z: number, s: number) => {
    const y = ground(x, z) - 0.1;
    add(tallTrunk, mat.bark, x, y + 3 * s, z, (rnd() - 0.5) * 0.1, rnd() * 6, (rnd() - 0.5) * 0.1, s);
    for (let c = 0; c < 4; c++) {
      const a = rnd() * 6.28, r = rnd() * 1.4 * s, cs = (1.3 + rnd() * 0.9) * s;
      add(blob[c % 3], leaf(), x + Math.cos(a) * r, y + (5.4 + rnd() * 1.6) * s, z + Math.sin(a) * r, rnd() * 3, rnd() * 3, 0, cs);
    }
  };
  for (let tr = 0; tr < 170; tr++) {
    const ta = rnd() * Math.PI * 2, trr = 18.5 + Math.pow(rnd(), 0.8) * 32, x = Math.cos(ta) * trr, z = Math.sin(ta) * trr;
    if (Math.abs(x) < 2.5 && z < -10 && z > -20) continue; // keep the arch path open
    if (rnd() < 0.55) conifer(x, z, 1 + rnd() * 1.4);
    else broadleaf(x, z, 0.9 + rnd() * 0.8);
  }
  // the old one: a huge tree whose roots grip a fallen column
  const OX = 9.5, OZ = 6.5, OY = ground(OX, OZ);
  add(facet(new THREE.CylinderGeometry(0.9, 1.6, 9, 8, 3), 0.25), mat.bark, OX, OY + 4.4, OZ);
  for (let r = 0; r < 7; r++) {
    const a = (r / 7) * Math.PI * 2 + rnd() * 0.4, root = facet(new THREE.ConeGeometry(0.45, 3.6, 5), 0.12);
    add(root, mat.bark, OX + Math.cos(a) * 1.5, OY + 0.4, OZ + Math.sin(a) * 1.5, Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2);
  }
  for (let c = 0; c < 9; c++) {
    const a = rnd() * 6.28, r = 1 + rnd() * 3.2, cs = 2 + rnd() * 1.6;
    add(blob[c % 3], leaf(), OX + Math.cos(a) * r, OY + 9 + rnd() * 2.5, OZ + Math.sin(a) * r, rnd() * 3, rnd() * 3, 0, cs);
  }
  add(facet(new THREE.CylinderGeometry(0.55, 0.6, 5.2, 7, 3), 0.12), mat.rock, OX - 1.8, OY + 0.5, OZ - 1.2, 0.1, 0.9, Math.PI / 2);
  // undergrowth and glowing mushrooms
  for (let b = 0; b < 70; b++) {
    const a = rnd() * 6.28, r = 6 + rnd() * 18, x = Math.cos(a) * r, z = Math.sin(a) * r, s = 0.3 + rnd() * 0.6;
    add(blob[b % 3], leaf(), x, ground(x, z) + s * 0.25, z, rnd() * 3, rnd() * 3, 0, s);
  }
  const capG = facet(new THREE.ConeGeometry(0.16, 0.1, 6));
  const stemG = facet(new THREE.CylinderGeometry(0.03, 0.04, 0.22, 4));
  for (let m = 0; m < 46; m++) {
    const a = rnd() * 6.28, r = 3 + rnd() * 9, x = Math.cos(a) * r, z = Math.sin(a) * r, s = 0.7 + rnd() * 0.9, y = ground(x, z);
    add(stemG, mat.stem, x, y + 0.11 * s, z, 0, 0, 0, s);
    add(capG, M.glyph, x, y + 0.25 * s, z, 0, 0, 0, s);
  }
  flush(scene);

  /* ---- the ward: floating crystal, rune ring, halo ---- */
  const CY = 3.4;
  const crystal = mesh(facet(new THREE.OctahedronGeometry(0.45, 0), 0), M.glyph, scene, 0, CY, 0);
  crystal.scale.set(0.8, 1.5, 0.8);
  const runeRing = new THREE.Group();
  runeRing.position.set(0, CY, 0);
  scene.add(runeRing);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    add(facet(new THREE.BoxGeometry(0.18, i % 3 ? 0.06 : 0.26, 0.04)), M.glyph, Math.cos(a) * 1.5, 0, Math.sin(a) * 1.5, 0, -a, 0);
  }
  flush(runeRing);
  const glowMat = new THREE.MeshBasicMaterial({ color: U.uAccent.value, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Group();
  glow.position.set(0, CY, 0);
  scene.add(glow);
  [1.4, 2.6].forEach((r) => glow.add(new THREE.Mesh(new THREE.CircleGeometry(r, 12), glowMat)));

  /* ---- mist: drifting translucent layers, plus shafts of light ---- */
  const mc = document.createElement("canvas");
  mc.width = mc.height = 64;
  const g2 = mc.getContext("2d");
  if (!g2) throw new Error("2d canvas unavailable");
  for (let i = 0; i < 26; i++) {
    const x = rnd() * 64, y = rnd() * 64, r = 8 + rnd() * 16;
    for (const ox of [-64, 0, 64]) for (const oy of [-64, 0, 64]) {
      const gr = g2.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      gr.addColorStop(0, "rgba(255,255,255,0.55)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g2.fillStyle = gr;
      g2.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    }
  }
  const mistTex = new THREE.CanvasTexture(mc);
  mistTex.wrapS = mistTex.wrapT = THREE.RepeatWrapping;
  mistTex.repeat.set(8, 8);
  const mists = [0.2, 0.6, 1.1, 1.7].map((h, i) => {
    const t = mistTex.clone();
    t.needsUpdate = true;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 240).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: "#c9d6cf", map: t, transparent: true, opacity: 0.26 - i * 0.04, depthWrite: false, side: THREE.DoubleSide }),
    );
    m.position.y = h;
    m.renderOrder = 2;
    scene.add(m);
    return { t, h, sp: 0.004 + i * 0.002, dir: i % 2 ? 1 : -1 };
  });
  const shaftMat = new THREE.MeshBasicMaterial({ color: "#d9e6c4", transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false });
  [[-4, 3, 0.35, 0.2], [3.5, -5, -0.3, 0.25], [6, -1, 0.28, -0.3], [-7, -4, -0.2, -0.35]].forEach(([x, z, rx, rz]) => {
    mesh(new THREE.BoxGeometry(1.3, 26, 1.3), shaftMat, scene, x, 12, z, rx, rnd(), rz).renderOrder = 3;
  });

  /* ---- wisps ---- */
  const NM = 140, mp = new Float32Array(NM * 3);
  for (let i = 0; i < NM; i++) {
    const ma = rnd() * 6.28, mr = 1 + rnd() * 16;
    mp[i * 3] = Math.cos(ma) * mr;
    mp[i * 3 + 1] = 0.3 + rnd() * 5;
    mp[i * 3 + 2] = Math.sin(ma) * mr;
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute("position", new THREE.BufferAttribute(mp, 3));
  const moteMat = new THREE.PointsMaterial({ color: U.uAccent.value.clone(), size: 1, sizeAttenuation: false });
  const motes = new THREE.Points(moteGeo, moteMat);
  motes.frustumCulled = false;
  scene.add(motes);
  const moteBase = mp.slice();
  const wispG = facet(new THREE.IcosahedronGeometry(0.1, 0));
  const wisps = Array.from({ length: 6 }, (_, i) => ({ m: mesh(wispG, M.glyph, scene), r: 2.2 + i * 0.7, ph: i * 1.7, sp: 0.25 + rnd() * 0.25 }));

  return {
    scene, cam, fog: [5, 34], fov: [64, 74], moteMat,
    labels: [
      { name: "Ward stone", sub: "still lit", at: (v) => { v.copy(crystal.position).y += 1.4; } },
      { name: "Stone circle", sub: "7 of 9 standing", at: (v) => { v.copy(circleTop[1]).y += 0.6; } },
      { name: "Old growth", sub: "roots over the colonnade", at: (v) => { v.set(OX, OY + 12, OZ); } },
    ],
    update(t) {
      const a = 2.1 + t * 0.018 + view.px * 0.12, r = 15.5 + Math.sin(t * 0.07) * 1.2, x = Math.cos(a) * r, z = Math.sin(a) * r;
      cam.position.set(x, ground(x, z) + 2.6 + Math.sin(t * 0.11) * 0.3 - view.py * 0.6, z);
      cam.lookAt(0, 2.8 - view.py * 1.2, 0);
      sky.position.copy(cam.position);

      crystal.position.y = CY + Math.sin(t * 0.9) * 0.15;
      crystal.rotation.y = t * 0.6;
      runeRing.rotation.y = -t * 0.25;
      runeRing.rotation.x = Math.sin(t * 0.3) * 0.12;
      glow.lookAt(cam.position);
      glowMat.color.copy(U.uAccent.value);
      glowMat.opacity = 0.13 + Math.sin(t * 1.3) * 0.04;
      for (const m of mists) {
        m.t.offset.set((t * m.sp * m.dir) % 1, (t * m.sp * 0.6) % 1);
      }
      wisps.forEach((w, i) => {
        const wa = w.ph + t * w.sp;
        w.m.position.set(Math.cos(wa) * w.r, 1.2 + i * 0.35 + Math.sin(t * 0.8 + w.ph) * 0.5, Math.sin(wa) * w.r);
      });
      for (let i = 0; i < NM; i++) {
        mp[i * 3 + 1] = moteBase[i * 3 + 1] + ((t * 0.1 + i * 0.37) % 2.5);
        mp[i * 3] = moteBase[i * 3] + Math.sin(t * 0.3 + i) * 0.35;
      }
      moteGeo.attributes.position.needsUpdate = true;
    },
    readout() {
      const p = cam.position;
      return [
        ["Lat", k.dms(48.0412 - p.z * 0.00009, "N", "S", 2)],
        ["Lon", k.dms(8.1736 + p.x * 0.00013, "E", "W", 3)],
        ["Elev", `${Math.round(840 + p.y * 3.1)} m`],
        ["Brg", `${k.pad(Math.round(k.bearing(cam)), 3)}°`],
        ["Grid", k.gridRef(p.x, p.z, 20)],
      ];
    },
  };
}
