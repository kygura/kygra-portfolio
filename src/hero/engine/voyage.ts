/**
 * Sheet 06 · Voyage: a cel-shaded sail-ship running before the wind across a
 * bright toon sea. Islands drift past, the wake and bow spray churn white, and
 * wind lines curl overhead. Keeps its own daylight palette; the accent does
 * not tint it.
 *
 * The ship stays at the origin facing -Z; the sea scrolls under it (uScroll),
 * so the wake, spray and wind are all built in the ship's frame.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { pulse, type PsxKit, type SceneDef } from "./psx";

/* ---- palette ---- */
const C = {
  zen: "#2774d8", sky: "#5fb2f4", hor: "#d4f0ff",
  deep: "#1c56b0", mid: "#2b88d8", line: "#a4e0ff", foam: "#ffffff",
  ink: "#1a2142",
  red: "#c8382c", redDk: "#9c2a24", white: "#f4efe2", wood: "#a8663a", woodDk: "#7c4526", deck: "#e6b46c",
  gold: "#efbe4c", cream: "#fbf3dc", roof: "#c8382c", glass: "#3c74b8",
  cliff: "#dcb57a", cliffDk: "#b98a55", grass: "#62bc45", grass2: "#8bd35a", sand: "#f3dea0",
  trunk: "#a8743f", frond: "#3fa83a", rock: "#9ea4b8", tower: "#f6f1e6",
};
const SHADE = new THREE.Vector3(0.58, 0.63, 0.92);
const SPEED = 4.2; // sea units per second

/* ---- shader chunks ---- */
const SNAP = `
vec4 snap(vec4 p){ p.xy = floor(p.xy / p.w * uSnap + 0.5) / uSnap * p.w; return p; }
vec2 lowRes(){ return min(uSnap * 2.0, vec2(720.0, 405.0)); }`;
const WAVE = `
float wave(vec2 q, float t){
  return 0.30 * sin(q.x * 0.16 + q.y * 0.07 + t * 0.9) + 0.22 * sin(q.y * 0.21 - q.x * 0.09 - t * 0.7) + 0.08 * sin((q.x + q.y) * 0.45 + t * 1.6);
}`;
const NOISE = `
float h21(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec2 h22(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
}`;

const TOON_V = `
uniform vec2 uSnap;
attribute vec3 aCol;
varying vec3 vCol; varying vec3 vN; varying vec3 vWP; varying float vDepth;
${SNAP}
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix) * normal);
  vWP = wp.xyz; vCol = aCol;
  vec4 mv = viewMatrix * wp;
  vDepth = -mv.z;
  gl_Position = snap(projectionMatrix * mv);
}`;
const TOON_F = `
uniform vec3 uSun; uniform vec3 uShade; uniform vec3 uHor; uniform vec2 uFog; uniform float uSpec; uniform float uFade;
varying vec3 vCol; varying vec3 vN; varying vec3 vWP; varying float vDepth;
void main(){
  vec3 n = normalize(vN), v = normalize(cameraPosition - vWP);
  float lit = smoothstep(-0.02, 0.05, dot(n, uSun));
  vec3 c = mix(vCol * uShade, vCol, lit);
  c = mix(c, vec3(1.0), step(0.94, dot(n, normalize(uSun + v))) * uSpec * lit * 0.4);
  c += vec3(0.14, 0.16, 0.2) * smoothstep(0.6, 0.66, 1.0 - max(dot(n, v), 0.0)) * lit * uSpec;
  float f = max(smoothstep(uFog.x, uFog.y, vDepth), uFade);
  gl_FragColor = vec4(mix(c, uHor, f), 1.0);
}`;

// Inverted hull, pushed out a fixed number of low-res pixels in screen space.
const LINE_V = `
uniform vec2 uSnap; uniform float uW;
attribute vec3 aOn;
varying float vDepth;
${SNAP}
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec3 n = normalize(mat3(modelMatrix) * aOn);
  vec4 mv = viewMatrix * wp;
  vec4 p = projectionMatrix * mv;
  vec2 nd = (projectionMatrix * viewMatrix * vec4(n, 0.0)).xy;
  float l = length(nd);
  if (l > 1e-5) p.xy += nd / l * (2.0 / lowRes()) * uW * p.w;
  vDepth = -mv.z;
  gl_Position = snap(p);
}`;
const LINE_F = `
uniform vec3 uInk; uniform vec3 uHor; uniform vec2 uFog; uniform float uFade; varying float vDepth;
void main(){ gl_FragColor = vec4(mix(uInk, uHor, max(smoothstep(uFog.x, uFog.y, vDepth), uFade)), 1.0); }`;

// Sails and the pennant: billow along uDir, flat normals from derivatives, edge ink from fwidth.
const CLOTH_V = `
uniform vec2 uSnap; uniform float uTime; uniform vec3 uDir; uniform float uBulge; uniform float uFlap;
attribute float aW;
varying vec2 vUv; varying vec3 vWP; varying float vDepth;
${SNAP}
void main(){
  float s = uBulge * (1.0 + 0.07 * sin(uTime * 2.6 + uv.x * 4.0 + uv.y * 3.0)) + uFlap * sin(uv.x * 9.0 - uTime * 8.0 + uv.y * 2.0);
  vec3 p = position + uDir * aW * s;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vUv = uv; vWP = wp.xyz;
  vec4 mv = viewMatrix * wp;
  vDepth = -mv.z;
  gl_Position = snap(projectionMatrix * mv);
}`;
const CLOTH_F = `
uniform vec3 uSun; uniform vec3 uShade; uniform vec3 uCol; uniform vec3 uMark; uniform vec3 uInk; uniform float uEmblem; uniform float uTri;
varying vec2 vUv; varying vec3 vWP; varying float vDepth;
void main(){
  vec3 n = normalize(cross(dFdx(vWP), dFdy(vWP)));
  vec3 v = normalize(cameraPosition - vWP);
  if (dot(n, v) < 0.0) n = -n;
  float lit = smoothstep(-0.02, 0.05, dot(n, uSun));
  vec3 col = uCol;
  if (uEmblem > 0.0) {
    vec2 p = (vUv - vec2(0.5, 0.52)) * vec2(1.2, 1.0);
    float r = length(p);
    float ring = step(abs(r - 0.25), 0.035);
    float crest = step(r, 0.18) * step(p.y, 0.025 * sin(p.x * 34.0) - 0.01 + 0.05 * step(abs(p.x), 0.045));
    float hem = step(vUv.y, 0.06) + step(0.955, vUv.y);
    col = mix(col, uMark, clamp(ring + crest + hem, 0.0, 1.0));
  }
  // light through the cloth: the shadow side stays bright
  vec3 c = mix(col * mix(uShade, vec3(1.0), 0.55), col, lit);
  vec2 fw = fwidth(vUv) + 1e-5;
  float e = uTri > 0.0 ? min(vUv.y / fw.y, (1.0 - vUv.x - vUv.y) / max(fw.x, fw.y)) : min(min(vUv.x / fw.x, (1.0 - vUv.x) / fw.x), min(vUv.y / fw.y, (1.0 - vUv.y) / fw.y));
  if (uTri > 0.0) e = min(e, vUv.x / fw.x);
  c = mix(uInk, c, step(1.0, e));
  gl_FragColor = vec4(c, 1.0);
}`;

