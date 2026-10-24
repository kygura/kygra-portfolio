/** Sheet · Drift: a train seen side-on, running over an open sea on rails a
 *  hand's breadth under the surface. The sea is a still mirror: everything
 *  above the waterline is drawn a second time, flipped through it, under a thin
 *  murk with slow ripple streaks. Sharp towers stand in it at every distance
 *  (shards, splayed clusters, slant-cut blades, broken stacks, obelisks), with
 *  half-sunk debris at their feet, rings, door frames and stairs to nowhere,
 *  and pieces of stone hanging in the air. Far out, islands float upside down
 *  under a low sun that never sets.
 *
 *  The camera rides alongside, so the train holds still in frame and the world
 *  slides past it. The palette is fixed (dusk lilac and peach); only the seams
 *  in the towers and the drifting motes take the site accent.
 *  Tap the cab to sound the horn, a middle car to put its lights out, the tail
 *  lamp to swing it, the sun to flare it. */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { pulse, type PsxKit, type SceneDef } from "./psx";

const P = {
  zen: "#2c3566",
  mid: "#8a82ba",
  hor: "#f4d6c6",
  fog: "#e4c8ca",
  sun: "#fff7ea",
  sunGlow: "#ffc4a2",
  deep: "#323f68",
  foam: "#f6eeea",
  lamp: "#ffdfa6",
  tail: "#ff5c4c",
};

/** Train speed, m/s. The world moves past at this rate; the train and camera stay put. */
const V = 6;

const NOISE = `
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y); }`;

