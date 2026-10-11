/** Sheet 01 · Monument: a pastel keep and a drift isle hovering over a still lake, mirrored in the water, mesas on the horizon. */
import * as THREE from "three";
import type { PsxKit, SceneDef } from "./psx";

type Mat = THREE.ShaderMaterial;
type Key = "cream" | "sand" | "peach" | "coral" | "rose" | "teal" | "leaf" | "rock" | "door" | "glow" | "mesa" | "mesa2";
type Palette = Record<Key, Mat>;
type Part = [THREE.BufferGeometry, Key, number, number, number, number, number, number];

const WATER_V = `
uniform vec2 uSnap; uniform float uTime; varying float vDepth; varying vec3 vWP;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  wp.y += sin(wp.x * 0.35 + uTime * 0.9) * 0.06 + cos(wp.z * 0.3 - uTime * 0.7) * 0.06;
  vWP = wp.xyz;
  vec4 mv = viewMatrix * wp;
  vec4 p = projectionMatrix * mv;
  p.xy = floor(p.xy / p.w * uSnap + 0.5) / uSnap * p.w;
  gl_Position = p;
  vDepth = -mv.z;
}`;
const WATER_F = `
uniform vec3 uFogColor; uniform vec3 uZen; uniform vec3 uAccent; uniform vec3 uAccent2;
uniform float uFogNear; uniform float uFogFar; uniform float uTime;
varying float vDepth; varying vec3 vWP;
void main(){
  vec3 c = mix(uZen, uAccent2, 0.4);
  float r = sin(vWP.x * 0.9 + sin(vWP.z * 0.21 + uTime * 0.4) * 2.0 + uTime * 0.6) * sin(vWP.z * 1.7 - uTime * 0.5);
  c = mix(c, uFogColor * 1.4, step(0.93, r) * 0.55);
  float d = length(vWP.xz);
  float ring = (1.0 - smoothstep(0.0, 0.035, abs(fract(d * 0.08 - uTime * 0.05) - 0.5))) * smoothstep(34.0, 5.0, d);
  c = mix(c, uAccent, ring * 0.22);
  float fg = smoothstep(uFogNear, uFogFar, vDepth);
  gl_FragColor = vec4(mix(c, uFogColor, fg), mix(0.6, 1.0, fg));
}`;

