/** Sheet 07 · Aloft: a winged galleon sailing above a sea of cloud, floating islands with waterfalls drifting past, a low sun. */
import * as THREE from "three";
import { burst, pulse, type PsxKit, type SceneDef, type V3 } from "./psx";
import { buildGalleon } from "./galleon";

export function buildAloft(k: PsxKit): SceneDef {
  const { rnd, facet, psx, M, tex, view } = k;
  const PIVOT = new THREE.Vector3(0, 5, 0);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 420);
  const sky = k.skyDome(0, 0.25, 2.8);
  scene.add(sky);

  // She flies along +x; the world slides past at SPEED and loops in a band around her.
  const SPEED = 6;
  let D = 0;
  const SPAN = 420;
  const wrap = (x: number) => ((((x + SPAN / 2) % SPAN) + SPAN) % SPAN) - SPAN / 2;

  const mat = {
    cloud: psx({ map: tex.tPlain, tint: "#f6f3ea", amb: "#c4cad0", sun: "#e8dcc4", fogAmt: 0.6 }),
    cloudLo: psx({ map: tex.tPlain, tint: "#ecebe4", amb: "#b0b8c0", sun: "#e0d4bc", fogAmt: 0.7 }),
    earth: psx({ map: tex.tStone, tint: "#9c8c78", moss: 0.25, uv: 1.5, amb: "#4c5860" }),
    grass: psx({ map: tex.tGround, tint: "#c8d8a0", moss: 0.5, uv: 2 }),
    ruin: psx({ map: tex.tStone, tint: "#c6c0aa", moss: 0.7 }),
  };
  const blob = [0, 1, 2].map((i) => facet(new THREE.IcosahedronGeometry(1, 0), 0.22 + i * 0.06));
  const drift: { o: THREE.Object3D; x: number; y: number; z: number; bob: number }[] = [];
  const place = (o: THREE.Object3D, x: number, y: number, z: number) => {
    scene.add(o);
    drift.push({ o, x, y, z, bob: rnd() * 6.28 });
  };

  /* ---- the ship ---- */
  const g = buildGalleon(k, true);
  const ship = g.group;
  scene.add(ship);

  /* ---- cloud sea below, and a few banks at the ship's height ---- */
  const cloud = (n: number, s: number, m: THREE.Material) => {
    const { add, flush } = k.batcher();
    const o = new THREE.Group();
    for (let j = 0; j < n; j++) {
      const sx = s * (1.6 + rnd() * 1.4), sy = s * (0.5 + rnd() * 0.4), sz = s * (1.2 + rnd() * 1.2);
      const b = blob[j % 3].clone().scale(sx, sy, sz);
      add(b, m, (rnd() - 0.5) * s * 4, (rnd() - 0.3) * s * 0.8, (rnd() - 0.5) * s * 3, 0, rnd() * 6, 0);
    }
    flush(o);
    return o;
  };
  for (let i = 0; i < 64; i++) {
    const z = (rnd() - 0.5) * 300;
    place(cloud(4 + Math.floor(rnd() * 4), 5 + rnd() * 5, mat.cloudLo), (i / 64) * SPAN - SPAN / 2, -34 + rnd() * 6, z);
  }
  for (let i = 0; i < 12; i++) {
    const side = i % 2 ? 1 : -1;
    place(cloud(3 + Math.floor(rnd() * 3), 2 + rnd() * 2.5, mat.cloud), rnd() * SPAN - SPAN / 2, -6 + rnd() * 22, side * (16 + rnd() * 50));
  }

  /* ---- floating islands: grass cap, a rock root hanging under, trees, a ruin, a waterfall ---- */
  const falls: { lines: THREE.LineSegments; geo: THREE.BufferGeometry; n: number; h: number }[] = [];
  const trunk = facet(new THREE.CylinderGeometry(0.14, 0.22, 2.4, 5), 0.03);
  const island = (r: number, ruin: boolean) => {
    const { add, flush } = k.batcher();
    const o = new THREE.Group();
    const cap = new THREE.CylinderGeometry(r, r * 0.92, r * 0.35, 10, 1);
    add(facet(cap, r * 0.08), mat.grass, 0, 0, 0, 0, rnd() * 6, 0);
    const root = new THREE.ConeGeometry(r * 0.95, r * 1.9, 9, 3);
    root.rotateX(Math.PI);
    add(facet(root, r * 0.16), mat.earth, 0, -r * 1.12, 0, 0, rnd() * 6, 0);
    // a few loose rocks trailing beneath
    for (let b = 0; b < 3; b++) add(blob[b], mat.earth, (rnd() - 0.5) * r * 1.4, -r * (2.4 + rnd() * 1.4), (rnd() - 0.5) * r * 1.4, rnd() * 3, rnd() * 3, 0, 0.3 + rnd() * r * 0.18);
    const nt = 2 + Math.floor(r * 0.5);
    for (let tr = 0; tr < nt; tr++) {
      const a = rnd() * 6.28, d = rnd() * r * 0.65, s = 0.7 + rnd() * 0.6;
      add(trunk, M.bark, Math.cos(a) * d, r * 0.17 + 1.2 * s, Math.sin(a) * d, 0, 0, 0, s);
      add(blob[tr % 3], M.leaf[tr % 3], Math.cos(a) * d, r * 0.17 + 2.8 * s, Math.sin(a) * d, rnd() * 3, rnd() * 3, 0, 1.3 * s);
    }
    if (ruin) {
      // three standing columns and a lintel, with a beacon
      for (let c = 0; c < 3; c++) add(facet(new THREE.CylinderGeometry(0.35, 0.4, 3.6, 6), 0.05), mat.ruin, -r * 0.3 + c * 1.4, r * 0.17 + 1.8, r * 0.25);
      add(facet(new THREE.BoxGeometry(3.6, 0.5, 0.9), 0.05), mat.ruin, -r * 0.3 + 1.4, r * 0.17 + 3.8, r * 0.25);
      add(facet(new THREE.BoxGeometry(0.4, 0.4, 0.4)), M.glyph, -r * 0.3 + 1.4, r * 0.17 + 4.3, r * 0.25);
    }
    flush(o);
    // waterfall over the lip: a fan of lines that drip downward each frame
    const lip = new THREE.Vector3(r * 0.95, r * 0.12, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6.28);
    const n = 7, h = r * 3.2, pts: V3[] = [];
    for (let i = 0; i < n * 2; i++) pts.push(lip.clone());
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const lines = new THREE.LineSegments(geo, M.lBone);
    lines.frustumCulled = false;
    lines.userData.lip = lip;
    o.add(lines);
    falls.push({ lines, geo, n, h });
    return o;
  };
  const isles: THREE.Object3D[] = [];
  ([
    // x, y, z, radius, ruin
    [-40, 6, -38, 7, true], [60, 14, 34, 5, false], [150, -4, -70, 10, false], [-120, 18, 60, 6, true],
    [10, 26, -90, 12, false], [-180, 0, -30, 4.5, false], [110, 2, 90, 8, true], [-70, -10, 110, 9, false],
    [190, 22, 40, 5, false],
  ] as [number, number, number, number, boolean][]).forEach(([x, y, z, r, ruin]) => {
    const o = island(r, ruin);
    isles.push(o);
    place(o, x, y, z);
  });
  // the first isle carries the ruin; its beacon sits at this local point (r = 7)
  const beaconIsle = isles[0], BEACON = new THREE.Vector3(-0.7, 5.5, 1.75);

  /* ---- a low sun ahead, off the starboard bow ---- */
  const sun = k.sunDisc(scene, 150, 38, 120, 15, "#fff1cc", "#ffb870");

  /* ---- wind streaks rushing past the hull ---- */
  const NS = 36, sp = new Float32Array(NS * 6), sBase = Array.from({ length: NS }, () => [rnd(), (rnd() - 0.5) * 22, (rnd() - 0.5) * 30, 1.5 + rnd() * 3]);
  const streakGeo = new THREE.BufferGeometry();
  streakGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  const streaks = new THREE.LineSegments(streakGeo, M.lBoneDim);
  streaks.frustumCulled = false;
  scene.add(streaks);

  /* ---- motes shed by the keel crystal ---- */
  const NM = 70, mp = new Float32Array(NM * 3), mJ = Array.from({ length: NM }, () => [rnd(), rnd(), rnd()]);
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute("position", new THREE.BufferAttribute(mp, 3));
  const moteMat = new THREE.PointsMaterial({ color: k.U.uAccent.value, size: 2, sizeAttenuation: false });
  const motes = new THREE.Points(moteGeo, moteMat);
  motes.frustumCulled = false;
  scene.add(motes);

  /* ---- a skein of birds keeping pace ---- */
  const birdGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0.2, 0, -0.7), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.2, 0, 0.7),
  ]);
  const birds = Array.from({ length: 7 }, (_, i) => {
    const l = new THREE.LineSegments(birdGeo, M.lBone);
    scene.add(l);
    const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
    return { l, ox: -row * 1.6, oz: side * row * 1.4, ph: rnd() * 6.28 };
  });

  // easter eggs: start times
  let tCrystal = -99, tBeacon = -99, tSun = -99, tBirds = -99;
  const crystalFlare = k.flare(scene, 0, 0, 0, 1.6);
  const beaconFlare = k.flare(scene, 0, 0, 0, 2);
  const tmpV = new THREE.Vector3();
  const ALT = 0;

  return {
    scene, cam, fog: [50, 210], fov: [60, 72], limits: { pitch: [-0.45, 0.8], zoom: [0.55, 1.7] },
    moteMat,
    labels: [
      { name: "Sky-galleon", sub: "under sail · wings out", at: (v) => { v.copy(g.mainTop).y += 1.4; ship.localToWorld(v); } },
      {
        name: "Drifting isle", sub: "waterfall · ruin",
        at: (v) => { beaconIsle.getWorldPosition(v); v.y += 9; },
        sub2: () => { beaconIsle.getWorldPosition(tmpV); return `${Math.round(tmpV.length())} m`; },
      },
      { name: "Cloud sea", sub: "ceiling 2,300 m", at: (v) => { v.set(-30, -26, 40); } },
    ],
    eggs: [
      {
        id: "aloft-crystal", r: 38,
        at: (v) => { g.crystal!.getWorldPosition(v); },
        fire: (t) => { tCrystal = t; return "KEEL STONE · hums a little louder. The ship lifts to listen."; },
      },
      {
        id: "aloft-beacon", r: 40,
        at: (v) => { beaconIsle.getWorldPosition(v).add(BEACON); },
        fire: (t) => { tBeacon = t; return "RUIN BEACON · lit for a ship that already passed."; },
      },
      {
        id: "aloft-birds", r: 36,
        at: (v) => { v.copy(birds[0].l.position); },
        fire: (t) => { tBirds = t; return "SKEIN · the lead bird loops. The rest pretend not to see."; },
      },
      {
        id: "aloft-sun", r: 44,
        at: (v) => { v.copy(sun.position); },
        fire: (t) => { tSun = t; return "SUN · low, warm, in no hurry."; },
      },
    ],
    update(t) {
      D = t * SPEED;
      const ec = t - tCrystal;

      // the ship: slow heave and yaw on the air, a lift when the keel stone sings
      ship.position.y = ALT + Math.sin(t * 0.5) * 0.6 + 1.6 * pulse(ec, 2.6);
      ship.rotation.set(Math.sin(t * 0.4) * 0.05, Math.sin(t * 0.17) * 0.04, Math.sin(t * 0.33) * 0.03 + 0.04 * pulse(ec, 2.6));
      g.sails.forEach((s, i) => { s.scale.x = 1 + 0.1 * Math.sin(t * 1.1 + i * 0.7); });
      g.pennants.forEach((p, i) => { p.rotation.y = Math.sin(t * 6 + i) * 0.35; });
      const flap = Math.sin(t * 1.3);
      g.wings.forEach((w, i) => { w.rotation.x = (i ? -1 : 1) * (0.1 + 0.32 * flap); });
      if (g.crystal) {
        g.crystal.rotation.y = t * 0.8 + burst(ec, 10, 2.6);
        g.crystal.position.y = -3.1 + Math.sin(t * 2) * 0.12;
      }
      if (g.screw) g.screw.rotation.x = t * 7;
      ship.updateMatrixWorld();

      for (const d of drift) {
        const x = wrap(d.x - D);
        d.o.position.set(x, d.y + Math.sin(t * 0.3 + d.bob) * 0.5, d.z);
      }
      // waterfalls: each strand's lower end sweeps down then resets, staggered
      for (const f of falls) {
        const lip = f.lines.userData.lip as V3, p = f.geo.attributes.position;
        for (let i = 0; i < f.n; i++) {
          const u = (t * 0.35 + i / f.n) % 1, off = (i - (f.n - 1) / 2) * 0.22, top = u * f.h * 0.6, bot = Math.min(f.h, top + f.h * 0.45);
          p.setXYZ(i * 2, lip.x * 1.02, lip.y - top, lip.z + off);
          p.setXYZ(i * 2 + 1, lip.x * (1.02 + bot * 0.004), lip.y - bot, lip.z + off);
        }
        p.needsUpdate = true;
      }

      // wind streaks: dashes rushing aft past the ship
      for (let i = 0; i < NS; i++) {
        const [ph, y, z, len] = sBase[i], u = (ph + t * 0.45) % 1, x = 60 - u * 120;
        sp.set([x, y + 3, z, x + len, y + 3, z], i * 6);
      }
      streakGeo.attributes.position.needsUpdate = true;

      // motes fall from the crystal and trail astern
      if (g.crystal) g.crystal.getWorldPosition(tmpV);
      for (let i = 0; i < NM; i++) {
        const [a0, jx, jz] = mJ[i], a = (a0 + t * 0.25) % 1;
        mp[i * 3] = tmpV.x - a * 26 + (jx - 0.5) * 1.5;
        mp[i * 3 + 1] = tmpV.y - 0.6 - a * a * 9;
        mp[i * 3 + 2] = tmpV.z + (jz - 0.5) * (1 + a * 5);
      }
      moteGeo.attributes.position.needsUpdate = true;

      // birds: a V off the starboard bow, wings beating out of step
      const eb = Math.min(1, (t - tBirds) / 1.6);
      birds.forEach((b, i) => {
        b.l.position.set(16 + b.ox + Math.sin(t * 0.21) * 3, 13 + Math.sin(t * 0.5 + i * 0.3) * 0.6, 14 + b.oz);
        b.l.scale.y = 1;
        b.l.rotation.set(Math.sin(t * 7 + b.ph) * 0.5, 0, 0);
      });
      if (eb > 0 && eb < 1) {
        const s = eb * eb * (3 - 2 * eb) * Math.PI * 2;
        birds[0].l.position.y += Math.sin(s) * 3;
        birds[0].l.position.x += (1 - Math.cos(s)) * 2;
        birds[0].l.rotation.z = s;
      }

      // eggs
      if (g.crystal) g.crystal.getWorldPosition(crystalFlare.g.position);
      crystalFlare.g.visible = ec > 0 && ec < 2.6;
      crystalFlare.mat.opacity = 0.8 * pulse(ec, 2.6);
      crystalFlare.g.lookAt(cam.position);
      const eB = t - tBeacon;
      beaconIsle.getWorldPosition(beaconFlare.g.position).add(BEACON);
      beaconFlare.g.visible = eB > 0 && eB < 2.2;
      beaconFlare.mat.opacity = 0.9 * Math.max(pulse(eB, 0.7), pulse(eB - 1, 1.2));
      beaconFlare.g.lookAt(cam.position);
      sun.scale.setScalar(1 + 0.35 * pulse(t - tSun, 1.6));

      // camera: orbit the ship from a little above, drifting
      const a = 2.0 + Math.sin(t * 0.028) * 0.4 + view.px * 0.12 + view.yaw, r = 31 + Math.sin(t * 0.045) * 2;
      cam.position.set(Math.cos(a) * r, 8 + Math.sin(t * 0.13) * 1.2 - view.py * 0.6, Math.sin(a) * r);
      cam.lookAt(0, 5 - view.py * 1.2, 0);
      cam.rotateZ(Math.sin(t * 0.4) * 0.012);
      k.orbit(cam, PIVOT);
      sky.position.copy(cam.position);
      sun.lookAt(cam.position);
    },
    readout() {
      const p = cam.position;
      return [
        ["Alt", `${Math.round(2600 + ship.position.y * 10 + p.y)} m`],
        ["Spd", `${(SPEED * 1.94384 * 3).toFixed(1)} kn`],
        ["Brg", `${k.pad(Math.round(k.bearing(cam)), 3)}°`],
        ["Wind", "W 4 · aft"],
        ["Run", `${(D / 1000 * 12).toFixed(2)} km`],
      ];
    },
  };
}
