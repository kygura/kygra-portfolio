/** Sheet 06 · Sail: a red-hulled sailboat running a loop through a cel-shaded archipelago of biome islands, under sky ruins, voxel clouds, cyclones and airships. */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { burst, pulse, type PsxKit, type SceneDef, type V3 } from "./psx";

/* ---- palette: saturated toon colours of its own; only the pennants follow the site accent ---- */
const C = {
  skyTop: "#1f7fe0", skyMid: "#5fb4f0", fog: "#c6eaf7",
  sea: "#1b62c8", seaFar: "#3f97dc", shallow: "#3fd2d4",
  sand: "#f4dd9c", sandDk: "#dcbc78", grass: "#74c443", grassLt: "#9ad957", grassDk: "#4f9d35",
  cliff: "#c99c6a", cliffDk: "#a27650", rock: "#aaa59c", rockDk: "#716d6b", rockBlue: "#8e9bb0",
  basalt: "#4d4244", basalt2: "#5f5052", basaltDk: "#3a3134", snow: "#fbfdff",
  trunk: "#9a6237", trunkLt: "#b47a45", leaf: "#3d9c3a", leafLt: "#5fbd43", pine: "#2c7a4e",
  wood: "#b5793f", woodDk: "#7a4a26", plank: "#d49d5c", straw: "#eab84b",
  red: "#de3a2c", redDk: "#a42323", gold: "#f6c445", cream: "#f8efd6", white: "#ffffff", ink: "#2a2338",
  roof: "#e2622f", roof2: "#3f74c4", roof3: "#2f9a6a", wall: "#f5ebd3", stone: "#e6dbc1", stoneDk: "#b8aa8b",
  lava: "#ff7a1c", lavaHot: "#ffd34a", crystal: "#7fe6f2", crystal2: "#c48cf2", shroom: "#e4473b",
  dolphin: "#5b80bb", belly: "#d9e6f2", mesa: ["#e8a35a", "#d4794a", "#f2c27a", "#c8643c"],
};

/* ---- GLSL pieces ---- */
const SNAP = `p.xy = floor(p.xy / p.w * uSnap + 0.5) / uSnap * p.w;`;
const FOG_GL = `uniform vec3 uFog; uniform vec2 uFogR; vec3 fogged(vec3 c, float d){ return mix(c, uFog, smoothstep(uFogR.x, uFogR.y, d)); }`;
const NOISE_GL = `
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }`;
const WAVE_GL = `float wave(vec2 p, float t){ return 0.32 * sin(p.x * 0.11 + p.y * 0.04 + t * 0.9) + 0.22 * sin(p.y * 0.13 - p.x * 0.06 - t * 0.7) + 0.1 * sin((p.x + p.y) * 0.31 + t * 1.6) + 0.05 * sin(p.x * 0.7 - p.y * 0.5 + t * 2.3); }`;
const wave = (x: number, z: number, t: number) =>
  0.32 * Math.sin(x * 0.11 + z * 0.04 + t * 0.9) +
  0.22 * Math.sin(z * 0.13 - x * 0.06 - t * 0.7) +
  0.1 * Math.sin((x + z) * 0.31 + t * 1.6) +
  0.05 * Math.sin(x * 0.7 - z * 0.5 + t * 2.3);

// Two-tone cel shading: a hard terminator, a cool shadow tint, a thin highlight band and a rim.
const TOON_V = `
uniform vec2 uSnap; attribute vec3 aCol;
varying vec3 vN; varying vec3 vCol; varying vec3 vWP; varying float vDepth;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix) * normal); vCol = aCol; vWP = wp.xyz;
  vec4 mv = viewMatrix * wp; vec4 p = projectionMatrix * mv;
  ${SNAP}
  gl_Position = p; vDepth = -mv.z;
}`;
const TOON_F = `
uniform vec3 uSun; uniform vec3 uShade; uniform vec3 uTint; uniform float uEmit; uniform float uRim;
${FOG_GL}
varying vec3 vN; varying vec3 vCol; varying vec3 vWP; varying float vDepth;
void main(){
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 base = vCol * uTint;
  float d = dot(n, uSun);
  float lit = smoothstep(-0.03, 0.03, d);
  vec3 c = mix(base * uShade, base, lit);
  c += base * smoothstep(0.88, 0.92, d) * 0.1;
  vec3 v = normalize(cameraPosition - vWP);
  c = mix(c, vec3(1.0), smoothstep(0.7, 0.76, 1.0 - max(dot(n, v), 0.0)) * lit * uRim);
  c = mix(c, base * 1.15, uEmit);
  gl_FragColor = vec4(fogged(c, vDepth), 1.0);
}`;
// Inverted hull, pushed out in clip space so the ink line keeps a fixed pixel width; it thins away with distance.
const OUT_V = `
uniform vec2 uSnap; uniform float uPx; attribute vec3 aOut; varying float vDepth;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec4 mv = viewMatrix * wp; vec4 p = projectionMatrix * mv;
  vec3 nv = mat3(viewMatrix) * normalize(mat3(modelMatrix) * aOut);
  vec2 dn = (projectionMatrix * vec4(nv, 0.0)).xy;
  float asp = projectionMatrix[1][1] / projectionMatrix[0][0];
  dn.x *= asp;
  float l = length(dn);
  if (l > 1e-5) { dn /= l; p.xy += vec2(dn.x / asp, dn.y) * uPx * p.w * (1.0 - smoothstep(70.0, 380.0, -mv.z)); }
  ${SNAP}
  gl_Position = p; vDepth = -mv.z;
}`;
const OUT_F = `uniform vec3 uCol; ${FOG_GL} varying float vDepth; void main(){ gl_FragColor = vec4(fogged(uCol, vDepth * 1.3), 1.0); }`;

const SKY_V = `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SKY_F = `
uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHor; uniform vec3 uSun; uniform float uTime; varying vec3 vDir;
${NOISE_GL}
void main(){
  vec3 d = normalize(vDir); float h = d.y;
  vec3 c = mix(uHor, uMid, smoothstep(0.0, 0.16, h));
  c = mix(c, uTop, smoothstep(0.16, 0.8, h));
  float sd = dot(d, uSun);
  c += vec3(1.0, 0.9, 0.7) * pow(max(sd, 0.0), 14.0) * 0.2;
  c = mix(c, mix(c, vec3(1.0, 0.95, 0.74), 0.5), smoothstep(0.984, 0.9855, sd));
  c = mix(c, vec3(1.0, 0.98, 0.88), smoothstep(0.9962, 0.997, sd));
  vec2 az = normalize(d.xz + 1e-5);
  float hb = 0.025 + 0.07 * vn(az * 3.0 + 4.0) + 0.035 * vn(az * 11.0 + 1.7);
  float cl = step(h, hb) * step(-0.02, h);
  c = mix(c, mix(vec3(0.83, 0.89, 0.98), vec3(1.0), step(hb * 0.55, h)), cl);
  vec2 cp = d.xz / (h + 0.25);
  float ci = step(0.74, vn(cp * vec2(1.2, 5.0) + uTime * 0.004)) * smoothstep(0.18, 0.4, h);
  c = mix(c, vec3(1.0), ci * 0.3);
  if (h < 0.0) c = uHor;
  gl_FragColor = vec4(c, 1.0);
}`;

// Open sea: rolling swell, the white cell-edge squiggles, shallows and surf rings round every island,
// spiral bases under the whirlpool and the cyclones, and toon sun glints.
const WATER_V = `
uniform float uTime; uniform vec2 uSnap;
varying vec3 vWP; varying vec3 vN; varying float vDepth;
${WAVE_GL}
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  float h = wave(wp.xz, uTime);
  float hx = wave(wp.xz + vec2(0.6, 0.0), uTime) - h, hz = wave(wp.xz + vec2(0.0, 0.6), uTime) - h;
  wp.y += h;
  vN = normalize(vec3(-hx, 0.6, -hz)); vWP = wp.xyz;
  vec4 mv = viewMatrix * wp; vec4 p = projectionMatrix * mv;
  ${SNAP}
  gl_Position = p; vDepth = -mv.z;
}`;
const WATER_F = `
uniform float uTime; uniform vec3 uSun; uniform vec3 uSea; uniform vec3 uSeaFar; uniform vec3 uShallow;
uniform vec4 uIsl[32]; uniform vec4 uPool; uniform vec4 uCyc[2];
${FOG_GL}
${NOISE_GL}
varying vec3 vWP; varying vec3 vN; varying float vDepth;
vec2 h22(vec2 p){ vec3 a = fract(vec3(p.xyx) * vec3(123.34, 234.34, 345.65)); a += dot(a, a + 34.45); return fract(vec2(a.x * a.y, a.y * a.z)); }
float cells(vec2 x, float t){
  vec2 n = floor(x), f = fract(x); float f1 = 8.0, f2 = 8.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j)); vec2 o = 0.5 + 0.38 * sin(t + 6.2831 * h22(n + g));
    vec2 r = g + o - f; float d = dot(r, r);
    if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
  }
  return sqrt(f2) - sqrt(f1);
}
float swirl(vec2 p, vec4 w, float t, out float core){
  vec2 q = p - w.xy; float r = length(q); core = 0.0;
  if (w.z <= 0.0 || r > w.z) return 0.0;
  float k = r / w.z;
  float s = fract(atan(q.y, q.x) / 6.2831 * 3.0 + log(r + 1.0) * 1.8 - t * w.w);
  core = 1.0 - smoothstep(0.0, 0.35, k);
  return step(0.8, s) * (1.0 - smoothstep(0.7, 1.0, k)) * smoothstep(0.06, 0.2, k);
}
void main(){
  vec3 n = normalize(vN); vec2 p = vWP.xz; float t = uTime;
  vec3 c = mix(uSea, uSeaFar, smoothstep(30.0, 380.0, vDepth));
  c *= 0.95 + 0.1 * step(0.03, dot(n.xz, normalize(uSun.xz)));
  float sh = 0.0, foam = 0.0, wob = vn(p * 0.45 + t * 0.4) * 1.3;
  for (int i = 0; i < 32; i++) {
    vec4 I = uIsl[i];
    if (I.z <= 0.0) continue;
    float d = length(p - I.xy) - I.z;
    if (d > 16.0) continue;
    sh = max(sh, 1.0 - smoothstep(0.0, 11.0, d));
    foam = max(foam, step(d, 0.5 + wob) * step(-4.0, d));
    float rip = fract(d * 0.2 - t * 0.32);
    foam = max(foam, step(0.87, rip) * step(0.4, d) * (1.0 - smoothstep(4.0, 11.0, d)) * step(0.38, vn(p * 0.35 + 5.0)));
  }
  c = mix(c, uShallow, sh * 0.88);
  vec2 q = p * 0.075 + vec2(vn(p * 0.03 + t * 0.03), vn(p * 0.03 + 9.1 - t * 0.02)) * 1.4;
  float l1 = (1.0 - smoothstep(0.02, 0.04, cells(q, t * 0.5))) * step(0.6, vn(p * 0.09 + vec2(t * 0.15, -t * 0.06))) * step(0.42, vn(p * 0.45 - t * 0.2));
  float l2 = (1.0 - smoothstep(0.018, 0.034, cells(p * 0.16 + vec2(t * 0.04, 0.0), t * 0.8 + 2.0))) * step(0.66, vn(p * 0.14 - t * 0.1 + 3.7));
  c = mix(c, vec3(1.0), max(l1, l2 * 0.85) * 0.8 * (1.0 - smoothstep(50.0, 240.0, vDepth)));
  float core; float s1 = swirl(p, uPool, t, core);
  c = mix(c, uSea * 0.5, core * 0.8); c = mix(c, vec3(1.0), s1);
  for (int i = 0; i < 2; i++) { float cc; float s2 = swirl(p, uCyc[i], t, cc); c = mix(c, uSea * 0.65, cc * 0.6); c = mix(c, vec3(0.96), s2); }
  c = mix(c, vec3(1.0), foam);
  vec3 v = normalize(cameraPosition - vWP);
  c = mix(c, vec3(1.0, 0.98, 0.9), step(0.993, dot(reflect(-v, n), uSun)) * step(0.4, vn(p * 1.3 + t)));
  gl_FragColor = vec4(fogged(c, vDepth), 1.0);
}`;

// Wake ribbons: the churned trail behind the stern and the Kelvin V lines off the bow. Opaque with discard, so no sorting.
const WAKE_V = `
uniform float uTime; uniform vec2 uSnap; attribute vec3 aW;
varying vec3 vW; varying vec3 vWP; varying float vDepth;
${WAVE_GL}
void main(){
  vec3 wp = position; wp.y = wave(wp.xz, uTime) + 0.08 + aW.z * 0.015;
  vW = aW; vWP = wp;
  vec4 mv = viewMatrix * vec4(wp, 1.0); vec4 p = projectionMatrix * mv;
  ${SNAP}
  gl_Position = p; vDepth = -mv.z;
}`;
const WAKE_F = `
uniform float uTime;
${FOG_GL}
${NOISE_GL}
varying vec3 vW; varying vec3 vWP; varying float vDepth;
void main(){
  float a = vW.x, u = abs(vW.y);
  float n = vn(vWP.xz * 0.9 + vec2(uTime * 0.3, 0.0)) * 0.6 + vn(vWP.xz * 2.4) * 0.4;
  float keep; vec3 c;
  if (vW.z < 0.5) {
    float body = (1.0 - u * u) * (1.0 - a);
    keep = step(0.3 + 0.45 * a, body * 0.9 + n * 0.45);
    c = mix(vec3(0.62, 0.88, 0.98), vec3(1.0), step(0.5 + 0.4 * a, body + n * 0.3));
  } else {
    float body = (1.0 - u) * (1.0 - a * 0.55);
    keep = step(0.3 + 0.32 * a, body + (n - 0.5) * 0.4);
    c = mix(vec3(1.0), vec3(0.7, 0.9, 1.0), smoothstep(0.2, 0.7, a));
  }
  if (keep < 0.5) discard;
  gl_FragColor = vec4(fogged(c, vDepth), 1.0);
}`;

// Foam collar hugging the hull at the waterline, streaming aft.
const COLLAR_V = `uniform vec2 uSnap; attribute vec2 aF; varying vec2 vF; varying float vDepth;
void main(){ vF = aF; vec4 mv = modelViewMatrix * vec4(position, 1.0); vec4 p = projectionMatrix * mv; ${SNAP} gl_Position = p; vDepth = -mv.z; }`;
const COLLAR_F = `uniform float uTime; ${FOG_GL} ${NOISE_GL} varying vec2 vF; varying float vDepth;
void main(){
  float n = vn(vec2(vF.x * 16.0 + uTime * 7.0, vF.y * 3.0));
  if (vF.y > 0.25 + 0.75 * n * (0.35 + vF.x * 0.8)) discard;
  gl_FragColor = vec4(fogged(mix(vec3(1.0), vec3(0.7, 0.9, 1.0), step(0.55, vF.y + n * 0.3)), vDepth), 1.0);
}`;

// Square sail: billows forward, flutters at the leech, carries a red crest and a gold hem.
const SAIL_V = `
uniform float uTime; uniform vec2 uSnap; uniform float uBillow;
varying vec2 vUv; varying vec3 vWP; varying float vDepth;
void main(){
  vUv = uv; vec3 q = position;
  float b = sin(3.14159 * uv.x) * sin(3.14159 * (0.12 + uv.y * 0.82));
  q.z += b * uBillow * (1.0 + 0.07 * sin(uTime * 5.0 + uv.y * 4.0 + uv.x * 3.0));
  q.x *= 1.0 - (1.0 - uv.y) * 0.1;
  vec4 wp = modelMatrix * vec4(q, 1.0); vWP = wp.xyz;
  vec4 mv = viewMatrix * wp; vec4 p = projectionMatrix * mv;
  ${SNAP}
  gl_Position = p; vDepth = -mv.z;
}`;
const SAIL_F = `
uniform vec3 uSun; uniform vec3 uCloth; uniform vec3 uMark; uniform vec3 uTrim;
${FOG_GL}
varying vec2 vUv; varying vec3 vWP; varying float vDepth;
void main(){
  vec3 n = normalize(cross(dFdx(vWP), dFdy(vWP)));
  float lit = smoothstep(0.12, 0.2, abs(dot(n, uSun)));
  vec2 q = vUv - vec2(0.5, 0.56);
  float r = length(q * vec2(1.0, 1.1));
  float ring = step(0.2, r) * step(r, 0.25);
  vec2 w = vec2(abs(q.x), q.y);
  float wing = step(abs(w.y - 0.55 * w.x + 0.02), 0.032) * step(w.x, 0.16) * step(0.02, w.x);
  float body = step(abs(q.x), 0.028) * step(-0.13, q.y) * step(q.y, 0.08);
  float head = step(length(q - vec2(0.0, 0.12)), 0.042);
  float mark = max(max(ring, wing), max(body, head));
  float trim = step(min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)), 0.035);
  vec3 base = mix(mix(uCloth, uMark, mark), uTrim, trim);
  gl_FragColor = vec4(fogged(mix(base * vec3(0.72, 0.76, 0.92), base, lit), vDepth), 1.0);
}`;

// Pennant: streams aft, tapers, waves.
const FLAG_V = `uniform float uTime; uniform vec2 uSnap; uniform float uLen; varying float vK; varying float vDepth;
void main(){ vec3 q = position; float k = clamp(q.x / uLen, 0.0, 1.0); vK = k;
  q.y *= 1.0 - k * 0.75; q.z += sin(k * 7.0 - uTime * 11.0) * k * uLen * 0.16;
  vec4 mv = modelViewMatrix * vec4(q, 1.0); vec4 p = projectionMatrix * mv; ${SNAP} gl_Position = p; vDepth = -mv.z; }`;
const FLAG_F = `uniform vec3 uColor; ${FOG_GL} varying float vK; varying float vDepth;
void main(){ gl_FragColor = vec4(fogged(mix(uColor, uColor * 0.72, step(0.5, fract(vK * 2.5))), vDepth), 1.0); }`;

// Falling water off the sky islands: streaks scroll down and the sheet breaks into spray before it ends.
const FALL_V = `uniform vec2 uSnap; varying vec2 vUv; varying float vDepth;
void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vec4 p = projectionMatrix * mv; ${SNAP} gl_Position = p; vDepth = -mv.z; }`;
const FALL_F = `uniform float uTime; ${FOG_GL} ${NOISE_GL} varying vec2 vUv; varying float vDepth;
void main(){
  float y = 1.0 - vUv.y;
  float edge = smoothstep(0.0, 0.14, vUv.x) * smoothstep(1.0, 0.86, vUv.x);
  float a = edge * (1.0 - smoothstep(0.45, 1.0, y));
  if (a < 0.3 + 0.35 * vn(vUv * vec2(18.0, 30.0) + vec2(0.0, uTime * 3.0))) discard;
  float streak = step(0.55, vn(vec2(vUv.x * 9.0, vUv.y * 3.0 + uTime * 2.2)));
  gl_FragColor = vec4(fogged(mix(vec3(0.55, 0.82, 0.98), vec3(1.0), streak), vDepth), 1.0);
}`;

// Cyclone funnel: wandering spine, spiral bands rising round it, cut out with discard.
const CYC_V = `uniform float uTime; uniform vec2 uSnap; varying vec2 vUv; varying float vDepth;
void main(){ vUv = uv; vec3 q = position; float y = q.y;
  q.x += sin(y * 0.06 + uTime * 0.5) * y * 0.1; q.z += cos(y * 0.05 + uTime * 0.4) * y * 0.08;
  vec4 mv = modelViewMatrix * vec4(q, 1.0); vec4 p = projectionMatrix * mv; ${SNAP} gl_Position = p; vDepth = -mv.z; }`;
const CYC_F = `uniform float uTime; uniform float uSpd; uniform vec3 uCol; uniform float uCut; ${FOG_GL} ${NOISE_GL}
varying vec2 vUv; varying float vDepth;
void main(){
  float s = fract(vUv.x * 4.0 + vUv.y * 3.0 - uTime * uSpd);
  float n = vn(vec2(vUv.x * 14.0 - uTime * uSpd * 3.0, vUv.y * 10.0));
  float fade = smoothstep(0.0, 0.08, vUv.y) * (1.0 - smoothstep(0.78, 1.0, vUv.y));
  if (step(s, uCut + 0.25 * n) * fade < 0.5) discard;
  gl_FragColor = vec4(fogged(mix(uCol * 0.84, uCol, step(0.5, n)), vDepth), 1.0);
}`;

const RAIN_V = `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const RAIN_F = `uniform vec2 uR; varying vec2 vP;
void main(){
  float k = clamp((length(vP) - uR.x) / (uR.y - uR.x), 0.0, 1.0);
  float hue = floor((1.0 - k) * 6.0) / 6.0 * 0.8;
  vec3 c = clamp(abs(mod(hue * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  gl_FragColor = vec4(mix(c, vec3(1.0), 0.25), 0.22 * smoothstep(0.0, 60.0, vP.y));
}`;