export function buildMonument(k: PsxKit, accentHex: string): SceneDef {
  const { U, rnd, facet, mesh, psx, M, tex, view } = k;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(64, 16 / 9, 0.1, 320);
  const sky = k.skyDome(0, 0.7, 1.4);
  scene.add(sky);

  /* ---- palette: flat pastel planes; the mirrored copy lights with a mirrored sun so faces keep their tone ---- */
  const palette = (refl: boolean): Palette => {
    const L = U.uLightDir.value;
    const mirrored = { value: new THREE.Vector3(L.x, -L.y, L.z) };
    const f = (o: Parameters<typeof psx>[0]) => {
      const m = psx({ amb: "#a29eb6", sun: "#fbe6c8", ...o });
      if (refl) m.uniforms.uLightDir = mirrored;
      return m;
    };
    const flat = (tint: string) => f({ map: tex.tPlain, tint });
    return {
      cream: flat("#f6e9d4"),
      sand: flat("#ecc9a2"),
      peach: flat("#f1a888"),
      coral: flat("#d9716b"),
      rose: flat("#c4657e"),
      teal: flat("#7fc4b6"),
      leaf: flat("#8fc59a"),
      rock: f({ map: tex.tStone, tint: "#b9a4b4", uv: 1.5 }),
      door: f({ map: tex.tPlain, tint: "#2c2436" }),
      glow: f({ map: tex.tPlain, tint: "#000000", emit: 0.95, fogAmt: 0.3 }),
      mesa: f({ map: tex.tStone, tint: "#a87a8c", fogAmt: 0.7, uv: 3 }),
      mesa2: f({ map: tex.tStone, tint: "#8c6a86", fogAmt: 0.75, uv: 3 }),
    };
  };
  const P = palette(false), PR = palette(true);

  // Each structure is recorded once as a parts list, then placed twice: upright and mirrored under the water line.
  const place = (parts: Part[], g: THREE.Group, pal: Palette) => {
    for (const [geo, key, x, y, z, rx, ry, rz] of parts) mesh(geo, pal[key], g, x, y, z, rx, ry, rz);
  };
  const pair = (parts: Part[]) => {
    const up = new THREE.Group(), down = new THREE.Group();
    down.scale.y = -1;
    place(parts, up, P);
    place(parts, down, PR);
    scene.add(up, down);
    return { up, down };
  };
  const box = (w: number, h: number, d: number) => facet(new THREE.BoxGeometry(w, h, d));
  const rockCone = (r: number, h: number, amt: number) => {
    const g = new THREE.ConeGeometry(r, h, 4, 3);
    g.rotateX(Math.PI);
    g.rotateY(Math.PI / 4);
    g.translate(0, -h / 2, 0);
    return facet(g, amt);
  };
  const dome = (r: number) => facet(new THREE.SphereGeometry(r, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2));
  const roof = (r: number, h: number) => {
    const g = new THREE.ConeGeometry(r, h, 4);
    g.rotateY(Math.PI / 4);
    return facet(g);
  };
  const archTop = (r: number, d: number) => {
    const g = new THREE.CylinderGeometry(r, r, d, 8, 1, false, -Math.PI / 2, Math.PI);
    g.rotateX(Math.PI / 2);
    return facet(g);
  };

  /* ---- the keep ---- */
  const keepParts: Part[] = [];
  const add = (list: Part[], geo: THREE.BufferGeometry, key: Key, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) =>
    list.push([geo, key, x, y, z, rx, ry, rz]);

  add(keepParts, rockCone(6.4, 5.5, 0.55), "rock");
  [[-2.6, 2.2, 1.4], [2.4, -2.8, 1.1], [1.8, 2.4, 0.9]].forEach(([x, z, s]) => add(keepParts, rockCone(s * 1.4, s * 3.2, 0.2), "rock", x, -1.2, z));
  add(keepParts, box(9, 1, 9), "sand", 0, 0.5, 0);
  add(keepParts, box(9.3, 0.2, 9.3), "cream", 0, 1.05, 0);

  // ground floor, doors on two faces
  add(keepParts, box(5.2, 4, 5.2), "peach", 0, 3.15, 0);
  const doorG = box(1.2, 1.9, 0.2), doorTop = archTop(0.6, 0.2);
  add(keepParts, doorG, "door", 0, 2.1, 2.6);
  add(keepParts, doorTop, "door", 0, 3.05, 2.6);
  add(keepParts, doorG, "door", 2.6, 2.1, 0, 0, Math.PI / 2);
  add(keepParts, doorTop, "door", 2.6, 3.05, 0, 0, Math.PI / 2);
  add(keepParts, box(5.8, 0.4, 5.8), "cream", 0, 5.35, 0);

  // upper tier, lantern windows
  add(keepParts, box(3.6, 3, 3.6), "coral", 0, 7.05, 0);
  const winG = box(0.5, 1.1, 0.16), winTop = archTop(0.25, 0.16);
  for (const [x, z, ry] of [[0, 1.8, 0], [1.8, 0, Math.PI / 2], [0, -1.8, 0], [-1.8, 0, Math.PI / 2]]) {
    for (const o of [-0.7, 0.7]) {
      const ox = ry ? 0 : o, oz = ry ? o : 0;
      add(keepParts, winG, "glow", x + ox, 6.9, z + oz, 0, ry);
      add(keepParts, winTop, "glow", x + ox, 7.45, z + oz, 0, ry);
    }
  }
  add(keepParts, box(4.1, 0.35, 4.1), "cream", 0, 8.72, 0);
  add(keepParts, dome(1.7), "teal", 0, 8.9, 0);
  add(keepParts, roof(0.3, 1.6), "cream", 0, 11.35, 0);
  const ORB_Y = 12.4;
  add(keepParts, facet(new THREE.IcosahedronGeometry(0.32, 0)), "glow", 0, ORB_Y, 0);

  // tall corner turret with a pointed roof
  add(keepParts, box(1.8, 9, 1.8), "cream", 3.3, 5.6, -3.3);
  add(keepParts, box(2.1, 0.3, 2.1), "sand", 3.3, 10.25, -3.3);
  add(keepParts, roof(1.55, 2.6), "rose", 3.3, 11.7, -3.3);
  for (const y of [4.2, 6.6, 8.6]) {
    add(keepParts, box(0.3, 0.9, 0.12), "glow", 3.3, y, -2.38);
    add(keepParts, box(0.12, 0.9, 0.3), "glow", 4.22, y, -3.3);
  }

  // short turret, domed
  add(keepParts, box(1.4, 5, 1.4), "peach", -3.5, 3.6, 3.5);
  add(keepParts, box(1.7, 0.25, 1.7), "cream", -3.5, 6.2, 3.5);
  add(keepParts, dome(0.8), "teal", -3.5, 6.3, 3.5);

  // stair climbing the east side to the first roof
  for (let i = 0; i < 8; i++) {
    const h = (i + 1) * 0.5;
    add(keepParts, box(1.3, h, 0.85), i % 2 ? "sand" : "cream", 3.55, 1.1 + h / 2, 3.6 - i * 0.85);
  }

  // cantilevered walkway off the west roof, ending in a gate
  add(keepParts, box(5.2, 0.5, 1.3), "cream", -5.2, 5.3, 0);
  add(keepParts, box(0.6, 2.4, 0.6), "rose", -6.9, 3.85, 0);
  const postG = box(0.32, 1.7, 0.32);
  add(keepParts, postG, "sand", -7.4, 6.4, -0.5);
  add(keepParts, postG, "sand", -7.4, 6.4, 0.5);
  add(keepParts, box(0.5, 0.3, 1.5), "coral", -7.4, 7.4, 0);
  // a small figure, for scale
  add(keepParts, facet(new THREE.ConeGeometry(0.17, 0.5, 6)), "cream", -6.2, 5.8, 0.2);
  add(keepParts, facet(new THREE.IcosahedronGeometry(0.11, 0)), "cream", -6.2, 6.12, 0.2);

  const keep = pair(keepParts);
  const KEEP_Y = 7, KX = 0, KZ = 0;

  /* ---- drift isle ---- */
  const isleParts: Part[] = [];
  add(isleParts, rockCone(3.1, 3.4, 0.35), "rock");
  add(isleParts, box(4.3, 0.6, 4.3), "sand", 0, 0.3, 0);
  add(isleParts, box(1.6, 3.6, 1.6), "rose", 0.6, 2.4, -0.4);
  add(isleParts, box(1.9, 0.25, 1.9), "cream", 0.6, 4.32, -0.4);
  add(isleParts, dome(0.75), "teal", 0.6, 4.45, -0.4);
  add(isleParts, box(0.35, 0.8, 0.12), "glow", 0.6, 2.9, 0.42);
  add(isleParts, box(0.35, 1.4, 0.35), "sand", -1.1, 1.3, 1.1);
  add(isleParts, facet(new THREE.IcosahedronGeometry(0.85, 0), 0.1), "leaf", -1.1, 2.5, 1.1);
  const isle = pair(isleParts);
  const IX = -12, IZ = -7, ISLE_Y = 9.5;

  /* ---- mesas on the horizon, standing in the water ---- */
  const mesaParts: Part[] = [];
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + rnd() * 0.4, r = 85 + rnd() * 35;
    const h = 9 + rnd() * 16, w = 3.5 + rnd() * 6;
    const g = facet(new THREE.CylinderGeometry(w * 0.82, w, h, 6, 2), 0.8);
    add(mesaParts, g, rnd() > 0.5 ? "mesa" : "mesa2", Math.cos(a) * r, h / 2 - 1, Math.sin(a) * r, 0, rnd() * 3);
    if (rnd() > 0.5) {
      const bh = h * (0.7 + rnd() * 0.5), ba = a + 0.05 + rnd() * 0.05;
      add(mesaParts, facet(new THREE.CylinderGeometry(1.2, 2, bh, 5), 0.3), "mesa2", Math.cos(ba) * (r - 6), bh / 2 - 1, Math.sin(ba) * (r - 6));
    }
  }
  pair(mesaParts);

  /* ---- floating stones ---- */
  const stoneG = box(0.7, 0.7, 0.7);
  const stones = Array.from({ length: 7 }, (_, i) => {
    const a = (i / 7) * Math.PI * 2 + rnd(), r = 8 + rnd() * 6;
    const x = Math.cos(a) * r, z = Math.sin(a) * r, y = 4 + rnd() * 9, s = 0.5 + rnd() * 0.9;
    const key: Key = i % 3 === 0 ? "teal" : i % 3 === 1 ? "cream" : "peach";
    const up = mesh(stoneG, P[key], scene, x, y, z);
    const down = mesh(stoneG, PR[key], scene, x, -y, z);
    up.scale.setScalar(s);
    down.scale.set(s, -s, s);
    return { up, down, y, ph: rnd() * 6 };
  });

  /* ---- water, moon and its reflection ---- */
  const waterGeo = new THREE.PlaneGeometry(320, 320, 64, 64);
  waterGeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(waterGeo, new THREE.ShaderMaterial({
    vertexShader: WATER_V,
    fragmentShader: WATER_F,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uSnap: U.uSnap, uTime: U.uTime, uFogColor: U.uFogColor, uZen: U.uZen, uAccent: U.uAccent, uAccent2: U.uAccent2,
      uFogNear: U.uFogNear, uFogFar: U.uFogFar,
    },
  }));
  scene.add(water);

  const moonGeo = facet(new THREE.IcosahedronGeometry(6, 1), 0.5);
  const moon = mesh(moonGeo, M.moon, scene, -55, 34, -80);
  const moonDown = mesh(moonGeo, M.moon, scene, -55, -34, -80);

  /* ---- motes: lantern sparks drifting up around the keep ---- */
  const NM = 80, mp = new Float32Array(NM * 3);
  for (let i = 0; i < NM; i++) {
    const ma = rnd() * 6.28, mr = 3 + rnd() * 12;
    mp[i * 3] = Math.cos(ma) * mr;
    mp[i * 3 + 1] = 1 + rnd() * 14;
    mp[i * 3 + 2] = Math.sin(ma) * mr;
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute("position", new THREE.BufferAttribute(mp, 3));
  const moteMat = new THREE.PointsMaterial({ color: new THREE.Color(accentHex), size: 1, sizeAttenuation: false });
  scene.add(new THREE.Points(moteGeo, moteMat));
  const moteBase = mp.slice();

  const float = (g: { up: THREE.Group; down: THREE.Group }, x: number, y: number, z: number, ry: number) => {
    g.up.position.set(x, y, z);
    g.down.position.set(x, -y, z);
    g.up.rotation.y = g.down.rotation.y = ry;
  };

  return {
    scene, cam, fog: [22, 115], fov: [64, 74], moteMat,
    labels: [
      { name: "Hanging keep", sub: "", sub2: () => `${(keep.up.position.y - 5.5).toFixed(1)} m above water`, at: (v) => { v.set(-2.6, 4, 2.6); keep.up.localToWorld(v); } },
      { name: "Lantern spire", sub: "lit", at: (v) => { v.set(0, ORB_Y + 0.8, 0); keep.up.localToWorld(v); } },
      { name: "Drift isle", sub: "untethered", at: (v) => { v.set(0.6, 5.6, -0.4); isle.up.localToWorld(v); } },
    ],
    update(t) {
      float(keep, KX, KEEP_Y + Math.sin(t * 0.5) * 0.35, KZ, 0);
      float(isle, IX, ISLE_Y + Math.sin(t * 0.42 + 1.7) * 0.6, IZ, 0.4 + Math.sin(t * 0.08) * 0.15);
      for (const s of stones) {
        const y = s.y + Math.sin(t * 0.6 + s.ph) * 0.5;
        s.up.position.y = y;
        s.down.position.y = -y;
        s.up.rotation.set(t * 0.2 + s.ph, t * 0.3, 0);
        s.down.rotation.copy(s.up.rotation);
      }
      const a = 0.9 + t * 0.03 + view.px * 0.15, r = 27 + Math.sin(t * 0.06) * 1.5;
      cam.position.set(Math.cos(a) * r, 3.2 + Math.sin(t * 0.1) * 0.4 - view.py * 0.8, Math.sin(a) * r);
      cam.lookAt(0, 7.5 - view.py * 1.5, 0);
      sky.position.copy(cam.position);
      moon.rotation.y = moonDown.rotation.y = t * 0.01;
      for (let i = 0; i < NM; i++) {
        mp[i * 3 + 1] = moteBase[i * 3 + 1] + ((t * 0.12 + i * 0.37) % 3);
        mp[i * 3] = moteBase[i * 3] + Math.sin(t * 0.3 + i) * 0.3;
      }
      moteGeo.attributes.position.needsUpdate = true;
    },
    readout() {
      const p = cam.position;
      return [
        ["Lat", k.dms(36.9983 - p.z * 0.00009, "N", "S", 2)],
        ["Lon", k.dms(-110.0985 + p.x * 0.00013, "E", "W", 3)],
        ["Elev", `${Math.round(1612 + p.y * 3.1)} m`],
        ["Brg", `${k.pad(Math.round(k.bearing(cam)), 3)}°`],
        ["Grid", k.gridRef(p.x, p.z, 30)],
      ];
    },
  };
}
