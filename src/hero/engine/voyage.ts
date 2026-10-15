/** Sheet 06 · Voyage: a galleon under full sail on a moonlit sea, sea stacks and an arch drifting past, a serpent pacing her. */
import * as THREE from "three";
import { burst, pulse, type PsxKit, type SceneDef } from "./psx";
import { buildGalleon } from "./galleon";

export function buildVoyage(k: PsxKit): SceneDef {
  const { rnd, facet, mesh, psx, M, tex, view } = k;
  const PIVOT = new THREE.Vector3(0, 6, 0);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 420);
  const sky = k.skyDome(0, 0.9, 1.6, 0.35);
  scene.add(sky);

  // She runs along +x; the world slides past at SPEED, so the sea is sampled at x + D.
  const SPEED = 4.2;
  let D = 0;
  const wave = (x: number, z: number, t: number) =>
    0.42 * Math.sin(x * 0.16 + z * 0.07 + t * 0.9) +
    0.24 * Math.sin(z * 0.21 - x * 0.08 - t * 0.7) +
    0.1 * Math.sin((x + z) * 0.5 + t * 1.6);
  const sea = (x: number, z: number, t: number) => wave(x + D, z, t);
  // Scenery loops in a 400-unit band centred on the ship, well past the fog.
  const SPAN = 400;
  const wrap = (x: number) => ((((x + SPAN / 2) % SPAN) + SPAN) % SPAN) - SPAN / 2;

  const mat = {
    water: psx({ map: tex.tWater, tint: "#94b4bc", amb: "#3e5662", sun: "#b8bcb0" }),
    rock: psx({ map: tex.tStone, tint: "#8e9088", moss: 0.6, uv: 1.5 }),
    rock2: psx({ map: tex.tStone, tint: "#a6a296", moss: 0.85 }),
    scale: psx({ map: tex.tStone, tint: "#3c5a58", amb: "#3a4a50", uv: 3 }),
  };

  /* ---- sea: a grid denser near the ship, displaced every frame ---- */
  const WN = 72, WH = 220;
  const warp = (u: number) => Math.sign(u) * Math.pow(Math.abs(u), 1.8) * WH;
  const wg = new THREE.PlaneGeometry(2, 2, WN, WN);
  wg.rotateX(-Math.PI / 2);
  const wp0 = wg.attributes.position;
  for (let i = 0; i < wp0.count; i++) wp0.setXYZ(i, warp(wp0.getX(i)), 0, warp(wp0.getZ(i)));
  const water = facet(wg);
  const wpos = water.attributes.position, wuv = water.attributes.uv;
  const wx = new Float32Array(wpos.count), wz = new Float32Array(wpos.count);
  for (let i = 0; i < wpos.count; i++) {
    wx[i] = wpos.getX(i);
    wz[i] = wpos.getZ(i);
  }
  mesh(water, mat.water, scene).frustumCulled = false;

  /* ---- the ship ---- */
  const g = buildGalleon(k);
  const ship = g.group;
  scene.add(ship);

  /* ---- scenery that drifts past: sea stacks, rock clusters, one great arch ---- */
  const drift: { o: THREE.Object3D; x: number; z: number }[] = [];
  const stack = facet(new THREE.CylinderGeometry(0.6, 1, 1, 7, 4), 0.18);
  const boulder = facet(new THREE.DodecahedronGeometry(1, 0), 0.3);
  const blob = facet(new THREE.IcosahedronGeometry(1, 0), 0.3);
  const place = (o: THREE.Object3D, x: number, z: number) => {
    scene.add(o);
    drift.push({ o, x, z });
  };
  for (let i = 0; i < 22; i++) {
    const { add, flush } = k.batcher();
    const o = new THREE.Group();
    const n = 1 + Math.floor(rnd() * 4);
    for (let j = 0; j < n; j++) {
      const h = 4 + rnd() * (j ? 8 : 22), r = 1.5 + rnd() * 3, px = (rnd() - 0.5) * 7, pz = (rnd() - 0.5) * 7;
      add(stack.clone().scale(r, h, r), j % 2 ? mat.rock2 : mat.rock, px, h / 2 - 2, pz, 0, rnd() * 6, 0);
      if (rnd() > 0.5) add(blob, M.leaf[j % 3], px, h - 2.2, pz, rnd() * 3, rnd() * 3, 0, r * (0.5 + rnd() * 0.3));
    }
    for (let b = 0; b < 3; b++) add(boulder, mat.rock, (rnd() - 0.5) * 12, 0, (rnd() - 0.5) * 12, rnd() * 3, rnd() * 3, 0, 0.6 + rnd() * 1.2);
    flush(o);
    const side = i % 2 ? 1 : -1;
    place(o, (i / 22) * SPAN - SPAN / 2 + rnd() * 10, side * (24 + rnd() * 90));
  }
  // the arch: two leaning pillars and a span, a lamp on the keystone
  const arch = new THREE.Group();
  {
    const { add, flush } = k.batcher();
    for (const s of [-1, 1]) add(facet(new THREE.CylinderGeometry(3.2, 4.6, 30, 7, 6), 0.6), mat.rock, 0, 11, s * 11, s * 0.08, 0, 0);
    const span = new THREE.TorusGeometry(11, 3.4, 5, 10, Math.PI);
    span.rotateY(Math.PI / 2);
    add(facet(span, 0.6), mat.rock2, 0, 24, 0);
    for (let c = 0; c < 8; c++) add(blob, M.leaf[c % 3], (rnd() - 0.5) * 4, 33 + rnd() * 2, (rnd() - 0.5) * 18, rnd() * 3, rnd() * 3, 0, 1.5 + rnd() * 1.5);
    add(facet(new THREE.BoxGeometry(0.9, 0.9, 0.9)), M.glyph, 0, 35.8, 0);
    flush(arch);
  }
  place(arch, 70, -46);

  /* ---- the serpent: coils breaking the surface off the port bow, pacing the ship ---- */
  const SZ = -26;
  const coilG = facet(new THREE.TorusGeometry(2.4, 0.62, 5, 9, Math.PI), 0.08);
  const finG = facet(new THREE.ConeGeometry(0.35, 1.0, 3), 0.02);
  const coils = Array.from({ length: 5 }, (_, i) => {
    const c = new THREE.Group();
    mesh(coilG, mat.scale, c);
    for (let f = 0; f < 3; f++) mesh(finG, M.glyph, c, Math.cos((f + 1) * 0.78) * 3.0, Math.sin((f + 1) * 0.78) * 3.0, 0, 0, 0, -((f + 1) * 0.78 - Math.PI / 2));
    c.scale.setScalar(1.7 - i * 0.18);
    scene.add(c);
    return c;
  });
  const head = new THREE.Group();
  {
    const hg = new THREE.ConeGeometry(1.0, 3.4, 5);
    hg.rotateZ(-Math.PI / 2 - 0.35);
    mesh(facet(hg, 0.08), mat.scale, head);
    for (const s of [-1, 1]) mesh(new THREE.OctahedronGeometry(0.18, 0), M.glyph, head, 0.5, 0.55, s * 0.5);
    for (const s of [-1, 1]) mesh(facet(new THREE.ConeGeometry(0.16, 1.4, 3)), M.solid, head, -0.6, 1.1, s * 0.45, s * 0.4, 0, 0.6);
  }
  head.scale.setScalar(1.7);
  scene.add(head);

  /* ---- two moons over the starboard quarter, and their road on the water ---- */
  const moonA = k.sunDisc(scene, -70, 62, 170, 16, "#f2eee0", "#b8c8d8");
  const moonB = k.sunDisc(scene, -110, 34, 150, 6, "#e8d8c8", "#d0a890");
  const NG = 180, gp = new Float32Array(NG * 3), gBase: number[] = [];
  {
    const l = Math.hypot(-70, 170), ux = -70 / l, uz = 170 / l;
    for (let i = 0; i < NG; i++) {
      const d = 6 + Math.pow(rnd(), 0.6) * 150, w = (rnd() - 0.5) * (0.8 + d * 0.12);
      gBase.push(ux * d - uz * w, uz * d + ux * w);
    }
  }
  const glintGeo = new THREE.BufferGeometry();
  glintGeo.setAttribute("position", new THREE.BufferAttribute(gp, 3));
  const glints = new THREE.Points(glintGeo, new THREE.PointsMaterial({ color: "#e8f0f0", size: 1, sizeAttenuation: false }));
  glints.frustumCulled = false;
  scene.add(glints);

  /* ---- wake: glowing foam peeling off the hull and falling astern ---- */
  const NW = 160, wkp = new Float32Array(NW * 3), wkJ = Array.from({ length: NW }, () => rnd());
  const wakeGeo = new THREE.BufferGeometry();
  wakeGeo.setAttribute("position", new THREE.BufferAttribute(wkp, 3));
  const wakeMat = new THREE.PointsMaterial({ color: k.U.uAccent.value, size: 2, sizeAttenuation: false });
  const wake = new THREE.Points(wakeGeo, wakeMat);
  wake.frustumCulled = false;
  scene.add(wake);
  const WAKE = 46;

  // easter eggs: start times
  let tLamp = -99, tSerp = -99, tMoon = -99, tArch = -99;
  const lampFlare = k.flare(scene, 0, 0, 0, 0.9);
  const archFlare = k.flare(scene, 0, 0, 0, 3);
  const tmpV = new THREE.Vector3();
  const serpX = (t: number) => 18 + Math.sin(t * 0.07) * 14;

  return {
    scene, cam, fog: [40, 170], fov: [60, 72], limits: { pitch: [-0.1, 0.75], zoom: [0.55, 1.7] },
    moteMat: wakeMat,
    labels: [
      { name: "Galleon", sub: "three masts · all canvas", at: (v) => { v.copy(g.mainTop).y += 1.4; ship.localToWorld(v); } },
      {
        name: "Serpent", sub: "pacing to port",
        at: (v) => { v.copy(head.position).y += 3; },
        sub2: () => `${Math.round(Math.hypot(head.position.x, SZ))} m off`,
      },
      { name: "Twin moons", sub: "waxing, both", at: (v) => { v.copy(moonA.position).y += 20; } },
    ],
    eggs: [
      {
        id: "voyage-lantern", r: 34,
        at: (v) => { v.copy(g.lantern); ship.localToWorld(v); },
        fire: (t) => { tLamp = t; return "STERN LANTERN · three flashes. Someone answers from the dark."; },
      },
      {
        id: "voyage-serpent", r: 44,
        at: (v) => { v.copy(head.position); },
        fire: (t) => { tSerp = t; return "SERPENT · surfaces, looks you over, decides against it."; },
      },
      {
        id: "voyage-arch", r: 46,
        at: (v) => { arch.getWorldPosition(v); v.y += 36; },
        fire: (t) => { tArch = t; return "KEYSTONE · still lit. Nobody remembers who keeps it."; },
      },
      {
        id: "voyage-moons", r: 40,
        at: (v) => { v.copy(moonA.position); },
        fire: (t) => { tMoon = t; return "MOONS · circle each other once, then act like nothing happened."; },
      },
    ],
    update(t) {
      D = t * SPEED;
      for (let i = 0; i < wpos.count; i++) {
        wpos.setY(i, sea(wx[i], wz[i], t));
        wuv.setXY(i, (wx[i] + D) / 6, wz[i] / 6);
      }
      wpos.needsUpdate = true;
      wuv.needsUpdate = true;
      water.computeVertexNormals();

      // ride the swell: heave, pitch over bow/stern, roll across the beam
      const el = t - tLamp;
      ship.position.y = sea(0, 0, t) * 0.75 - 0.25;
      ship.rotation.z = (sea(6, 0, t) - sea(-6, 0, t)) * 0.045;
      ship.rotation.x = (sea(0, 2, t) - sea(0, -2, t)) * 0.07 + Math.sin(t * 0.6) * 0.025;
      g.sails.forEach((s, i) => { s.scale.x = 1 + 0.12 * Math.sin(t * 1.3 + i * 0.7); });
      g.pennants.forEach((p, i) => { p.rotation.y = Math.sin(t * 5 + i) * 0.3; });
      ship.updateMatrixWorld();

      for (const d of drift) {
        const x = wrap(d.x - D);
        d.o.position.set(x, sea(x, d.z, t) * 0.15 - 0.3, d.z);
      }

      // serpent: a travelling hump wave, keeps station off the port bow
      const sx = serpX(t), es = t - tSerp, rise = 2.2 * pulse(es, 3.2);
      coils.forEach((c, i) => {
        const cx = sx - 7 - i * 7, ph = t * 1.4 - i * 0.9;
        c.position.set(cx, -1.2 + Math.sin(ph) * 1.1 + rise * (1 - i * 0.15), SZ + Math.sin(ph * 0.5) * 0.6);
        c.rotation.set(0, 0, Math.sin(ph) * 0.12);
      });
      head.position.set(sx, 2.6 + Math.sin(t * 1.4 + 0.9) * 0.8 + rise * 1.6, SZ);
      head.rotation.set(0, 0, Math.sin(t * 0.9) * 0.15 + 0.5 * pulse(es, 3.2));

      // wake: two arms from the stern quarters plus a bow wave
      for (let i = 0; i < NW; i++) {
        const a = (i / NW + t * (SPEED / WAKE)) % 1, d = a * WAKE, side = i % 2 ? 1 : -1, j = wkJ[i];
        const bow = i % 5 === 0;
        const x = bow ? 7 - d * 0.25 : -6.5 - d;
        const z = bow ? side * (1.4 + d * 0.12) : side * (1.6 + d * 0.22 + (j - 0.5) * (0.6 + d * 0.06));
        const on = Math.sin(t * 3 + i * 2.1) > -0.4 + a * 0.9;
        wkp[i * 3] = x;
        wkp[i * 3 + 1] = on ? sea(x, z, t) + 0.08 : -20;
        wkp[i * 3 + 2] = z;
      }
      wakeGeo.attributes.position.needsUpdate = true;

      for (let i = 0; i < NG; i++) {
        const x = gBase[i * 2], z = gBase[i * 2 + 1], on = Math.sin(t * 2.1 + i * 1.73) > 0.45;
        gp[i * 3] = x;
        gp[i * 3 + 1] = on ? sea(x, z, t) + 0.06 : -20;
        gp[i * 3 + 2] = z;
      }
      glintGeo.attributes.position.needsUpdate = true;

      // eggs
      tmpV.copy(g.lantern);
      ship.localToWorld(tmpV);
      lampFlare.g.position.copy(tmpV);
      lampFlare.g.visible = el > 0 && el < 1.9;
      lampFlare.mat.opacity = 0.9 * Math.max(pulse(el, 0.4), pulse(el - 0.7, 0.4), pulse(el - 1.4, 0.4));
      lampFlare.g.lookAt(cam.position);
      const ea = t - tArch;
      arch.getWorldPosition(archFlare.g.position);
      archFlare.g.position.y += 35.8;
      archFlare.g.visible = ea > 0 && ea < 1.6;
      archFlare.mat.opacity = 0.85 * pulse(ea, 1.6);
      archFlare.g.lookAt(cam.position);
      // the moons loop round each other and settle back (burst eases 0 → 1 over two seconds)
      const sw = burst(t - tMoon, 1, 2);
      moonA.position.set(-70 - 40 * Math.sin(sw * Math.PI), 62 - 28 * Math.sin(sw * Math.PI * 0.5) ** 2, 170 - 20 * Math.sin(sw * Math.PI));
      moonB.position.set(-110 + 40 * Math.sin(sw * Math.PI), 34 + 28 * Math.sin(sw * Math.PI * 0.5) ** 2, 150 + 20 * Math.sin(sw * Math.PI));

      // camera: a slow orbit around the ship, riding a little of the swell
      const a = 2.25 + Math.sin(t * 0.03) * 0.35 + view.px * 0.12 + view.yaw, r = 30 + Math.sin(t * 0.05) * 2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      cam.position.set(x, 5.5 + sea(x, z, t) * 0.4 - view.py * 0.6, z);
      cam.lookAt(0, 6 - view.py * 1.2, 0);
      cam.rotateZ(Math.sin(t * 0.6) * 0.01);
      k.orbit(cam, PIVOT);
      sky.position.copy(cam.position);
      moonA.lookAt(cam.position);
      moonB.lookAt(cam.position);
    },
    readout() {
      const kn = SPEED * 1.94384 * 1.6;
      return [
        ["Lat", k.dms(-31.2208 + D * 0.00002, "N", "S", 2)],
        ["Lon", k.dms(-171.4405 + D * 0.00011, "E", "W", 3)],
        ["Spd", `${kn.toFixed(1)} kn`],
        ["Brg", `${k.pad(Math.round(k.bearing(cam)), 3)}°`],
        ["Log", `${(D / 1852 * 40).toFixed(2)} nm`],
      ];
    },
  };
}