const WATER_V = `
uniform vec2 uSnap; uniform float uTime; uniform float uScroll;
varying vec3 vWP; varying float vDepth; varying float vH;
${SNAP}
${WAVE}
void main(){
  vec3 p = position;
  float h = wave(vec2(p.x, p.z - uScroll), uTime);
  p.y = h * (1.0 - smoothstep(70.0, 170.0, length(p.xz)));
  vH = h;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWP = wp.xyz;
  vec4 mv = viewMatrix * wp;
  vDepth = -mv.z;
  gl_Position = snap(projectionMatrix * mv);
}`;
const WATER_F = `
uniform float uTime; uniform float uScroll; uniform float uYaw; uniform vec4 uIsl[4];
uniform vec3 uDeep; uniform vec3 uMid; uniform vec3 uLine; uniform vec3 uFoam; uniform vec3 uHor;
varying vec3 vWP; varying float vDepth; varying float vH;
${NOISE}
// distance to the nearest edge of a drifting Voronoi cell
float vedge(vec2 p, float t){
  vec2 n = floor(p), f = fract(p), mg = vec2(0.0), mr = vec2(0.0);
  float md = 8.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j)), o = 0.5 + 0.42 * sin(t + 6.2831 * h22(n + g)), r = g + o - f;
    float d = dot(r, r);
    if (d < md) { md = d; mr = r; mg = g; }
  }
  md = 8.0;
  for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) {
    vec2 g = mg + vec2(float(i), float(j)), o = 0.5 + 0.42 * sin(t + 6.2831 * h22(n + g)), r = g + o - f;
    if (dot(mr - r, mr - r) > 1e-5) md = min(md, dot(0.5 * (mr + r), normalize(r - mr)));
  }
  return md;
}
void main(){
  float t = uTime;
  vec2 q = vec2(vWP.x, vWP.z - uScroll);
  vec3 c = mix(uDeep, uMid, smoothstep(-0.4, 0.5, vH));

  // the swirling white crackle that rides the swell
  vec2 wq = q * 0.1 + (vec2(vnoise(q * 0.045 + t * 0.04), vnoise(q * 0.045 + 9.1 - t * 0.035)) - 0.5) * 1.7;
  float e = vedge(wq, t * 0.35);
  float px = e / max(fwidth(e), 1e-4);
  float line = step(px, mix(1.25, 0.8, smoothstep(10.0, 50.0, vDepth))) * (1.0 - smoothstep(32.0, 72.0, vDepth));
  line *= step(0.3, vnoise(q * 0.07 + vec2(t * 0.05, 0.0)));
  c = mix(c, uLine, line);

  float foam = 0.0;
  // surf around each island
  for (int k = 0; k < 4; k++) {
    vec4 I = uIsl[k];
    if (I.w <= 0.0) continue;
    float d = length(vWP.xz - I.xy) - I.z;
    float band = step(0.55, fract(d * 0.38 - t * 0.45)) * (1.0 - smoothstep(0.0, 5.0, d)) * step(0.3, vnoise(q * 0.45));
    foam = max(foam, max(1.0 - smoothstep(0.3, 1.0, d), band) * I.w);
  }

  // the ship's frame: bow at -z, stern at +4.7
  float cs = cos(uYaw), sn = sin(uYaw);
  vec2 s = vec2(cs * vWP.x - sn * vWP.z, sn * vWP.x + cs * vWP.z);
  float ax = abs(s.x);
  float ell = length(vec2(s.x / 1.75, (s.y + 0.2) / 5.1));
  foam = max(foam, (1.0 - smoothstep(1.0, 1.16, ell)) * step(1.0, ell + 0.25) * step(0.2, vnoise(vec2(s.x * 1.3, q.y * 0.9))));
  float z = s.y - 3.4;
  if (z > 0.0) {
    // Kelvin arms
    float arm = abs(ax - (1.4 + z * 0.34));
    float aw = 0.5 + z * 0.035;
    float kel = (1.0 - smoothstep(aw * 0.5, aw, arm)) * (1.0 - smoothstep(18.0, 80.0, z)) * step(0.18 + z * 0.006, vnoise(vec2(ax * 0.6, q.y * 0.35)));
    // churned trail straight astern
    float tw = 1.0 + z * 0.06;
    float trail = (1.0 - smoothstep(tw * 0.7, tw, ax)) * (1.0 - smoothstep(8.0, 46.0, z)) * step(0.22 + z * 0.012, vnoise(vec2(s.x * 0.9, q.y * 0.55)));
    foam = max(foam, max(kel, trail));
    c = mix(c, mix(uLine, uMid, 0.3), (1.0 - smoothstep(tw, tw * 1.7, ax)) * (1.0 - smoothstep(10.0, 60.0, z)) * 0.65);
  }
  // bow wave curling off each cheek
  {
    foam = max(foam, (1.0 - smoothstep(0.0, 1.6, length(vec2(ax - 1.1, s.y + 4.3)))) * step(0.35, vnoise(vec2(s.x * 2.0, q.y * 1.4))));
  }

  c = mix(c, uFoam, foam);
  c = mix(c, uHor, smoothstep(60.0, 230.0, vDepth));
  gl_FragColor = vec4(c, 1.0);
}`;

