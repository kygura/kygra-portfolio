/** Sheet 08 · Drifter: a cloaked wanderer on a ledge over azure wetlands, a fallen titan's skull, ribs and raised hand in the water, aqua crystal through the bone, neon pink trees, a glyph monolith and mesas under a peach-to-indigo dusk. After Hyper Light Drifter: deep blue grass, pink foliage, hardlight cyan, soft gradient light. The palette is the scene's own, so it keeps its colours under every accent. */
import * as THREE from "three";
import { burst, pulse, type PsxKit, type SceneDef, type V3 } from "./psx";

// Sky stops, horizon to zenith, and the haze far things sink into.
const SKY = { low: "#b77a98", hor: "#f6a8a0", mid: "#8c4f8e", zen: "#251f4c" };
const HAZE = "#c27f98";
const CYAN = "#5ff2e0";
const PINK = "#ff4f86";

const SKY_V = `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SKY_F = `
uniform float uTime; uniform vec3 uSun; uniform vec3 uLow; uniform vec3 uHor; uniform vec3 uMid; uniform vec3 uZen; varying vec3 vDir;
float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h1(i), h1(i + vec2(1.0, 0.0)), f.x), mix(h1(i + vec2(0.0, 1.0)), h1(i + vec2(1.0, 1.0)), f.x), f.y); }
void main(){
  vec3 d = normalize(vDir); float h = d.y;
  vec3 c = mix(uHor, uMid, smoothstep(0.0, 0.3, h));
  c = mix(c, uZen, smoothstep(0.26, 0.9, h));
  c = mix(c, uLow, smoothstep(0.0, -0.08, h));
  float s = max(dot(d, uSun), 0.0);
  c += vec3(1.0, 0.86, 0.72) * (pow(s, 28.0) * 0.55 + pow(s, 5.0) * 0.16);
  // long flat cloud bars low over the horizon, lit pale on the sun side
  vec2 q = vec2(atan(d.z, d.x) * 3.0 + uTime * 0.004, h * 26.0);
  float cl = smoothstep(0.58, 0.8, vn(q * vec2(1.0, 0.5)) * 0.65 + vn(q * 2.3) * 0.35) * smoothstep(0.03, 0.1, h) * smoothstep(0.34, 0.14, h);
  c = mix(c, mix(vec3(0.83, 0.5, 0.64), vec3(1.0, 0.85, 0.8), pow(s, 3.0)), cl * 0.55);
  float st = step(0.997, h1(floor(d.xz * 220.0) + floor(d.y * 220.0))) * smoothstep(0.5, 0.85, h) * (0.5 + 0.5 * sin(uTime * 1.3 + d.x * 90.0));
  gl_FragColor = vec4(c + st * 0.5, 1.0);
}`;

export function buildDrifter(k: PsxKit): SceneDef {
  const { rnd, facet, mesh, psx, tex, view } = k;
  const { add, flush } = k.batcher();
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 520);

  /* ---- own palette: these uniforms replace the shared accent and fog on every material here ---- */
  const FOG = { value: new THREE.Color(HAZE) };
  const GLOW = { value: new THREE.Color(CYAN) };
  const ROSE = { value: new THREE.Color(PINK) };
  const hm = (o: Parameters<typeof psx>[0], glow = GLOW) => {
    const m = psx({ amb: "#4a3f6e", sun: "#ffd6b6", ...o });
    m.uniforms.uFogColor = FOG;
    m.uniforms.uAccent = glow;
    m.uniforms.uAccent2 = ROSE;
    return m;
  };
  const mat = {
    rock: hm({ map: tex.tStone, tint: "#b2a2d0" }),
    rock2: hm({ map: tex.tStone, tint: "#8a7cb0", uv: 1.5 }),
    grass: hm({ map: tex.tPlain, tint: "#4aa8bc", amb: "#3a4a78" }),
    grass2: hm({ map: tex.tPlain, tint: "#3a8aa6", amb: "#3a4a78" }),
    water: hm({ map: tex.tPlain, tint: "#58c4d6", amb: "#6a86c0", sun: "#fff4ec", emit: 0.04 }),
    bone: hm({ map: tex.tStone, tint: "#f4e6d8", amb: "#5c4c80", uv: 0.6 }),
    moss: hm({ map: tex.tPlain, tint: "#52b4a4", amb: "#3a4a78" }),
    trunk: hm({ map: tex.tBark, tint: "#a07aa8", amb: "#3a2c50" }),
    leaf: [
      hm({ map: tex.tPlain, tint: "#ff5a8c", amb: "#7a3a78" }),
      hm({ map: tex.tPlain, tint: "#ff86a8", amb: "#7a3a78" }),
      hm({ map: tex.tPlain, tint: "#e0407e", amb: "#6a3070" }),
    ],
    crystal: hm({ map: tex.tPlain, tint: "#2a7a84", amb: "#5a8fb0", sun: "#c8fff4", emit: 0.5, fogAmt: 0.55 }),
    mesa: hm({ map: tex.tStone, tint: "#a894c8", amb: "#584a84", uv: 3 }),
    mesaTop: hm({ map: tex.tPlain, tint: "#5ab0c0", amb: "#4a5a88" }),
    fall: hm({ map: tex.tWater, tint: "#f0ffff", amb: "#c0d8f0", sun: "#ffffff", emit: 0.12 }),
    obelisk: hm({ map: tex.tStone, tint: "#4a4470", amb: "#2c2848", sun: "#9a8ab0" }),
    cloak: hm({ map: tex.tPlain, tint: "#ff3a5a", amb: "#7a2848", sun: "#ffd0c0" }),
    cape: hm({ map: tex.tPlain, tint: "#d02a50", amb: "#6a2040", sun: "#ffc8c0", side: THREE.DoubleSide }),
    under: hm({ map: tex.tPlain, tint: "#34477c", amb: "#283460" }),
    scarf: hm({ map: tex.tPlain, tint: "#9adcf0", amb: "#4a6a9a" }),
    blade: hm({ map: tex.tPlain, tint: "#000000", emit: 1, fogAmt: 0 }),
    sprite: hm({ map: tex.tPlain, tint: "#ecebf4", amb: "#8a88b0", emit: 0.08 }),
    eye: hm({ map: tex.tPlain, tint: "#1a1430", emit: 0.06, fogAmt: 0.4 }, ROSE),
  };
  const leaf = () => mat.leaf[Math.floor(rnd() * 3)];
  const blob = [0, 1, 2].map((i) => facet(new THREE.IcosahedronGeometry(1, 0), 0.22 + i * 0.06));
  const up = new THREE.Vector3(0, 1, 0);
  // Strut from a to b.
  const bar = (a: V3, b: V3, r0: number, r1 = r0, n = 5) => {
    const g = new THREE.CylinderGeometry(r1, r0, a.distanceTo(b), n, 1);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, b.clone().sub(a).normalize()));
    g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    return facet(g, r0 * 0.3);
  };
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  // Round pink canopy on a crooked trunk; `s` scales the whole tree.
  const tree = (x: number, y: number, z: number, s: number) => {
    const lean = (rnd() - 0.5) * 0.5, top = v(x + lean * s, y + 2.4 * s, z + (rnd() - 0.5) * 0.4 * s);
    add(bar(v(x, y - 0.3, z), top, 0.2 * s, 0.12 * s), mat.trunk);
    for (let i = 0; i < 4; i++) {
      const r = (0.8 + rnd() * 0.6) * s, a = rnd() * 6.28, d = i ? 0.9 * s : 0;
      add(blob[i % 3], leaf(), top.x + Math.cos(a) * d, top.y + (i ? -0.2 : 0.5) * s + rnd() * 0.4 * s, top.z + Math.sin(a) * d, rnd() * 3, rnd() * 3, 0, r);
    }
  };
  const shard = (x: number, y: number, z: number, h: number, rx = 0, rz = 0) =>
    add(facet(new THREE.ConeGeometry(h * 0.16, h, 5), 0.04 * h), mat.crystal, x, y + h * 0.4, z, rx, rnd() * 3, rz);
  const cluster = (x: number, y: number, z: number, s: number) => {
    shard(x, y, z, 3 * s);
    for (let i = 0; i < 4; i++) {
      const a = rnd() * 6.28;
      shard(x + Math.cos(a) * 0.5 * s, y, z + Math.sin(a) * 0.5 * s, (1 + rnd() * 1.4) * s, Math.sin(a) * 0.5, -Math.cos(a) * 0.5);
    }
  };

  /* ---- sky: peach horizon, mauve, indigo zenith; a low sun ahead and to the left ---- */
  const SUN = v(-0.3, 0.12, -1).normalize();
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTime: k.U.uTime, uSun: { value: SUN },
      uLow: { value: new THREE.Color(SKY.low) }, uHor: { value: new THREE.Color(SKY.hor) },
      uMid: { value: new THREE.Color(SKY.mid) }, uZen: { value: new THREE.Color(SKY.zen) },
    },
    vertexShader: SKY_V,
    fragmentShader: SKY_F,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(200, 24, 16), skyMat);
  sky.renderOrder = -1;
  scene.add(sky);
  const sunPos = SUN.clone().multiplyScalar(420);
  const sun = k.sunDisc(scene, sunPos.x, sunPos.y, sunPos.z, 20, "#fff0dc", "#ffb0a0");

  /* ---- the ledge: a lavender cliff with a deep blue grass top, sheer to the water ---- */
  const WL = -10, EDGE = -3;
  add(facet(new THREE.BoxGeometry(16, 10.4, 12, 4, 4, 4), 0.5), mat.rock, 0, WL / 2 - 0.2, EDGE + 6);
  add(facet(new THREE.BoxGeometry(15.4, 0.4, 11.4, 5, 1, 5), 0.18), mat.grass, 0, 0.0, EDGE + 6.1);
  for (let i = 0; i < 9; i++) {
    const x = -7 + i * 1.8 + (rnd() - 0.5), s = 1 + rnd() * 1.6;
    add(blob[i % 3], i % 2 ? mat.rock2 : mat.rock, x, WL + 1 + rnd() * 5, EDGE - 0.4 - rnd() * 1.2, rnd() * 3, rnd() * 3, 0, s);
  }
  add(blob[1], mat.rock2, 2.6, -0.1, EDGE + 0.4, 0, 0.6, 0, 0.9);
  add(blob[2], mat.rock, -3.4, -0.2, EDGE + 1.2, 0, 1.4, 0, 0.7);
  const tuft = facet(new THREE.ConeGeometry(0.08, 0.32, 3));
  for (let i = 0; i < 90; i++) {
    const x = (rnd() - 0.5) * 14, z = EDGE + 0.3 + rnd() * 10;
    add(tuft, rnd() > 0.5 ? mat.grass : mat.grass2, x, 0.32, z, (rnd() - 0.5) * 0.4, 0, (rnd() - 0.5) * 0.4);
  }
  tree(-6.4, 0.2, -2.2, 0.95);
  tree(5.6, 0.2, -2.5, 0.7);
  tree(6.6, 0.2, 1.5, 1.1);
  cluster(-3.0, 0.1, -2.2, 0.45);
  cluster(3.5, 0.1, 1.5, 0.3);

  // four-point flowers across the grass
  const NF = 70, fp = new Float32Array(NF * 3);
  for (let i = 0; i < NF; i++) {
    fp[i * 3] = (rnd() - 0.5) * 14;
    fp[i * 3 + 1] = 0.28;
    fp[i * 3 + 2] = EDGE + 0.3 + rnd() * 10;
  }
  const flowerGeo = new THREE.BufferGeometry();
  flowerGeo.setAttribute("position", new THREE.BufferAttribute(fp, 3));
  const flowers = new THREE.Points(flowerGeo, new THREE.PointsMaterial({ color: "#ffd2e2", size: 2, sizeAttenuation: false }));
  scene.add(flowers);

  /* ---- the titan: skull, spine and ribcage lying in the water, one hand still raised ---- */
  const SK = v(17, WL, -70);
  // Built facing local +z in its own group, then turned toward the ledge and tipped onto its cheek.
  const skull = new THREE.Group();
  skull.position.copy(SK);
  skull.rotation.set(0.12, -0.45, 0.2);
  skull.scale.setScalar(1.3);
  scene.add(skull);
  const sb = k.batcher();
  sb.add(facet(new THREE.IcosahedronGeometry(1, 1).scale(6, 4.8, 6.2), 0.5), mat.bone, 0, 3.2, -1);
  sb.add(facet(new THREE.BoxGeometry(8.4, 2.2, 3, 2, 1, 1), 0.3), mat.bone, 0, 4.4, 4.2);
  sb.add(facet(new THREE.BoxGeometry(6.4, 3.6, 4.4, 2, 2, 2), 0.4), mat.bone, 0, 1.2, 4.6);
  sb.add(facet(new THREE.BoxGeometry(1.4, 1.1, 0.6)), mat.under, 0, 1.4, 6.8);
  sb.add(facet(new THREE.BoxGeometry(5.6, 1.6, 4.6, 2, 1, 2), 0.3), mat.bone, 0.4, -0.8, 4.8, 0.25, 0, 0);
  for (let i = 0; i < 5; i++) sb.add(facet(new THREE.BoxGeometry(0.6, 0.9, 0.5)), mat.bone, -2.2 + i * 1.1, 0.0, 6.9);
  sb.flush(skull);
  const eyes = [-1, 1].map((s) => mesh(facet(new THREE.BoxGeometry(2.1, 1.7, 0.8)), mat.eye, skull, s * 2.3, 3.0, 5.4));
  skull.updateMatrixWorld();
  const eyeAt = skull.localToWorld(v(-2.3, 3.0, 6.4));
  add(blob[0], mat.moss, SK.x - 1, SK.y + 9.4, SK.z - 2, 0, 0, 0, 5);
  add(blob[2], mat.moss, SK.x + 4.5, SK.y + 8.2, SK.z - 3.5, 0, 1, 0, 3.4);
  tree(SK.x - 2, SK.y + 12.6, SK.z - 2.5, 1.7);
  tree(SK.x + 4, SK.y + 10.8, SK.z - 4, 1.2);
  cluster(SK.x + 1.5, SK.y + 10, SK.z + 1, 2.4);
  const SP0 = v(9, WL, -77), SP1 = v(-28, WL, -94), spine = SP1.clone().sub(SP0), ribYaw = Math.atan2(spine.x, spine.z);
  for (let i = 0; i <= 10; i++) {
    const p = SP0.clone().addScaledVector(spine, i / 10);
    add(facet(new THREE.BoxGeometry(2.2, 1.6, 2.6), 0.3), mat.bone, p.x, WL + 0.2, p.z, 0, ribYaw + rnd() * 0.3, 0);
  }
  for (let i = 0; i < 8; i++) {
    const f = 0.06 + i * 0.12, p = SP0.clone().addScaledVector(spine, f), r = 9.5 - i * 0.75;
    const arc = Math.PI * (rnd() > 0.35 ? 0.9 + rnd() * 0.1 : 0.45 + rnd() * 0.2), flip = rnd() > 0.5 ? Math.PI - arc : 0;
    const g = facet(new THREE.TorusGeometry(r, 0.42 + r * 0.03, 4, 12, arc).rotateZ(flip), 0.15);
    add(g, mat.bone, p.x, WL - 0.6, p.z, 0, ribYaw, (rnd() - 0.5) * 0.2);
    if (i % 3 === 1) cluster(p.x + Math.cos(ribYaw) * r * 0.6, WL + r * 0.6, p.z - Math.sin(ribYaw) * r * 0.6, 1.2);
  }
  // forearm out of the water, fingers curled toward the sky
  const EL = v(-13, WL - 1, -50), WR = v(-10, WL + 11, -54);
  add(bar(EL, WR, 1.5, 1.1, 6), mat.bone);
  add(facet(new THREE.BoxGeometry(3.4, 2.6, 1.4), 0.3), mat.bone, WR.x, WR.y + 1, WR.z, 0.1, 0.3, -0.15);
  for (let i = 0; i < 4; i++) {
    const b = v(WR.x - 1.3 + i * 0.9, WR.y + 2.2, WR.z), m1 = v(b.x - 0.2, b.y + 2.0 + (i % 3) * 0.3, b.z + 0.6), tip = v(m1.x - 0.1, m1.y + 0.9, m1.z + 1.4);
    add(bar(b, m1, 0.38, 0.32), mat.bone);
    add(bar(m1, tip, 0.32, 0.22), mat.bone);
  }
  add(bar(v(WR.x + 1.6, WR.y + 0.8, WR.z), v(WR.x + 2.8, WR.y + 2.4, WR.z + 0.8), 0.4, 0.3), mat.bone);
  add(blob[1], mat.moss, EL.x + 0.6, WL + 2.4, EL.z - 0.6, 0, 0, 0, 1.8);
  cluster(WR.x - 0.2, WR.y + 2.6, WR.z - 0.3, 0.7);

  /* ---- small islands of blue grass and pink trees ---- */
  for (let i = 0; i < 9; i++) {
    const x = -70 + i * 17 + (rnd() - 0.5) * 8, z = -24 - rnd() * 110;
    if (Math.hypot(x - SK.x, z - SK.z) < 16 || Math.hypot(x + 10, z + 85) < 22) continue;
    const s = 2 + rnd() * 3;
    add(blob[i % 3], mat.rock2, x, WL - s * 0.35, z, 0, rnd() * 3, 0, s);
    add(facet(new THREE.CylinderGeometry(s * 0.75, s * 0.85, 0.4, 7), 0.2), mat.grass, x, WL + s * 0.5, z);
    tree(x + (rnd() - 0.5) * s * 0.6, WL + s * 0.55, z, 0.9 + rnd() * 0.7);
    if (rnd() > 0.5) cluster(x + s * 0.4, WL + s * 0.5, z + s * 0.2, 0.6 + rnd() * 0.5);
  }

  /* ---- mesas on the horizon, two with waterfalls ---- */
  for (let i = 0; i < 11; i++) {
    const a = -1.25 + i * 0.24 + (rnd() - 0.5) * 0.1, d = 170 + rnd() * 60, x = Math.sin(a) * d, z = -Math.cos(a) * d;
    const w = 30 + rnd() * 30, h = 18 + rnd() * 26;
    add(facet(new THREE.CylinderGeometry(w * 0.48, w * 0.6, h, 7, 3), 0.9), mat.mesa, x, WL + h / 2 - 2, z, 0, rnd() * 3, 0);
    add(facet(new THREE.CylinderGeometry(w * 0.5, w * 0.48, 1.2, 7), 0.4), mat.mesaTop, x, WL + h - 2.2, z, 0, rnd() * 3, 0);
    if (i === 3 || i === 7) {
      const fx = x + Math.sin(a + Math.PI) * w * 0.47, fz = z - Math.cos(a + Math.PI) * w * 0.47;
      add(facet(new THREE.BoxGeometry(2.6, h - 1, 0.3)), mat.fall, fx, WL + (h - 1) / 2 - 2, fz, 0, -a, 0);
    }
  }

  /* ---- monolith: a leaning obelisk cut with glyph bands ---- */
  const MO = v(-44, WL, -140), MH = 52;
  const mono = new THREE.Group();
  mono.position.copy(MO);
  mono.rotation.set(0.04, 0.35, -0.07);
  scene.add(mono);
  mesh(facet(new THREE.BoxGeometry(5, MH, 3.4, 1, 6, 1), 0.3), mat.obelisk, mono, 0, MH / 2 - 3, 0);
  mesh(facet(new THREE.ConeGeometry(3.2, 5, 4).rotateY(Math.PI / 4), 0.2), mat.obelisk, mono, 0, MH - 0.5, 0);
  const runes = Array.from({ length: 6 }, (_, i) => {
    const m = hm({ map: tex.tPlain, tint: "#000000", emit: 0.35, fogAmt: 0.35 });
    mesh(facet(new THREE.BoxGeometry(2.6, 0.7, 0.2)), m, mono, 0, 12 + i * 6.2, 1.75);
    return m;
  });
  flush(scene);

  /* ---- the sea: a grid denser near the ledge, displaced every frame ---- */
  const wave = (x: number, z: number, t: number) =>
    0.12 * Math.sin(x * 0.18 + z * 0.07 + t * 0.5) + 0.07 * Math.sin(z * 0.23 - x * 0.11 - t * 0.42) + 0.03 * Math.sin((x + z) * 0.6 + t * 1.1);
  const WN = 64, WH = 420, WCX = 0, WCZ = -8;
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
    wuv.setXY(i, wx[i] / 7, wz[i] / 7);
  }
  mesh(water, mat.water, scene, 0, WL).frustumCulled = false;

  // glitter on the water along the line to the sun
  const NG = 150, gp = new Float32Array(NG * 3), gBase: number[] = [];
  for (let i = 0; i < NG; i++) {
    const d = 14 + Math.pow(rnd(), 0.6) * 260, w = (rnd() - 0.5) * (1 + d * 0.12);
    const ux = SUN.x / Math.hypot(SUN.x, SUN.z), uz = SUN.z / Math.hypot(SUN.x, SUN.z);
    gBase.push(ux * d - uz * w, 2 + uz * d + ux * w);
  }
  const glintGeo = new THREE.BufferGeometry();
  glintGeo.setAttribute("position", new THREE.BufferAttribute(gp, 3));
  const glints = new THREE.Points(glintGeo, new THREE.PointsMaterial({ color: "#ffe6d8", size: 1, sizeAttenuation: false }));
  glints.frustumCulled = false;
  scene.add(glints);

  /* ---- sunbeams: faint slanted shafts falling over the water ---- */
  const beamGeo = new THREE.PlaneGeometry(1, 1);
  const beams = Array.from({ length: 6 }, (_, i) => {
    const m = new THREE.MeshBasicMaterial({ color: "#ffd8c8", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const b = mesh(beamGeo, m, scene, -40 + i * 15 + rnd() * 6, 20, -40 - i * 9 - rnd() * 10, 0, 0, 0.42);
    b.scale.set(3 + rnd() * 5, 140, 1);
    return { m, ph: rnd() * 6.28, sp: 0.15 + rnd() * 0.2, o: 0.035 + rnd() * 0.035 };
  });

  /* ---- the drifter: hooded, cloak and cape, hardlight blade low at the side; local -z is where they look ---- */
  const DX = -0.9, DZ = -1.7;
  const drifter = new THREE.Group();
  drifter.position.set(DX, 0.2, DZ);
  drifter.rotation.y = -0.18;
  scene.add(drifter);
  const da = k.batcher();
  for (const s of [-1, 1]) da.add(facet(new THREE.BoxGeometry(0.1, 0.34, 0.12)), mat.under, s * 0.1, 0.17, 0);
  da.add(facet(new THREE.ConeGeometry(0.34, 0.86, 7)), mat.cloak, 0, 0.72, 0);
  da.add(facet(new THREE.CylinderGeometry(0.2, 0.3, 0.16, 7)), mat.cloak, 0, 1.02, 0);
  da.add(facet(new THREE.CylinderGeometry(0.15, 0.17, 0.1, 7)), mat.scarf, 0, 1.12, 0);
  da.add(facet(new THREE.IcosahedronGeometry(0.17, 0)), mat.cloak, 0, 1.28, 0.01, 0, 0, 0, 1);
  da.add(facet(new THREE.ConeGeometry(0.08, 0.22, 4)), mat.cloak, 0, 1.38, 0.12, 0.9, 0, 0);
  da.add(facet(new THREE.BoxGeometry(0.2, 0.1, 0.04)), mat.under, 0, 1.26, -0.15);
  da.add(facet(new THREE.BoxGeometry(0.08, 0.36, 0.1)), mat.cloak, 0.3, 0.86, -0.02, 0, 0, 0.25);
  da.flush(drifter);
  const cape = new THREE.Group();
  cape.position.set(0, 1.1, 0.1);
  drifter.add(cape);
  mesh(facet(new THREE.PlaneGeometry(0.5, 0.82, 1, 2).translate(0, -0.41, 0), 0.03), mat.cape, cape);
  const scarf = new THREE.Group();
  scarf.position.set(-0.12, 1.12, 0.12);
  drifter.add(scarf);
  mesh(facet(new THREE.BoxGeometry(0.06, 0.04, 0.5).translate(0, 0, 0.25)), mat.scarf, scarf);
  const blade = new THREE.Group();
  blade.position.set(0.36, 0.72, -0.06);
  blade.rotation.set(-0.5, 0, 0.18);
  drifter.add(blade);
  mesh(facet(new THREE.BoxGeometry(0.035, 0.66, 0.05).translate(0, -0.33, 0)), mat.blade, blade);
  mesh(facet(new THREE.BoxGeometry(0.12, 0.04, 0.06)), mat.under, blade);

  // Additive glow disc in a fixed colour; the caller faces it to the camera and drives the opacity.
  const glow = (parent: THREE.Object3D, x: number, y: number, z: number, r: number, color: string) => {
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    [r, r * 2.4].forEach((rr, i) => {
      const c = new THREE.Mesh(new THREE.CircleGeometry(rr, 12), m);
      c.position.z = -i * 0.05;
      g.add(c);
    });
    return { g, m };
  };
  const bladeGlow = glow(blade, 0, -0.4, 0, 0.12, CYAN);

  // the sprite companion: a small floating diamond that keeps by the shoulder
  const sprite = mesh(facet(new THREE.OctahedronGeometry(0.1, 0)), mat.sprite, scene);
  sprite.scale.set(1, 1.4, 1);
  const spriteGlow = glow(scene, 0, 0, 0, 0.04, "#ffffff");
  const eyeGlow = glow(scene, eyeAt.x, eyeAt.y, eyeAt.z, 2.6, PINK);

  // petals on the wind
  const NP = 120, pp = new Float32Array(NP * 3), pBase = new Float32Array(NP * 3);
  for (let i = 0; i < NP; i++) {
    pBase[i * 3] = rnd() * 60;
    pBase[i * 3 + 1] = -7 + rnd() * 14;
    pBase[i * 3 + 2] = 4 - rnd() * 44;
  }
  const petalGeo = new THREE.BufferGeometry();
  petalGeo.setAttribute("position", new THREE.BufferAttribute(pp, 3));
  const petals = new THREE.Points(petalGeo, new THREE.PointsMaterial({ color: "#ff8fb4", size: 2, sizeAttenuation: false }));
  petals.frustumCulled = false;
  scene.add(petals);

  // easter eggs: start times
  let tBlade = -99, tSprite = -99, tEye = -99, tRune = -99;
  const PIVOT = v(DX, 1.0, DZ);
  const sp = new THREE.Vector3();

  return {
    scene, cam, fog: [18, 240], fov: [58, 72], limits: { pitch: [-0.22, 0.45], zoom: [0.75, 2.4], yaw: 1.0 },
    labels: [
      { name: "Titan", sub: "fallen, overgrown", at: (p) => { p.set(SK.x, SK.y + 17, SK.z); } },
      { name: "Drifter", sub: "blade drawn", at: (p) => { p.set(DX, 1.8, DZ); } },
      { name: "Monolith", sub: "glyphs still lit", at: (p) => { p.set(MO.x, MO.y + MH + 4, MO.z); } },
    ],
    eggs: [
      { id: "drifter-blade", r: 40, at: (p) => { p.set(DX, 0.8, DZ); }, fire: (t) => { tBlade = t; } },
      { id: "drifter-sprite", r: 28, at: (p) => { p.copy(sprite.position); }, fire: (t) => { tSprite = t; } },
      { id: "drifter-titan", r: 48, at: (p) => { p.copy(eyeAt); }, fire: (t) => { tEye = t; } },
      { id: "drifter-monolith", r: 44, at: (p) => { p.set(MO.x, MO.y + 16, MO.z); }, fire: (t) => { tRune = t; } },
    ],
    update(t) {
      for (let i = 0; i < wpos.count; i++) wpos.setY(i, wave(wx[i], wz[i], t));
      wpos.needsUpdate = true;
      water.computeVertexNormals();

      // the wind: cape and scarf lift and fall, the trees' petals ride it
      const gust = 0.5 + 0.5 * Math.sin(t * 0.37);
      cape.rotation.x = 0.28 + 0.16 * gust + Math.sin(t * 2.6) * 0.06;
      cape.rotation.z = Math.sin(t * 1.7) * 0.05;
      scarf.rotation.set(0.3 * gust + Math.sin(t * 3.1) * 0.12, 0.9 + Math.sin(t * 2.2) * 0.2, 0);

      const eb = t - tBlade;
      drifter.position.z = DZ - 0.35 * pulse(eb, 0.5);
      drifter.position.y = 0.2 + 0.12 * pulse(eb - 0.1, 0.3);
      blade.rotation.x = -0.5 - 1.6 * pulse(eb, 0.7);
      blade.scale.y = 1 + 0.5 * pulse(eb, 1.0);
      mat.blade.uniforms.uEmit.value = 1 + 1.5 * pulse(eb, 1.2) + Math.sin(t * 4.0) * 0.08;
      bladeGlow.m.opacity = 0.12 + Math.sin(t * 4.0) * 0.04 + 0.6 * pulse(eb, 1.0);
      bladeGlow.g.lookAt(cam.position);

      const es = t - tSprite, ring = pulse(es, 2.4);
      const sa = t * 0.7 + burst(es, 9, 2.4);
      sp.set(DX + 0.55 + Math.cos(sa) * 0.12 * (1 + 6 * ring), 1.5 + Math.sin(t * 1.6) * 0.07 + 0.3 * ring, DZ + 0.15 + Math.sin(sa) * 0.12 * (1 + 6 * ring));
      sprite.position.copy(sp);
      sprite.rotation.y = t * 1.2 + burst(es, 14, 2.4);
      spriteGlow.g.position.copy(sp);
      spriteGlow.m.opacity = 0.08 + 0.5 * pulse(es, 2.4);
      spriteGlow.g.lookAt(cam.position);

      const ee = t - tEye;
      mat.eye.uniforms.uEmit.value = 0.06 + 1.1 * Math.max(pulse(ee, 0.6), pulse(ee - 0.9, 1.6));
      eyeGlow.m.opacity = 0.35 * Math.max(pulse(ee, 0.6), pulse(ee - 0.9, 1.6));
      eyeGlow.g.lookAt(cam.position);
      for (const e of eyes) e.scale.setScalar(1 + 0.08 * pulse(ee - 0.9, 1.6));

      const er = t - tRune;
      runes.forEach((m, i) => { m.uniforms.uEmit.value = 0.35 + Math.sin(t * 0.8 + i) * 0.06 + 0.9 * pulse(er - i * 0.25, 0.9); });
      mat.crystal.uniforms.uEmit.value = 0.5 + Math.sin(t * 0.9) * 0.06;

      for (const b of beams) b.m.opacity = b.o * (0.6 + 0.4 * Math.sin(t * b.sp + b.ph));
      for (let i = 0; i < NG; i++) {
        const x = gBase[i * 2], z = gBase[i * 2 + 1], on = Math.sin(t * 2.1 + i * 1.73) > 0.45;
        gp[i * 3] = x;
        gp[i * 3 + 1] = on ? WL + wave(x, z, t) + 0.05 : -99;
        gp[i * 3 + 2] = z;
      }
      glintGeo.attributes.position.needsUpdate = true;
      for (let i = 0; i < NP; i++) {
        const x = ((pBase[i * 3] + t * (1.2 + gust * 1.4) + i * 0.13) % 60) - 30;
        pp[i * 3] = x;
        pp[i * 3 + 1] = pBase[i * 3 + 1] + Math.sin(t * 0.9 + i) * 0.6 - ((t * 0.15 + i * 0.07) % 3);
        pp[i * 3 + 2] = pBase[i * 3 + 2] + Math.cos(t * 0.7 + i * 2) * 0.5;
      }
      petalGeo.attributes.position.needsUpdate = true;

      const a = Math.sin(t * 0.045) * 0.12 + view.px * 0.1 + view.yaw, r = 6.6 + Math.sin(t * 0.07) * 0.3;
      cam.position.set(DX + 0.8 + Math.sin(a) * r, 2.9 + Math.sin(t * 0.13) * 0.1 - view.py * 0.4, DZ + Math.cos(a) * r);
      cam.lookAt(DX + 4 + view.px * 3, -3.5 - view.py * 2, DZ - 40);
      k.orbit(cam, PIVOT);
      sky.position.copy(cam.position);
      sun.lookAt(cam.position);
    },
    readout() {
      const p = cam.position;
      return [
        ["Lat", k.dms(-3.8814 - p.z * 0.00009, "N", "S", 2)],
        ["Lon", k.dms(117.2046 + p.x * 0.00013, "E", "W", 3)],
        ["Elev", `${Math.round(212 + p.y * 3.1)} m`],
        ["Brg", `${k.pad(Math.round(k.bearing(cam)), 3)}°`],
        ["Grid", k.gridRef(p.x, p.z, 20)],
      ];
    },
  };
}
