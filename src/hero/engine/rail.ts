/** Sheet 05 · Rail: a halt on a causeway in a boundless shallow sea, a train coming in over the water, a city skyline on the horizon, two suns overhead. */
import * as THREE from "three";
import type { PsxKit, SceneDef, V3 } from "./psx";

export function buildRail(k: PsxKit): SceneDef {
  const { rnd, facet, wallUV, mesh, psx, M, tex, view } = k;
  const { add, flush } = k.batcher();
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 340);
  const sky = k.skyDome(0, 0.15, 2.6);
  scene.add(sky);

  // A near-still sea: long low swell, nothing breaking.
  const wave = (x: number, z: number, t: number) =>
    0.07 * Math.sin(x * 0.21 + z * 0.06 + t * 0.6) +
    0.05 * Math.sin(z * 0.27 - x * 0.09 - t * 0.48) +
    0.025 * Math.sin((x + z) * 0.6 + t * 1.2);

  const mat = {
    water: psx({ map: tex.tWater, tint: "#b9d6d8", amb: "#5a7682", sun: "#d6ccb0" }),
    deck: psx({ map: tex.tStone, tint: "#9a9c92", amb: "#56646a" }),
    sleeper: psx({ map: tex.tBark, tint: "#7a6a5a" }),
    steel: psx({ map: tex.tPlain, tint: "#a7adad", amb: "#66727a" }),
    concrete: psx({ map: tex.tStone, tint: "#c4c0b2", amb: "#5e6a70", moss: 0.25 }),
    body: psx({ map: tex.tPlain, tint: "#e2ddcf", amb: "#6d7a82" }),
    roof: psx({ map: tex.tPlain, tint: "#8d9496", amb: "#5a666c" }),
    glass: psx({ map: tex.tGlass, tint: "#b9c6cc" }),
    dark: psx({ map: tex.tPlain, tint: "#2b3439", amb: "#3c464c" }),
    city: [
      psx({ map: tex.tGlass, tint: "#b7c4ca", amb: "#56646e", sun: "#c8c0aa", fogAmt: 0.72 }),
      psx({ map: tex.tGlass, tint: "#8f9eaa", amb: "#4a5862", sun: "#b8b09c", fogAmt: 0.72 }),
      psx({ map: tex.tStone, tint: "#a9aba4", amb: "#56646e", sun: "#c8c0aa", fogAmt: 0.72 }),
    ],
  };
  const up = new THREE.Vector3(0, 1, 0);
  // Thin strut from a to b.
  const bar = (a: V3, b: V3, r: number) => {
    const g = new THREE.CylinderGeometry(r, r, a.distanceTo(b), 4, 1);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, b.clone().sub(a).normalize()));
    g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    return facet(g);
  };

  /* ---- sea: a grid denser near the camera, displaced every frame ---- */
  const WN = 72, WH = 280, WCX = -2, WCZ = 12;
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

  /* ---- causeway: a low slab just clear of the water, running to the horizon ---- */
  const Z0 = -300, Z1 = 70, ZN = -90, DECK = 0.42, GAUGE = 0.72, WIRE = 5.2;
  add(wallUV(facet(new THREE.BoxGeometry(2.6, 0.5, Z1 - Z0, 1, 1, 60)), 0.5), mat.deck, 0, DECK - 0.25, (Z0 + Z1) / 2);
  const sleeper = facet(new THREE.BoxGeometry(2.1, 0.1, 0.32), 0.02);
  for (let z = ZN; z < Z1; z += 0.9) add(sleeper, mat.sleeper, 0, DECK + 0.05, z, 0, (rnd() - 0.5) * 0.04, 0);
  for (const s of [-1, 1]) add(facet(new THREE.BoxGeometry(0.09, 0.12, Z1 - ZN, 1, 1, 24)), mat.steel, s * GAUGE, DECK + 0.16, (ZN + Z1) / 2);
  // Past ZN the rails and wires are lines, so they stay one pixel wide all the way out.
  const far: V3[] = [];
  for (const s of [-1, 1]) far.push(new THREE.Vector3(s * GAUGE, DECK + 0.2, ZN), new THREE.Vector3(s * GAUGE, DECK + 0.2, Z0));

  // catenary: masts on the sea side, contact wire over the track, sagging messenger
  const wires: V3[] = [];
  const pole = facet(new THREE.CylinderGeometry(0.09, 0.12, WIRE + 0.6 - DECK, 5));
  const arm = facet(new THREE.BoxGeometry(2.3, 0.08, 0.08));
  let prevZ = Z0;
  for (let z = -285, n = 0; z <= 60; z += 15, n++) {
    add(pole, mat.steel, 1.9, (WIRE + 0.6 + DECK) / 2, z);
    add(arm, mat.steel, 0.85, WIRE + 0.5, z);
    if (n % 4 === 2) add(facet(new THREE.BoxGeometry(0.16, 0.16, 0.16)), M.glyph, 1.9, WIRE + 0.75, z);
    const mid = (prevZ + z) / 2;
    wires.push(new THREE.Vector3(0, WIRE, prevZ), new THREE.Vector3(0, WIRE, z));
    wires.push(new THREE.Vector3(0, WIRE + 0.6, prevZ), new THREE.Vector3(0, WIRE + 0.32, mid));
    wires.push(new THREE.Vector3(0, WIRE + 0.32, mid), new THREE.Vector3(0, WIRE + 0.6, z));
    wires.push(new THREE.Vector3(0, WIRE + 0.32, mid), new THREE.Vector3(0, WIRE, mid));
    prevZ = z;
  }
  scene.add(k.segs(far, M.lBoneDim), k.segs(wires, M.lBoneDim));

  /* ---- the halt: a bare platform with a short canopy, standing in the sea ---- */
  const PX = -3.25, PW = 3.0, PZ0 = -16, PZ1 = 21, PT = 1.25;
  add(wallUV(facet(new THREE.BoxGeometry(PW, PT + 2.5, PZ1 - PZ0, 1, 1, 10), 0.03), 0.5), mat.concrete, PX, (PT - 2.5) / 2, (PZ0 + PZ1) / 2);
  add(facet(new THREE.BoxGeometry(0.18, 0.03, PZ1 - PZ0)), M.glyph, PX + PW / 2 - 0.22, PT + 0.015, (PZ0 + PZ1) / 2);
  // steps down into the water on the sea side
  for (let i = 0; i < 5; i++) {
    const top = PT - (i + 1) * 0.28;
    add(facet(new THREE.BoxGeometry(0.7, top + 2.5, 3.2), 0.02), mat.concrete, PX - PW / 2 - 0.35 - i * 0.7, (top - 2.5) / 2, 6);
  }
  for (let z = -13; z <= -3; z += 5) add(facet(new THREE.CylinderGeometry(0.08, 0.1, 3.0, 5)), mat.steel, PX - 0.7, PT + 1.5, z);
  add(facet(new THREE.BoxGeometry(3.4, 0.14, 13, 2, 1, 3), 0.02), mat.roof, PX + 0.1, PT + 3.05, -7.8, 0, 0, -0.06);
  for (let z = -12; z <= -4; z += 4) add(facet(new THREE.BoxGeometry(0.5, 0.05, 0.12)), M.glyph, PX + 0.2, PT + 2.92, z);
  // name board on two legs
  for (const s of [-1.1, 1.1]) add(facet(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 4)), mat.steel, PX + 0.6, PT + 1.3, 2 + s);
  add(facet(new THREE.BoxGeometry(0.08, 0.5, 2.4)), mat.dark, PX + 0.6, PT + 2.45, 2);
  add(facet(new THREE.BoxGeometry(0.1, 0.07, 1.8)), M.glyph, PX + 0.6, PT + 2.45, 2);
  // benches
  for (const bz of [3, -7]) {
    add(facet(new THREE.BoxGeometry(0.5, 0.08, 1.8)), mat.roof, PX - 0.85, PT + 0.45, bz);
    add(facet(new THREE.BoxGeometry(0.06, 0.45, 1.8)), mat.roof, PX - 1.08, PT + 0.75, bz);
    for (const s of [-0.75, 0.75]) add(facet(new THREE.BoxGeometry(0.4, 0.45, 0.06)), mat.dark, PX - 0.85, PT + 0.22, bz + s);
  }
  // glass shelter and a lamp at the far end
  add(wallUV(facet(new THREE.BoxGeometry(1.4, 2.3, 2.6)), 1 / 3), mat.glass, PX - 0.55, PT + 1.15, -11);
  add(facet(new THREE.BoxGeometry(1.6, 0.1, 2.8)), mat.roof, PX - 0.55, PT + 2.35, -11);
  add(facet(new THREE.CylinderGeometry(0.06, 0.08, 3.2, 5)), mat.steel, PX + 0.3, PT + 1.6, -15.3);
  add(facet(new THREE.BoxGeometry(0.3, 0.14, 0.3)), M.glyph, PX + 0.3, PT + 3.25, -15.3);
  flush(scene);

  /* ---- skyline: a city of towers standing in the sea, tallest where the line runs in ---- */
  let peak = new THREE.Vector3(0, 0, -200);
  for (let i = 0; i < 70; i++) {
    const x = (rnd() - 0.5) * 340, z = -172 - rnd() * 72;
    if (Math.abs(x) < 5) continue;
    const h = 14 + rnd() * 18 + 80 * Math.exp(-(((x - 8) / 60) ** 2)) * (0.45 + rnd() * 0.55);
    const w = 5 + rnd() * 7, d = w * (0.7 + rnd() * 0.4), ry = (rnd() - 0.5) * 0.5;
    const clad = mat.city[Math.floor(rnd() * 3)], kind = rnd();
    let top = h;
    if (kind < 0.55) {
      // box, sometimes stepped back once or twice
      const tiers = h > 50 ? 1 + Math.floor(rnd() * 3) : 1;
      let y = 0, tw = w, td = d;
      for (let t = 0; t < tiers; t++) {
        const th = t === tiers - 1 ? h - y : (h - y) * (0.5 + rnd() * 0.2);
        add(wallUV(facet(new THREE.BoxGeometry(tw, th + (t ? 0 : 3), td)), 1 / 12), clad, x, y + (th - (t ? 0 : 3)) / 2, z, 0, ry, 0);
        y += th;
        tw *= 0.72;
        td *= 0.72;
      }
    } else if (kind < 0.8) {
      add(wallUV(facet(new THREE.CylinderGeometry(w * 0.45, w * 0.5, h + 3, 8)), 1 / 12), clad, x, (h - 3) / 2, z, 0, ry, 0);
    } else {
      add(wallUV(facet(new THREE.CylinderGeometry(w * 0.3, w * 0.62, h + 3, 4).rotateY(Math.PI / 4)), 1 / 12), clad, x, (h - 3) / 2, z, 0, ry, 0);
      top = h + 4;
      add(facet(new THREE.ConeGeometry(w * 0.3, 8, 4).rotateY(Math.PI / 4)), clad, x, h + 4, z, 0, ry, 0);
    }
    // lit crown bands on the tall ones, masts with a beacon on some
    if (h > 55) add(facet(new THREE.BoxGeometry(w * 0.62, 0.6, d * 0.62)), M.glyph, x, h * 0.86, z, 0, ry, 0);
    if (rnd() > 0.45) {
      const mh = 4 + rnd() * (h > 60 ? 16 : 6);
      add(facet(new THREE.CylinderGeometry(0.2, 0.35, mh, 4)), mat.dark, x, top + mh / 2, z);
      add(facet(new THREE.BoxGeometry(0.9, 0.9, 0.9)), M.glyph, x, top + mh, z);
      top += mh;
    }
    if (top > peak.y) peak = new THREE.Vector3(x, top, z);
  }
  flush(scene);

  /* ---- two suns, high over the horizon ---- */
  const sunA = k.sunDisc(scene, 85, 132, -255, 14, "#fff3d2", "#ffc874");
  const sunB = k.sunDisc(scene, -45, 108, -265, 9, "#ffd8b8", "#ff9a68");

  /* ---- the train: four cars, lead car with a raked nose; local z = 0 is its front ---- */
  const train = new THREE.Group();
  scene.add(train);
  const NC = 4, CL = 8, CG = 0.5, CW = 2.5, CH = 2.5, FLOOR = DECK + 0.6, BY = FLOOR + CH / 2;
  const bogie = facet(new THREE.BoxGeometry(2.0, 0.35, 1.8));
  const door = facet(new THREE.BoxGeometry(0.04, 2.0, 1.0));
  for (let i = 0; i < NC; i++) {
    const z1 = -i * (CL + CG), z0 = z1 - CL, nose = i === 0 ? 1.6 : 0, bodyL = CL - nose, bz = z0 + bodyL / 2;
    add(facet(new THREE.BoxGeometry(CW, CH, bodyL)), mat.body, 0, BY, bz);
    add(wallUV(facet(new THREE.BoxGeometry(CW + 0.04, 0.85, bodyL - 1)), 1 / 3), mat.glass, 0, BY + 0.3, bz);
    add(facet(new THREE.BoxGeometry(CW + 0.05, 0.12, CL)), M.glyph, 0, BY - 0.55, z0 + CL / 2);
    add(facet(new THREE.BoxGeometry(CW - 0.3, 0.26, bodyL - 0.3)), mat.roof, 0, FLOOR + CH + 0.13, bz);
    add(facet(new THREE.BoxGeometry(1.9, 0.45, CL - 1.6)), mat.dark, 0, FLOOR - 0.15, z0 + CL / 2);
    for (const gz of [z0 + 1.5, z1 - 1.5]) add(bogie, mat.dark, 0, DECK + 0.38, gz);
    for (const s of [-1, 1]) for (const f of [0.3, 0.7]) add(door, mat.roof, s * (CW / 2 + 0.03), BY - 0.05, z0 + CL * f);
    if (i < NC - 1) add(facet(new THREE.BoxGeometry(1.6, 2.0, CG + 0.1)), mat.dark, 0, BY, z0 - CG / 2);
  }
  // nose: upper half raked back, windscreen on the slope, headlamps below
  const noseG = new THREE.BoxGeometry(CW, CH, 1.6, 1, 2, 1);
  const np = noseG.attributes.position;
  for (let i = 0; i < np.count; i++) if (np.getZ(i) > 0 && np.getY(i) > 0.1) np.setXYZ(i, np.getX(i) * 0.92, np.getY(i) - 0.12, np.getZ(i) - 1.15);
  add(facet(noseG), mat.body, 0, BY, -0.8);
  add(facet(new THREE.BoxGeometry(CW * 0.84, 0.05, 1.3).rotateX(Math.PI / 4)), mat.dark, 0, BY + 0.58, -0.56);
  for (const s of [-1, 1]) add(facet(new THREE.BoxGeometry(0.4, 0.16, 0.06)), M.glyph, s * 0.75, BY - 0.25, 0.03);
  // pantograph on the second car, up to the contact wire
  const PZ = -(CL + CG) - CL / 2, RT = FLOOR + CH + 0.26;
  const knee = new THREE.Vector3(0, RT + 0.7, PZ + 0.5), head = new THREE.Vector3(0, WIRE - 0.05, PZ - 0.1);
  add(bar(new THREE.Vector3(0, RT, PZ - 0.7), knee, 0.04), mat.steel);
  add(bar(knee, head, 0.04), mat.steel);
  add(facet(new THREE.BoxGeometry(1.6, 0.06, 0.12)), mat.steel, 0, WIRE - 0.05, PZ - 0.1);
  add(facet(new THREE.BoxGeometry(0.8, 0.12, 1.2)), mat.dark, 0, RT, PZ - 0.4);
  flush(train);

  // Timetable: brake in from beyond the fog, stand at the halt, pull out past the camera, repeat.
  const ZSTOP = 12, D = 320, TA = 24, TW = 9, TD = 14, TP = TA + TW + TD;
  let speed = 0, phase = 0;
  const run = (t: number) => {
    const u = (((t - 1) % TP) + TP) % TP;
    if (u < TA) {
      const f = 1 - u / TA;
      speed = (2 * D * f) / TA;
      phase = 0;
      return ZSTOP - D * f * f;
    }
    if (u < TA + TW) {
      speed = 0;
      phase = 1;
      return ZSTOP;
    }
    const d = u - TA - TW;
    speed = 3 * d;
    phase = 2;
    return ZSTOP + 1.5 * d * d;
  };

  /* ---- glitter on the sea along the line to each sun ---- */
  const CX = -3.6, CZ = 18.5;
  const NG = 180, gp = new Float32Array(NG * 3), gBase: number[] = [];
  for (let i = 0; i < NG; i++) {
    const s = i % 3 ? sunA.position : sunB.position;
    const dx = s.x - CX, dz = s.z - CZ, l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l;
    const d = 8 + Math.pow(rnd(), 0.6) * 200, w = (rnd() - 0.5) * (0.6 + d * 0.1);
    gBase.push(CX + ux * d - uz * w, CZ + uz * d + ux * w);
  }
  const glintGeo = new THREE.BufferGeometry();
  glintGeo.setAttribute("position", new THREE.BufferAttribute(gp, 3));
  const glints = new THREE.Points(glintGeo, new THREE.PointsMaterial({ color: "#ffe0a0", size: 1, sizeAttenuation: false }));
  glints.frustumCulled = false;
  scene.add(glints);

  return {
    scene, cam, fog: [30, 260], fov: [58, 72],
    labels: [
      {
        name: "Inbound", sub: "4 cars",
        at: (v) => { v.set(0, FLOOR + CH + 1.2, train.position.z - 3); },
        sub2: () => (phase === 0 ? `${Math.round(speed * 3.6)} km/h` : phase === 1 ? "at the halt" : "departing"),
      },
      { name: "Skyline", sub: "lights still on", at: (v) => { v.copy(peak).y += 6; } },
      { name: "Twin suns", sub: "binary, high", at: (v) => { v.copy(sunA.position).y += 26; } },
    ],
    update(t) {
      for (let i = 0; i < wpos.count; i++) wpos.setY(i, wave(wx[i], wz[i], t));
      wpos.needsUpdate = true;
      water.computeVertexNormals();

      train.position.z = run(t);
      train.position.y = Math.sin(t * 7.3) * 0.012 * Math.min(1, speed / 4);

      for (let i = 0; i < NG; i++) {
        const x = gBase[i * 2], z = gBase[i * 2 + 1], on = Math.sin(t * 2.3 + i * 1.73) > 0.4;
        gp[i * 3] = x;
        gp[i * 3 + 1] = on ? wave(x, z, t) + 0.04 : -9;
        gp[i * 3 + 2] = z;
      }
      glintGeo.attributes.position.needsUpdate = true;

      const x = CX + Math.sin(t * 0.05) * 0.25 + view.px * 0.6, z = CZ + Math.sin(t * 0.031) * 0.4;
      cam.position.set(x, PT + 1.55 + Math.sin(t * 0.6) * 0.015 - view.py * 0.3, z);
      cam.lookAt(1.5 + view.px * 6 + Math.sin(t * 0.04) * 3, 6 - view.py * 4, -80);
      sky.position.copy(cam.position);
      sunA.lookAt(cam.position);
      sunB.lookAt(cam.position);
    },
    readout() {
      const p = cam.position;
      return [
        ["Lat", k.dms(-11.402 - p.z * 0.00009, "N", "S", 2)],
        ["Lon", k.dms(-152.7713 + p.x * 0.00013, "E", "W", 3)],
        ["Elev", `${p.y.toFixed(1)} m`],
        ["Brg", `${k.pad(Math.round(k.bearing(cam)), 3)}°`],
        ["Grid", k.gridRef(p.x, p.z, 40)],
      ];
    },
  };
}
