/** Sheet 08 · Drifter: an abstract prism shrine in the Hyper Light Drifter
 *  palette. Deep navy shadow, a magenta-to-pink horizon, neon cyan light and
 *  one red marker colour. A faceted crystal floats over a sigil floor, ringed
 *  by orbiting shards and a halo, with a light shaft through it and hex
 *  terraces and floating monoliths fading into the haze. The palette is the
 *  scene, so it ignores the page accent. Tapping the prism flings the shards
 *  out and sends a ripple across the floor. */
import * as THREE from "three";
import { pulse, type PsxKit, type SceneDef } from "./psx";

const P = {
  zenith: "#071224",
  navy: "#133879",
  violet: "#3b1f5c",
  magenta: "#9a1b58",
  pink: "#f0688c",
  haze: "#8a3570",
  cyan: "#1cffe5",
  mint: "#78ffef",
  teal: "#94b7b7",
  red: "#ff001e",
  bone: "#eddbda",
};

const SNAP = `p.xy = floor(p.xy / p.w * uSnap + 0.5) / uSnap * p.w;`;

const SKY_V = `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SKY_F = `
uniform float uTime; uniform vec3 uZen; uniform vec3 uNavy; uniform vec3 uViolet; uniform vec3 uMag; uniform vec3 uPink; uniform vec3 uHaze; uniform vec3 uBone;
varying vec3 vDir;
float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
void main(){
  vec3 d = normalize(vDir); float h = d.y;
  vec3 c = mix(uHaze, uPink, smoothstep(-0.01, 0.07, h));
  c = mix(c, uMag, smoothstep(0.06, 0.2, h));
  c = mix(c, uViolet, smoothstep(0.17, 0.34, h));
  c = mix(c, uNavy, smoothstep(0.3, 0.56, h));
  c = mix(c, uZen, smoothstep(0.52, 0.95, h));
  float lon = atan(d.z, d.x);
  // Long thin cloud streaks low in the glow.
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float y = 0.05 + fi * 0.045 + sin(lon * (2.0 + fi) + uTime * 0.015 + fi * 1.7) * 0.012;
    float w = 0.0035 + 0.002 * sin(lon * 5.0 + fi);
    float s = smoothstep(w, 0.0, abs(h - y)) * smoothstep(0.2, 0.7, sin(lon * (3.0 + fi) + fi * 2.3) * 0.5 + 0.5);
    c = mix(c, mix(uPink, uBone, 0.45), s * 0.7);
  }
  vec3 q = floor(d * 140.0); float r = hash(q);
  float star = step(0.9965, r) * smoothstep(0.32, 0.6, h) * (0.55 + 0.45 * sin(uTime * 1.3 + r * 90.0));
  c += vec3(star) * 0.8;
  gl_FragColor = vec4(c, 1.0);
}`;

const FLAT_V = `
uniform vec2 uSnap; varying vec3 vN; varying vec3 vWP; varying vec3 vLP; varying float vDepth;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix) * normal);
  vWP = wp.xyz; vLP = position;
  vec4 mv = viewMatrix * wp;
  vec4 p = projectionMatrix * mv;
  ${SNAP}
  gl_Position = p;
  vDepth = -mv.z;
}`;

const CRYSTAL_F = `
uniform vec3 uA; uniform vec3 uB; uniform vec3 uRim; uniform float uTime; uniform float uFlash;
varying vec3 vN; varying vec3 vWP; varying vec3 vLP;
void main(){
  vec3 n = normalize(vN);
  vec3 v = normalize(cameraPosition - vWP);
  float band = vLP.y * 0.4 + dot(n, vec3(0.45, 0.2, 0.6)) * 0.7 + sin(uTime * 0.6) * 0.25;
  vec3 c = mix(uA, uB, smoothstep(-0.2, 1.1, band));
  c *= 0.7 + 0.5 * max(dot(n, normalize(vec3(-0.4, 0.8, 0.45))), 0.0);
  c = mix(c, uRim, pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.65);
  gl_FragColor = vec4(mix(c, vec3(1.0), uFlash), 1.0);
}`;

const SLAB_F = `
uniform vec3 uTop; uniform vec3 uSide; uniform vec3 uRim; uniform vec3 uFog; uniform float uFogNear; uniform float uFogFar; uniform vec3 uCore;
varying vec3 vN; varying vec3 vWP; varying float vDepth;
void main(){
  vec3 n = normalize(vN);
  vec3 c = mix(uSide, uTop, smoothstep(0.6, 0.92, n.y));
  vec3 L = normalize(uCore - vWP);
  c += uRim * max(dot(n, L), 0.0) * 0.4 * smoothstep(48.0, 8.0, length(vWP.xz - uCore.xz));
  c *= mix(0.5, 1.0, smoothstep(-5.0, 3.0, vWP.y));
  gl_FragColor = vec4(mix(c, uFog, smoothstep(uFogNear, uFogFar, vDepth)), 1.0);
}`;

const GROUND_F = `
uniform vec3 uBase; uniform vec3 uDeep; uniform vec3 uCyan; uniform vec3 uMint; uniform vec3 uPink; uniform vec3 uRed; uniform vec3 uFog;
uniform float uFogNear; uniform float uFogFar; uniform float uTime; uniform float uPulse;
varying vec3 vWP; varying float vDepth;
const float TAU = 6.2831853;
void main(){
  float r = length(vWP.xz), ang = atan(vWP.z, vWP.x);
  vec3 c = mix(uBase, uDeep, smoothstep(4.0, 32.0, r));
  c += mix(uPink, uCyan, 0.5 + 0.5 * sin(uTime * 0.4)) * exp(-r * r * 0.035) * 0.4;
  vec2 g = abs(fract(vWP.xz * 0.25 + 0.5) - 0.5);
  c = mix(c, c * 1.4 + uCyan * 0.02, step(0.47, max(g.x, g.y)) * smoothstep(28.0, 9.0, r));
  float k = 0.0;
  k += smoothstep(0.09, 0.0, abs(r - 5.0)) * step(0.5, fract((ang + uTime * 0.05) * 24.0 / TAU));
  k += smoothstep(0.06, 0.0, abs(r - 6.2));
  k += smoothstep(0.35, 0.0, abs(r - 8.6)) * step(0.82, fract((ang - uTime * 0.03) * 48.0 / TAU));
  k += smoothstep(0.05, 0.0, abs(r - 11.0)) * step(0.3, fract((ang + uTime * 0.012) * 6.0 / TAU));
  c = mix(c, uCyan, clamp(k, 0.0, 1.0) * 0.85);
  float s = (fract((ang + uTime * 0.02) * 3.0 / TAU) - 0.5) * TAU / 3.0 * 7.3;
  c = mix(c, uRed, step(abs(r - 7.3) + abs(s), 0.32));
  if (uPulse >= 0.0) c = mix(c, uMint, smoothstep(0.7, 0.0, abs(r - uPulse * 26.0)) * (1.0 - uPulse) * 0.9);
  gl_FragColor = vec4(mix(c, uFog, smoothstep(uFogNear, uFogFar, vDepth)), 1.0);
}`;

const SHAFT_V = `varying float vY; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vY = wp.y; gl_Position = projectionMatrix * viewMatrix * wp; }`;
const SHAFT_F = `
uniform vec3 uCol; uniform float uTime; uniform float uCore; uniform float uBoost; varying float vY;
void main(){
  float a = exp(-abs(vY - uCore) * 0.07) * 0.2 * (0.75 + 0.25 * sin(vY * 1.6 - uTime * 2.4));
  a *= smoothstep(0.0, 1.5, vY);
  gl_FragColor = vec4(uCol * a * (1.0 + uBoost * 2.0), 1.0);
}`;

const LINE_V = `uniform vec2 uSnap; void main(){ vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); ${SNAP} gl_Position = p; }`;
const LINE_F = `uniform vec3 uColor; void main(){ gl_FragColor = vec4(uColor, 1.0); }`;

/** Hexagonal crystal: pointed cap, straight band, longer pointed foot. Flat-shaded. */
function crystalGeo(n: number, r: number, top: number, mid: number, bot: number) {
  const pos: number[] = [];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    const x0 = Math.cos(a0) * r, z0 = Math.sin(a0) * r, x1 = Math.cos(a1) * r, z1 = Math.sin(a1) * r;
    pos.push(0, top, 0, x1, mid, z1, x0, mid, z0);
    pos.push(x0, -mid, z0, x1, mid, z1, x1, -mid, z1);
    pos.push(x0, -mid, z0, x0, mid, z0, x1, mid, z1);
    pos.push(0, -bot, 0, x0, -mid, z0, x1, -mid, z1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

export function buildDrifter(kit: PsxKit): SceneDef {
  const { U, rnd, view } = kit;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(54, 16 / 9, 0.1, 420);
  const col = (h: string) => ({ value: new THREE.Color(h) });
  const fogU = col(P.haze);
  const CORE_Y = 4.2;
  const core = new THREE.Vector3(0, CORE_Y, 0);

  /* ---- sky ---- */
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(200, 24, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTime: U.uTime, uZen: col(P.zenith), uNavy: col(P.navy), uViolet: col(P.violet), uMag: col(P.magenta),
        uPink: col(P.pink), uHaze: fogU, uBone: col(P.bone),
      },
      vertexShader: SKY_V,
      fragmentShader: SKY_F,
    }),
  );
  sky.renderOrder = -1;
  scene.add(sky);

  /* ---- sigil floor ---- */
  const groundU = {
    uSnap: U.uSnap, uTime: U.uTime, uFogNear: U.uFogNear, uFogFar: U.uFogFar, uFog: fogU,
    uBase: col("#1d2b52"), uDeep: col("#241c45"), uCyan: col(P.cyan), uMint: col(P.mint), uPink: col(P.pink), uRed: col(P.red),
    uPulse: { value: -1 },
  };
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 260, 26, 26),
    new THREE.ShaderMaterial({ uniforms: groundU, vertexShader: FLAT_V, fragmentShader: GROUND_F }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  /* ---- hex terraces and floating monoliths ---- */
  const slab = (top: string, side: string) =>
    new THREE.ShaderMaterial({
      uniforms: {
        uSnap: U.uSnap, uFogNear: U.uFogNear, uFogFar: U.uFogFar, uFog: fogU,
        uTop: col(top), uSide: col(side), uRim: col(P.pink), uCore: { value: core },
      },
      vertexShader: FLAT_V,
      fragmentShader: SLAB_F,
    });
  const mTerrace = slab("#5f8f98", "#22305e");
  const mMono = slab("#94b7b7", "#1a2350");
  const bat = kit.batcher();
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + rnd() * 0.25;
    const d = 15 + rnd() * 34 + (i % 3) * 6;
    const h = 1 + rnd() * (d > 30 ? 10 : 4);
    const r = 2.5 + rnd() * 4;
    const g = kit.facet(new THREE.CylinderGeometry(r, r * 1.08, h, 6, 1), 0.25);
    bat.add(g, mTerrace, Math.cos(a) * d, h / 2 - 0.4, Math.sin(a) * d, 0, rnd() * Math.PI, 0);
    // A smaller step on top of every other plateau.
    if (i % 2 === 0) {
      const h2 = 0.8 + rnd() * 1.6;
      bat.add(kit.facet(new THREE.CylinderGeometry(r * 0.55, r * 0.6, h2, 6, 1), 0.2), mTerrace, Math.cos(a) * d, h + h2 / 2 - 0.4, Math.sin(a) * d, 0, rnd(), 0);
    }
  }
  bat.flush(scene);

  const monoGeo = crystalGeo(4, 1, 1.2, 4, 2.2);
  const monos = Array.from({ length: 7 }, (_, i) => {
    const a = (i / 7) * Math.PI * 2 + 0.4, d = 24 + (i % 3) * 9;
    const m = kit.mesh(monoGeo, mMono, scene, Math.cos(a) * d, 9 + (i % 4) * 2.5, Math.sin(a) * d, 0.08 * (i % 2 ? 1 : -1), a, 0.1);
    const s = 0.8 + (i % 3) * 0.35;
    m.scale.set(s, s, s);
    return { m, y: m.position.y, ph: i * 1.3 };
  });

  /* ---- the prism ---- */
  const prismU = { uA: col(P.magenta), uB: col(P.cyan), uRim: col(P.bone), uTime: U.uTime, uFlash: { value: 0 }, uSnap: U.uSnap };
  const prismMat = new THREE.ShaderMaterial({ uniforms: prismU, vertexShader: FLAT_V, fragmentShader: CRYSTAL_F });
  const lineMat = (h: string) => new THREE.ShaderMaterial({ uniforms: { uSnap: U.uSnap, uColor: col(h) }, vertexShader: LINE_V, fragmentShader: LINE_F });
  const prismGeo = crystalGeo(6, 1.15, 1.9, 0.7, 3.1);
  const prismRoot = new THREE.Group();
  prismRoot.position.copy(core);
  scene.add(prismRoot);
  const prism = kit.mesh(prismGeo, prismMat, prismRoot);
  prism.add(new THREE.LineSegments(new THREE.EdgesGeometry(prismGeo), lineMat(P.mint)));
  // Wire cage, a size up, turning the other way.
  const cage = new THREE.LineSegments(new THREE.EdgesGeometry(crystalGeo(6, 1.75, 2.9, 1.0, 4.4)), lineMat(P.pink));
  prismRoot.add(cage);

  /* ---- orbiting shards ---- */
  const shardGeo = crystalGeo(4, 0.22, 0.35, 0.12, 0.55);
  const orbit = new THREE.Group();
  orbit.rotation.set(0.32, 0, 0.12);
  prismRoot.add(orbit);
  const shards = Array.from({ length: 9 }, (_, i) => {
    const m = kit.mesh(shardGeo, prismMat, orbit);
    return { m, a: (i / 9) * Math.PI * 2, spin: 0.8 + (i % 3) * 0.4 };
  });
  const redShard = kit.mesh(shardGeo, new THREE.MeshBasicMaterial({ color: P.red }), prismRoot);

  /* ---- light shaft ---- */
  const shaftU = { uCol: col(P.mint), uTime: U.uTime, uCore: { value: CORE_Y }, uBoost: { value: 0 } };
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.75, 70, 10, 1, true),
    new THREE.ShaderMaterial({
      uniforms: shaftU, vertexShader: SHAFT_V, fragmentShader: SHAFT_F,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }),
  );
  shaft.position.y = 35;
  scene.add(shaft);

  /* ---- halo: rings that always face the camera, framing the prism ---- */
  const halo = new THREE.Group();
  scene.add(halo);
  const haloSpin = new THREE.Group();
  halo.add(haloSpin);
  const ring = (r: number, n: number) => {
    const pts = kit.circle(r, n);
    return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), lineMat(P.pink));
  };
  halo.add(ring(6.4, 64));
  const dashes: THREE.Vector3[] = [];
  const ticks: THREE.Vector3[] = [];
  for (let i = 0; i < 48; i++) {
    const a0 = (i / 48) * Math.PI * 2, a1 = a0 + (Math.PI * 2) / 96;
    if (i % 2 === 0) dashes.push(new THREE.Vector3(Math.cos(a0) * 7.1, Math.sin(a0) * 7.1, 0), new THREE.Vector3(Math.cos(a1) * 7.1, Math.sin(a1) * 7.1, 0));
    if (i % 4 === 0) {
      const l = i % 12 === 0 ? 0.9 : 0.45;
      ticks.push(new THREE.Vector3(Math.cos(a0) * 7.6, Math.sin(a0) * 7.6, 0), new THREE.Vector3(Math.cos(a0) * (7.6 + l), Math.sin(a0) * (7.6 + l), 0));
    }
  }
  haloSpin.add(kit.segs(dashes, lineMat(P.mint)));
  haloSpin.add(kit.segs(ticks, lineMat(P.teal)));

  /* ---- motes rising through the shaft ---- */
  const N = 170;
  const mp = new Float32Array(N * 3), mc = new Float32Array(N * 3);
  const seeds = Array.from({ length: N }, (_, i) => {
    const c = new THREE.Color(i % 5 === 0 ? P.pink : i % 7 === 0 ? P.bone : P.mint);
    c.toArray(mc, i * 3);
    return { a: rnd() * Math.PI * 2, r: 0.6 + Math.pow(rnd(), 1.6) * 11, s: 0.25 + rnd() * 0.7, ph: rnd() * 16, w: 0.05 + rnd() * 0.15 };
  });
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute("position", new THREE.BufferAttribute(mp, 3));
  moteGeo.setAttribute("color", new THREE.BufferAttribute(mc, 3));
  const motes = new THREE.Points(
    moteGeo,
    new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  motes.frustumCulled = false;
  scene.add(motes);

  /* ---- egg: tap the prism ---- */
  let fired = -100;
  let now = 0;
  const FLING = 1.8;

  const pivot = new THREE.Vector3(0, CORE_Y - 0.6, 0);
  const tmpV = new THREE.Vector3();

  return {
    scene,
    cam,
    fog: [20, 95],
    fov: [52, 68],
    limits: { pitch: [-0.22, 0.5], zoom: [0.65, 2.4] },
    labels: [
      {
        name: "Prism",
        sub: "hyperlight core",
        at: (v) => v.copy(prismRoot.position).add(tmpV.set(1.6, 2.2, 0)),
        sub2: () => `flux ${(0.62 + 0.38 * Math.sin(now * 0.6)).toFixed(2)}`,
      },
      { name: "Monolith", sub: "module 04", at: (v) => v.copy(monos[2].m.position).add(tmpV.set(0, 5, 0)) },
    ],
    eggs: [
      {
        id: "drifter-prism",
        r: 42,
        at: (v) => v.copy(prismRoot.position),
        fire: (t) => { fired = t; },
      },
    ],
    update(t) {
      now = t;
      const e = t - fired;
      const fling = pulse(e, FLING);

      /* camera: slow orbit around the shrine */
      const a = t * 0.035 + view.yaw + view.px * 0.25;
      const R = 15.5;
      cam.position.set(Math.sin(a) * R, 4.8 - view.py * 1.5, Math.cos(a) * R);
      cam.lookAt(pivot);
      kit.orbit(cam, pivot);

      prismRoot.position.y = CORE_Y + Math.sin(t * 0.8) * 0.25;
      prism.rotation.set(Math.sin(t * 0.3) * 0.06, t * 0.4 + fling * 2.5, 0);
      cage.rotation.set(0, -t * 0.22, Math.sin(t * 0.25) * 0.05);
      cage.scale.setScalar(1 + fling * 0.18);
      prismU.uFlash.value = pulse(e, 0.45) * 0.85;
      shaftU.uBoost.value = fling;
      shaftU.uCore.value = prismRoot.position.y;

      orbit.rotation.y = t * 0.3;
      const rr = 3.1 + fling * 3.6;
      for (const s of shards) {
        const sa = s.a + t * 0.15;
        s.m.position.set(Math.cos(sa) * rr, Math.sin(t * 1.1 + s.a * 2) * 0.25, Math.sin(sa) * rr);
        s.m.rotation.set(t * s.spin, t * s.spin * 0.7, 0);
      }
      const ra = -t * 0.5;
      redShard.position.set(Math.cos(ra) * 4.4, -1.6 + Math.sin(t * 0.7) * 0.4, Math.sin(ra) * 4.4);
      redShard.rotation.set(0, t * 2, 0.4);

      halo.position.copy(prismRoot.position);
      halo.quaternion.copy(cam.quaternion);
      halo.translateZ(-4);
      haloSpin.rotation.z = t * 0.05;
      halo.scale.setScalar(1 + fling * 0.08);

      groundU.uPulse.value = e >= 0 && e < 2.6 ? e / 2.6 : -1;

      for (const o of monos) o.m.position.y = o.y + Math.sin(t * 0.35 + o.ph) * 0.6;

      for (let i = 0; i < N; i++) {
        const s = seeds[i];
        const y = (s.ph + t * s.s) % 16;
        const aa = s.a + t * s.w;
        const r = s.r * (1 + fling * 0.6);
        mp[i * 3] = Math.cos(aa) * r;
        mp[i * 3 + 1] = y;
        mp[i * 3 + 2] = Math.sin(aa) * r;
      }
      moteGeo.attributes.position.needsUpdate = true;
    },
    readout() {
      const deg = Math.round((((prism.rotation.y * 180) / Math.PI) % 360 + 360) % 360);
      const out = now - fired < FLING;
      return [
        ["CORE", `${kit.pad(deg, 3)}°`],
        ["SHARDS", out ? "09 · FLUNG" : "09 · BOUND"],
        ["FLUX", (0.62 + 0.38 * Math.sin(now * 0.6)).toFixed(2)],
        ["HDG", `${kit.pad(Math.round(kit.bearing(cam)), 3)}°`],
        ["ALT", `${cam.position.y.toFixed(1)} M`],
      ];
    },
  };
}