// The sea mirrors the sky, so the dome below the horizon is the dome above it.
const SKY_V = `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SKY_F = `
uniform vec3 uZen; uniform vec3 uMid; uniform vec3 uHor; uniform vec3 uGlow; uniform vec3 uSunDir; uniform float uFlare; uniform float uTime; varying vec3 vDir;
float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
void main(){
  vec3 d = normalize(vDir); vec3 m = vec3(d.x, abs(d.y), d.z); float h = m.y;
  vec3 c = mix(uHor, uMid, smoothstep(0.0, 0.17, h));
  c = mix(c, uZen, smoothstep(0.15, 0.8, h));
  float s = max(dot(m, normalize(vec3(uSunDir.x, abs(uSunDir.y), uSunDir.z))), 0.0);
  c += uGlow * (pow(s, 5.0) * 0.26 + pow(s, 48.0) * 0.4) * (1.0 + uFlare * 1.6);
  c += uGlow * exp(-h * 34.0) * 0.16;
  vec3 q = floor(m * 140.0); float st = hash(q);
  c += vec3(step(0.9965, st) * smoothstep(0.3, 0.65, h) * (0.45 + 0.55 * sin(uTime * 1.3 + st * 60.0))) * 0.6;
  gl_FragColor = vec4(c, 1.0);
}`;

// The surface: a thin murk over the mirror world, thickening into haze toward the horizon,
// with ripple streaks, the sun's glitter, the train's foam and wake, and the headlamp's pool.
// Unsnapped: it is one quad, and snapping a vertex far behind the lens throws the whole plane.
const SEA_V = `
varying vec3 vWP; varying float vDepth;
void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz; vec4 mv = viewMatrix * wp; gl_Position = projectionMatrix * mv; vDepth = -mv.z; }`;
const SEA_F = `
uniform float uTime; uniform float uScroll; uniform vec3 uDeep; uniform vec3 uFog; uniform vec3 uFoam; uniform vec3 uLamp; uniform vec3 uGlow;
uniform float uFogNear; uniform float uFogFar; uniform vec2 uTrain; uniform vec3 uHorn; uniform vec2 uSunXZ; uniform float uLampAmt;
varying vec3 vWP; varying float vDepth;
${NOISE}
void main(){
  vec2 w = vec2(vWP.x + uScroll, vWP.z);
  float fg = smoothstep(uFogNear, uFogFar, vDepth);
  vec3 c = mix(uDeep, uFog, fg);
  float a = mix(0.46, 1.0, fg);
  float nearK = 1.0 - smoothstep(25.0, 140.0, vDepth);

  // Ripple streaks: lines along the track, wobbling as a slow swell passes under them.
  float wob = vn(vec2(w.x * 0.04, w.y * 0.25) + uTime * 0.04) * 2.2;
  float band = fract(w.y * 0.42 + wob + sin(w.x * 0.07 + uTime * 0.35) * 0.12);
  float streak = smoothstep(0.07, 0.0, abs(band - 0.5)) * (0.35 + 0.65 * vn(w * vec2(0.18, 1.0) + uTime * 0.08)) * nearK;
  c = mix(c, uFoam, streak * 0.3);
  a = max(a, streak * 0.45);

  // Glitter on the line from the eye to the sun.
  vec2 eye = cameraPosition.xz, dir = normalize(uSunXZ - eye), rel = vWP.xz - eye;
  float along = dot(rel, dir), perp = abs(rel.x * dir.y - rel.y * dir.x);
  float col = exp(-pow(perp / (0.8 + max(along, 0.0) * 0.07), 2.0)) * step(0.0, along);
  float spark = step(0.82, h2(floor(w * vec2(1.4, 3.0)) + floor(uTime * 5.0)));
  c += uGlow * col * (0.25 + spark * 0.9);
  a = max(a, col * spark * 0.8);

  // The train: churn along both sides, a widening V and a trail behind the last car.
  float side = abs(vWP.z), behind = uTrain.x - vWP.x;
  float churn = smoothstep(0.35, 0.75, vn(w * vec2(0.9, 2.6) + vec2(0.0, uTime * 0.7)));
  float hull = step(uTrain.x, vWP.x) * step(vWP.x, uTrain.y + 0.8) * smoothstep(2.5, 1.35, side);
  float arm = step(0.0, behind) * smoothstep(0.45 + behind * 0.03, 0.0, abs(side - 1.4 - behind * 0.3)) * exp(-behind * 0.03);
  float trail = step(0.0, behind) * smoothstep(1.6, 0.3, side) * exp(-behind * 0.05);
  float foam = clamp(hull * 0.9 + arm + trail * 0.7, 0.0, 1.0) * churn;
  c = mix(c, uFoam, foam * 0.85);
  a = max(a, foam * 0.85);

  // Headlamp pool ahead of the cab.
  float ahead = vWP.x - uTrain.y;
  float pool = exp(-pow((ahead - 8.0) / 6.5, 2.0)) * exp(-side * side / 5.0) * step(0.0, ahead) * uLampAmt;
  c += uLamp * pool * 0.55;
  a = max(a, pool * 0.6);

  // Horn: rings running out over the water from the cab.
  if (uHorn.z > 0.0 && uHorn.z < 4.0) {
    float r = length(vWP.xz - uHorn.xy), k = 1.0 - uHorn.z / 4.0;
    float ring = smoothstep(0.7, 0.0, abs(r - uHorn.z * 11.0)) + smoothstep(0.7, 0.0, abs(r - (uHorn.z - 0.6) * 11.0)) * step(0.6, uHorn.z);
    c = mix(c, uFoam, ring * k * 0.7);
    a = max(a, ring * k * 0.7);
  }
  gl_FragColor = vec4(c, clamp(a, 0.0, 1.0));
}`;

export function buildDrift(kit: PsxKit): SceneDef {
  const { U, rnd, facet, wallUV, tex, view } = kit;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(44, 16 / 9, 0.3, 3200);
  const fog: [number, number] = [30, 420];

  const fogU = { value: new THREE.Color(P.fog) };
  // Kit materials, re-pointed at this scene's own fog so the accent switch leaves the palette alone.
  const own = <M extends THREE.ShaderMaterial>(m: M) => {
    m.uniforms.uFogColor = fogU;
    return m;
  };
  // Unlit and a little over-bright: lamps, lit windows and the figures against them.
  const glow = <M extends THREE.ShaderMaterial>(m: M, k = 1.35) => {
    m.uniforms.uAmbient.value.setScalar(k);
    return own(m);
  };
  const lit = { amb: "#5a5880", sun: "#ffd8c6" };
  const mSpire = own(kit.psx({ map: tex.tStone, tint: "#7c7a9c", ...lit }));
  const mSpire2 = own(kit.psx({ map: tex.tPlain, tint: "#50527a", ...lit }));
  const mGlass = own(kit.psx({ map: tex.tGlass, tint: "#9aa4c6", ...lit }));
  const mFar = own(kit.psx({ map: tex.tPlain, tint: "#6c6690", fogAmt: 0.8, ...lit }));
  const mDebris = own(kit.psx({ map: tex.tStone, tint: "#aa9ea8", ...lit }));
  const mRust = own(kit.psx({ map: tex.tBark, tint: "#a06c5c", ...lit }));
  const mCloud = glow(kit.psx({ map: tex.tPlain, tint: "#f8e8ea", sun: "#000000", fogAmt: 0.45 }), 1.1);
  const mSeam = own(kit.psx({ map: tex.tPlain, tint: "#000000", emit: 1, fogAmt: 0.35 }));
  const tl = { amb: "#6c6478", sun: "#ffe2cc" };
  const mBody = own(kit.psx({ map: tex.tPlain, tint: "#8e3040", ...tl }));
  const mCream = own(kit.psx({ map: tex.tPlain, tint: "#f0e4cc", ...tl }));
  const mRoof = own(kit.psx({ map: tex.tPlain, tint: "#4c4460", ...tl }));
  const mIron = own(kit.psx({ map: tex.tPlain, tint: "#2c2a38", ...tl }));
  const mMetal = own(kit.psx({ map: tex.tPlain, tint: "#a6a2b4", ...tl }));
  const mWin = glow(kit.psx({ map: tex.tPlain, tint: P.lamp, sun: "#000000", fogAmt: 0.3 }));
  const mLamp = glow(kit.psx({ map: tex.tPlain, tint: P.lamp, sun: "#000000", fogAmt: 0.3 }), 1.6);
  const mPax = glow(kit.psx({ map: tex.tPlain, tint: "#1c1828", sun: "#000000", fogAmt: 0.3 }), 1);
  const mTail = glow(kit.psx({ map: tex.tPlain, tint: P.tail, sun: "#000000", fogAmt: 0.3 }), 1.4);
  const additive = (color: string, opacity: number) =>
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

  /* ---- sky: its own dome, wide enough for the horizon spires, following the camera ---- */
  const SUN = new THREE.Vector3(330, 64, -1280);
  const sunDir = new THREE.Vector3();
  const skyU = {
    uZen: { value: new THREE.Color(P.zen) }, uMid: { value: new THREE.Color(P.mid) }, uHor: { value: new THREE.Color(P.hor) },
    uGlow: { value: new THREE.Color(P.sunGlow) }, uSunDir: { value: sunDir }, uFlare: { value: 0 }, uTime: U.uTime,
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1500, 24, 16),
    new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: skyU, vertexShader: SKY_V, fragmentShader: SKY_F }),
  );
  sky.renderOrder = -1;
  scene.add(sky);

  // Everything above the waterline goes in `above`; a copy flipped through y = 0 is its reflection.
  const above = new THREE.Group();
  scene.add(above);
  const sun = kit.sunDisc(above, SUN.x, SUN.y, SUN.z, 38, P.sun, P.sunGlow);

  /* ---- batching, cut at the waterline: anything under it would come back up through the mirror ---- */
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler(), pv = new THREE.Vector3(), sv = new THREE.Vector3();
  const batch = () => {
    const lists = new Map<THREE.Material, THREE.BufferGeometry[]>();
    return {
      add(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) {
        const g = geo.clone().applyMatrix4(m4.compose(pv.set(x, y, z), q.setFromEuler(eu.set(rx, ry, rz)), sv.set(s, s, s)));
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) p.setY(i, 0);
        const l = lists.get(mat) ?? [];
        l.push(g);
        lists.set(mat, l);
      },
      flush(parent: THREE.Object3D) {
        const out: THREE.Mesh[] = [];
        for (const [mat, l] of lists) {
          const g = mergeGeometries(l);
          if (g) out.push(kit.mesh(g, mat, parent));
        }
        lists.clear();
        return out;
      },
    };
  };
  type Batch = ReturnType<typeof batch>;

  /* ---- shapes: towers stand on y = 0, debris is cut by the batch ---- */
  const up = (g: THREE.BufferGeometry, h: number) => g.translate(0, h / 2, 0);
  const box = (w: number, h: number, d: number) => wallUV(facet(new THREE.BoxGeometry(w, h, d)), 1 / 3);
  const shard = (r: number, h: number, n = 4) => wallUV(facet(up(new THREE.ConeGeometry(r, h, n, 2), h), r * 0.1), 1 / 7).rotateY(rnd() * 3);
  // A thin slab with its top cut on a slant, so one corner runs up to a blade edge.
  const blade = (w: number, h: number, d: number, cut: number) => {
    const g = up(new THREE.BoxGeometry(w, h, d), h);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > h - 1e-3) p.setY(i, h + (p.getX(i) / (w / 2)) * cut);
    return wallUV(facet(g), 1 / 7);
  };
  // Jagged top hashed from position, so the faces that share an edge break the same way.
  const jag = (x: number, z: number) => {
    const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
    return s - Math.floor(s);
  };
  const broken = (w: number, h: number, d: number) => {
    const g = up(new THREE.BoxGeometry(w, h, d, 3, 1, 3), h);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > h - 1e-3) p.setY(i, h - jag(p.getX(i), p.getZ(i)) * h * 0.32);
    return wallUV(facet(g), 1 / 7);
  };
  const obelisk = (w: number, h: number) => {
    const top = w * 0.3;
    return mergeGeometries([
      wallUV(facet(up(new THREE.CylinderGeometry(top, w * 0.5, h, 4).rotateY(Math.PI / 4), h)), 1 / 7),
      facet(new THREE.ConeGeometry(top, w * 1.6, 4).rotateY(Math.PI / 4).translate(0, h + w * 0.8, 0)),
    ])!;
  };
  // An upside-down island: a stone cone hanging point down, a needle standing on its flat top.
  const island = (r: number) =>
    mergeGeometries([
      facet(new THREE.ConeGeometry(r, r * 2.6, 5, 2).rotateX(Math.PI), r * 0.12),
      facet(up(new THREE.ConeGeometry(r * 0.14, r * 1.5, 4), r * 1.5).translate(r * 0.2, r * 1.3, 0)),
    ])!;
  const cloud = (w: number) => facet(new THREE.IcosahedronGeometry(1, 0).scale(w, w * 0.11, w * 0.3), w * 0.04);

  const cluster = (b: Batch, m: THREE.Material, x: number, z: number, h: number, r: number) => {
    const n = 3 + Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, d = i ? r * (0.7 + rnd()) : 0, hh = i ? h * (0.3 + rnd() * 0.45) : h;
      const tilt = i ? 0.18 + rnd() * 0.32 : rnd() * 0.06;
      b.add(shard(r * (0.3 + rnd() * 0.25) * (0.5 + hh / h), hh, 3 + Math.floor(rnd() * 3)), m, x + Math.cos(a) * d, 0, z + Math.sin(a) * d, Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
    }
  };
  const spire = (b: Batch, x: number, z: number, h: number, mats: THREE.Material[], seam: boolean) => {
    const m = mats[Math.floor(rnd() * mats.length)], k = rnd(), ry = rnd() * 3;
    const lx = (rnd() - 0.5) * 0.16, lz = (rnd() - 0.5) * 0.16;
    if (k < 0.28) {
      b.add(shard(h * (0.07 + rnd() * 0.06), h, 3 + Math.floor(rnd() * 2)), m, x, 0, z, lx, 0, lz);
    } else if (k < 0.5) {
      cluster(b, m, x, z, h, h * 0.09);
    } else if (k < 0.72) {
      const w = h * (0.12 + rnd() * 0.1), d = w * (0.3 + rnd() * 0.4);
      b.add(blade(w, h, d, Math.min(h * 0.5, w * (1 + rnd() * 1.5))), m, x, 0, z, lx, ry, lz);
      if (seam && rnd() > 0.35) b.add(facet(new THREE.BoxGeometry(w * 0.09, h * 0.45, d * 1.08)).translate(w * 0.18, h * 0.42, 0), mSeam, x, 0, z, lx, ry, lz);
    } else if (k < 0.88) {
      const w = h * (0.13 + rnd() * 0.08), d = w * (0.7 + rnd() * 0.4);
      b.add(broken(w, h, d), m, x, 0, z, lx * 0.5, ry, lz * 0.5);
      if (seam) for (let j = 0, nb = 1 + Math.floor(rnd() * 3); j < nb; j++) {
        b.add(facet(new THREE.BoxGeometry(w * 1.05, 0.18 + h * 0.008, d * 1.05)).translate(0, h * (0.2 + rnd() * 0.45), 0), mSeam, x, 0, z, lx * 0.5, ry, lz * 0.5);
      }
    } else {
      b.add(obelisk(h * 0.1, h), m, x, 0, z, lx * 0.4, ry, lz * 0.4);
    }
  };
  // Waterline debris: slabs, cubes and beams half sunk, a ring rising out of the water,
  // a door frame and a flight of stairs that lead nowhere, a toppled column.
  const junk = (b: Batch, x: number, z: number, s: number) => {
    const k = rnd(), m = rnd() > 0.7 ? mRust : mDebris, ry = rnd() * 3;
    if (k < 0.22) b.add(box(s * 1.6, s * 2.2, s * 0.35), m, x, s * 0.5, z, (rnd() - 0.5) * 0.6, ry, (rnd() - 0.5) * 1.2);
    else if (k < 0.4) b.add(box(s, s, s), m, x, s * 0.15, z, rnd() * 3, ry, rnd() * 3);
    else if (k < 0.54) b.add(box(s * 0.25, s * 4, s * 0.25), m, x, s * 0.9, z, (rnd() - 0.5) * 0.8, ry, 0.5 + rnd() * 0.6);
    else if (k < 0.66) b.add(facet(new THREE.TorusGeometry(s * 1.6, s * 0.18, 4, 14)).translate(0, s, 0), mDebris, x, 0, z, 0, ry, (rnd() - 0.5) * 0.3);
    else if (k < 0.78) {
      const door = mergeGeometries([
        box(s * 0.3, s * 3, s * 0.3).translate(-s * 0.8, s * 1.5, 0),
        box(s * 0.3, s * 3, s * 0.3).translate(s * 0.8, s * 1.5, 0),
        box(s * 1.9, s * 0.3, s * 0.36).translate(0, s * 3.1, 0),
      ])!;
      b.add(door, m, x, -s * 0.2, z, 0, ry, (rnd() - 0.5) * 0.25);
    } else if (k < 0.9) {
      const steps: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 5; i++) steps.push(box(s * 0.7, s * 0.36 * (i + 1), s * 1.4).translate(i * s * 0.7, s * 0.18 * (i + 1), 0));
      b.add(mergeGeometries(steps)!, mDebris, x, -s * 0.15, z, 0, ry, 0);
    } else {
      b.add(wallUV(facet(new THREE.CylinderGeometry(s * 0.45, s * 0.5, s * 3, 7)), 1 / 3), mDebris, x, s * 0.4, z, (rnd() - 0.5) * 0.4, ry, 1.1 + rnd() * 0.3);
    }
  };

  /* ---- layers: each fills one tile S wide; three copies side by side slide past and wrap ---- */
  const layers: { g: THREE.Group; S: number }[] = [];
  const layer = (S: number, fill: (b: Batch) => void) => {
    const tile = new THREE.Group(), b = batch();
    fill(b);
    b.flush(tile);
    const g = new THREE.Group();
    for (const k of [-1, 0, 1]) {
      const c = k ? tile.clone() : tile;
      c.position.x = k * S;
      g.add(c);
    }
    above.add(g);
    layers.push({ g, S });
  };
  const at = (S: number) => rnd() * S;
  const between = (a: number, b: number) => a + rnd() * (b - a);
  // Near: a few small pieces low in the water between the camera and the line.
  layer(100, (b) => {
    for (let i = 0; i < 7; i++) junk(b, at(100), between(16, 24), between(0.25, 0.55));
  });
  // Mid: spires behind the line and debris around their feet.
  layer(260, (b) => {
    for (let i = 0; i < 10; i++) spire(b, at(260), between(-30, -72), between(6, 22), [mSpire, mSpire2], true);
    for (let i = 0; i < 20; i++) junk(b, at(260), between(-6, -60), between(0.6, 1.6));
  });
  // Far: a denser stand of towers, low cloud between them, small islands overhead.
  layer(640, (b) => {
    for (let i = 0; i < 30; i++) spire(b, at(640), between(-120, -300), between(18, 75), [mSpire, mSpire2, mGlass], true);
    for (let i = 0; i < 5; i++) b.add(cloud(between(30, 60)), mCloud, at(640), between(8, 26), between(-160, -320));
    for (let i = 0; i < 4; i++) b.add(island(between(4, 9)), mSpire, at(640), between(34, 80), between(-120, -260), 0, rnd() * 3, 0);
  });
  // Horizon: tall hazed silhouettes, the high cloud and the big islands.
  layer(1600, (b) => {
    for (let i = 0; i < 34; i++) spire(b, at(1600), between(-380, -680), between(50, 190), [mFar], false);
    for (let i = 0; i < 10; i++) b.add(cloud(between(60, 160)), mCloud, at(1600), between(50, 200), between(-420, -700));
    for (let i = 0; i < 6; i++) b.add(island(between(14, 38)), mFar, at(1600), between(90, 240), between(-360, -620), 0, rnd() * 3, 0);
  });

  /* ---- stone hanging in the air, turning slowly, never touching the water ---- */
  const DSPAN = 300, DC = 10;
  const floatGeo = [
    box(1, 1, 1), box(1.6, 0.3, 1), facet(new THREE.TetrahedronGeometry(0.8)), facet(new THREE.OctahedronGeometry(0.7)),
    facet(up(new THREE.ConeGeometry(0.35, 2.4, 4), 2.4).translate(0, -1.2, 0)),
  ];
  const floaters = Array.from({ length: 22 }, (_, i) => {
    const s = between(0.5, 2.2), mat = i % 9 === 4 ? mSeam : [mDebris, mSpire2, mRust][i % 3];
    const m = kit.mesh(floatGeo[i % floatGeo.length], mat, above);
    m.scale.setScalar(s);
    return {
      m, x0: at(DSPAN), y: between(1.6, 9) + s, z: between(-50, -5), amp: between(0.2, 0.8),
      ph: rnd() * 6.28, w1: between(-0.25, 0.25), w2: between(-0.2, 0.2),
    };
  });

  /* ---- the train: four cars, cab at the right, running toward the sun ---- */
  const CAR = 11, GAP = 1, D = 2.6, N = 4, PITCH = CAR + GAP;
  const FRONT = ((N - 1) / 2) * PITCH + CAR / 2 + D / 2, REAR = -FRONT;
  const train = new THREE.Group();
  above.add(train);
  const bodies: THREE.Group[] = [], axles: THREE.Mesh[] = [], pax: THREE.Mesh[] = [], bogX: number[] = [];
  const wheel = (z: number) => facet(new THREE.CylinderGeometry(0.42, 0.42, 0.14, 8).rotateX(Math.PI / 2).translate(0, 0, z));
  const axleGeo = mergeGeometries([wheel(D / 2 - 0.22), wheel(-(D / 2 - 0.22)), facet(new THREE.CylinderGeometry(0.07, 0.07, D - 0.3, 4).rotateX(Math.PI / 2))])!;
  // One bar across each wheel face, so the turning reads.
  const spokeGeo = facet(new THREE.BoxGeometry(0.72, 0.08, D - 0.26));
  // Half-round end, bulging toward +x (dir 1) or -x (dir -1).
  const end = (b: Batch, x: number, dir: number) => {
    const t0 = dir > 0 ? 0 : Math.PI, phi = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    b.add(facet(new THREE.CylinderGeometry(D / 2, D / 2, 1.25, 10, 1, false, t0, Math.PI)), mBody, x, 1.62, 0);
    b.add(facet(new THREE.CylinderGeometry(D / 2, D / 2, 1.35, 10, 1, false, t0, Math.PI)), mCream, x, 2.945, 0);
    b.add(facet(new THREE.SphereGeometry(D / 2, 10, 4, phi, Math.PI, 0, Math.PI / 2).scale(1, 0.38, 1)), mRoof, x, 3.62, 0);
  };
  let lanternPivot: THREE.Group | null = null;
  for (let i = 0; i < N; i++) {
    const cx = (i - (N - 1) / 2) * PITCH;
    const car = new THREE.Group();
    car.position.x = cx;
    train.add(car);
    const body = new THREE.Group();
    car.add(body);
    bodies.push(body);

    const b = batch();
    b.add(box(CAR, 1.25, D), mBody, 0, 1.62, 0);
    b.add(box(CAR + 0.02, 0.08, D + 0.02), mIron, 0, 2.27, 0);
    b.add(box(CAR, 1.35, D), mCream, 0, 2.945, 0);
    b.add(facet(new THREE.CylinderGeometry(D / 2, D / 2, CAR, 10, 1, false, Math.PI, Math.PI).rotateZ(-Math.PI / 2).scale(1, 0.38, 1)), mRoof, 0, 3.62, 0);
    b.add(box(CAR - 1.2, 0.35, D - 0.5), mIron, 0, 0.85, 0);
    for (const vx of [-2.6, 2.6]) b.add(box(1.2, 0.2, 0.7), mRoof, vx, 4.1, 0);
    if (i === 0) end(b, -CAR / 2, -1);
    if (i === N - 1) {
      end(b, CAR / 2, 1);
      b.add(box(0.14, 0.32, 0.55), mLamp, CAR / 2 + D / 2 + 0.02, 1.75, 0);
    }
    b.flush(body);

    // Windows go right through the body, so both sides are lit; some have a figure against the light.
    const wb = batch(), pb = batch();
    for (let j = 0; j < 7; j++) {
      const wx = -CAR / 2 + 1.1 + (j * (CAR - 2.2)) / 6;
      wb.add(box(0.9, 0.8, D + 0.04), mWin, wx, 2.95, 0);
      if (rnd() < 0.55) {
        const px = wx + (rnd() - 0.5) * 0.3;
        pb.add(box(0.44, 0.44, D + 0.06), mPax, px, 2.77, 0);
        pb.add(box(0.28, 0.3, D + 0.07), mPax, px + (rnd() - 0.5) * 0.06, 3.13, 0);
      }
    }
    if (i === N - 1) wb.add(facet(new THREE.CylinderGeometry(D / 2 + 0.03, D / 2 + 0.03, 0.7, 10, 1, true, 0.5, Math.PI - 1)), mWin, CAR / 2, 3.0, 0);
    wb.flush(body);
    pax.push(...pb.flush(body));

    // Bogies hold the rails; the body rides a little above them.
    const fb = batch();
    for (const bx of [-(CAR / 2 - 2.1), CAR / 2 - 2.1]) {
      bogX.push(cx + bx);
      fb.add(box(2.4, 0.28, D - 0.1), mIron, bx, 0.62, 0);
      for (const ax of [-0.7, 0.7]) {
        const a = kit.mesh(axleGeo, mIron, car, bx + ax, 0.44, 0);
        kit.mesh(spokeGeo, mMetal, a);
        axles.push(a);
      }
    }
    fb.flush(car);

    if (i < N - 1) kit.mesh(box(GAP + 0.4, 2.2, 1.7), mIron, train, cx + PITCH / 2, 2.3, 0);
    if (i === 0) {
      lanternPivot = new THREE.Group();
      lanternPivot.position.set(-CAR / 2 - D / 2 - 0.12, 2.5, 0);
      body.add(lanternPivot);
      kit.mesh(box(0.06, 0.32, 0.06), mIron, lanternPivot, 0, -0.16, 0);
      kit.mesh(box(0.24, 0.3, 0.24), mTail, lanternPivot, 0, -0.45, 0);
    }
  }
  const lantern = lanternPivot!;

  /* ---- the reflection: a copy of everything above, flipped through the surface ---- */
  const below = above.clone();
  below.scale.y = -1;
  scene.add(below);
  const la: THREE.Object3D[] = [], lb: THREE.Object3D[] = [];
  above.traverse((o) => la.push(o));
  below.traverse((o) => lb.push(o));

  /* ---- not mirrored: the sea, the rails under it, the lamp's beam, spray and motes ---- */
  const seaU = {
    uTime: U.uTime, uScroll: { value: 0 }, uDeep: { value: new THREE.Color(P.deep) }, uFog: fogU, uFoam: { value: new THREE.Color(P.foam) },
    uLamp: { value: new THREE.Color(P.lamp) }, uGlow: { value: new THREE.Color(P.sunGlow) }, uFogNear: U.uFogNear, uFogFar: U.uFogFar,
    uTrain: { value: new THREE.Vector2(REAR, FRONT) }, uHorn: { value: new THREE.Vector3(FRONT - 3, 0, -9) },
    uSunXZ: { value: new THREE.Vector2(SUN.x, SUN.z) }, uLampAmt: { value: 1 },
  };
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(6000, 6000).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: seaU, vertexShader: SEA_V, fragmentShader: SEA_F }),
  );
  sea.renderOrder = 1;
  sea.frustumCulled = false;
  scene.add(sea);

  const rail = facet(new THREE.BoxGeometry(400, 0.07, 0.09, 100, 1, 1));
  for (const z of [-0.72, 0.72]) kit.mesh(rail, mIron, scene, 0, -0.12, z);
  const SLEEP = 48, sleepers = new THREE.Group();
  {
    const sb = kit.batcher();
    for (let x = 0; x < SLEEP; x += 1.2) sb.add(facet(new THREE.BoxGeometry(0.22, 0.05, 1.9)), x % 6 < 1.2 ? mRust : mIron, x, -0.2, 0);
    const tile = new THREE.Group();
    sb.flush(tile);
    for (const k of [-1, 0, 1]) {
      const c = k ? tile.clone() : tile;
      c.position.x = k * SLEEP;
      sleepers.add(c);
    }
    scene.add(sleepers);
  }

  const beamMat = additive(P.lamp, 0.1);
  const beam = kit.mesh(new THREE.ConeGeometry(1.5, 16, 10, 1, true).rotateZ(Math.PI / 2), beamMat, scene, FRONT + 8, 1.75, 0);
  beam.renderOrder = 2;
  const lampGlow = kit.flare(scene, FRONT + 0.25, 1.75, 0, 0.45);
  lampGlow.mat.color.set(P.lamp);
  lampGlow.g.visible = true;
  const tailGlow = kit.flare(scene, 0, 0, 0, 0.45);
  tailGlow.mat.color.set(P.tail);
  tailGlow.g.visible = true;
  for (const f of [lampGlow, tailGlow]) f.g.children.forEach((c) => { c.renderOrder = 2; });

  // Spray thrown off the wheels, drifting back along the hull.
  const NS = 176, sprayPos = new Float32Array(NS * 3), spraySeed = Array.from({ length: NS }, () => [rnd(), rnd(), rnd()]);
  const sprayGeo = new THREE.BufferGeometry();
  sprayGeo.setAttribute("position", new THREE.BufferAttribute(sprayPos, 3));
  const spray = new THREE.Points(sprayGeo, new THREE.PointsMaterial({ color: P.foam, size: 1.6, sizeAttenuation: false }));
  spray.frustumCulled = false;
  scene.add(spray);

  // Motes: slow, rising, fixed to the world so they stream past with it.
  const NM = 110, MSPAN = 180, motePos = new Float32Array(NM * 3);
  const moteSeed = Array.from({ length: NM }, () => [at(MSPAN), rnd() * 22, between(-40, 14), rnd() * 6.28]);
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute("position", new THREE.BufferAttribute(motePos, 3));
  const moteMat = new THREE.PointsMaterial({ color: U.uAccent.value.clone(), size: 1.5, sizeAttenuation: false });
  const motes = new THREE.Points(moteGeo, moteMat);
  motes.frustumCulled = false;
  scene.add(motes);

  /* ---- eggs ---- */
  let hornT = -99, lightsT = -99, lanternT = -99, sunT = -99, tNow = 0;
  const lampOn = new THREE.Color(P.lamp), lampOff = new THREE.Color("#2a2638"), winTint = mWin.uniforms.uTint.value as THREE.Color;
  const eggs: SceneDef["eggs"] = [
    { id: "drift-horn", r: 46, at: (v) => { v.set(FRONT - 4, 3, 0); }, fire: (t) => { hornT = t; } },
    { id: "drift-lights", r: 44, at: (v) => { v.set(-PITCH / 2, 3, 0); }, fire: (t) => { lightsT = t; } },
    { id: "drift-lantern", r: 30, at: (v) => { lantern.getWorldPosition(v).y -= 0.45; }, fire: (t) => { lanternT = t; } },
    { id: "drift-sun", r: 50, at: (v) => { v.copy(SUN); }, fire: (t) => { sunT = t; } },
  ];

  const wrap = (v: number, s: number) => ((v % s) + s) % s;
  const pivot = new THREE.Vector3(), tmp = new THREE.Vector3(), UP = THREE.Object3D.DEFAULT_UP;

  return {
    scene,
    cam,
    fog,
    fov: [44, 64],
    limits: { pitch: [-0.06, 0.4], zoom: [0.72, 2], yaw: 0.35 },
    labels: [
      { name: "Train", sub: `${N} CARS, NO STOPS`, at: (v) => { v.set(FRONT - 6, 5.2, 0); } },
      { name: "Sun", sub: "NOT SETTING", at: (v) => { v.copy(SUN).y += 60; } },
    ],
    eggs,
    moteMat,
    update(t) {
      tNow = t;
      const scroll = V * t;
      for (const L of layers) L.g.position.x = -wrap(scroll, L.S);
      sleepers.position.x = -wrap(scroll, SLEEP);
      seaU.uScroll.value = scroll;

      for (const f of floaters) {
        f.m.position.set(wrap(f.x0 - scroll, DSPAN) - DSPAN / 2 + DC, f.y + Math.sin(t * 0.5 + f.ph) * f.amp, f.z);
        f.m.rotation.set(f.ph + t * f.w1, t * f.w2, f.ph * 0.5);
      }

      // The ride: wheels turning at line speed, each body rocking a little on its springs.
      const spin = -(scroll / 0.42) % (Math.PI * 2);
      for (const a of axles) a.rotation.z = spin;
      bodies.forEach((b, i) => {
        b.position.y = 0.022 * (1 + Math.sin(t * 6.3 + i * 1.9));
        b.rotation.z = 0.003 * Math.sin(t * 2.1 + i * 2.4);
      });

      // Horn: two blasts of the lamp and rings out over the water.
      const eh = t - hornT, blast = pulse(eh, 0.5) + pulse(eh - 0.7, 0.5);
      seaU.uHorn.value.z = eh;
      lampGlow.mat.opacity = 0.45 + 0.9 * blast;
      lampGlow.g.lookAt(cam.position);
      beamMat.opacity = 0.1 + 0.22 * blast;
      seaU.uLampAmt.value = 1 + blast;

      // Lights: they flicker and go out; when they come back the seats are empty, for a while.
      const el = t - lightsT;
      let lamp = 1, seated = true;
      if (el > 0 && el < 5.5) {
        if (el < 0.7) lamp = Math.sin(el * 40) > 0 ? 1 : 0.15;
        else if (el < 2.2) lamp = 0.06;
        else seated = false;
      }
      winTint.lerpColors(lampOff, lampOn, lamp);
      for (const m of pax) m.visible = seated;

      // Tail lamp: swings on its hook and brightens.
      const et = t - lanternT;
      lantern.rotation.z = et > 0 && et < 7 ? Math.sin(et * 5.5) * 0.7 * Math.exp(-et * 0.7) : 0;
      lantern.updateWorldMatrix(true, false);
      tailGlow.g.position.set(0, -0.45, 0).applyMatrix4(lantern.matrixWorld);
      tailGlow.mat.opacity = 0.3 + 0.7 * pulse(et, 2.2);
      tailGlow.g.lookAt(cam.position);

      const es = t - sunT;
      sun.scale.setScalar(1 + 0.4 * pulse(es, 1.6));
      skyU.uFlare.value = pulse(es, 2.4);

      for (let i = 0; i < NS; i++) {
        const [a, b, c] = spraySeed[i];
        const ph = (t * (1.1 + a * 0.6) + b) % 1, bow = i < 24;
        const bx = bow ? FRONT - 0.4 : bogX[i % bogX.length], side = Math.floor(i / bogX.length) % 2 ? 1 : -1;
        sprayPos[i * 3] = bx + 0.5 - ph * (bow ? 3.5 : 2.2 + c * 1.5);
        sprayPos[i * 3 + 1] = 0.04 + Math.sin(ph * Math.PI) * (bow ? 0.3 + c * 0.7 : 0.15 + c * 0.45);
        sprayPos[i * 3 + 2] = side * (bow ? 0.3 + ph * (0.8 + a) : D / 2 - 0.1 + ph * (0.4 + a * 0.8));
      }
      sprayGeo.attributes.position.needsUpdate = true;

      for (let i = 0; i < NM; i++) {
        const [x0, y0, z, ph] = moteSeed[i];
        motePos[i * 3] = wrap(x0 - scroll, MSPAN) - MSPAN / 2 + DC + Math.sin(t * 0.4 + ph) * 0.6;
        motePos[i * 3 + 1] = 0.6 + ((y0 + t * 0.35) % 22);
        motePos[i * 3 + 2] = z + Math.cos(t * 0.3 + ph) * 0.6;
      }
      moteGeo.attributes.position.needsUpdate = true;

      // Riding alongside: the camera holds abreast of the cab end, drifting a little fore and aft.
      const ang = view.yaw + Math.sin(t * 0.05) * 0.03 + view.px * 0.12;
      pivot.set((cam.aspect < 1 ? 20 : 9) + Math.sin(t * 0.07) * 1.2, 2.4, 0);
      tmp.set(0, 0.9, 34).applyAxisAngle(UP, ang);
      cam.position.copy(pivot).add(tmp);
      cam.position.y -= view.py * 0.6;
      cam.lookAt(pivot);
      kit.orbit(cam, pivot);
      cam.position.y = Math.max(cam.position.y, 0.7);
      sky.position.copy(cam.position);
      sea.position.set(cam.position.x, 0, cam.position.z);
      sunDir.copy(SUN).sub(cam.position).normalize();
      sun.lookAt(cam.position);

      for (let i = 1; i < la.length; i++) {
        const a = la[i], b = lb[i];
        b.position.copy(a.position);
        b.quaternion.copy(a.quaternion);
        b.scale.copy(a.scale);
        b.visible = a.visible;
      }
    },
    readout: () => {
      const p = cam.position;
      return [
        ["LINE", "OPEN SEA"],
        ["SPEED", `${Math.round(V * 3.6)} km/h`],
        ["DEPTH", `${(0.12 + 0.03 * Math.sin(tNow * 0.4)).toFixed(2)} m`],
        ["BRG", `${kit.pad(Math.round(kit.bearing(cam)), 3)}°`],
        ["NEXT", p.y > 6 ? "NOT IN SIGHT" : "NONE"],
      ];
    },
  };
}