// Spray, foam, embers, rain: round cel discs with a shaded crescent.
const PART_V = `uniform float uScale; uniform vec2 uSnap; attribute float aSize; attribute vec3 aC;
varying vec3 vC; varying float vDepth;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vec4 p = projectionMatrix * mv; ${SNAP}
  gl_Position = p; gl_PointSize = max(aSize * uScale / -mv.z, 0.0); vC = aC; vDepth = -mv.z; }`;
const PART_F = `${FOG_GL} varying vec3 vC; varying float vDepth;
void main(){ vec2 q = gl_PointCoord * 2.0 - 1.0; if (dot(q, q) > 1.0) discard;
  vec3 c = mix(vC * vec3(0.72, 0.85, 1.0), vC, step(q.x * 0.45 + q.y * 0.75, 0.25));
  gl_FragColor = vec4(fogged(c, vDepth), 1.0); }`;

type Paint = string | THREE.Color | ((c: V3, n: V3) => string | THREE.Color);
type Kind =
  | "palm" | "village" | "snow" | "volcano" | "mesa" | "lighthouse" | "forest"
  | "stacks" | "platform" | "ruins" | "atoll" | "crystal" | "mushroom" | "wreck";

const COLS = new Map<string, THREE.Color>();
const col = (c: string | THREE.Color) => {
  if (typeof c !== "string") return c;
  let v = COLS.get(c);
  if (!v) COLS.set(c, (v = new THREE.Color(c)));
  return v;
};
const hash3 = (x: number, y: number, z: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
};
// Deterministic per-particle randoms.
const hr = (i: number, k: number) => {
  const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return s - Math.floor(s);
};
// Hashed from position, so shared corners move together and seams stay closed.
const jitter = (g: THREE.BufferGeometry, amt: number) => {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const kx = Math.round(x * 100), ky = Math.round(y * 100), kz = Math.round(z * 100);
    p.setXYZ(i, x + (hash3(kx, ky, kz) - 0.5) * amt, y + (hash3(ky, kz, kx) - 0.5) * amt, z + (hash3(kz, kx, ky) - 0.5) * amt);
  }
};
const _c = new THREE.Vector3(), _n = new THREE.Vector3();
/** Flat-shaded, per-face coloured copy: position + normal + aCol, ready to merge. */
const paint = (src: THREE.BufferGeometry, p: Paint, jit = 0) => {
  const g = src.index ? src.toNonIndexed() : src;
  for (const key of Object.keys(g.attributes)) if (key !== "position") g.deleteAttribute(key);
  if (jit) jitter(g, jit);
  g.computeVertexNormals();
  const pos = g.attributes.position, nor = g.attributes.normal, ca = new Float32Array(pos.count * 3);
  for (let i = 0; i + 2 < pos.count; i += 3) {
    let c: THREE.Color;
    if (typeof p === "function") {
      _c.set(
        (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3,
        (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3,
        (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3,
      );
      _n.set(nor.getX(i), nor.getY(i), nor.getZ(i));
      c = col(p(_c, _n));
    } else c = col(p);
    for (let v = (i + 2) * 3; v >= i * 3; v -= 3) {
      ca[v] = c.r;
      ca[v + 1] = c.g;
      ca[v + 2] = c.b;
    }
  }
  g.setAttribute("aCol", new THREE.BufferAttribute(ca, 3));
  return g;
};
/** Averaged normals for the ink hull, so faceted parts get one closed outline. */
const smoothOut = (g: THREE.BufferGeometry) => {
  const p = g.attributes.position, n = g.attributes.normal, idx = new Int32Array(p.count);
  const seen = new Map<number, number>(), sums: number[] = [];
  for (let i = 0; i < p.count; i++) {
    // Quantised position packed into one number (exact for |coord| < ~400 at 1/40 steps).
    const key = (Math.round(p.getX(i) * 40) + 16384) * 1073741824 + (Math.round(p.getY(i) * 40) + 16384) * 32768 + (Math.round(p.getZ(i) * 40) + 16384);
    let j = seen.get(key);
    if (j === undefined) {
      j = sums.length / 3;
      seen.set(key, j);
      sums.push(0, 0, 0);
    }
    sums[j * 3] += n.getX(i);
    sums[j * 3 + 1] += n.getY(i);
    sums[j * 3 + 2] += n.getZ(i);
    idx[i] = j;
  }
  const out = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const j = idx[i], x = sums[j * 3], y = sums[j * 3 + 1], z = sums[j * 3 + 2], l = Math.hypot(x, y, z) || 1;
    out[i * 3] = x / l;
    out[i * 3 + 1] = y / l;
    out[i * 3 + 2] = z / l;
  }
  g.setAttribute("aOut", new THREE.BufferAttribute(out, 3));
};
const UPV = new THREE.Vector3(0, 1, 0);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
/** Cylinder from a to b. */
const seg = (a: V3, b: V3, r0: number, r1: number, n = 6) => {
  const g = new THREE.CylinderGeometry(r1, r0, a.distanceTo(b), n, 1);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UPV, b.clone().sub(a).normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
};

/** Lofted hull, bow at +z. Stern is a flat transom, the bow sweeps up by `rise`. */
function hullGeo(L: number, Bm: number, D: number, rise: number, NS = 16, NV = 8) {
  const st = (f: number) => {
    const w = Bm * (f < 0.5 ? 0.8 + 0.2 * Math.sin((f / 0.5) * Math.PI * 0.5) : Math.pow(Math.max(0, Math.cos(((f - 0.5) / 0.5) * Math.PI * 0.5)), 0.7));
    return { z: (f - 0.45) * L, w: Math.max(w, 0.03), top: D * 0.5 + rise * f ** 3, keel: -D * 0.5 * (1 - f ** 3) + rise * 0.55 * f ** 4 };
  };
  const pt = (i: number, j: number) => {
    const s = st(i / NS), ph = (j / NV) * Math.PI;
    return v3(s.w * Math.cos(ph), s.top + (s.keel - s.top) * Math.pow(Math.sin(ph), 0.6), s.z);
  };
  const side: number[] = [], deck: number[] = [], stern: number[] = [];
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), nn = new THREE.Vector3();
  const tri = (out: number[], a: V3, b: V3, c: V3, ref: V3) => {
    nn.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a));
    if (nn.dot(ref) < 0) [b, c] = [c, b];
    out.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  };
  for (let i = 0; i < NS; i++) {
    const s = st(i / NS), mid = (s.top + s.keel) / 2;
    for (let j = 0; j < NV; j++) {
      const a = pt(i, j), b = pt(i + 1, j), c = pt(i + 1, j + 1), d = pt(i, j + 1);
      const ref = v3((a.x + c.x) / 2, (a.y + c.y) / 2 - mid, 0);
      tri(side, a, b, c, ref);
      tri(side, a, c, d, ref);
    }
    const s1 = st((i + 1) / NS), dy = -0.03;
    tri(deck, v3(-s.w, s.top + dy, s.z), v3(s.w, s.top + dy, s.z), v3(s1.w, s1.top + dy, s1.z), UPV);
    tri(deck, v3(-s.w, s.top + dy, s.z), v3(s1.w, s1.top + dy, s1.z), v3(-s1.w, s1.top + dy, s1.z), UPV);
  }
  const s0 = st(0), back = v3(0, 0, -1), cen = v3(0, (s0.top + s0.keel) / 2, s0.z);
  for (let j = 0; j < NV; j++) tri(stern, cen, pt(0, j), pt(0, j + 1), back);
  tri(stern, cen, pt(0, NV), pt(0, 0), back);
  const geo = (a: number[]) => new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(a, 3));
  return { side: geo(side), deck: geo(deck), stern: geo(stern), st, sheer: (z: number) => st(z / L + 0.45).top };
}