const SKY_V = `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SKY_F = `
uniform vec3 uZen; uniform vec3 uSky; uniform vec3 uHor; uniform vec3 uSunDir; uniform float uPulse; varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 c = mix(uHor, uSky, smoothstep(0.0, 0.2, h));
  c = mix(c, uZen, smoothstep(0.2, 0.75, h));
  // the sun: a hard disc in flat rings, the way a cartoon draws it
  float a = acos(clamp(dot(d, uSunDir), -1.0, 1.0)) / (1.0 + 0.35 * uPulse);
  c = mix(c, c + vec3(0.1, 0.09, 0.04), step(a, 0.2));
  c = mix(c, c + vec3(0.12, 0.11, 0.05), step(a, 0.12));
  c = mix(c, vec3(1.0, 0.96, 0.78), step(a, 0.075));
  c = mix(c, vec3(1.0, 1.0, 0.95), step(a, 0.05));
  gl_FragColor = vec4(c, 1.0);
}`;

const PT_V = `
uniform vec2 uSnap; uniform float uK;
attribute float aSize;
${SNAP}
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = snap(projectionMatrix * mv);
  gl_PointSize = aSize <= 0.0 ? 0.0 : max(1.0, aSize * lowRes().y * 0.5 * uK / max(0.1, -mv.z));
}`;
const PT_F = `
uniform vec3 uA; uniform vec3 uB;
void main(){
  float r = length(gl_PointCoord - 0.5);
  if (r > 0.5) discard;
  gl_FragColor = vec4(r > 0.33 ? uB : uA, 1.0);
}`;

const WIND_V = `
uniform vec2 uSnap; attribute float aA; varying float vA;
${SNAP}
void main(){ vA = aA; gl_Position = snap(projectionMatrix * modelViewMatrix * vec4(position, 1.0)); }`;
const WIND_F = `varying float vA; void main(){ if (vA < 0.02) discard; gl_FragColor = vec4(1.0, 1.0, 1.0, vA); }`;

const wave = (x: number, z: number, t: number) =>
  0.3 * Math.sin(x * 0.16 + z * 0.07 + t * 0.9) +
  0.22 * Math.sin(z * 0.21 - x * 0.09 - t * 0.7) +
  0.08 * Math.sin((x + z) * 0.45 + t * 1.6);

export function buildVoyage(k: PsxKit): SceneDef {
  const { U, rnd, view } = k;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 330);
  const PIVOT = new THREE.Vector3(0, 4.5, 0);
  const SUN = new THREE.Vector3(0.55, 0.7, 0.45).normalize(); // light, from over the camera's shoulder
  const SUN_DISC = new THREE.Vector3(-0.62, 0.3, -0.72).normalize(); // where the disc hangs in the sky
  const col = (h: string) => new THREE.Color(h);
  const HOR = col(C.hor);

  /* ---- materials ---- */
  const toon = (o: { fog?: [number, number]; shade?: THREE.Vector3; spec?: number } = {}) =>
    new THREE.ShaderMaterial({
      vertexShader: TOON_V,
      fragmentShader: TOON_F,
      uniforms: {
        uSnap: U.uSnap, uSun: { value: SUN }, uShade: { value: o.shade ?? SHADE }, uHor: { value: HOR },
        uFog: { value: new THREE.Vector2(...(o.fog ?? [70, 240])) }, uSpec: { value: o.spec ?? 1 }, uFade: { value: 0 },
      },
    });
  const ink = (fog: [number, number] = [70, 240], w = 1) =>
    new THREE.ShaderMaterial({
      vertexShader: LINE_V,
      fragmentShader: LINE_F,
      side: THREE.BackSide,
      uniforms: {
        uSnap: U.uSnap, uW: { value: w }, uInk: { value: col(C.ink) }, uHor: { value: HOR },
        uFog: { value: new THREE.Vector2(...fog) }, uFade: { value: 0 },
      },
    });
  const cloth = (o: { color: string; dir: THREE.Vector3; bulge: number; flap?: number; emblem?: boolean; tri?: boolean }) =>
    new THREE.ShaderMaterial({
      vertexShader: CLOTH_V,
      fragmentShader: CLOTH_F,
      side: THREE.DoubleSide,
      extensions: { derivatives: true },
      uniforms: {
        uSnap: U.uSnap, uTime: U.uTime, uSun: { value: SUN }, uShade: { value: SHADE },
        uDir: { value: o.dir }, uBulge: { value: o.bulge }, uFlap: { value: o.flap ?? 0 },
        uCol: { value: col(o.color) }, uMark: { value: col(C.red) }, uInk: { value: col(C.ink) },
        uEmblem: { value: o.emblem ? 1 : 0 }, uTri: { value: o.tri ? 1 : 0 },
      },
    });

  /* ---- geometry: vertex-coloured, flat-faceted parts merged per object ---- */
  type Paint = string | ((cy: number, n: THREE.Vector3, cz: number) => string);
  const tc = new THREE.Color(), nrm = new THREE.Vector3();
  const paint = (g: THREE.BufferGeometry, p: Paint, smooth = false) => {
    if (smooth && g.index) g.computeVertexNormals();
    let geo = g.index ? g.toNonIndexed() : g;
    if (!smooth) geo.computeVertexNormals();
    geo = new THREE.BufferGeometry()
      .setAttribute("position", geo.attributes.position)
      .setAttribute("normal", geo.attributes.normal);
    const pos = geo.attributes.position, nm = geo.attributes.normal, n = pos.count;
    const cols = new Float32Array(n * 3);
    for (let f = 0; f < n; f += 3) {
      const cy = (pos.getY(f) + pos.getY(f + 1) + pos.getY(f + 2)) / 3;
      const cz = (pos.getZ(f) + pos.getZ(f + 1) + pos.getZ(f + 2)) / 3;
      nrm.set(nm.getX(f) + nm.getX(f + 1) + nm.getX(f + 2), nm.getY(f) + nm.getY(f + 1) + nm.getY(f + 2), nm.getZ(f) + nm.getZ(f + 1) + nm.getZ(f + 2)).normalize();
      tc.set(typeof p === "string" ? p : p(cy, nrm, cz));
      for (let v = 0; v < 3; v++) cols.set([tc.r, tc.g, tc.b], (f + v) * 3);
    }
    geo.setAttribute("aCol", new THREE.BufferAttribute(cols, 3));
    return geo;
  };
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), s4 = new THREE.Vector3(), p4 = new THREE.Vector3();
  const place = (g: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) =>
    g.applyMatrix4(m4.compose(p4.set(x, y, z), q4.setFromEuler(e4.set(rx, ry, rz)), s4.set(sx, sy, sz)));
  // Averaged normals keyed by position, so the outline shell has no cracks at hard edges.
  const outlineNormals = (g: THREE.BufferGeometry) => {
    const pos = g.attributes.position, nm = g.attributes.normal, acc = new Map<string, THREE.Vector3>();
    const key = (i: number) => `${Math.round(pos.getX(i) * 200)},${Math.round(pos.getY(i) * 200)},${Math.round(pos.getZ(i) * 200)}`;
    for (let i = 0; i < pos.count; i++) {
      const kk = key(i);
      const a = acc.get(kk) ?? new THREE.Vector3();
      a.x += nm.getX(i); a.y += nm.getY(i); a.z += nm.getZ(i);
      acc.set(kk, a);
    }
    const on = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const a = acc.get(key(i))!.clone().normalize();
      on.set([a.x, a.y, a.z], i * 3);
    }
    g.setAttribute("aOn", new THREE.BufferAttribute(on, 3));
  };
  const bake = (parts: THREE.BufferGeometry[], parent: THREE.Object3D, mat: THREE.ShaderMaterial, line?: THREE.ShaderMaterial) => {
    const g = mergeGeometries(parts)!;
    const m = new THREE.Mesh(g, mat);
    parent.add(m);
    if (line) {
      outlineNormals(g);
      parent.add(new THREE.Mesh(g, line));
    }
    return m;
  };
  const up = new THREE.Vector3(0, 1, 0);
  const rod = (a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, p: Paint, n = 6) => {
    const g = new THREE.CylinderGeometry(r1, r0, a.distanceTo(b), n, 1);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, b.clone().sub(a).normalize()));
    g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    return paint(g, p);
  };
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

  /* ---- sky, clouds, far peaks ---- */
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(300, 24, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: SKY_V,
      fragmentShader: SKY_F,
      uniforms: { uZen: { value: col(C.zen) }, uSky: { value: col(C.sky) }, uHor: { value: HOR }, uSunDir: { value: SUN_DISC }, uPulse: { value: 0 } },
    }),
  );
  sky.renderOrder = -1;
  scene.add(sky);

  const clouds = new THREE.Group();
  scene.add(clouds);
  {
    const parts: THREE.BufferGeometry[] = [];
    const puff = new THREE.IcosahedronGeometry(1, 1);
    for (let c = 0; c < 11; c++) {
      const a = (c / 11) * Math.PI * 2 + rnd() * 0.3, r = 190 + rnd() * 40, y = 26 + rnd() * 34, s = 7 + rnd() * 6;
      const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
      const n = 4 + Math.floor(rnd() * 4);
      for (let i = 0; i < n; i++) {
        const u = (i / (n - 1) - 0.5) * 2, ps = s * (0.65 + rnd() * 0.5) * (1 - Math.abs(u) * 0.35);
        const g = paint(puff.clone(), "#ffffff", true);
        // along the tangent of the ring, puffs bunched and lifted in the middle
        place(g, cx - Math.sin(a) * u * s * 1.5, y + (1 - Math.abs(u)) * s * 0.5 + rnd() * 2, cz + Math.cos(a) * u * s * 1.5, 0, rnd() * 3, 0, ps, ps * 0.78, ps);
        parts.push(g);
      }
    }
    bake(parts, clouds, toon({ fog: [250, 700], shade: new THREE.Vector3(0.74, 0.82, 1.0), spec: 0 }));
  }
  {
    const parts: THREE.BufferGeometry[] = [];
    ([[-0.9, 20, 34], [-0.35, 14, 22], [2.3, 24, 40], [2.75, 12, 26], [3.9, 17, 30]] as const).forEach(([a, h, w]) => {
      const g = paint(k.facet(new THREE.ConeGeometry(w, h, 7, 2), 2.2), "#7fa7c8");
      parts.push(place(g, Math.cos(a) * 250, h / 2 - 1, Math.sin(a) * 250, 0, rnd() * 3, 0));
    });
    bake(parts, scene, toon({ fog: [120, 330], spec: 0 }));
  }

  /* ---- sea ---- */
  const WN = 120, WR = 280;
  const wg = new THREE.PlaneGeometry(2, 2, WN, WN);
  wg.rotateX(-Math.PI / 2);
  {
    const wp = wg.attributes.position;
    const warp = (u: number) => Math.sign(u) * Math.pow(Math.abs(u), 1.9) * WR;
    for (let i = 0; i < wp.count; i++) wp.setXYZ(i, warp(wp.getX(i)), 0, warp(wp.getZ(i)));
  }
  const islU = Array.from({ length: 4 }, () => new THREE.Vector4());
  const waterMat = new THREE.ShaderMaterial({
    vertexShader: WATER_V,
    fragmentShader: WATER_F,
    extensions: { derivatives: true },
    uniforms: {
      uSnap: U.uSnap, uTime: U.uTime, uScroll: { value: 0 }, uYaw: { value: 0 }, uIsl: { value: islU },
      uDeep: { value: col(C.deep) }, uMid: { value: col(C.mid) }, uLine: { value: col(C.line) }, uFoam: { value: col(C.foam) }, uHor: { value: HOR },
    },
  });
  const water = new THREE.Mesh(wg, waterMat);
  water.frustumCulled = false;
  scene.add(water);

  /* ---- islands that drift past ---- */
  const palm = (parts: THREE.BufferGeometry[], x: number, y: number, z: number, s: number) => {
    const H = 3.6 + rnd() * 1.6, lean = 0.5 + rnd(), ry = rnd() * 6.28, n = 5;
    const xf = new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(up, ry), V(s, s, s));
    const P = (i: number) => V(lean * (i / n) ** 2, (H * i) / n, 0);
    for (let i = 0; i < n; i++) parts.push(rod(P(i), P(i + 1), 0.2 - i * 0.02, 0.18 - i * 0.02, i % 2 ? C.trunk : "#946233", 5).applyMatrix4(xf));
    const top = P(n).applyMatrix4(xf);
    for (let f = 0; f < 7; f++) {
      const g = new THREE.ConeGeometry(0.5, 2.8, 4);
      g.scale(0.25, 1, 1);
      g.translate(0, 1.4, 0);
      parts.push(place(paint(g, f % 2 ? C.frond : "#58c040"), top.x, top.y, top.z, 0, ry + (f / 7) * 6.28, -Math.PI / 2 - 0.35 - rnd() * 0.3, s));
    }
  };
  type Isle = { g: THREE.Group; mats: THREE.ShaderMaterial[]; r: number; x: number; z: number };
  const isles: Isle[] = [];
  const makeIsle = (kind: number, r: number) => {
    const g = new THREE.Group();
    scene.add(g);
    const parts: THREE.BufferGeometry[] = [];
    const H = kind === 0 ? r * 1.6 : kind === 1 ? r * 0.25 : r * 1.0;
    // cliffs in stacked tiers, banded like sandstone
    const tiers = kind === 1 ? 1 : 3;
    for (let i = 0; i < tiers; i++) {
      const y0 = -1.5 + (i * (H + 1.5)) / tiers, y1 = -1.5 + ((i + 1) * (H + 1.5)) / tiers;
      const rr0 = r * (1 - i * 0.12), rr1 = r * (1 - (i + 1) * 0.12) * (kind === 1 ? 0.9 : 1);
      const cg = k.facet(new THREE.CylinderGeometry(rr1, rr0, y1 - y0, 10, 1, true), r * 0.06);
      parts.push(place(paint(cg, i % 2 ? C.cliffDk : C.cliff), 0, (y0 + y1) / 2, 0, 0, i * 0.7, 0));
    }
    const topR = r * (1 - tiers * 0.12) * (kind === 1 ? 0.9 : 1);
    const cap = k.facet(new THREE.CylinderGeometry(topR * 0.75, topR * 1.04, r * 0.18, 10), r * 0.04);
    parts.push(place(paint(cap, (cy, n) => (n.y > 0.6 ? C.grass2 : C.grass)), 0, H + r * 0.09, 0));
    if (kind !== 1) {
      // sandy apron at the waterline
      parts.push(place(paint(k.facet(new THREE.CylinderGeometry(r * 1.05, r * 1.25, 0.8, 12), 0.2), C.sand), 0, 0, 0));
    }
    const top = H + r * 0.18;
    const np = kind === 2 ? 1 : 2 + Math.floor(rnd() * 2);
    for (let p = 0; p < np; p++) {
      const a = rnd() * 6.28, d = rnd() * topR * 0.5;
      palm(parts, Math.cos(a) * d + (kind === 2 ? topR * 0.45 : 0), top - 0.1, Math.sin(a) * d, 0.9 + rnd() * 0.4);
    }
    if (kind === 2) {
      // lighthouse
      for (let i = 0; i < 4; i++) {
        const cg = new THREE.CylinderGeometry(1.1 - (i + 1) * 0.12, 1.1 - i * 0.12, 1.6, 8);
        parts.push(place(paint(cg, i % 2 ? C.red : C.tower), -topR * 0.2, top + 0.8 + i * 1.6, 0));
      }
      parts.push(place(paint(new THREE.CylinderGeometry(0.95, 0.95, 0.2, 8), C.ink), -topR * 0.2, top + 6.5, 0));
      parts.push(place(paint(new THREE.ConeGeometry(0.85, 1.3, 8), C.red), -topR * 0.2, top + 8.0, 0));
    }
    for (let s = 0; s < 3; s++) {
      const a = rnd() * 6.28, sc = 0.6 + rnd() * 0.9;
      parts.push(place(paint(k.facet(new THREE.DodecahedronGeometry(1, 0), 0.3), C.rock), Math.cos(a) * r * 1.3, 0.1, Math.sin(a) * r * 1.3, rnd() * 3, rnd() * 3, 0, sc));
    }
    const mats = [toon(), ink()];
    bake(parts, g, mats[0], mats[1]);
    if (kind === 2) {
      const lampMat = toon({ shade: new THREE.Vector3(1, 1, 1), spec: 0 });
      bake([place(paint(new THREE.CylinderGeometry(0.55, 0.55, 0.9, 8), "#ffe27a"), -topR * 0.2, top + 7.0, 0)], g, lampMat);
      mats.push(lampMat);
    }
    return { g, mats, r: kind === 1 ? r * 0.95 : r * 1.25, x: 0, z: 0 };
  };
  const Z0 = -170, Z1 = 210;
  const lane = () => (rnd() > 0.5 ? 1 : -1) * (30 + rnd() * 34);
  ([[0, 9], [1, 5], [2, 7], [0, 12]] as const).forEach(([kind, r], i) => {
    const s = makeIsle(kind, r);
    s.x = lane();
    s.z = Z0 + ((i + 0.3) / 4) * (Z1 - Z0);
    s.g.rotation.y = rnd() * 6.28;
    isles.push(s);
  });

  /* ---- the ship ---- */
  const ship = new THREE.Group();
  scene.add(ship);
  const parts: THREE.BufferGeometry[] = [];
  const glow: THREE.BufferGeometry[] = [];
  // Hull: a box bent into a hull. xn, yn, zn in [-0.5, 0.5]; bow at zn = -0.5.
  const LEN = 9.4, BEAM = 1.5;
  const Yrows = [-1.05, -0.7, -0.25, 0.2, 0.4, 0.75, 1.1];
  const hullAt = (xn: number, yn: number, zn: number) => {
    const f = zn + 0.5;
    const v = Math.max(0, Math.min(1, yn + 0.5)) * 6, i = Math.min(5, Math.floor(v));
    let y = Yrows[i] + (Yrows[i + 1] - Yrows[i]) * (v - i);
    let w = f < 0.42 ? Math.sqrt(f / 0.42) : 1 - Math.max(0, f - 0.8) * 0.9;
    w = Math.max(w, 0.04) * (0.32 + 0.68 * Math.pow(v / 6, 0.55));
    const sheer = (f < 0.3 ? 0.75 * (1 - f / 0.3) ** 2 : 0) + (f > 0.72 ? 0.55 * ((f - 0.72) / 0.28) ** 2 : 0);
    const keel = f < 0.3 ? 0.9 * (1 - f / 0.3) ** 2 : 0;
    y += (v / 6) * sheer + (1 - v / 6) * keel;
    return V(xn * 2 * BEAM * w, y, zn * LEN);
  };
  {
    const hg = new THREE.BoxGeometry(1, 1, 1, 6, 6, 18);
    const hp = hg.attributes.position;
    for (let i = 0; i < hp.count; i++) {
      const p = hullAt(hp.getX(i), hp.getY(i), hp.getZ(i));
      hp.setXYZ(i, p.x, p.y, p.z);
    }
    parts.push(paint(hg, (cy, n, cz) => {
      if (n.y > 0.75 && cy > 0.6) return C.deck;
      if (n.z > 0.75 && cz > 4) return C.woodDk;
      if (cy < 0.2) return cy < -0.7 ? C.redDk : C.red;
      if (cy < 0.4) return C.white;
      return cy > 0.86 ? C.woodDk : C.wood;
    }));
  }
  // gunwale rail along the sheer, with posts
  for (const side of [-1, 1]) {
    let prevP: THREE.Vector3 | null = null;
    for (let i = 0; i <= 14; i++) {
      const zn = -0.47 + (i / 14) * 0.94;
      const p = hullAt(side * 0.5, 0.5, zn);
      p.x -= side * 0.06;
      const top = p.clone().add(V(0, 0.45, 0));
      if (prevP) parts.push(rod(prevP, top, 0.07, 0.07, C.gold, 4));
      if (i % 2 === 0) parts.push(rod(p, top, 0.05, 0.05, C.woodDk, 4));
      prevP = top;
    }
    // portholes
    for (let i = 0; i < 4; i++) {
      const zn = -0.22 + i * 0.13, p = hullAt(side * 0.5, 0.12, zn);
      const g = new THREE.CylinderGeometry(0.17, 0.17, 0.1, 8).rotateZ(Math.PI / 2);
      parts.push(place(paint(g, C.gold), p.x + side * 0.02, p.y + 0.42, p.z));
    }
  }
  // stern cabin
  {
    const cz = 2.9, cy = 1.1;
    parts.push(place(paint(new THREE.BoxGeometry(2.3, 1.4, 2.0), C.cream), 0, cy + 0.7, cz));
    parts.push(place(paint(new THREE.BoxGeometry(2.6, 0.14, 2.3), C.woodDk), 0, cy + 1.45, cz));
    const roof = new THREE.ConeGeometry(1.75, 0.9, 4).rotateY(Math.PI / 4);
    roof.scale(1.04, 1, 0.9);
    parts.push(place(paint(roof, C.roof), 0, cy + 1.97, cz));
    parts.push(place(paint(new THREE.BoxGeometry(0.6, 0.95, 0.06), C.woodDk), 0, cy + 0.48, cz - 1.02));
    for (const s of [-1, 1]) {
      parts.push(place(paint(new THREE.BoxGeometry(0.06, 0.48, 0.5), C.gold), s * 1.16, cy + 0.85, cz));
      parts.push(place(paint(new THREE.BoxGeometry(0.07, 0.34, 0.36), C.glass), s * 1.17, cy + 0.85, cz));
    }
    // stern lantern
    parts.push(rod(V(0, cy + 2.3, cz + 0.9), V(0, cy + 2.3, cz + 1.6), 0.04, 0.04, C.woodDk, 4));
    glow.push(place(paint(new THREE.OctahedronGeometry(0.22, 0), "#ffe27a"), 0, cy + 2.05, cz + 1.6));
  }
  // figurehead: a little red sea-dragon
  {
    const p = hullAt(0, 0.5, -0.5);
    const head = V(0, p.y + 0.25, p.z - 0.35);
    parts.push(place(paint(k.facet(new THREE.IcosahedronGeometry(0.42, 0), 0.04), C.red), head.x, head.y, head.z, 0, 0, 0, 1, 0.9, 1.15));
    parts.push(place(paint(new THREE.ConeGeometry(0.26, 0.7, 5), C.red), head.x, head.y - 0.05, head.z - 0.55, -Math.PI / 2 - 0.2, 0, 0));
    for (const s of [-1, 1]) {
      parts.push(place(paint(new THREE.ConeGeometry(0.08, 0.6, 4), C.gold), head.x + s * 0.2, head.y + 0.35, head.z + 0.2, 0.9, 0, s * 0.3));
      parts.push(place(paint(new THREE.BoxGeometry(0.1, 0.1, 0.1), C.ink), head.x + s * 0.24, head.y + 0.1, head.z - 0.25));
    }
    parts.push(place(paint(new THREE.ConeGeometry(0.35, 0.8, 6), C.gold), head.x, head.y + 0.1, head.z + 0.45, Math.PI / 2 + 0.3, 0, 0));
  }
  // rudder
  parts.push(place(paint(new THREE.BoxGeometry(0.14, 1.4, 0.7), C.woodDk), 0, -0.3, LEN / 2 + 0.2));
  // mast, yards, crow's nest, bowsprit
  const MZ = -0.5;
  parts.push(rod(V(0, 0.9, MZ), V(0, 14, MZ), 0.2, 0.12, C.wood, 7));
  const yard = (y: number, half: number) => parts.push(rod(V(-half, y, MZ - 0.12), V(half, y, MZ - 0.12), 0.12, 0.12, C.woodDk, 5));
  yard(3.3, 3.2);
  yard(9.9, 3.5);
  yard(10.9, 2.3);
  yard(13.1, 2.1);
  {
    const nest = new THREE.CylinderGeometry(0.62, 0.48, 0.55, 8, 1);
    parts.push(place(paint(nest, C.wood), 0, 10.35, MZ));
    parts.push(place(paint(new THREE.CylinderGeometry(0.66, 0.66, 0.1, 8), C.gold), 0, 10.66, MZ));
  }
  const bowTip = V(0, 2.9, -7.4);
  parts.push(rod(V(0, 1.55, -4.2), bowTip, 0.13, 0.08, C.wood, 5));
  glow.push(place(paint(new THREE.OctahedronGeometry(0.16, 0), C.gold), 0, 14.15, MZ));

  const shipMat = toon({ fog: [70, 240] });
  bake(parts, ship, shipMat, ink([70, 240]));
  bake(glow, ship, toon({ shade: new THREE.Vector3(1, 1, 1), spec: 0 }), ink([70, 240]));

  // sails
  const FWD = V(0, 0, -1);
  const sheet = (w: number, h: number, segX: number, segY: number, wt: (u: number, v: number) => number) => {
    const g = new THREE.PlaneGeometry(w, h, segX, segY);
    const uv = g.attributes.uv, aw = new Float32Array(uv.count);
    for (let i = 0; i < uv.count; i++) aw[i] = wt(uv.getX(i), uv.getY(i));
    g.setAttribute("aW", new THREE.BufferAttribute(aw, 1));
    return g;
  };
  const sailW = (u: number, v: number) => Math.sin(Math.PI * u) * Math.sin(Math.PI * 0.55 * (1 - v) + 0.12) * (1 - 0.15 * v);
  const mainSail = new THREE.Mesh(sheet(6.4, 6.5, 10, 10, sailW), cloth({ color: C.cream, dir: FWD, bulge: 1.5, emblem: true }));
  mainSail.position.set(0, 6.6, MZ - 0.2);
  ship.add(mainSail);
  const topSail = new THREE.Mesh(sheet(4.2, 2.1, 8, 4, sailW), cloth({ color: C.cream, dir: FWD, bulge: 0.7 }));
  topSail.position.set(0, 12.0, MZ - 0.2);
  ship.add(topSail);
  {
    // jib: a triangle from the mast to the bowsprit, billowing to port
    const A = V(0, 8.4, MZ - 0.25), B = bowTip.clone(), Cc = V(0, 1.7, -4.3);
    const N = 8, pos: number[] = [], uvs: number[] = [], aw: number[] = [], idx: number[] = [];
    const id: number[][] = [];
    for (let i = 0; i <= N; i++) {
      id.push([]);
      for (let j = 0; j <= N - i; j++) {
        const u = j / N, v = i / N, w = 1 - u - v;
        const p = Cc.clone().multiplyScalar(w).addScaledVector(B, u).addScaledVector(A, v);
        id[i].push(pos.length / 3);
        pos.push(p.x, p.y, p.z);
        uvs.push(u, v);
        aw.push(Math.min(1, 6.75 * u * v * w * 2.2));
      }
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < N - i; j++) {
      idx.push(id[i][j], id[i][j + 1], id[i + 1][j]);
      if (j < N - i - 1) idx.push(id[i][j + 1], id[i + 1][j + 1], id[i + 1][j]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    g.setAttribute("aW", new THREE.Float32BufferAttribute(aw, 1));
    g.setIndex(idx);
    ship.add(new THREE.Mesh(g, cloth({ color: C.cream, dir: V(-1, 0, -0.3).normalize(), bulge: 0.8, tri: true })));
  }
  {
    // pennant streaming forward off the masthead
    const g = new THREE.BufferGeometry();
    const N = 10, pos: number[] = [], uvs: number[] = [], aw: number[] = [], idx: number[] = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, hw = 0.32 * (1 - u);
      pos.push(0, -hw, -u * 3.4, 0, hw, -u * 3.4);
      uvs.push(u, 0, u, 1);
      aw.push(u, u);
      if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    g.setAttribute("aW", new THREE.Float32BufferAttribute(aw, 1));
    g.setIndex(idx);
    const flag = new THREE.Mesh(g, cloth({ color: C.red, dir: V(1, 0, 0), bulge: 0, flap: 0.4 }));
    flag.position.set(0, 13.75, MZ);
    ship.add(flag);
  }
  // rigging
  {
    const pts: THREE.Vector3[] = [];
    const L = (a: THREE.Vector3, b: THREE.Vector3) => pts.push(a, b);
    const top = V(0, 13.9, MZ);
    L(top, bowTip);
    L(top, V(0, 2.7, 4.6));
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const p = hullAt(s * 0.5, 0.5, -0.12 + i * 0.07);
        L(V(0, 10.1, MZ), p.add(V(-s * 0.06, 0.45, 0)));
      }
      L(V(s * 3.4, 9.9, MZ - 0.12), V(s * 1.1, 1.7, 1.6));
    }
    const rig = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), k.lineMat({ value: col("#3a2b26") }, 400));
    ship.add(rig);
  }

  /* ---- gulls ---- */
  const gullMat = toon({ spec: 0 });
  const gulls = Array.from({ length: 3 }, (_, i) => {
    const g = new THREE.Group();
    scene.add(g);
    bake([place(paint(new THREE.OctahedronGeometry(0.3, 0), "#ffffff"), 0, 0, 0, 0, 0, 0, 0.6, 0.6, 1.6)], g, gullMat);
    const wings = [-1, 1].map((s) => {
      const w = new THREE.Group();
      g.add(w);
      const wg2 = new THREE.BoxGeometry(1.3, 0.06, 0.45);
      wg2.translate(s * 0.65, 0, 0);
      bake([paint(wg2, "#ffffff"), place(paint(new THREE.BoxGeometry(0.3, 0.07, 0.46), "#8d96a8"), s * 1.3, 0, 0)], w, gullMat);
      return { w, s };
    });
    return { g, wings, r: 6 + i * 2.5, y: 15 + i * 1.6, sp: 0.35 + i * 0.08, ph: i * 2.1 };
  });

  /* ---- particles: bow spray and stern churn ---- */
  const NP = 320;
  const pPos = new Float32Array(NP * 3), pVel = new Float32Array(NP * 3), pSize = new Float32Array(NP), pAge = new Float32Array(NP), pLife = new Float32Array(NP), pS0 = new Float32Array(NP);
  pPos.fill(-50);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute("aSize", new THREE.BufferAttribute(pSize, 1));
  const ptMat = new THREE.ShaderMaterial({
    vertexShader: PT_V,
    fragmentShader: PT_F,
    uniforms: { uSnap: U.uSnap, uK: { value: 1 }, uA: { value: col("#ffffff") }, uB: { value: col("#bfe6ff") } },
  });
  const spray = new THREE.Points(pGeo, ptMat);
  spray.frustumCulled = false;
  scene.add(spray);
  let pNext = 0;
  const lp = new THREE.Vector3(), lv = new THREE.Vector3();
  const emit = (x: number, y: number, z: number, vx: number, vy: number, vz: number, size: number, life: number) => {
    const i = pNext;
    pNext = (pNext + 1) % NP;
    lp.set(x, y, z);
    ship.localToWorld(lp);
    lv.set(vx, vy, vz).applyQuaternion(ship.quaternion);
    pPos.set([lp.x, lp.y, lp.z], i * 3);
    pVel.set([lv.x, lv.y, lv.z], i * 3);
    pAge[i] = 0;
    pLife[i] = life;
    pS0[i] = size;
    pSize[i] = size;
  };

  /* ---- wind lines ---- */
  const NW = 6, NPt = 44, TRAIL = 0.028, WLIFE = 5.2;
  const wPos = new Float32Array(NW * NPt * 2 * 3), wA = new Float32Array(NW * NPt * 2);
  const wIdx: number[] = [];
  for (let l = 0; l < NW; l++) for (let i = 0; i < NPt - 1; i++) {
    const a = (l * NPt + i) * 2;
    wIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const wGeo = new THREE.BufferGeometry();
  wGeo.setAttribute("position", new THREE.BufferAttribute(wPos, 3));
  wGeo.setAttribute("aA", new THREE.BufferAttribute(wA, 1));
  wGeo.setIndex(wIdx);
  const wind = new THREE.Mesh(
    wGeo,
    new THREE.ShaderMaterial({ vertexShader: WIND_V, fragmentShader: WIND_F, transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uSnap: U.uSnap } }),
  );
  wind.frustumCulled = false;
  wind.renderOrder = 2;
  scene.add(wind);
  type Gust = { t0: number; S: THREE.Vector3; v: number; A: number; ph: number; loop: number; R: number };
  const spawnGust = (g: Gust, t0: number) => {
    g.t0 = t0;
    g.S.set((rnd() - 0.5) * 18, 2 + rnd() * 9, 16 + rnd() * 8);
    g.v = 6.5 + rnd() * 2;
    g.A = 0.4 + rnd() * 0.6;
    g.ph = rnd() * 6.28;
    g.loop = rnd() < 0.65 ? 1.2 + rnd() * 2.2 : -1;
    g.R = 1.1 + rnd() * 0.6;
  };
  const gusts: Gust[] = Array.from({ length: NW }, () => ({ t0: 0, S: new THREE.Vector3(), v: 0, A: 0, ph: 0, loop: -1, R: 1 }));
  const gustAt = (g: Gust, a: number, out: THREE.Vector3) => {
    out.set(g.S.x + Math.sin(a * 0.9 + g.ph) * 0.8, g.S.y + Math.sin(a * 1.4 + g.ph) * g.A, g.S.z - g.v * a);
    if (g.loop >= 0 && a > g.loop && a < g.loop + 1.1) {
      const u = (a - g.loop) / 1.1, th = 2 * Math.PI * (u - Math.sin(2 * Math.PI * u) / (2 * Math.PI));
      out.z -= g.R * Math.sin(th);
      out.y += g.R * (1 - Math.cos(th));
    }
    return out;
  };
  const trail: THREE.Vector3[] = Array.from({ length: NPt }, () => new THREE.Vector3());
  const side = new THREE.Vector3(), tan = new THREE.Vector3(), toCam = new THREE.Vector3();
  let gustsReady = false;

  /* ---- motion state ---- */
  let scroll = 0, lastT = -1, yaw = 0;
  let tHop = -99, tSun = -99, tGull = -99, hopSplash = false;
  const sample = (x: number, z: number, t: number) => wave(x, z - scroll, t);

  return {
    scene, cam, fog: [70, 240], fov: [58, 72], limits: { pitch: [-0.08, 0.75], zoom: [0.55, 1.7] },
    labels: [
      { name: "Sail-ship", sub: "under way", at: (v) => { v.set(0, 14.6, MZ); ship.localToWorld(v); }, sub2: () => `${(SPEED * 2.9).toFixed(1)} kn · running free` },
      { name: "Fair wind", sub: "following", at: (v) => { v.set(0, 2, -18); } },
    ],
    eggs: [
      {
        id: "voyage-hop", r: 46,
        at: (v) => { v.set(0, 4, 0); ship.localToWorld(v); },
        fire: (t) => { tHop = t; hopSplash = false; return "SAIL-SHIP · hops a swell. The figurehead looks pleased."; },
      },
      {
        id: "voyage-sun", r: 40,
        at: (v) => { v.copy(SUN_DISC).multiplyScalar(250).add(cam.position); },
        fire: (t) => { tSun = t; return "SUN · one, for once. Big and round, as drawn."; },
      },
      {
        id: "voyage-gull", r: 30,
        at: (v) => { gulls[0].g.getWorldPosition(v); },
        fire: (t) => { tGull = t; return "GULL · loops the mast, then pretends it didn't."; },
      },
    ],
    update(t) {
      const dt = lastT < 0 ? 0 : Math.max(0, Math.min(0.05, t - lastT));
      lastT = t;
      scroll += SPEED * dt;
      waterMat.uniforms.uScroll.value = scroll;

      /* ship rides the swell */
      const eh = t - tHop, hop = 1.6 * pulse(eh, 0.95);
      const bow = sample(0, -4, t), stern = sample(0, 4, t), port = sample(-1.6, 0, t), stbd = sample(1.6, 0, t);
      yaw = Math.sin(t * 0.21) * 0.05;
      ship.position.set(0, (bow + stern + port + stbd) / 4 - 0.15 + hop, 0);
      ship.rotation.set((stern - bow) * 0.09 + hop * 0.06, yaw, (stbd - port) * 0.16 - 0.035, "YXZ");
      ship.updateMatrixWorld();
      waterMat.uniforms.uYaw.value = yaw;

      /* islands drift astern */
      isles.forEach((s, i) => {
        s.z += SPEED * dt;
        if (s.z > Z1) {
          s.z -= Z1 - Z0;
          s.x = lane();
          s.g.rotation.y = rnd() * 6.28;
        }
        const vis = Math.min(1, (s.z - Z0) / 40, (Z1 - s.z) / 50);
        s.g.position.set(s.x, sample(s.x, s.z, t) * 0.15, s.z);
        for (const m of s.mats) m.uniforms.uFade.value = 1 - Math.max(0, vis);
        islU[i].set(s.x, s.z, s.r, Math.max(0, vis));
      });

      /* particles */
      if (dt > 0) {
        const dip = Math.max(0, -(bow - stern)) * 1.5;
        const rate = (75 + dip * 80) * dt;
        for (let n = rate + rnd(); n >= 1; n--) {
          const s = rnd() > 0.5 ? 1 : -1;
          emit(s * (0.3 + rnd() * 0.6), 0.1, -4.5 + rnd() * 1.4, s * (1.6 + rnd() * 2.4), 2.4 + rnd() * 3 + dip, 0.5 + rnd() * 1.4, 0.5 + rnd() * 0.6, 1.6);
        }
        for (let n = 34 * dt + rnd(); n >= 1; n--) {
          emit((rnd() - 0.5) * 1.6, -0.1, 4.6 + rnd() * 0.4, (rnd() - 0.5) * 1.2, 0.8 + rnd() * 1.4, SPEED * 0.6, 0.4 + rnd() * 0.35, 0.9);
        }
        for (let n = 22 * dt + rnd(); n >= 1; n--) {
          const s = rnd() > 0.5 ? 1 : -1;
          emit(s * (1.45 + rnd() * 0.3), -0.1, -2 + rnd() * 5.5, s * (0.6 + rnd()), 1 + rnd() * 1.4, SPEED * 0.4, 0.32 + rnd() * 0.25, 0.7);
        }
        if (eh > 0.9 && !hopSplash) {
          hopSplash = true;
          for (let n = 0; n < 90; n++) {
            const a = rnd() * 6.28;
            emit(Math.cos(a) * 1.6, -0.2, Math.sin(a) * 4.4, Math.cos(a) * (2 + rnd() * 3), 3 + rnd() * 4, Math.sin(a) * 2, 0.4 + rnd() * 0.5, 1.6);
          }
        }
        for (let i = 0; i < NP; i++) {
          if (pSize[i] <= 0) continue;
          pAge[i] += dt;
          const j = i * 3;
          pVel[j + 1] -= 9.5 * dt;
          pVel[j] *= 1 - 0.8 * dt;
          pVel[j + 2] += (SPEED - pVel[j + 2]) * 1.4 * dt;
          pPos[j] += pVel[j] * dt;
          pPos[j + 1] += pVel[j + 1] * dt;
          pPos[j + 2] += pVel[j + 2] * dt;
          const r = pAge[i] / pLife[i];
          if (r >= 1 || (pVel[j + 1] < 0 && pPos[j + 1] < sample(pPos[j], pPos[j + 2], t) - 0.05)) {
            pSize[i] = 0;
            pPos[j + 1] = -50;
          } else pSize[i] = pS0[i] * (1 - r * 0.5);
        }
        pGeo.attributes.position.needsUpdate = true;
        pGeo.attributes.aSize.needsUpdate = true;
      }

      /* camera */
      const a = 0.62 + Math.sin(t * 0.04) * 0.14 + view.px * 0.15 + view.yaw, r = 23 + Math.sin(t * 0.06) * 1.5;
      const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
      cam.position.set(cx, 6 + sample(cx, cz, t) * 0.3 - view.py * 0.8, cz);
      cam.lookAt(0, 4.6 - view.py * 1.2, 0);
      cam.rotateZ(Math.sin(t * 0.5) * 0.008);
      k.orbit(cam, PIVOT);
      cam.updateMatrixWorld();
      sky.position.copy(cam.position);
      clouds.position.set(cam.position.x, 0, cam.position.z);
      clouds.rotation.y = t * 0.004;
      ptMat.uniforms.uK.value = 1 / Math.tan(THREE.MathUtils.degToRad(cam.fov / cam.zoom) / 2);
      (sky.material as THREE.ShaderMaterial).uniforms.uPulse.value = pulse(t - tSun, 1.6);

      /* wind lines */
      if (!gustsReady) {
        gusts.forEach((g, i) => spawnGust(g, t - (i / NW) * WLIFE));
        gustsReady = true;
      }
      gusts.forEach((g, l) => {
        if (t - g.t0 > WLIFE) spawnGust(g, t);
        const age = t - g.t0, life = Math.min(1, age / 0.5, (WLIFE - age) / 0.9);
        for (let i = 0; i < NPt; i++) gustAt(g, Math.max(0, age - i * TRAIL), trail[i]);
        for (let i = 0; i < NPt; i++) {
          const p = trail[i];
          tan.copy(trail[Math.max(0, i - 1)]).sub(trail[Math.min(NPt - 1, i + 1)]);
          toCam.copy(cam.position).sub(p);
          side.crossVectors(tan, toCam);
          const u = i / (NPt - 1), w = 0.15 * Math.sin(Math.PI * Math.min(1, u * 1.15)) + 0.02;
          if (side.lengthSq() > 1e-8) side.normalize().multiplyScalar(w);
          const o = (l * NPt + i) * 2;
          wPos.set([p.x - side.x, p.y - side.y, p.z - side.z, p.x + side.x, p.y + side.y, p.z + side.z], o * 3);
          const al = age - i * TRAIL > 0 ? Math.max(0, life) * (1 - u * 0.55) : 0;
          wA[o] = wA[o + 1] = al;
        }
      });
      wGeo.attributes.position.needsUpdate = true;
      wGeo.attributes.aA.needsUpdate = true;

      /* gulls */
      gulls.forEach((gl, i) => {
        const ga = gl.ph + t * gl.sp;
        gl.g.position.set(Math.cos(ga) * gl.r, gl.y + Math.sin(t * 0.6 + gl.ph) * 0.8, MZ + Math.sin(ga) * gl.r);
        gl.g.rotation.set(0, -ga, i === 0 && t - tGull > 0 && t - tGull < 1.4 ? ((t - tGull) / 1.4) * Math.PI * 2 : 0.3);
        const f = Math.sin(t * 7 + gl.ph * 3) * 0.5;
        for (const { w, s } of gl.wings) w.rotation.z = s * f;
      });
    },
    readout() {
      return [
        ["Lat", k.dms(12.4031 - scroll * 0.00002, "N", "S", 2)],
        ["Lon", k.dms(-61.207 + yaw * 0.01, "E", "W", 3)],
        ["Spd", `${(SPEED * 2.9).toFixed(1)} kn`],
        ["Hdg", `${k.pad(Math.round((360 + (yaw * 180) / Math.PI) % 360), 3)}°`],
        ["Wind", "SSE 5"],
      ];
    },
  };
}