function world(k: PsxKit, scene: THREE.Scene, cam: THREE.PerspectiveCamera) {
  const { U, rnd, view } = k;
  const SUN = new THREE.Vector3(-0.42, 0.5, -0.76).normalize();
  const S = {
    uSun: { value: SUN },
    uFog: { value: new THREE.Color(C.fog) },
    uFogR: { value: new THREE.Vector2(160, 860) },
    uPx: { value: 0.01 },
    uScale: { value: 300 },
  };
  const fogU = { uFog: S.uFog, uFogR: S.uFogR, uSnap: U.uSnap };

  /* ---- materials ---- */
  const toon = (o: { shade?: [number, number, number]; emit?: number; rim?: number; tint?: string; side?: THREE.Side } = {}) =>
    new THREE.ShaderMaterial({
      vertexShader: TOON_V,
      fragmentShader: TOON_F,
      side: o.side ?? THREE.FrontSide,
      uniforms: {
        ...fogU,
        uSun: S.uSun,
        uShade: { value: new THREE.Vector3(...(o.shade ?? [0.56, 0.6, 0.84])) },
        uTint: { value: new THREE.Color(o.tint ?? "#ffffff") },
        uEmit: { value: o.emit ?? 0 },
        uRim: { value: o.rim ?? 0.18 },
      },
    });
  const T = {
    solid: toon(),
    glow: toon({ emit: 1, rim: 0 }),
    two: toon({ side: THREE.DoubleSide, rim: 0 }),
    cloud: toon({ shade: [0.8, 0.86, 1.0], rim: 0 }),
    storm: toon({ shade: [0.66, 0.7, 0.84], tint: "#8f97ab", rim: 0 }),
    smoke: toon({ shade: [0.7, 0.72, 0.82], tint: "#a59fab", rim: 0 }),
  };
  const outMat = new THREE.ShaderMaterial({
    vertexShader: OUT_V,
    fragmentShader: OUT_F,
    side: THREE.BackSide,
    uniforms: { ...fogU, uPx: S.uPx, uCol: { value: new THREE.Color(C.ink) } },
  });
  const shader = (v: string, f: string, u: Record<string, THREE.IUniform>, o: Partial<THREE.ShaderMaterialParameters> = {}) =>
    new THREE.ShaderMaterial({ vertexShader: v, fragmentShader: f, uniforms: { ...fogU, uTime: U.uTime, ...u }, ...o });
  const flagMat = shader(FLAG_V, FLAG_F, { uColor: U.uAccent, uLen: { value: 1.1 } }, { side: THREE.DoubleSide });
  const fallMat = shader(FALL_V, FALL_F, {}, { side: THREE.DoubleSide });

  /* ---- batching: parts merge per material into one mesh, plus one ink hull ---- */
  const batch = () => {
    const parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pv = new THREE.Vector3(), sv = new THREE.Vector3();
    return {
      add(geo: THREE.BufferGeometry, p: Paint, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s: number | [number, number, number] = 1, mat: THREE.Material = T.solid, jit = 0) {
        if (Array.isArray(s)) sv.set(s[0], s[1], s[2]);
        else sv.set(s, s, s);
        m4.compose(pv.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), sv);
        const g = geo.clone().applyMatrix4(m4);
        const list = parts.get(mat) ?? [];
        list.push(g.getAttribute("aCol") ? g : paint(g, p, jit));
        parts.set(mat, list);
      },
      flush(parent: THREE.Object3D, ink = true) {
        for (const [mat, list] of parts) {
          const merged = mergeGeometries(list);
          if (!merged) continue;
          parent.add(new THREE.Mesh(merged, mat));
          if (ink && mat === T.solid) {
            smoothOut(merged);
            parent.add(new THREE.Mesh(merged, outMat));
          }
        }
        parts.clear();
      },
    };
  };
  type Bt = ReturnType<typeof batch>;

  const G = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cyl6: new THREE.CylinderGeometry(1, 1, 1, 6),
    cyl8: new THREE.CylinderGeometry(1, 1, 1, 8),
    cone4: new THREE.ConeGeometry(1, 1, 4),
    cone6: new THREE.ConeGeometry(1, 1, 6),
    ico0: new THREE.IcosahedronGeometry(1, 0),
    ico1: new THREE.IcosahedronGeometry(1, 1),
    ico2: new THREE.IcosahedronGeometry(1, 2),
    dode: new THREE.DodecahedronGeometry(1, 0),
    oct: new THREE.OctahedronGeometry(1, 0),
    // Triangular prism along z, apex up: base at y=-0.5, apex at y=1.
    roof: new THREE.CylinderGeometry(1, 1, 1, 3, 1, false, Math.PI).rotateX(Math.PI / 2),
    hemi: new THREE.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2),
    frond: new THREE.ConeGeometry(0.55, 2.8, 4).scale(0.18, 1, 1).translate(0, 1.4, 0),
  };
  const dyn: ((t: number) => void)[] = [];

  /* ---- sky and sea, both centred on the camera every frame ---- */
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1000, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: SKY_V,
      fragmentShader: SKY_F,
      uniforms: {
        uTop: { value: new THREE.Color(C.skyTop) }, uMid: { value: new THREE.Color(C.skyMid) }, uHor: S.uFog,
        uSun: S.uSun, uTime: U.uTime,
      },
    }),
  );
  sky.renderOrder = -1;
  sky.frustumCulled = false;
  scene.add(sky);

  const ISL = Array.from({ length: 32 }, () => new THREE.Vector4(0, 0, -1, 0));
  let nIsl = 0;
  const POOL = new THREE.Vector4(0, 0, 0, 0.45);
  const CYC = [new THREE.Vector4(), new THREE.Vector4()];
  const WN = 120, WH = 950;
  const wg = new THREE.PlaneGeometry(2, 2, WN, WN);
  wg.rotateX(-Math.PI / 2);
  const wp0 = wg.attributes.position;
  const warp = (u: number) => Math.sign(u) * Math.pow(Math.abs(u), 1.9) * WH;
  for (let i = 0; i < wp0.count; i++) wp0.setXYZ(i, warp(wp0.getX(i)), 0, warp(wp0.getZ(i)));
  const water = new THREE.Mesh(
    wg,
    shader(WATER_V, WATER_F, {
      uSun: S.uSun,
      uSea: { value: new THREE.Color(C.sea) }, uSeaFar: { value: new THREE.Color(C.seaFar) }, uShallow: { value: new THREE.Color(C.shallow) },
      uIsl: { value: ISL }, uPool: { value: POOL }, uCyc: { value: CYC },
    }),
  );
  water.frustumCulled = false;
  scene.add(water);

  /* ---- the route: a wavy closed loop, walked at constant speed via an arc-length table ---- */
  const route = (th: number, o: V3) => {
    const r = 175 + 36 * Math.sin(3 * th + 0.4) + 12 * Math.sin(5 * th + 1.3);
    return o.set(Math.cos(th) * r, 0, Math.sin(th) * r * 0.82);
  };
  const NL = 2048, lutS = new Float32Array(NL + 1);
  const A = new THREE.Vector3(), Bv = new THREE.Vector3(), Fv = new THREE.Vector3();
  let LEN = 0;
  route(0, A);
  for (let i = 1; i <= NL; i++) {
    route((i / NL) * Math.PI * 2, Bv);
    LEN += A.distanceTo(Bv);
    lutS[i] = LEN;
    A.copy(Bv);
  }
  const thAt = (s: number) => {
    s = ((s % LEN) + LEN) % LEN;
    let lo = 0, hi = NL;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (lutS[m] <= s) lo = m;
      else hi = m;
    }
    return ((lo + (s - lutS[lo]) / Math.max(1e-6, lutS[lo + 1] - lutS[lo])) / NL) * Math.PI * 2;
  };
  /** Point `off` to the right of the route at arc length s, heading `dir` (+1 with the boat, -1 against). */
  const along = (s: number, pos: V3, fwd: V3, off = 0, dir = 1) => {
    route(thAt(s), pos);
    route(thAt(s + 0.8 * dir), fwd);
    fwd.sub(pos).normalize();
    if (off) {
      pos.x -= fwd.z * off;
      pos.z += fwd.x * off;
    }
  };
  const SPEED = 12;
  const boatAt = (t: number, pos: V3, fwd: V3) => along(t * SPEED, pos, fwd);
  const RP: V3[] = [];
  for (let i = 0; i < 256; i++) RP.push(route((i / 256) * Math.PI * 2, new THREE.Vector3()));
  const pathDist = (x: number, z: number) => RP.reduce((m, p) => Math.min(m, Math.hypot(p.x - x, p.z - z)), Infinity);

  /* ---- props shared by the islands ---- */
  const palm = (B: Bt, x: number, y: number, z: number, s = 1) => {
    const H = (4 + rnd() * 2) * s, lean = (0.8 + rnd() * 1.2) * s, ry = rnd() * 6.28, n = 5;
    const P = (i: number) => v3(x + Math.cos(ry) * lean * (i / n) ** 2, y - 0.3 + (H * i) / n, z + Math.sin(ry) * lean * (i / n) ** 2);
    for (let i = 0; i < n; i++) B.add(seg(P(i), P(i + 1), (0.26 - i * 0.03) * s, (0.23 - (i + 1) * 0.03) * s), i % 2 ? C.trunk : C.trunkLt);
    const top = P(n);
    for (let f = 0; f < 7; f++) {
      const a = (f / 7) * 6.28 + rnd() * 0.4, droop = 0.3 + rnd() * 0.45;
      B.add(G.frond, f % 2 ? C.leaf : C.leafLt, top.x, top.y, top.z, 0, a, -(Math.PI / 2 + droop), s);
    }
    for (let c = 0; c < 3; c++) B.add(G.ico0, C.woodDk, top.x + Math.cos(c * 2.1) * 0.25 * s, top.y - 0.25 * s, top.z + Math.sin(c * 2.1) * 0.25 * s, 0, 0, 0, 0.2 * s);
  };
  const tree = (B: Bt, x: number, y: number, z: number, s = 1, tone = 0) => {
    B.add(seg(v3(x, y - 0.4, z), v3(x, y + 1.7 * s, z), 0.24 * s, 0.16 * s, 5), C.trunk);
    const lc = [C.leaf, C.leafLt, C.grassDk][tone % 3];
    B.add(G.ico1, lc, x, y + 2.4 * s, z, rnd(), rnd(), 0, [1.3 * s, 1.15 * s, 1.3 * s], T.solid, 0.18 * s);
    if (rnd() > 0.4) B.add(G.ico1, lc, x + 0.7 * s, y + 1.9 * s, z + 0.3 * s, 0, rnd(), 0, 0.8 * s, T.solid, 0.12 * s);
  };
  const pine = (B: Bt, x: number, y: number, z: number, s = 1, snowy = false) => {
    B.add(G.cyl6, C.trunk, x, y + 0.4 * s, z, 0, 0, 0, [0.2 * s, 1.2 * s, 0.2 * s]);
    for (let i = 0; i < 3; i++) {
      const w = (1.4 - i * 0.35) * s;
      B.add(G.cone6, (c) => (snowy && c.y > y + (1.6 + i * 1.1) * s ? C.snow : C.pine), x, y + (1.5 + i * 1.1) * s, z, 0, rnd(), 0, [w, 1.7 * s, w]);
    }
  };
  const house = (B: Bt, x: number, y: number, z: number, s = 1, ry = 0, roofC: string = C.roof) => {
    B.add(G.box, C.wall, x, y + 0.75 * s, z, 0, ry, 0, [2 * s, 1.5 * s, 1.6 * s]);
    B.add(G.roof, roofC, x, y + 1.5 * s + 0.45 * s, z, 0, ry + Math.PI / 2, 0, [1.25 * s, 0.9 * s, 2.3 * s]);
    B.add(G.box, C.woodDk, x + Math.sin(ry) * 0.81 * s, y + 0.45 * s, z + Math.cos(ry) * 0.81 * s, 0, ry, 0, [0.45 * s, 0.9 * s, 0.05]);
    B.add(G.box, C.stoneDk, x + Math.cos(ry) * 0.5 * s, y + 2.2 * s, z - Math.sin(ry) * 0.5 * s, 0, ry, 0, [0.3 * s, 0.8 * s, 0.3 * s]);
  };
  const hut = (B: Bt, x: number, y: number, z: number, s = 1, ry = 0) => {
    B.add(G.cyl8, C.plank, x, y + 0.6 * s, z, 0, ry, 0, [0.9 * s, 1.2 * s, 0.9 * s]);
    B.add(G.cone6, C.straw, x, y + 1.6 * s, z, 0, ry, 0, [1.35 * s, 1.1 * s, 1.35 * s]);
    B.add(G.box, C.woodDk, x + Math.sin(ry) * 0.86 * s, y + 0.45 * s, z + Math.cos(ry) * 0.86 * s, 0, ry, 0, [0.4 * s, 0.8 * s, 0.06]);
  };
  const column = (B: Bt, x: number, y: number, z: number, h: number, r = 0.45, broken = false) => {
    B.add(G.box, C.stoneDk, x, y + 0.15, z, 0, 0, 0, [r * 2.6, 0.3, r * 2.6]);
    B.add(G.cyl8, C.stone, x, y + 0.3 + h / 2, z, 0, 0, 0, [r, h, r], T.solid, broken ? r * 0.4 : 0);
    if (!broken) B.add(G.box, C.stone, x, y + 0.45 + h, z, 0, 0, 0, [r * 2.6, 0.3, r * 2.6]);
  };
  const rocks = (B: Bt, n: number, r0: number, r1: number, s0: number, s1: number, colr: string = C.rock) => {
    for (let i = 0; i < n; i++) {
      const a = rnd() * 6.28, d = r0 + rnd() * (r1 - r0), s = s0 + rnd() * (s1 - s0);
      B.add(G.dode, colr, Math.cos(a) * d, s * 0.1, Math.sin(a) * d, rnd() * 3, rnd() * 3, 0, [s, s * 0.8, s], T.solid, s * 0.3);
    }
  };
  const flag = (parent: THREE.Object3D, x: number, y: number, z: number, len = 1.1) => {
    const g = new THREE.PlaneGeometry(len, len * 0.32, 8, 1).translate(len / 2, 0, 0);
    const m = new THREE.Mesh(g, flagMat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  /** Exposed faces of a cell blob made of ellipsoid lobes [cx, cy, cz, a, b, c] (in cells). */
  const voxGeo = (lobes: number[][], cell: number) => {
    const filled = new Map<string, [number, number, number]>();
    for (const [cx, cy, cz, a, b, c] of lobes) {
      for (let i = -a; i <= a; i++) for (let j = -b; j <= b; j++) for (let kk = -c; kk <= c; kk++) {
        if (j < -b * 0.45) continue;
        if ((i / a) ** 2 + (j / b) ** 2 + (kk / c) ** 2 + (rnd() - 0.5) * 0.4 < 1) {
          const q: [number, number, number] = [i + cx, j + cy, kk + cz];
          filled.set(q.join(","), q);
        }
      }
    }
    const pos: number[] = [], nor: number[] = [], cl: number[] = [];
    const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map(([x, y, z]) => v3(x, y, z));
    const u = new THREE.Vector3(), w = new THREE.Vector3(), cc = new THREE.Vector3();
    const white = col(C.white), under = col("#e4ecfa");
    for (const [i, j, kk] of filled.values()) {
      for (const d of dirs) {
        if (filled.has(`${i + d.x},${j + d.y},${kk + d.z}`)) continue;
        u.set(Math.abs(d.y) > 0.5 ? 1 : 0, Math.abs(d.y) > 0.5 ? 0 : 1, 0);
        w.crossVectors(d, u);
        cc.set(i, j, kk).addScaledVector(d, 0.5);
        const corner = (su: number, sw: number) => [(cc.x + u.x * su * 0.5 + w.x * sw * 0.5) * cell, (cc.y + u.y * su * 0.5 + w.y * sw * 0.5) * cell, (cc.z + u.z * su * 0.5 + w.z * sw * 0.5) * cell];
        const q0 = corner(-1, -1), q1 = corner(1, -1), q2 = corner(1, 1), q3 = corner(-1, 1);
        pos.push(...q0, ...q1, ...q2, ...q0, ...q2, ...q3);
        const c = d.y < -0.5 ? under : white;
        for (let v = 0; v < 6; v++) {
          nor.push(d.x, d.y, d.z);
          cl.push(c.r, c.g, c.b);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute("aCol", new THREE.Float32BufferAttribute(cl, 3));
    return g;
  };
  const puffGeo = paint(new THREE.BoxGeometry(1, 1, 1), C.white);

  /* ---- islands, one builder per biome ---- */
  let volcanoTop = new THREE.Vector3();
  const embers: { x: number; y: number; z: number; r: number }[] = [];
  const isle = (kind: Kind, x: number, z: number, r: number, ink = true) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rnd() * 6.283;
    scene.add(g);
    const B = batch();
    let shore = r * 1.12;
    const beach = (rr = r, c: string = C.sand) =>
      B.add(new THREE.CylinderGeometry(rr * 1.02, rr * 1.2, 2.4, 16, 1), c, 0, -1.0, 0, 0, 0, 0, 1, T.solid, rr * 0.04);
    const land = (rr: number, hh: number, top: string = C.grass, side: string = C.cliff, ox = 0, oz = 0) =>
      B.add(rr > 14 ? G.ico2 : G.ico1, (c, n) => (n.y > 0.62 ? (c.y > hh * 0.8 ? C.grassLt : top) : c.y < 0.9 ? C.sandDk : side), ox, 0, oz, 0, rnd() * 6, 0, [rr, hh, rr], T.solid, rr * 0.05);
    // Surface height of a land() ellipsoid at distance d from its centre (facets sit a little under the sphere).
    const landY = (rr: number, hh: number, d: number) => hh * 0.86 * Math.sqrt(Math.max(0, 1 - (d / rr) ** 2));
    const ring = (n: number, d0: number, d1: number, fn: (px: number, pz: number, d: number, i: number) => void) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 6.28 + rnd() * 0.6, d = d0 + rnd() * (d1 - d0);
        fn(Math.cos(a) * d, Math.sin(a) * d, d, i);
      }
    };

    if (kind === "palm") {
      beach();
      const R = r * 0.8, h = 1.6 + r * 0.1;
      land(R, h);
      ring(3 + Math.floor(r / 4), 0, R * 0.5, (px, pz, d) => palm(B, px, landY(R, h, d), pz, 0.9 + rnd() * 0.4));
      if (r > 11) hut(B, R * 0.35, landY(R, h, R * 0.35) - 0.1, -R * 0.2, 1.2, rnd() * 6);
      ring(4, R * 0.2, R * 0.7, (px, pz, d) => B.add(G.ico1, C.leafLt, px, landY(R, h, d), pz, 0, rnd() * 3, 0, [1, 0.7, 1], T.solid, 0.2));
      rocks(B, 4, r * 1.05, r * 1.25, 0.6, 1.4);
    } else if (kind === "village") {
      beach();
      const R = r * 0.88, h = 3 + r * 0.12;
      land(R, h);
      const ty = landY(R, h, 0) - 0.3;
      B.add(new THREE.CylinderGeometry(0.95, 1.5, 7.5, 8), C.wall, 0, ty + 3.75, 0);
      B.add(G.cone6, C.roof, 0, ty + 8.4, 0, 0, 0, 0, [1.5, 1.8, 1.5]);
      B.add(G.box, C.woodDk, 0, ty + 1, 1.32, -0.12, 0, 0, [0.7, 1.6, 0.1]);
      for (let w = 0; w < 3; w++) B.add(G.box, C.ink, 0, ty + 3 + w * 1.6, 1.16 - w * 0.08, -0.15, 0, 0, [0.4, 0.5, 0.1]);
      const blades = new THREE.Group();
      blades.position.set(0, ty + 7.2, 1.45);
      g.add(blades);
      const BB = batch();
      BB.add(G.ico0, C.gold, 0, 0, 0, 0, 0, 0, 0.35);
      for (let b = 0; b < 4; b++) {
        const a = (b / 4) * Math.PI * 2;
        BB.add(G.box, C.woodDk, Math.cos(a) * 2.2, Math.sin(a) * 2.2, 0, 0, 0, a, [4.4, 0.16, 0.12]);
        BB.add(G.box, C.cream, Math.cos(a + 0.12) * 2.6, Math.sin(a + 0.12) * 2.6, 0.04, 0, 0, a, [2.9, 0.75, 0.05]);
      }
      BB.flush(blades);
      const sp = 0.7 + rnd() * 0.4;
      dyn.push((t) => { blades.rotation.z = t * sp; });
      const roofs = [C.roof, C.roof2, C.roof3, C.roof];
      ring(Math.min(7, 3 + Math.floor(r / 5)), R * 0.38, R * 0.62, (px, pz, d, i) => house(B, px, landY(R, h, d) - 0.25, pz, 0.9 + rnd() * 0.4, Math.atan2(px, pz), roofs[i % 4]));
      ring(5, R * 0.6, R * 0.8, (px, pz, d, i) => tree(B, px, landY(R, h, d), pz, 0.8 + rnd() * 0.4, i));
      // pier
      const py = 0.9;
      B.add(G.box, C.plank, R * 1.05 + 4, py, 0, 0, 0, 0, [9, 0.25, 1.6]);
      for (let i = 0; i < 5; i++) for (const sd of [-0.7, 0.7]) B.add(G.cyl6, C.woodDk, R * 1.05 + 0.5 + i * 1.9, py - 1.5, sd, 0, 0, 0, [0.14, 3.2, 0.14]);
      flag(g, R * 1.05 + 8.2, py + 2.6, 0.6);
      B.add(G.cyl6, C.woodDk, R * 1.05 + 8.2, py + 1.4, 0.6, 0, 0, 0, [0.06, 2.6, 0.06]);
    } else if (kind === "snow") {
      beach(r, "#d9d0bf");
      const h = r * 1.6;
      const peak = (rr: number, hh: number, ox: number, oz: number) =>
        B.add(new THREE.CylinderGeometry(rr * 0.07, rr, hh, 11, 6), (c, n) => (c.y > hh * 0.5 + Math.sin(c.x * 0.9 + c.z * 0.7) * hh * 0.06 || n.y > 0.8 ? C.snow : c.y < 1 ? C.rockDk : C.rockBlue), ox, hh / 2 - 0.6, oz, 0, rnd() * 6, 0, 1, T.solid, rr * 0.08);
      peak(r * 0.95, h, 0, 0);
      peak(r * 0.55, h * 0.62, r * 0.55, r * 0.35);
      ring(Math.floor(r * 0.8), r * 0.72, r * 0.98, (px, pz) => pine(B, px, 0.2, pz, 0.7 + rnd() * 0.5, true));
      ring(Math.floor(r / 2), r * 1.3, r * 1.9, (px, pz) => B.add(G.box, C.snow, px, -0.1, pz, 0, rnd() * 3, 0, [1.5 + rnd() * 3, 1.5, 1.5 + rnd() * 2.5], T.solid, 0.4));
    } else if (kind === "volcano") {
      const big = r > 30;
      beach(r, big ? C.sandDk : C.sand);
      const h = r * (big ? 1.25 : 1.3);
      B.add(new THREE.CylinderGeometry(r * 0.24, r * 0.95, h, big ? 18 : 13, 6), (c, n) =>
        c.y < h * 0.14 && n.y > 0.3 ? C.grass : c.y > h * 0.84 ? C.basaltDk : Math.floor(c.y / (h * 0.16)) % 2 ? C.basalt : C.basalt2,
        0, h / 2 - 0.5, 0, 0, 0, 0, 1, T.solid, r * 0.05);
      const top = h - 0.9;
      B.add(new THREE.CylinderGeometry(r * 0.21, r * 0.21, 0.4, 12), C.lava, 0, top, 0, 0, 0, 0, 1, T.glow);
      for (let i = 0; i < (big ? 5 : 3); i++) {
        const a = rnd() * 6.28, L0 = r * 0.24, L1 = r * (0.45 + rnd() * 0.3);
        const y1 = h - 0.5 - ((L1 - L0) / (r * 0.71)) * h;
        B.add(seg(v3(Math.cos(a) * L0 * 1.05, h - 0.5, Math.sin(a) * L0 * 1.05), v3(Math.cos(a) * L1 * 1.05, y1, Math.sin(a) * L1 * 1.05), r * 0.012, r * 0.03, 5), i % 2 ? C.lava : C.lavaHot, 0, 0, 0, 0, 0, 0, 1, T.glow);
      }
      ring(big ? 14 : 5, r * 0.85, r * 1.0, (px, pz, _d, i) => (i % 2 ? palm(B, px, 0.3, pz, 1.1) : tree(B, px, 0.3, pz, 1, i)));
      const puffs: THREE.Mesh[] = [];
      const N = big ? 10 : 6, sc = big ? 2.4 : 1;
      for (let i = 0; i < N; i++) {
        const m = new THREE.Mesh(puffGeo, T.smoke);
        g.add(m);
        puffs.push(m);
      }
      dyn.push((t) => {
        puffs.forEach((m, i) => {
          const a = (t * 0.1 + i / N) % 1;
          m.position.set(a * a * 9 * sc + Math.sin(i * 2.3) * sc, top + a * 16 * sc, Math.cos(i * 1.7) * sc * (1 + a * 2));
          m.scale.setScalar(sc * (1.4 + a * 3.2) * (a < 0.85 ? 1 : (1 - a) / 0.15));
          m.rotation.set(i + t * 0.2, i * 2 + t * 0.15, 0);
        });
      });
      if (big) {
        g.updateMatrixWorld();
        volcanoTop = g.localToWorld(v3(0, h, 0));
        embers.push({ x, y: top, z, r: r * 0.18 });
      }
    } else if (kind === "mesa") {
      beach(r, "#f0cf8a");
      let y = 0, rr = r * 0.85;
      for (let i = 0; i < 5; i++) {
        const hh = r * (0.16 + rnd() * 0.1);
        B.add(new THREE.CylinderGeometry(rr * 0.9, rr, hh, 7, 1), C.mesa[i % 4], 0, y + hh / 2 - (i ? 0 : 0.6), 0, 0, i * 0.4, 0, 1, T.solid, r * 0.05);
        y += hh - (i ? 0 : 0.6);
        rr *= 0.8;
      }
      B.add(new THREE.TorusGeometry(r * 0.36, r * 0.1, 5, 12, Math.PI), C.mesa[1], r * 0.95, -0.3, 0, 0, Math.PI / 2, 0, 1, T.solid, r * 0.04);
      ring(5, r * 0.6, r * 0.95, (px, pz) => {
        const H = 1.4 + rnd() * 1.4;
        B.add(G.cyl8, C.grassDk, px, H / 2, pz, 0, 0, 0, [0.28, H, 0.28]);
        B.add(G.cyl8, C.grassDk, px + 0.45, H * 0.6, pz, 0, 0, 0, [0.18, H * 0.4, 0.18]);
      });
      rocks(B, 5, r * 1.0, r * 1.3, 0.8, 2, C.mesa[3]);
    } else if (kind === "lighthouse") {
      beach(r, "#dcd2bb");
      const R = r * 0.85, h = r * 0.55;
      land(R, h, C.grass, C.rock);
      const by = landY(R, h, 0) - 0.4;
      for (let i = 0; i < 6; i++) B.add(new THREE.CylinderGeometry(1.25 - (i + 1) * 0.07, 1.25 - i * 0.07, 1.2, 10), i % 2 ? C.white : C.red, 0, by + 0.6 + i * 1.2, 0);
      const gy = by + 7.2;
      B.add(G.cyl8, C.ink, 0, gy + 0.1, 0, 0, 0, 0, [1.25, 0.2, 1.25]);
      B.add(G.cyl8, C.lavaHot, 0, gy + 0.65, 0, 0, 0, 0, [0.7, 0.9, 0.7], T.glow);
      B.add(G.cone6, C.red, 0, gy + 1.6, 0, 0, 0, 0, [1.0, 1.0, 1.0]);
      house(B, 2.6, landY(R, h, 2.6) - 0.3, 1.4, 0.8, 0.5, C.roof2);
      rocks(B, 6, r * 1.0, r * 1.3, 1, 2.4);
      const beam = new THREE.Mesh(
        new THREE.ConeGeometry(2.4, 28, 10, 1, true).translate(0, -14, 0).rotateZ(Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: "#fff4b8", transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
      );
      beam.position.set(0, gy + 0.65, 0);
      g.add(beam);
      dyn.push((t) => { beam.rotation.y = t * 0.8; });
    } else if (kind === "forest") {
      beach();
      const R = r * 0.9, h = r * 0.3;
      land(R, h);
      const by = landY(R, h, 0) - 0.5, H = 8 + r * 0.5;
      B.add(seg(v3(0, by - 1, 0), v3(0.4, by + H, 0.2), 1.9, 1.1, 8), C.trunk, 0, 0, 0, 0, 0, 0, 1, T.solid, 0.3);
      for (let i = 0; i < 4; i++) {
        const a = i * 1.6, top = v3(Math.cos(a) * 4.5, by + H * 0.85 + rnd() * 2, Math.sin(a) * 4.5);
        B.add(seg(v3(0.3, by + H * 0.6, 0.1), top, 0.7, 0.4, 6), C.trunk);
        B.add(G.ico1, i % 2 ? C.leaf : C.leafLt, top.x, top.y + 1.5, top.z, rnd(), rnd(), 0, [4, 3.2, 4], T.solid, 0.6);
        B.add(seg(v3(0, by + 0.5, 0), v3(Math.cos(a + 0.8) * 3.5, by - 0.6, Math.sin(a + 0.8) * 3.5), 0.7, 0.3, 5), C.trunk);
      }
      B.add(G.ico1, C.leafLt, 0.4, by + H + 3, 0.2, 0, 0, 0, [5, 4, 5], T.solid, 0.7);
      ring(8, R * 0.45, R * 0.8, (px, pz, d, i) => tree(B, px, landY(R, h, d), pz, 0.9 + rnd() * 0.5, i));
    } else if (kind === "stacks") {
      shore = r * 0.85;
      ring(5, 0, r * 0.6, (px, pz, _d, i) => {
        const H = 6 + rnd() * 12, w = 1.6 + rnd() * 2;
        B.add(new THREE.CylinderGeometry(w * 0.7, w, H, 6, 4), (c, n) => (n.y > 0.7 ? C.grass : Math.floor(c.y / 2.2) % 2 ? C.cliff : C.cliffDk), px, H / 2 - 1, pz, 0, rnd() * 3, 0, 1, T.solid, w * 0.3);
        if (i % 2 === 0) tree(B, px, H - 1.3, pz, 0.6, i);
      });
      rocks(B, 6, r * 0.5, r * 0.9, 0.8, 2, C.cliffDk);
    } else if (kind === "platform") {
      shore = 3;
      const D = 7;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        B.add(seg(v3(sx * 2.4, -3, sz * 2.4), v3(sx * 1.8, D, sz * 1.8), 0.25, 0.2, 6), C.woodDk);
        B.add(seg(v3(sx * 2.25, 0.5, sz * 2.25), v3(-sx * 1.95, D - 1.5, sz * 1.95), 0.08, 0.08, 4), C.woodDk);
      }
      B.add(G.box, C.plank, 0, D, 0, 0, 0, 0, [5.4, 0.35, 5.4]);
      for (const sx of [-1, 1]) {
        B.add(G.box, C.wood, sx * 2.6, D + 0.6, 0, 0, 0, 0, [0.12, 0.12, 5.2]);
        B.add(G.box, C.wood, 0, D + 0.6, sx * 2.6, 0, 0, 0, [5.2, 0.12, 0.12]);
      }
      hut(B, 0.6, D + 0.15, -0.6, 1.1, 0.4);
      B.add(G.cyl6, C.woodDk, -2.1, D + 2.4, 2.1, 0, 0, 0, [0.07, 4.6, 0.07]);
      flag(g, -2.1, D + 4.4, 2.1, 1.3);
      B.add(G.box, C.lavaHot, 2.1, D + 1.2, 2.1, 0, 0.6, 0, 0.35, T.glow);
      for (let i = 0; i < 6; i++) B.add(G.box, C.woodDk, 2.5, 0.6 + i * 1.05, 2.75, 0, 0, 0, [0.9, 0.1, 0.12]);
    } else if (kind === "ruins") {
      beach();
      const R = r * 0.85, h = 2.2;
      land(R, h);
      const by = (d: number) => landY(R, h, d) - 0.2;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * 6.28, d = R * 0.45, broken = i % 3 === 1;
        column(B, Math.cos(a) * d, by(d), Math.sin(a) * d, broken ? 1.5 + rnd() * 2 : 5, 0.45, broken);
      }
      for (let i = 0; i < 8; i += 3) {
        const a = ((i + 0.5) / 8) * 6.28, d = R * 0.45 * Math.cos(Math.PI / 8);
        B.add(G.box, C.stone, Math.cos(a) * d, by(R * 0.45) + 5.9, Math.sin(a) * d, 0, -a, 0, [0.9, 0.5, 2 * R * 0.45 * Math.sin(Math.PI / 8) + 0.9]);
      }
      B.add(G.cyl8, C.stone, R * 0.6, by(R * 0.6) + 0.35, -R * 0.2, 0, 0.7, Math.PI / 2, [0.45, 4, 0.45], T.solid, 0.1);
      B.add(G.ico1, C.stoneDk, 0, by(0) + 1.2, 0, 0.2, 0.5, 0.1, [1.4, 1.7, 1.3], T.solid, 0.3);
      B.add(G.box, C.ink, 0.3, by(0) + 1.5, 1.15, 0, 0, 0, [0.3, 0.2, 0.1]);
      B.add(G.box, C.ink, -0.4, by(0) + 1.5, 1.12, 0, 0, 0, [0.3, 0.2, 0.1]);
      ring(5, R * 0.6, R * 0.85, (px, pz, d) => B.add(G.ico1, C.leafLt, px, by(d) + 0.2, pz, 0, rnd() * 3, 0, [1.1, 0.8, 1.1], T.solid, 0.2));
    } else if (kind === "atoll") {
      shore = r * 1.1;
      B.add(new THREE.TorusGeometry(r * 0.82, r * 0.2, 5, 24).rotateX(Math.PI / 2), (c, n) => (n.y > 0.85 ? C.sand : C.sandDk), 0, -0.6, 0, 0, 0, 0, [1, 1, 0.35], T.solid, r * 0.04);
      ring(6, r * 0.8, r * 0.84, (px, pz) => palm(B, px, 0.6, pz, 0.85 + rnd() * 0.35));
      ring(5, r * 0.78, r * 0.86, (px, pz) => B.add(G.ico1, C.leafLt, px, 0.6, pz, 0, rnd() * 3, 0, [1, 0.6, 1], T.solid, 0.2));
    } else if (kind === "crystal") {
      beach(r, "#e0d6ec");
      const R = r * 0.85, h = r * 0.4;
      land(R, h, "#8fd0a0", "#7c6f92");
      ring(7, 0, R * 0.65, (px, pz, d, i) => {
        const y = landY(R, h, d) - 0.4, s = 0.8 + rnd() * 1.3;
        for (let c = 0; c < 3; c++) B.add(G.oct, i % 2 ? C.crystal : C.crystal2, px + (rnd() - 0.5) * s, y + s * 1.6, pz + (rnd() - 0.5) * s, (rnd() - 0.5) * 0.7, rnd() * 3, (rnd() - 0.5) * 0.7, [s * 0.55, s * 2.2, s * 0.55], c === 0 ? T.glow : T.solid);
      });
      rocks(B, 6, r * 1.0, r * 1.25, 0.8, 1.8, "#7c6f92");
    } else if (kind === "mushroom") {
      beach();
      const R = r * 0.85, h = r * 0.22;
      land(R, h, "#8fd05a");
      ring(5, 0, R * 0.6, (px, pz, d, i) => {
        const y = landY(R, h, d) - 0.3, H = 3 + rnd() * 4, Rc = 1.6 + rnd() * 1.8;
        B.add(G.cyl8, C.cream, px, y + H / 2, pz, 0, 0, (rnd() - 0.5) * 0.2, [0.45 + Rc * 0.12, H, 0.45 + Rc * 0.12]);
        B.add(G.hemi, i % 3 === 2 ? C.gold : C.shroom, px, y + H - 0.2, pz, 0, 0, 0, [Rc, Rc * 0.65, Rc]);
        for (let s = 0; s < 6; s++) {
          const th = rnd() * 6.28, ph = 0.35 + rnd() * 0.8;
          B.add(G.ico0, C.white, px + Math.sin(ph) * Math.cos(th) * Rc, y + H - 0.2 + Math.cos(ph) * Rc * 0.65, pz + Math.sin(ph) * Math.sin(th) * Rc, 0, 0, 0, [0.28, 0.12, 0.28]);
        }
      });
      ring(4, R * 0.55, R * 0.85, (px, pz, d, i) => tree(B, px, landY(R, h, d), pz, 0.8, i));
    } else {
      // wreck on a sandbar
      shore = r * 0.75;
      beach(r * 0.6);
      land(r * 0.5, 0.9, C.sand, C.sand);
      const hull = hullGeo(9, 1.7, 2.2, 0.8);
      B.add(paint(hull.side, (c) => (Math.floor(c.y * 2.2) % 2 ? C.woodDk : C.wood)), C.wood, 1.5, -0.4, 0, 0.12, 0.6, 0.45);
      B.add(paint(hull.deck, C.plank), C.plank, 1.5, -0.4, 0, 0.12, 0.6, 0.45);
      B.add(seg(v3(1.2, 0.4, 0.4), v3(-1.6, 6.5, 1.5), 0.2, 0.14), C.woodDk);
      B.add(G.box, C.cream, -0.6, 4.3, 1.1, 0.3, 0.4, 0.5, [2.4, 1.8, 0.05], T.two);
      rocks(B, 5, r * 0.5, r * 0.8, 0.6, 1.4);
      palm(B, -r * 0.3, 0.4, -r * 0.2, 0.8);
    }
    B.flush(g, ink);
    if (nIsl < ISL.length) ISL[nIsl++].set(x, z, shore, 0);
  };

  /* ---- place the archipelago: one big volcano inside the loop, eighteen biomes along it, a far ring on the horizon ---- */
  const placed: { x: number; z: number; r: number }[] = [];
  const free = (x: number, z: number, r: number, clear: number) =>
    pathDist(x, z) > r + clear && placed.every((p) => Math.hypot(p.x - x, p.z - z) > p.r + r + 10);
  placed.push({ x: 0, z: 0, r: 38 });
  isle("volcano", 0, 0, 38);
  const RING: Kind[] = ["palm", "lighthouse", "mesa", "village", "stacks", "mushroom", "platform", "snow", "atoll", "ruins", "crystal", "forest", "wreck", "volcano", "palm", "stacks", "village", "atoll"];
  RING.forEach((kind, i) => {
    const r = kind === "platform" ? 4 : kind === "atoll" ? 13 + rnd() * 5 : kind === "wreck" ? 8 : 9 + rnd() * 9;
    along((LEN * (i + 0.5 + (rnd() - 0.5) * 0.35)) / RING.length, A, Fv);
    for (let tries = 0; tries < 14; tries++) {
      const side = (i + tries) % 2 ? 1 : -1, d = r + 16 + rnd() * 20 + tries * 5;
      const x = A.x - Fv.z * d * side, z = A.z + Fv.x * d * side;
      if (free(x, z, r, kind === "platform" ? 9 : 13)) {
        placed.push({ x, z, r });
        isle(kind, x, z, r);
        return;
      }
    }
  });
  const FAR: Kind[] = ["snow", "mesa", "forest", "stacks", "volcano", "snow", "village", "mesa", "forest", "lighthouse"];
  FAR.forEach((kind, i) => {
    const a = (i / FAR.length) * Math.PI * 2 + rnd() * 0.3, d = 400 + rnd() * 140, r = 22 + rnd() * 12;
    isle(kind, Math.cos(a) * d, Math.sin(a) * d, r, false);
  });

  /* ---- sky islands: rock cones with grass caps, ruins, trees, waterfalls, hanging roots, orbiting rubble ---- */
  const fallGeo = (w: number, L: number) => new THREE.PlaneGeometry(w, L, 1, 6).translate(0, -L / 2, 0);
  const skyIsle = (parent: THREE.Object3D, x: number, y: number, z: number, r: number, variant: number) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    const B = batch();
    const H = r * 1.7;
    B.add(new THREE.ConeGeometry(r, H, 10, 4).rotateX(Math.PI), (c) => (c.y > -r * 0.22 ? C.cliff : Math.floor(-c.y / (r * 0.3)) % 2 ? C.rock : C.rockDk), 0, -H / 2, 0, 0, rnd() * 6, 0, 1, T.solid, r * 0.09);
    B.add(new THREE.CylinderGeometry(r * 1.02, r * 0.98, 0.9, 10), (_c, n) => (n.y > 0.5 ? C.grass : C.cliffDk), 0, 0.3, 0, 0, rnd(), 0, 1, T.solid, r * 0.03);
    for (let i = 0; i < 3; i++) B.add(G.ico1, C.grassLt, (rnd() - 0.5) * r, 0.7, (rnd() - 0.5) * r, 0, rnd() * 3, 0, [r * 0.3, 0.5, r * 0.3], T.solid, 0.2);
    const top = 0.75;
    if (variant === 0) {
      B.add(G.box, C.stoneDk, 0, top + 0.3, 0, 0, 0, 0, [r * 0.95, 0.6, r * 0.7]);
      for (let i = 0; i < 6; i++) {
        const cx = ((i % 3) - 1) * r * 0.36, cz = (Math.floor(i / 3) - 0.5) * r * 0.5;
        column(B, cx, top + 0.6, cz, i === 4 ? 1.6 : 3.4, 0.36, i === 4);
      }
      B.add(G.box, C.stone, -r * 0.18, top + 4.65, 0, 0, 0, 0.05, [r * 0.62, 0.45, r * 0.7]);
      B.add(G.roof, C.stone, -r * 0.18, top + 5.3, 0, 0, Math.PI / 2, 0.05, [r * 0.3, 0.75, r * 0.6], T.solid, 0.1);
    } else if (variant === 1) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * 6.28, broken = i % 3 === 0;
        column(B, Math.cos(a) * r * 0.6, top, Math.sin(a) * r * 0.6, broken ? 1.2 + rnd() * 1.5 : 4, 0.38, broken);
      }
      B.add(G.ico1, C.stone, 0, top + 1.6, 0, 0, 0.4, 0, [1.4, 1.9, 1.3], T.solid, 0.25);
      B.add(G.box, C.lavaHot, 0, top + 1.9, 1.2, 0, 0, 0, [0.9, 0.25, 0.15], T.glow);
    } else if (variant === 2) {
      const tw = r * 0.32, th = r * 1.3;
      B.add(new THREE.CylinderGeometry(tw * 0.9, tw, th, 9, 3), (c) => (Math.floor(c.y / 2) % 2 ? C.stone : C.stoneDk), 0, top + th / 2, 0, 0, 0, 0, 1, T.solid, 0.15);
      for (let i = 0; i < 7; i++) {
        const a = (i / 9) * 6.28;
        B.add(G.box, C.stone, Math.cos(a) * tw * 0.85, top + th + 0.4, Math.sin(a) * tw * 0.85, 0, -a, 0, [0.6, 0.8, 0.6]);
      }
      for (let w = 0; w < 3; w++) B.add(G.box, C.ink, 0, top + 2 + w * th * 0.28, tw * 0.95 - w * 0.05, 0, 0, 0, [0.5, 0.9, 0.1]);
      B.add(G.cyl6, C.woodDk, 0, top + th + 2, 0, 0, 0, 0, [0.06, 3, 0.06]);
      flag(g, 0, top + th + 3.2, 0, 1.4);
    } else {
      for (const sx of [-1, 1]) B.add(G.box, C.stone, sx * 1.6, top + 2, 0, 0, 0, 0, [0.9, 4, 0.9], T.solid, 0.1);
      B.add(new THREE.TorusGeometry(1.6, 0.4, 5, 10, Math.PI), C.stone, 0, top + 4, 0, 0, 0, 0, 1, T.solid, 0.1);
      for (let s = 0; s < 4; s++) B.add(G.box, C.stoneDk, 0, top + 0.12 + s * 0.22, 1.6 + s * 0.5, 0, 0, 0, [3, 0.25, 0.6]);
    }
    for (let i = 0; i < 2 + (r > 12 ? 2 : 0); i++) {
      const a = rnd() * 6.28, d = r * (0.55 + rnd() * 0.3);
      tree(B, Math.cos(a) * d, top, Math.sin(a) * d, 0.8 + rnd() * 0.4, i);
    }
    // hanging roots
    for (let i = 0; i < 7; i++) {
      const a = rnd() * 6.28, d = r * (0.5 + rnd() * 0.4), y0 = -(1 - d / r) * H * 0.6;
      B.add(seg(v3(Math.cos(a) * d, y0, Math.sin(a) * d), v3(Math.cos(a) * d * 0.9, y0 - 2 - rnd() * 4, Math.sin(a) * d * 0.9), 0.14, 0.04, 4), i % 2 ? C.leaf : C.woodDk);
    }
    B.flush(g);
    // waterfall off the rim, fed by a little stream
    const fa = rnd() * 6.28, fw = r * 0.22, fl = r * 2.6;
    const fall = new THREE.Mesh(fallGeo(fw, fl), fallMat);
    fall.position.set(Math.cos(fa) * r * 1.0, top - 0.1, Math.sin(fa) * r * 1.0);
    fall.rotation.y = Math.atan2(Math.cos(fa), Math.sin(fa));
    g.add(fall);
    const SB = batch();
    SB.add(G.box, "#6fd0f2", Math.cos(fa) * r * 0.55, top - 0.05, Math.sin(fa) * r * 0.55, 0, -fa, 0, [r * 0.9, 0.12, fw * 0.8], T.glow);
    SB.flush(g, false);
    // orbiting rubble
    const rub = new THREE.Group();
    g.add(rub);
    const RB = batch();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * 6.28, s = 0.5 + rnd() * 1.2;
      RB.add(G.dode, i % 2 ? C.rock : C.cliff, Math.cos(a) * r * 1.35, -1 - rnd() * 4, Math.sin(a) * r * 1.35, rnd() * 3, rnd() * 3, 0, s, T.solid, s * 0.3);
    }
    RB.flush(rub);
    const sp = 0.04 + rnd() * 0.04;
    dyn.push((t) => { rub.rotation.y = t * sp; });
    return g;
  };
  const skyRoot = new THREE.Group();
  scene.add(skyRoot);
  const skyGroups: { g: THREE.Group; y: number; ph: number }[] = [];
  const addSky = (s: number, off: number, y: number, r: number, variant: number, pair = false) => {
    along(s, A, Fv, off);
    const holder = new THREE.Group();
    holder.position.set(A.x, 0, A.z);
    skyRoot.add(holder);
    skyIsle(holder, 0, 0, 0, r, variant);
    if (pair) {
      // a second island and a sagging plank bridge between them, bobbing as one
      const dx = Fv.x * (r * 2.6), dz = Fv.z * (r * 2.6);
      skyIsle(holder, dx, 3, dz, r * 0.7, (variant + 1) % 4);
      const BB = batch();
      const a = v3(Fv.x * r * 0.95, 0.8, Fv.z * r * 0.95), b = v3(dx - Fv.x * r * 0.65, 3.8, dz - Fv.z * r * 0.65);
      const n = 14, yaw = Math.atan2(Fv.x, Fv.z);
      const rope: V3[] = [];
      for (let i = 0; i <= n; i++) {
        const f = i / n, p = a.clone().lerp(b, f);
        p.y -= Math.sin(Math.PI * f) * 2.2;
        BB.add(G.box, i % 2 ? C.plank : C.wood, p.x, p.y, p.z, 0, yaw, 0, [1.8, 0.12, 0.5]);
        rope.push(p.clone().add(v3(-Fv.z * 0.9, 0.7, Fv.x * 0.9)), p.clone().add(v3(Fv.z * 0.9, 0.7, -Fv.x * 0.9)));
      }
      BB.flush(holder, false);
      const pts: V3[] = [];
      for (let i = 0; i < n; i++) pts.push(rope[i * 2], rope[i * 2 + 2], rope[i * 2 + 1], rope[i * 2 + 3]);
      holder.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: C.woodDk })));
    }
    skyGroups.push({ g: holder, y, ph: rnd() * 6.28 });
  };
  addSky(LEN * 0.03, 70, 30, 11, 0);
  addSky(LEN * 0.15, -85, 42, 14, 2);
  addSky(LEN * 0.27, 62, 28, 9, 3);
  addSky(LEN * 0.4, 80, 36, 10, 1, true);
  addSky(LEN * 0.55, -66, 32, 12, 0);
  addSky(LEN * 0.7, -95, 46, 13, 3);
  addSky(LEN * 0.84, 75, 34, 10, 2);
  // the citadel above the volcano
  const citadel = new THREE.Group();
  skyRoot.add(citadel);
  skyIsle(citadel, 0, 0, 0, 30, 0);
  skyIsle(citadel, 26, 9, 18, 9, 2);
  skyIsle(citadel, -24, -6, 20, 8, 1);
  skyGroups.push({ g: citadel, y: 128, ph: 0 });

  /* ---- voxel clouds drifting on the wind ---- */
  const clouds: { g: THREE.Group; x: number; z: number; y: number }[] = [];
  const WIND = 1.6;
  const cloud = (x: number, y: number, z: number, size: number, mat: THREE.Material = T.cloud) => {
    const g = new THREE.Group();
    const lobes: number[][] = [[0, 0, 0, size, Math.max(1, Math.round(size * 0.45)), Math.round(size * 0.75)]];
    for (let i = 0; i < 2 + Math.floor(rnd() * 3); i++) {
      const s = Math.max(2, Math.round(size * (0.45 + rnd() * 0.3)));
      lobes.push([Math.round((rnd() - 0.5) * size * 1.6), Math.round(rnd() * size * 0.3), Math.round((rnd() - 0.5) * size), s, Math.max(1, Math.round(s * 0.55)), s]);
    }
    const B = batch();
    B.add(voxGeo(lobes, 3), C.white, 0, 0, 0, 0, 0, 0, 1, mat);
    B.flush(g, false);
    g.position.set(x, y, z);
    scene.add(g);
    clouds.push({ g, x, z, y });
    return g;
  };
  for (let i = 0; i < 22; i++) {
    const a = rnd() * Math.PI * 2, d = 40 + rnd() * 420;
    cloud(Math.cos(a) * d, 26 + rnd() * 36, Math.sin(a) * d, 3 + Math.floor(rnd() * 4));
  }
  // a rain squall over the route
  along(LEN * 0.78, A, Fv, 22);
  const squall = cloud(A.x, 30, A.z, 5, T.storm);
  const squallC = clouds[clouds.length - 1];

  /* ---- cyclones ---- */
  const cyclones: { base: V3; r: number; H: number; layers: THREE.Group; debris: THREE.Mesh[]; top: THREE.Group; ph: number }[] = [];
  const cycSpec: [number, number][] = [[0.23, 60], [0.62, -56]];
  cycSpec.forEach(([s, off], ci) => {
    along(LEN * s, A, Fv, off);
    const H = 58, r0 = 2.2, r1 = 13;
    const prof: THREE.Vector2[] = [];
    for (let i = 0; i <= 18; i++) {
      const f = i / 18;
      prof.push(new THREE.Vector2(r0 + (r1 - r0) * Math.pow(f, 1.7), f * H));
    }
    const layers = new THREE.Group();
    scene.add(layers);
    const outer = new THREE.Mesh(new THREE.LatheGeometry(prof, 30), shader(CYC_V, CYC_F, { uSpd: { value: 0.35 }, uCol: { value: new THREE.Color("#f4f8ff") }, uCut: { value: 0.3 } }, { side: THREE.DoubleSide }));
    const inner = new THREE.Mesh(
      new THREE.LatheGeometry(prof.map((p) => new THREE.Vector2(p.x * 0.7, p.y * 0.97)), 24),
      shader(CYC_V, CYC_F, { uSpd: { value: 0.6 }, uCol: { value: new THREE.Color("#b9c6dc") }, uCut: { value: 0.42 } }, { side: THREE.DoubleSide }),
    );
    layers.add(outer, inner);
    const top = cloud(0, 0, 0, 6, T.storm);
    clouds.pop();
    const debrisGeo = paint(new THREE.BoxGeometry(0.8, 0.5, 1.4), C.woodDk);
    const debris = Array.from({ length: 9 }, () => {
      const m = new THREE.Mesh(debrisGeo, T.solid);
      scene.add(m);
      return m;
    });
    cyclones.push({ base: A.clone(), r: r1, H, layers, debris, top, ph: ci * 2.1 });
  });

  /* ---- whirlpool ---- */
  along(LEN * 0.43, A, Fv, -36);
  POOL.set(A.x, A.z, 16, 0.45);

  /* ---- rainbow, opposite the sun ---- */
  const rainbow = new THREE.Mesh(
    new THREE.RingGeometry(230, 262, 72, 1, 0, Math.PI),
    new THREE.ShaderMaterial({
      vertexShader: RAIN_V, fragmentShader: RAIN_F, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uR: { value: new THREE.Vector2(230, 262) } },
    }),
  );
  rainbow.position.set(-SUN.x * 760, -40, -SUN.z * 760);
  rainbow.lookAt(0, -40, 0);
  scene.add(rainbow);

  /* ---- the boat ---- */
  const boat = new THREE.Group();
  boat.rotation.order = "YXZ";
  scene.add(boat);
  const hull = hullGeo(5.4, 0.95, 1.15, 1.25);
  const bow = hull.st(1), stern = hull.st(0);
  const BB = batch();
  BB.add(paint(hull.side, (c) => (c.y > hull.sheer(c.z) - 0.17 ? C.gold : c.y < -0.12 ? C.redDk : C.red)), C.red);
  BB.add(paint(hull.deck, (c) => (Math.floor((c.x + 2) * 3.2) % 2 ? C.plank : C.wood)), C.plank);
  BB.add(paint(hull.stern, (c) => (c.y > stern.top - 0.17 ? C.gold : C.redDk)), C.redDk);
  BB.add(G.box, C.redDk, 0, -0.85, 0.2, 0, 0, 0, [0.1, 0.7, 1.8]);
  BB.add(G.box, C.redDk, 0, -0.25, stern.z - 0.12, 0, 0, 0, [0.09, 0.95, 0.55]);
  BB.add(seg(v3(0, stern.top, stern.z + 0.3), v3(0, stern.top + 0.35, stern.z - 0.25), 0.05, 0.05), C.woodDk);
  // gunwale rail
  for (let i = 0; i < 12; i++) {
    const a = hull.st(i / 12), b = hull.st((i + 1) / 12);
    for (const sx of [-1, 1]) BB.add(seg(v3(sx * a.w, a.top + 0.04, a.z), v3(sx * b.w, b.top + 0.04, b.z), 0.055, 0.055, 4), C.gold);
  }
  // mast, yard, boom
  const MZ = 0.45, MT = 5.3;
  BB.add(seg(v3(0, hull.sheer(MZ) - 0.1, MZ), v3(0, MT, MZ), 0.1, 0.07), C.wood);
  BB.add(G.ico0, C.gold, 0, MT + 0.1, MZ, 0, 0, 0, 0.16);
  BB.add(seg(v3(-1.75, 4.6, MZ + 0.12), v3(1.75, 4.6, MZ + 0.12), 0.06, 0.06), C.woodDk);
  BB.add(seg(v3(-1.6, 1.5, MZ + 0.12), v3(1.6, 1.5, MZ + 0.12), 0.05, 0.05), C.woodDk);
  // lion figurehead
  const hd = v3(0, bow.top + 0.12, bow.z + 0.02);
  BB.add(G.ico1, C.red, hd.x, hd.y, hd.z, 0, 0, 0, 0.34);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    BB.add(G.cone4, i % 2 ? C.cream : C.gold, hd.x - Math.sin(a) * 0.36, hd.y + Math.cos(a) * 0.36, hd.z - 0.12, 0, 0, a, [0.16, 0.5, 0.16]);
  }
  BB.add(G.box, C.gold, hd.x, hd.y - 0.08, hd.z + 0.32, 0, 0, 0, [0.3, 0.22, 0.3]);
  BB.add(G.box, C.ink, hd.x, hd.y, hd.z + 0.48, 0, 0, 0, [0.1, 0.08, 0.06]);
  for (const sx of [-1, 1]) BB.add(G.box, C.ink, hd.x + sx * 0.14, hd.y + 0.12, hd.z + 0.29, 0, 0, 0, [0.07, 0.07, 0.04]);
  BB.add(G.box, C.lavaHot, 0, stern.top + 0.55, stern.z - 0.25, 0, 0.6, 0, 0.18, T.glow);
  BB.flush(boat);
  const sail = new THREE.Mesh(
    new THREE.PlaneGeometry(3.3, 3.0, 12, 10),
    shader(SAIL_V, SAIL_F, {
      uSun: S.uSun, uBillow: { value: 0.75 },
      uCloth: { value: new THREE.Color(C.cream) }, uMark: { value: new THREE.Color(C.red) }, uTrim: { value: new THREE.Color(C.gold) },
    }, { side: THREE.DoubleSide }),
  );
  sail.position.set(0, 3.05, MZ + 0.16);
  boat.add(sail);
  const pennant = flag(boat, 0, MT + 0.05, MZ, 1.1);
  pennant.rotation.y = Math.PI / 2;
  const rig = [
    v3(0, MT, MZ), hd.clone().add(v3(0, 0.2, -0.2)),
    v3(0, MT, MZ), v3(stern.w * 0.9, stern.top, stern.z + 0.1),
    v3(0, MT, MZ), v3(-stern.w * 0.9, stern.top, stern.z + 0.1),
    v3(1.7, 4.6, MZ + 0.12), v3(0.85, hull.sheer(-0.9), -0.9),
    v3(-1.7, 4.6, MZ + 0.12), v3(-0.85, hull.sheer(-0.9), -0.9),
  ];
  boat.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(rig), new THREE.LineBasicMaterial({ color: "#5a3a22" })));
  // waterline foam collar, wider toward the bow
  {
    const pos: number[] = [], af: number[] = [];
    const NS = 20;
    const wl = (f: number) => {
      const s = hull.st(f);
      if (s.keel >= -0.05 || s.top <= 0) return null;
      const sn = Math.pow(s.top / (s.top - s.keel), 1 / 0.6);
      return { x: s.w * Math.sqrt(Math.max(0, 1 - sn * sn)), z: s.z };
    };
    for (const sx of [-1, 1]) {
      for (let i = 0; i < NS; i++) {
        const f0 = i / NS, f1 = (i + 1) / NS, a = wl(f0), b = wl(f1);
        if (!a || !b) continue;
        const pa = 0.3 + 1.1 * f0 * f0, pb = 0.3 + 1.1 * f1 * f1;
        const q = [
          [sx * a.x * 0.95, a.z, f0, 0], [sx * (a.x + pa), a.z - pa * 0.4, f0, 1], [sx * (b.x + pb), b.z - pb * 0.4, f1, 1],
          [sx * a.x * 0.95, a.z, f0, 0], [sx * (b.x + pb), b.z - pb * 0.4, f1, 1], [sx * b.x * 0.95, b.z, f1, 0],
        ];
        for (const [x, z, f, u] of q) {
          pos.push(x, 0.1, z);
          af.push(f, u);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("aF", new THREE.Float32BufferAttribute(af, 2));
    boat.add(new THREE.Mesh(g, shader(COLLAR_V, COLLAR_F, {}, { side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
  }

  /* ---- wake ribbons, rebuilt from the boat's own past positions every frame ---- */
  const WS = 72, WAGE = 7.5;
  const strips: { kind: number; side: number; origin: number; off: (a: number) => number; w: (a: number) => number }[] = [
    { kind: 0, side: 0, origin: stern.z + 0.2, off: () => 0, w: (a) => 0.7 + a * 0.55 },
    ...[-1, 1].flatMap((side) => [
      { kind: 1, side, origin: bow.z - 0.4, off: (a: number) => 0.7 + a * SPEED * 0.34, w: (a: number) => 0.24 + a * 0.12 },
      { kind: 2, side, origin: 0.6, off: (a: number) => 0.9 + a * SPEED * 0.19, w: (a: number) => 0.16 + a * 0.08 },
    ]),
  ];
  const wakePos = new Float32Array(strips.length * WS * 2 * 3), wakeW = new Float32Array(strips.length * WS * 2 * 3);
  const wakeIdx: number[] = [];
  strips.forEach((sp, si) => {
    for (let i = 0; i < WS; i++) {
      const base = (si * WS + i) * 2, ageN = i / (WS - 1);
      wakeW.set([ageN, -1, sp.kind === 0 ? 0 : 1, ageN, 1, sp.kind === 0 ? 0 : 1], base * 3);
      if (i < WS - 1) wakeIdx.push(base, base + 1, base + 3, base, base + 3, base + 2);
    }
  });
  const wakeGeo = new THREE.BufferGeometry();
  wakeGeo.setAttribute("position", new THREE.BufferAttribute(wakePos, 3));
  wakeGeo.setAttribute("aW", new THREE.BufferAttribute(wakeW, 3));
  wakeGeo.setIndex(wakeIdx);
  const wake = new THREE.Mesh(wakeGeo, shader(WAKE_V, WAKE_F, {}, { side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  wake.frustumCulled = false;
  scene.add(wake);

  /* ---- flying craft ---- */
  const prop = (parent: THREE.Object3D, x: number, y: number, z: number, r: number, blades = 3) => {
    const p = new THREE.Group();
    p.position.set(x, y, z);
    parent.add(p);
    const B = batch();
    B.add(G.ico0, C.gold, 0, 0, 0, 0, 0, 0, r * 0.2);
    for (let b = 0; b < blades; b++) {
      const a = (b / blades) * Math.PI * 2;
      B.add(G.box, C.woodDk, Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, 0, 0, 0, a, [r, r * 0.2, 0.06]);
    }
    B.flush(p, false);
    return p;
  };
  const airship = (body: string, band: string, s = 1) => {
    const g = new THREE.Group();
    const B = batch();
    B.add(paint(new THREE.SphereGeometry(1, 18, 10).rotateX(Math.PI / 2).scale(3 * s, 3 * s, 10 * s), (c) => (Math.abs(c.z) > 8.4 * s ? C.gold : Math.floor((c.z + 10 * s) / (2.5 * s)) % 2 ? body : band)), body);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      B.add(G.box, band, Math.cos(a) * 2.6 * s, Math.sin(a) * 2.6 * s, -8 * s, 0, 0, a, [2.4 * s, 0.15 * s, 2.6 * s]);
    }
    B.add(G.box, C.wood, 0, -4 * s, 0, 0, 0, 0, [2 * s, 1.1 * s, 5 * s]);
    B.add(G.box, C.redDk, 0, -3.35 * s, 0, 0, 0, 0, [2.2 * s, 0.2 * s, 5.4 * s]);
    for (let w = 0; w < 4; w++) for (const sx of [-1, 1]) B.add(G.box, C.lavaHot, sx * 1.01 * s, -3.95 * s, (w - 1.5) * 1.1 * s, 0, 0, 0, [0.05, 0.4 * s, 0.6 * s], T.glow);
    for (const sx of [-1, 1]) for (const sz of [-1.8, 1.8]) B.add(seg(v3(sx * 0.9 * s, -3.4 * s, sz * s), v3(sx * 1.2 * s, -2.6 * s, sz * 1.3 * s), 0.06, 0.06, 4), C.woodDk);
    for (const sx of [-1, 1]) B.add(G.cyl8, C.wood, sx * 2 * s, -3.8 * s, 0.4 * s, Math.PI / 2, 0, 0, [0.35 * s, 1.4 * s, 0.35 * s]);
    B.flush(g);
    const props = [prop(g, 0, -4 * s, -2.7 * s, 1.6 * s), prop(g, 2 * s, -3.8 * s, -0.4 * s, 1.1 * s, 2), prop(g, -2 * s, -3.8 * s, -0.4 * s, 1.1 * s, 2)];
    flag(g, 0, 2.6 * s, -8.6 * s, 1.4 * s).rotation.y = Math.PI / 2;
    scene.add(g);
    return { g, props };
  };
  const galleon = () => {
    const g = new THREE.Group();
    const h = hullGeo(11, 1.9, 2.4, 1.5);
    const B = batch();
    B.add(paint(h.side, (c) => (c.y > h.sheer(c.z) - 0.25 ? C.gold : Math.floor((c.y + 3) * 1.6) % 2 ? C.wood : C.woodDk)), C.wood);
    B.add(paint(h.deck, C.plank), C.plank);
    B.add(paint(h.stern, C.woodDk), C.woodDk);
    for (const [mz, mh] of [[2.2, 9], [-1.8, 7.5]]) {
      B.add(seg(v3(0, 0.8, mz), v3(0, mh, mz), 0.16, 0.12), C.woodDk);
      for (let s = 0; s < 2; s++) {
        const y = 3 + s * (mh - 3.5) * 0.5, w = 4.2 - s * 1;
        B.add(G.box, C.cream, 0, y + 1.2, mz + 0.2, 0, 0, 0, [w, 2.3, 0.08], T.two);
        B.add(G.box, C.red, 0, y + 1.2, mz + 0.24, 0, 0, Math.PI / 4, [0.7, 0.7, 0.05], T.two);
      }
    }
    B.add(G.box, C.wood, 0, 1.9, -4.6, 0, 0, 0, [3, 1.6, 2.2]);
    for (let w = 0; w < 3; w++) B.add(G.box, C.lavaHot, (w - 1) * 0.8, 1.9, -5.72, 0, 0, 0, [0.4, 0.5, 0.05], T.glow);
    B.flush(g);
    const wings = [-1, 1].map((sx) => {
      const w = new THREE.Group();
      w.position.set(sx * 1.6, 1.2, 0.8);
      g.add(w);
      const WB = batch();
      WB.add(seg(v3(0, 0, 0), v3(sx * 8, 0.6, -1), 0.25, 0.12), C.woodDk);
      for (let f = 0; f < 6; f++) {
        const L = 4.5 - f * 0.4, x0 = sx * (1.3 + f * 1.3);
        WB.add(G.box, f % 2 ? C.white : "#d4ecff", x0, 0.2, -1.6 - L / 2 + 1, 0, sx * (0.25 - f * 0.08), 0, [0.9, 0.08, L], T.two);
      }
      WB.flush(w);
      return w;
    });
    const p = prop(g, 0, 0.3, h.st(0).z - 0.3, 2.2);
    scene.add(g);
    return { g, wings, p };
  };
  const balloon = (c1: string, c2: string, s = 1) => {
    const g = new THREE.Group();
    const prof: THREE.Vector2[] = [];
    for (let i = 0; i <= 10; i++) {
      const f = i / 10;
      prof.push(new THREE.Vector2(i === 10 ? 0 : 3.2 * (0.22 + 0.78 * Math.sin(Math.PI * Math.pow(f, 0.72))), f * 8));
    }
    const B = batch();
    B.add(paint(new THREE.LatheGeometry(prof, 12), (c) => (c.y > 6.9 ? C.gold : Math.floor(((Math.atan2(c.x, c.z) + Math.PI) / (Math.PI * 2)) * 12) % 2 ? c1 : c2)), c1);
    B.add(G.box, C.wood, 0, -2.2, 0, 0, 0, 0, [1.3, 0.9, 1.3]);
    B.add(G.box, C.gold, 0, -1.72, 0, 0, 0, 0, [1.4, 0.1, 1.4]);
    B.flush(g);
    const lines: V3[] = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) lines.push(v3(sx * 0.6, -1.75, sz * 0.6), v3(sx * 0.6, 0.1, sz * 0.6));
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lines), new THREE.LineBasicMaterial({ color: C.woodDk })));
    const fl = new THREE.Mesh(paint(new THREE.ConeGeometry(0.3, 0.9, 5), C.lavaHot), T.glow);
    fl.position.y = -0.9;
    g.add(fl);
    g.scale.setScalar(s);
    scene.add(g);
    return { g, fl };
  };
  const ornithopter = (body: string) => {
    const g = new THREE.Group();
    const B = batch();
    B.add(G.ico1, body, 0, 0, 0, 0, 0, 0, [0.6, 0.55, 1.8]);
    B.add(G.ico1, "#9fe3f5", 0, 0.35, 0.7, 0, 0, 0, [0.38, 0.32, 0.6]);
    B.add(G.box, C.red, 0, 0.45, -1.7, 0, 0, 0, [0.08, 0.9, 0.8]);
    B.add(G.box, C.red, 0, 0.05, -1.75, 0, 0, 0, [1.6, 0.06, 0.6]);
    B.flush(g);
    const wings = [-1, 1].map((sx) => {
      const w = new THREE.Group();
      w.position.set(sx * 0.45, 0.2, 0.1);
      g.add(w);
      const WB = batch();
      WB.add(G.box, C.cream, sx * 1.7, 0, 0, 0, 0, 0, [3.4, 0.08, 1.1], T.two);
      WB.add(G.box, C.red, sx * 3.1, 0.01, 0, 0, 0, 0, [0.7, 0.09, 1.12], T.two);
      WB.flush(w);
      return w;
    });
    scene.add(g);
    return { g, wings };
  };
  const gyro = () => {
    const g = new THREE.Group();
    const B = batch();
    B.add(G.ico1, C.roof3, 0, 0, 0, 0, 0, 0, [0.7, 0.7, 1.4]);
    B.add(seg(v3(0, 0.2, -0.8), v3(0, 0.6, -3), 0.15, 0.08), C.roof3);
    B.add(G.box, C.gold, 0, 0.8, -3, 0, 0, 0, [0.06, 0.8, 0.6]);
    B.add(seg(v3(0, 0.5, 0), v3(0, 1.4, 0), 0.06, 0.06), C.ink);
    for (const sx of [-1, 1]) B.add(seg(v3(sx * 0.3, -0.5, 0.2), v3(sx * 0.6, -1, 0.2), 0.04, 0.04, 4), C.ink);
    B.flush(g);
    const rotor = prop(g, 0, 1.45, 0, 5, 2);
    rotor.rotation.x = -Math.PI / 2;
    const tail = prop(g, 0.1, 0.6, -3, 0.9, 2);
    tail.rotation.y = Math.PI / 2;
    scene.add(g);
    return { g, rotor, tail };
  };
  const ship1 = airship(C.cream, C.red);
  const ship2 = airship("#f0e2b8", C.roof2, 0.7);
  const gal = galleon();
  const balloons = [
    [C.red, C.gold], [C.roof2, C.white], [C.roof3, C.roof], ["#8a5cc8", C.gold], [C.white, C.red], [C.gold, C.roof2],
  ].map(([c1, c2], i) => {
    along(LEN * (i / 6 + 0.05), A, Fv, (i % 2 ? 1 : -1) * (24 + rnd() * 30));
    return { ...balloon(c1, c2, 0.9 + rnd() * 0.5), x: A.x, z: A.z, y: 18 + rnd() * 22, ph: rnd() * 6.28 };
  });
  const orni = [ornithopter(C.gold), ornithopter(C.wall)];
  const gy = gyro();

  /* ---- gulls and dolphins keeping the boat company ---- */
  const gullGeo = new THREE.BufferGeometry().setFromPoints([v3(-0.7, 0.25, 0), v3(0, 0, 0), v3(0, 0, 0), v3(0.7, 0.25, 0)]);
  const gullMat = new THREE.LineBasicMaterial({ color: "#ffffff" });
  const gulls = Array.from({ length: 9 }, (_, i) => {
    const l = new THREE.LineSegments(gullGeo, gullMat);
    scene.add(l);
    return { l, r: 6 + rnd() * 9, y: 7 + rnd() * 6, sp: (0.25 + rnd() * 0.2) * (i % 3 ? 1 : -1), ph: rnd() * 6.28 };
  });
  const DB = batch();
  DB.add(G.ico1, (_c, n) => (n.y < -0.3 ? C.belly : C.dolphin), 0, 0, 0, 0, 0, 0, [0.42, 0.42, 1.4]);
  DB.add(G.cone4, C.dolphin, 0, 0.45, -0.1, -0.5, 0, 0, [0.08, 0.5, 0.3]);
  DB.add(G.box, C.dolphin, 0, 0, -1.45, 0, 0, 0, [0.9, 0.06, 0.35]);
  DB.add(G.cone4, C.dolphin, 0, -0.05, 1.45, Math.PI / 2, 0, 0, [0.15, 0.4, 0.15]);
  const dolGroup = new THREE.Group();
  DB.flush(dolGroup);
  const DPER = 3.4, DJUMP = 1.1;
  const dolphins = [
    { side: -1, lat: 3.8, fw: 4.5, ph: 0.3 },
    { side: 1, lat: 4.4, fw: 3.2, ph: 1.6 },
    { side: 1, lat: 6.2, fw: 6.0, ph: 2.6 },
  ].map((d) => {
    const g = new THREE.Group();
    g.rotation.order = "YXZ";
    for (const c of dolGroup.children) g.add(new THREE.Mesh((c as THREE.Mesh).geometry, (c as THREE.Mesh).material));
    scene.add(g);
    return { ...d, g };
  });

  /* ---- particles: spray, foam, splashes, embers, rain ---- */
  const NP = 960;
  const pPos = new Float32Array(NP * 3), pSize = new Float32Array(NP), pCol = new Float32Array(NP * 3);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute("aSize", new THREE.BufferAttribute(pSize, 1));
  pGeo.setAttribute("aC", new THREE.BufferAttribute(pCol, 3));
  const parts = new THREE.Points(pGeo, shader(PART_V, PART_F, { uScale: S.uScale }));
  parts.frustumCulled = false;
  scene.add(parts);
  let np = 0;
  const put = (x: number, y: number, z: number, size: number, c: THREE.Color) => {
    if (np >= NP || size <= 0) return;
    pPos[np * 3] = x;
    pPos[np * 3 + 1] = y;
    pPos[np * 3 + 2] = z;
    pSize[np] = size;
    pCol[np * 3] = c.r;
    pCol[np * 3 + 1] = c.g;
    pCol[np * 3 + 2] = c.b;
    np++;
  };
  const cWhite = col("#ffffff"), cFoam = col("#d6f2ff"), cLava = col(C.lava), cHot = col(C.lavaHot), cRain = col("#cfe4f7"), cMist = col("#eef6ff");
  const P0 = new THREE.Vector3(), F0 = new THREE.Vector3();
  // A burst of n drops thrown from a world point at time `birth`.
  const splash = (t: number, birth: number, life: number, n: number, seed: number, x: number, z: number, out: number, up: number, size: number) => {
    const age = t - birth;
    if (age < 0 || age > life) return;
    for (let i = 0; i < n; i++) {
      const a = hr(i, seed) * 6.28, sp = out * (0.4 + hr(i, seed + 1) * 0.8), vy = up * (0.5 + hr(i, seed + 2) * 0.7);
      const px = x + Math.cos(a) * sp * age, pz = z + Math.sin(a) * sp * age, py = vy * age - 4.9 * age * age;
      if (py < wave(px, pz, t) - 0.2) continue;
      put(px, py, pz, size * (1 - (age / life) * 0.6), i % 3 ? cWhite : cFoam);
    }
  };

  /* ---- per-frame state ---- */
  const BP = new THREE.Vector3(), BF = new THREE.Vector3(), P2 = new THREE.Vector3(), F2 = new THREE.Vector3();
  const pivot = new THREE.Vector3(), tmpV = new THREE.Vector3();
  let tHop = -99, tShip = -99, tCyc = -99;
  const placeOn = (g: THREE.Object3D, s: number, off: number, y: number, dir: number) => {
    along(s, P2, F2, off, dir);
    g.position.set(P2.x, y, P2.z);
    g.rotation.y = Math.atan2(F2.x, F2.z);
  };

  return {
    labelAt: [
      (v: V3) => { v.set(0, 6, 0); boat.localToWorld(v); },
      (v: V3) => { citadel.getWorldPosition(v); v.y += 12; },
      (v: V3) => { v.copy(volcanoTop); },
    ],
    eggAt: [
      (v: V3) => { v.set(0, 2.5, 0); boat.localToWorld(v); },
      (v: V3) => { ship1.g.getWorldPosition(v); },
      (v: V3) => { v.copy(cyclones[0].layers.position); v.y += 25; },
    ],
    fire: [
      (t: number) => { tHop = t; },
      (t: number) => { tShip = t; },
      (t: number) => { tCyc = t; },
    ],
    update(t: number) {
      /* boat */
      boatAt(t, BP, BF);
      const rx = -BF.z, rz = BF.x;
      const wf = wave(BP.x + BF.x * 2.2, BP.z + BF.z * 2.2, t), wb = wave(BP.x - BF.x * 2.2, BP.z - BF.z * 2.2, t);
      const wl = wave(BP.x - rx, BP.z - rz, t), wr = wave(BP.x + rx, BP.z + rz, t);
      const eh = t - tHop, hopT = 0.9, hop = eh > 0 && eh < hopT ? 5.6 * (eh / hopT) * (1 - eh / hopT) : 0;
      boatAt(t + 0.5, P2, F2);
      const turn = BF.x * F2.z - BF.z * F2.x;
      boat.position.set(BP.x, (wf + wb) * 0.25 + wave(BP.x, BP.z, t) * 0.5 + hop, BP.z);
      boat.rotation.set(-(wf - wb) * 0.16 - 0.05 - hop * 0.06, Math.atan2(BF.x, BF.z), (wl - wr) * 0.2 + turn * 1.6 + Math.sin(t * 1.3) * 0.02);
      boat.updateMatrixWorld();

      /* wake */
      strips.forEach((sp, si) => {
        for (let i = 0; i < WS; i++) {
          const age = WAGE * Math.pow(i / (WS - 1), 1.35);
          boatAt(t - age, P0, F0);
          const ox = -F0.z, oz = F0.x, off = sp.side * sp.off(age), w = sp.w(age);
          const cx = P0.x + F0.x * sp.origin + ox * off, cz = P0.z + F0.z * sp.origin + oz * off;
          const b = (si * WS + i) * 6;
          wakePos[b] = cx - ox * w;
          wakePos[b + 2] = cz - oz * w;
          wakePos[b + 3] = cx + ox * w;
          wakePos[b + 5] = cz + oz * w;
        }
      });
      wakeGeo.attributes.position.needsUpdate = true;

      /* particles */
      np = 0;
      for (const side of [-1, 1]) {
        for (let i = 0; i < 64; i++) {
          const life = 0.85, ph = hr(i, side + 3) * life, cyc = Math.floor((t - ph) / life), birth = cyc * life + ph, age = t - birth;
          boatAt(birth, P0, F0);
          const ox = -F0.z * side, oz = F0.x * side, q = i + cyc * 37;
          const lat = 2 + hr(q, 1) * 3.2, fwd = SPEED * 0.45 + hr(q, 2) * 2, up = 2.2 + hr(q, 3) * 3.4;
          const x = P0.x + F0.x * 1.9 + ox * 0.45 + (ox * lat + F0.x * fwd) * age;
          const z = P0.z + F0.z * 1.9 + oz * 0.45 + (oz * lat + F0.z * fwd) * age;
          const y = 0.25 + up * age - 4.9 * age * age;
          if (y < wave(x, z, t) - 0.1) continue;
          put(x, y, z, (0.3 + hr(q, 4) * 0.32) * (1 - (age / life) * 0.65), i % 4 ? cWhite : cFoam);
        }
        for (let i = 0; i < 30; i++) {
          const life = 0.5, ph = hr(i, side + 9) * life, cyc = Math.floor((t - ph) / life), birth = cyc * life + ph, age = t - birth;
          boatAt(birth, P0, F0);
          const ox = -F0.z * side, oz = F0.x * side, q = i + cyc * 53, along0 = (hr(q, 1) - 0.5) * 3;
          const x = P0.x + F0.x * along0 + ox * (0.95 + age * 1.6), z = P0.z + F0.z * along0 + oz * (0.95 + age * 1.6);
          const y = 0.1 + (1.2 + hr(q, 2) * 1.4) * age - 4.9 * age * age;
          put(x, Math.max(y, wave(x, z, t) + 0.05), z, 0.16 + hr(q, 3) * 0.12, cMist);
        }
      }
      for (let i = 0; i < 150; i++) {
        const life = 3.4, ph = hr(i, 21) * life, cyc = Math.floor((t - ph) / life), birth = cyc * life + ph, age = t - birth;
        boatAt(birth, P0, F0);
        const q = i + cyc * 71, lat = (hr(q, 1) - 0.5) * (1.3 + age * 1.1), ox = -F0.z, oz = F0.x;
        const x = P0.x + F0.x * (stern.z + 0.1) + ox * lat, z = P0.z + F0.z * (stern.z + 0.1) + oz * lat;
        put(x, wave(x, z, t) + 0.1, z, (0.3 + hr(q, 2) * 0.3) * (1 - age / life), age / life > 0.45 ? cFoam : cWhite);
      }
      {
        const per = 2.6, cyc = Math.floor(t / per), birth = cyc * per;
        boatAt(birth, P0, F0);
        splash(t, birth, 0.95, 36, cyc * 3.1, P0.x + F0.x * 2.4, P0.z + F0.z * 2.4, 3.2, 6, 0.36);
      }
      if (eh > hopT && eh < hopT + 1.4) {
        boatAt(tHop + hopT, P0, F0);
        splash(t, tHop + hopT, 1.3, 80, 7.7, P0.x, P0.z, 5.5, 7.5, 0.5);
      }

      /* dolphins: arc out of the water off the bow, splash in and out */
      for (const [di, d] of dolphins.entries()) {
        const cyc = Math.floor((t + d.ph) / DPER), birth = cyc * DPER - d.ph, e = t - birth;
        boatAt(t, P0, F0);
        const ox = -F0.z * d.side, oz = F0.x * d.side;
        const x = P0.x + F0.x * d.fw + ox * d.lat, z = P0.z + F0.z * d.fw + oz * d.lat;
        if (e < DJUMP) {
          const f = e / DJUMP, y = 2.2 * 4 * f * (1 - f) - 0.6;
          d.g.visible = true;
          d.g.position.set(x, y + wave(x, z, t) * 0.5, z);
          d.g.rotation.set(-Math.atan(2.2 * 4 * (1 - 2 * f) / (SPEED * DJUMP)) * 2.2, Math.atan2(F0.x, F0.z), 0);
        } else d.g.visible = false;
        for (const [ti, te] of [birth, birth + DJUMP].entries()) {
          boatAt(te, P0, F0);
          splash(t, te, 0.7, 14, cyc * 1.7 + di * 13 + ti * 5, P0.x + F0.x * d.fw + -F0.z * d.side * d.lat, P0.z + F0.z * d.fw + F0.x * d.side * d.lat, 2.2, 4.2, 0.3);
        }
      }

      /* cyclones: wander, spin, lift debris, spray at the base */
      const ec = t - tCyc;
      cyclones.forEach((c, ci) => {
        const x = c.base.x + Math.cos(t * 0.05 + c.ph) * 14, z = c.base.z + Math.sin(t * 0.07 + c.ph) * 14;
        const spin = t * 1.2 + burst(ec, ci === 0 ? 30 : 0, 4);
        c.layers.position.set(x, -0.5, z);
        c.layers.children[0].rotation.y = spin;
        c.layers.children[1].rotation.y = -spin * 1.4;
        c.layers.scale.setScalar(1 + (ci === 0 ? 0.25 * pulse(ec, 3) : 0));
        c.top.position.set(x, c.H - 2, z);
        c.top.rotation.y = t * 0.05;
        CYC[ci].set(x, z, 18, 0.9);
        c.debris.forEach((m, i) => {
          const f = (t * 0.07 + i / c.debris.length) % 1, y = f * c.H * 0.85, rr = (2.2 + (c.r - 2.2) * Math.pow(f, 1.7)) * 1.15, a = spin * 1.6 + i * 2.1;
          m.position.set(x + Math.cos(a) * rr + Math.sin(y * 0.06 + t * 0.5) * y * 0.1, y, z + Math.sin(a) * rr + Math.cos(y * 0.05 + t * 0.4) * y * 0.08);
          m.rotation.set(t * 2 + i, t * 1.3 + i, 0);
        });
        for (let i = 0; i < 60; i++) {
          const life = 2.2, ph = hr(i, 31 + ci) * life, age = (t - ph) % life, a = hr(i, 33) * 6.28 + age * 3, rr = 2.5 + age * 3;
          put(x + Math.cos(a) * rr, age * 4.5 - age * age * 0.8, z + Math.sin(a) * rr, 0.7 * (1 - age / life) + 0.15, i % 2 ? cWhite : cMist);
        }
      });

      /* volcano embers */
      for (const v of embers) {
        for (let i = 0; i < 40; i++) {
          const life = 2.6, ph = hr(i, 41) * life, age = (t - ph) % life, cyc = Math.floor((t - ph) / life), q = i + cyc * 13;
          put(v.x + (hr(q, 1) - 0.5) * v.r * 1.6 + age * age * 1.5, v.y + age * (7 + hr(q, 2) * 6) - age * age * 2.4, v.z + (hr(q, 3) - 0.5) * v.r * 1.6, 0.9 * (1 - age / life) + 0.2, i % 3 ? cLava : cHot);
        }
      }

      /* clouds drift with the wind; the squall rains */
      for (const c of clouds) {
        const x = ((((c.x + t * WIND + 950) % 1900) + 1900) % 1900) - 950;
        c.g.position.set(x, c.y + Math.sin(t * 0.1 + c.z) * 0.6, c.z);
      }
      for (let i = 0; i < 110; i++) {
        const life = 0.95, ph = hr(i, 51) * life, age = (t - ph) % life, cyc = Math.floor((t - ph) / life), q = i + cyc * 7;
        const a = hr(q, 1) * 6.28, d = Math.sqrt(hr(q, 2)) * 11;
        put(squall.position.x + Math.cos(a) * d, squallC.y - 1 - (age / life) * (squallC.y + 1), squall.position.z + Math.sin(a) * d, 0.16, cRain);
      }

      for (let i = np; i < NP; i++) pSize[i] = 0;
      pGeo.setDrawRange(0, np);
      pGeo.attributes.position.needsUpdate = true;
      (pGeo.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
      (pGeo.attributes.aC as THREE.BufferAttribute).needsUpdate = true;

      /* sky islands bob */
      for (const s of skyGroups) {
        s.g.position.y = s.y + Math.sin(t * 0.22 + s.ph) * 1.4;
        s.g.rotation.z = Math.sin(t * 0.15 + s.ph) * 0.015;
      }
      dyn.forEach((f) => f(t));

      /* flying craft */
      const es = t - tShip;
      placeOn(ship1.g, -t * 5 + LEN * 0.35, -85, 36 + Math.sin(t * 0.2) * 2, -1);
      ship1.g.rotation.x = Math.sin(t * 0.3) * 0.03 + 0.18 * pulse(es, 2.5);
      ship1.props.forEach((p, i) => { p.rotation.z = t * (i ? 9 : 6) + burst(es, 40, 3); });
      placeOn(ship2.g, t * 6.5 + LEN * 0.6, 70, 40 + Math.sin(t * 0.25 + 1) * 2, 1);
      ship2.props.forEach((p, i) => { p.rotation.z = -t * (i ? 10 : 7); });
      placeOn(gal.g, -t * 7 + LEN * 0.1, 48, 24 + Math.sin(t * 0.3) * 2.5, -1);
      gal.g.rotation.z = Math.sin(t * 0.4) * 0.05;
      gal.wings.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * Math.sin(t * 1.6) * 0.35; });
      gal.p.rotation.z = t * 5;
      balloons.forEach((b, i) => {
        b.g.position.set(b.x + Math.sin(t * 0.03 + b.ph) * 12, b.y + Math.sin(t * 0.3 + b.ph) * 1.6, b.z + Math.cos(t * 0.025 + b.ph) * 12);
        b.g.rotation.y = t * 0.05 + i;
        b.fl.scale.setScalar(0.7 + 0.3 * Math.abs(Math.sin(t * 7 + i * 3)));
      });
      // escorts circle the boat
      orni.forEach((o, i) => {
        const a = t * (0.32 + i * 0.07) + i * 3, rr = 22 + i * 9, y = 14 + i * 5 + Math.sin(t * 0.5 + i) * 1.5;
        o.g.position.set(BP.x + Math.cos(a) * rr, y, BP.z + Math.sin(a) * rr);
        o.g.rotation.set(0, -a, 0.3);
        o.wings.forEach((w, j) => { w.rotation.z = (j ? 1 : -1) * Math.sin(t * 9 + i) * 0.45; });
      });
      {
        const a = -t * 0.18 + 1, rr = 34;
        gy.g.position.set(BP.x + Math.cos(a) * rr + BF.x * 10, 24 + Math.sin(t * 0.4) * 2, BP.z + Math.sin(a) * rr + BF.z * 10);
        gy.g.rotation.set(0.1, -a + Math.PI, -0.15);
        gy.rotor.rotation.z = t * 14;
        gy.tail.rotation.z = t * 20;
      }
      for (const g of gulls) {
        const a = g.ph + t * g.sp;
        g.l.position.set(BP.x + Math.cos(a) * g.r, g.y + Math.sin(t * 0.6 + g.ph) * 0.8, BP.z + Math.sin(a) * g.r);
        g.l.rotation.y = -a + (g.sp > 0 ? 0 : Math.PI);
        g.l.scale.y = Math.sin(t * 7 + g.ph * 3);
      }

      /* chase camera: trails the boat's smoothed heading, swings slowly round its quarter */
      boatAt(t - 1.4, P2, F2);
      const ha = Math.atan2(F2.x, F2.z) + Math.PI + 0.62 + Math.sin(t * 0.045) * 0.5 + view.px * 0.3 + view.yaw;
      const dist = 15 + Math.sin(t * 0.06) * 2;
      cam.position.set(BP.x + Math.sin(ha) * dist, 4.2 + Math.sin(t * 0.08) * 0.6 - view.py * 1.2, BP.z + Math.cos(ha) * dist);
      pivot.set(BP.x + BF.x * 2, 5.2, BP.z + BF.z * 2);
      cam.lookAt(pivot);
      cam.rotateZ(Math.sin(t * 0.5) * 0.01);
      k.orbit(cam, pivot);
      cam.position.y = Math.max(cam.position.y, wave(cam.position.x, cam.position.z, t) + 0.8);
      sky.position.copy(cam.position);
      water.position.set(Math.round(cam.position.x / 4) * 4, 0, Math.round(cam.position.z / 4) * 4);

      /* ink width and particle scale follow the render resolution */
      const low = U.uSnap.value.y < 1e4;
      const resY = low ? U.uSnap.value.y * 2 : Math.min(window.devicePixelRatio || 1, 2) * window.innerHeight;
      S.uPx.value = (2 * (low ? 1 : 2.2)) / resY;
      S.uScale.value = resY / (2 * Math.tan((cam.fov * Math.PI) / 360));
      tmpV.copy(cam.position);
    },
    readout(): [string, string][] {
      const p = boat.position;
      return [
        ["Lat", k.dms(11.62 + p.z * 0.0004, "N", "S", 2)],
        ["Lon", k.dms(-141.08 + p.x * 0.0005, "E", "W", 3)],
        ["Speed", `${Math.round(SPEED * 1.94)} kn`],
        ["Hdg", `${k.pad(Math.round(((Math.atan2(BF.x, -BF.z) * 180) / Math.PI + 360) % 360), 3)}°`],
        ["Wind", "W · F5"],
      ];
    },
  };
}

/** The world is built on first use, so the other sheets don't pay for it at page load. */
export function buildSail(k: PsxKit): SceneDef {
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.3, 2400);
  let w: ReturnType<typeof world> | null = null;
  const get = () => (w ??= world(k, scene, cam));
  const egg = (i: number, id: string, r: number, text: string) => ({
    id, r,
    at: (v: V3) => get().eggAt[i](v),
    fire: (t: number) => { get().fire[i](t); return text; },
  });
  return {
    scene, cam, fog: [160, 860], fov: [60, 72], limits: { pitch: [-0.12, 1.0], zoom: [0.45, 2.2] },
    labels: [
      { name: "Red sail", sub: "making 23 kn", at: (v) => get().labelAt[0](v) },
      { name: "Sky citadel", sub: "ruins aloft", at: (v) => get().labelAt[1](v) },
      { name: "Fire peak", sub: "smoking, as ever", at: (v) => get().labelAt[2](v) },
    ],
    eggs: [
      egg(0, "sail-hop", 40, "RED SAIL \u00b7 hops a wave. Showing off for nobody."),
      egg(1, "sail-airship", 44, "AIRSHIP \u00b7 throttles up and dips its nose. A greeting, probably."),
      egg(2, "sail-cyclone", 48, "CYCLONE \u00b7 spins up, then thinks better of it."),
    ],
    update: (t) => get().update(t),
    readout: () => get().readout(),
  };
}
