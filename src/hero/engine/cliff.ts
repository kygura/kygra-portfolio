/** Sheet 09 · Cliffs: a ruined stone city on a sea cliff, gone to trees,
 *  looking out over an open swell to a low sun. A waterfall breaks out of the
 *  cliff face, a broken bridge reaches a sea stack with a small temple, and
 *  out on the water the old world stands in silhouette: a drowned colossus,
 *  a line of arches marching to the horizon, a raised hand and a leaning tower.
 *  Tap the lighthouse to light it, the colossus to wake it. */
import * as THREE from "three";
import { pulse, type PsxKit, type SceneDef, type V3 } from "./psx";

const FALL_V = `
uniform vec2 uSnap; varying vec2 vUv; varying float vDepth;
void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vec4 p = projectionMatrix * mv;
  p.xy = floor(p.xy / p.w * uSnap + 0.5) / uSnap * p.w; gl_Position = p; vDepth = -mv.z; }`;
const FALL_F = `
uniform float uTime; uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar; varying vec2 vUv; varying float vDepth;
void main(){
  float col = floor(vUv.x * 6.0);
  float s = fract(vUv.y * 5.0 + uTime * (1.1 + fract(col * 0.37) * 0.5) + col * 0.21);
  vec3 c = mix(vec3(0.55, 0.7, 0.74), vec3(0.92, 0.96, 0.95), step(0.6, s));
  c = mix(c, vec3(0.95), smoothstep(0.85, 1.0, 1.0 - vUv.y) * 0.6);
  float fg = smoothstep(uFogNear, uFogFar, vDepth);
  gl_FragColor = vec4(mix(c, uFogColor, fg), 1.0);
}`;

export function buildCliff(kit: PsxKit): SceneDef {
  const { U, rnd } = kit;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(52, 16 / 9, 0.1, 700);
  scene.add(kit.skyDome(0, 0.25, 1));
  const sun = kit.sunDisc(scene, -330, 34, -360, 13, "#f6e7c2", "#f0b878");

  /* ---- coastline: land to +x of a wavy edge, sea to -x ---- */
  const edge = (z: number) => 4 * Math.sin(z * 0.045) + 2 * Math.sin(z * 0.11 + 1) - Math.max(0, -z - 90) * 0.12;
  const TOP = 22;
  const groundH = (x: number, z: number) => {
    const d = x - edge(z);
    const top = TOP + 1.6 * Math.sin(x * 0.08) * Math.cos(z * 0.06) + Math.max(0, d - 55) * 0.18;
    const k = THREE.MathUtils.smoothstep(d, -2.5, 1.5);
    return -7 + (top + 7) * k;
  };

  // Facade: pale ashlar with dark arched openings on an 8px bay.
  const facadeTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const g = c.getContext("2d");
    if (!g) throw new Error("2d canvas unavailable");
    const img = g.createImageData(32, 32);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const bx = x % 8, by = y % 16, k = 0.82 + rnd() * 0.25;
      const hole = bx >= 2 && bx <= 5 && by >= 4 && by <= 12 && !(by === 4 && (bx === 2 || bx === 5));
      const i = (y * 32 + x) * 4;
      const course = y % 4 === 0 ? 0.8 : 1;
      if (hole) { img.data[i] = 34; img.data[i + 1] = 36; img.data[i + 2] = 40; }
      else { img.data[i] = 196 * k * course; img.data[i + 1] = 184 * k * course; img.data[i + 2] = 160 * k * course; }
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  })();

  const mCliff = kit.psx({ map: kit.tex.tSand, tint: "#9c917c", moss: 1, uv: 0.6 });
  const mRock = kit.psx({ map: kit.tex.tStone, tint: "#8f8676", moss: 0.5, uv: 1.5 });
  const mFacade = kit.psx({ map: facadeTex, tint: "#e2d8c0", moss: 0.6 });
  const mFacade2 = kit.psx({ map: facadeTex, tint: "#c9bfa8", moss: 0.8 });
  const mRoof = kit.psx({ map: kit.tex.tStone, tint: "#a88a70", moss: 0.5, uv: 2 });
  const mFar = kit.psx({ map: kit.tex.tStone, tint: "#9aa0a0", moss: 0.35, uv: 0.8 });
  const mWater = kit.psx({ map: kit.tex.tWater, uv: 60, tint: "#c8d6d4" });
  const mVine = kit.M.leaf[1];

  /* ---- land ---- */
  {
    const geo = new THREE.PlaneGeometry(210, 340, 84, 120);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i) + 70;
      const z = p.getZ(i) - 60;
      const d = x - edge(z);
      // Crag: rows near the edge are pushed around so the face isn't a clean wall.
      if (d > -4 && d < 3) x += (rnd() - 0.5) * 2.2;
      const y = groundH(x, z) + (d > 1.5 ? (rnd() - 0.5) * 0.6 : 0);
      p.setXYZ(i, x, y, z);
      uv.setXY(i, z * 0.12, y * 0.14 + x * 0.03);
    }
    kit.mesh(kit.facet(geo), mCliff, scene);
  }

  /* ---- sea: one swell field, displaced on the CPU each frame ---- */
  const seaGeo = new THREE.PlaneGeometry(620, 620, 96, 96);
  seaGeo.rotateX(-Math.PI / 2);
  seaGeo.translate(-160, 0, -150);
  const seaPos = seaGeo.attributes.position;
  const seaXZ = new Float32Array(seaPos.count * 2);
  for (let i = 0; i < seaPos.count; i++) { seaXZ[i * 2] = seaPos.getX(i); seaXZ[i * 2 + 1] = seaPos.getZ(i); }
  kit.mesh(seaGeo, mWater, scene);
  const swell = (x: number, z: number, t: number) =>
    0.45 * Math.sin(x * 0.09 + t * 0.8) + 0.3 * Math.sin(z * 0.13 - t * 1.05 + x * 0.04) + 0.12 * Math.sin((x + z) * 0.45 + t * 2);

  const b = kit.batcher();
  const box = (w: number, h: number, d: number, r = 0.1) => kit.facet(new THREE.BoxGeometry(w, h, d, 2, 2, 2), r);
  const rock = (r: number, a = 0.35) => kit.facet(new THREE.IcosahedronGeometry(r, 0), r * a);

  // Boulders along the foot of the cliff and a few sea stacks.
  for (let z = -200; z < 90; z += 4 + rnd() * 5) {
    const x = edge(z) - 1.5 - rnd() * 6, r = 1 + rnd() * 2.6;
    b.add(rock(r), mRock, x, -0.5 + rnd(), z, rnd() * 3, rnd() * 3, 0);
  }
  const stacks: [number, number, number, number][] = [[-18, -78, 3.6, 20], [-28, 18, 2.4, 11], [-13, 46, 1.8, 7]];
  for (const [ox, z, r, h] of stacks) {
    const x = edge(z) + ox;
    b.add(kit.facet(new THREE.CylinderGeometry(r * 0.85, r * 1.3, h + 6, 7, 4), 0.7), mRock, x, h / 2 - 3, z);
  }

  /* ---- ruined city ---- */
  const LIGHT_Z = -36;
  const lightX = edge(LIGHT_Z) + 3.2;
  const facade = (w: number, h: number, d: number) => kit.wallUV(kit.facet(new THREE.BoxGeometry(w, h, d, 1, 2, 1), 0.12), 0.13);
  for (let i = 0; i < 80; i++) {
    const z = -150 + rnd() * 190, d = 7 + Math.pow(rnd(), 1.3) * 62, x = edge(z) + d;
    if (Math.abs(z - LIGHT_Z) < 8 && d < 14) continue;
    const gy = groundH(x, z), w = 3 + rnd() * 5, dp = 3 + rnd() * 5;
    const ruin = rnd() < 0.45;
    let h = 4 + rnd() * (d < 30 ? 9 : 15);
    if (ruin) h *= 0.45 + rnd() * 0.3;
    const ry = rnd() * 0.3 - 0.15;
    b.add(facade(w, h + 1.5, dp), rnd() < 0.5 ? mFacade : mFacade2, x, gy + h / 2 - 0.75, z, 0, ry);
    if (ruin) {
      for (let k = 0; k < 3; k++) b.add(box(0.8 + rnd() * 1.4, 0.6 + rnd(), 0.8 + rnd(), 0.25), mRock, x + (rnd() - 0.5) * w * 1.6, gy + 0.2, z + (rnd() - 0.5) * dp * 1.6, rnd(), rnd() * 3, rnd());
      // A broken upper wall stub on one side.
      b.add(facade(w, 1.5 + rnd() * 3, 0.6), mFacade2, x, gy + h + 0.5, z - dp / 2 + 0.3, 0, ry);
    } else {
      const roof = rnd();
      if (roof < 0.35) b.add(kit.facet(new THREE.SphereGeometry(Math.min(w, dp) * 0.48, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2)), mRoof, x, gy + h + 0.75, z, 0, ry);
      else if (roof < 0.7) b.add(kit.facet(new THREE.ConeGeometry(Math.max(w, dp) * 0.72, 2.6, 4)), mRoof, x, gy + h + 2, z, 0, ry + Math.PI / 4);
      else b.add(box(w + 0.4, 0.5, dp + 0.4), mRoof, x, gy + h + 1, z, 0, ry);
    }
  }
  // Towers, one snapped.
  [[20, -96, 30, false], [34, -20, 26, true], [14, 22, 22, false], [48, -66, 34, false]].forEach(([d, z, h, broken]) => {
    const x = edge(z as number) + (d as number), gy = groundH(x, z as number), hh = broken ? (h as number) * 0.55 : (h as number);
    b.add(facade(3.2, hh, 3.2), mFacade, x, gy + hh / 2 - 0.5, z as number);
    if (!broken) {
      b.add(box(4, 0.8, 4), mRoof, x, gy + hh, z as number);
      b.add(kit.facet(new THREE.ConeGeometry(2.4, 6, 6)), mRoof, x, gy + hh + 3.4, z as number);
    } else b.add(facade(3.2, 7, 3.2), mFacade2, x - 4.5, gy + 0.6, (z as number) + 2, 0.15, 0.4, Math.PI / 2 - 0.1);
  });
  // Sea wall along the edge, with gaps.
  for (let z = -160; z < 60; z += 6) {
    if (rnd() < 0.35 || Math.abs(z - LIGHT_Z) < 6) continue;
    const x = edge(z) + 3.2, h = 1.6 + rnd() * 2.2;
    b.add(box(1.4, h, 6, 0.15), mFacade2, x, groundH(x, z) + h / 2 - 0.3, z + 3, 0, -Math.atan(4 * 0.045 * Math.cos(z * 0.045)));
  }
  // Broken bridge out to the big stack, and the temple on it.
  {
    const [ox, sz, , sh] = stacks[0];
    const sx = edge(sz) + ox, cx = edge(sz) + 2;
    const span = cx - sx;
    for (let k = 0; k < 5; k++) {
      if (k === 2) continue;
      const x = sx + (span * (k + 0.5)) / 5;
      b.add(box(1.4, TOP + 7, 1.6, 0.1), mFacade2, x, (TOP - 7) / 2 - 0.5, sz);
      b.add(box(span / 5 + 0.2, 1.4, 2.2, 0.1), mFacade, x, TOP - 0.2, sz);
    }
    const ty = sh + 3;
    for (let c = 0; c < 8; c++) {
      if (c === 5) continue;
      const a = (c / 8) * Math.PI * 2;
      b.add(kit.facet(new THREE.CylinderGeometry(0.32, 0.36, 4.2, 6)), mFacade, sx + Math.cos(a) * 2.6, ty + 2.1, sz + Math.sin(a) * 2.6);
    }
    b.add(kit.facet(new THREE.CylinderGeometry(3.4, 3.4, 0.6, 8)), mFacade2, sx, ty - 0.1, sz);
    b.add(kit.facet(new THREE.ConeGeometry(3.6, 1.8, 8)), mRoof, sx, ty + 5.1, sz, 0.12, 0, 0.1);
  }

  /* ---- lighthouse ---- */
  const lgy = groundH(lightX, LIGHT_Z);
  b.add(kit.facet(new THREE.CylinderGeometry(1.5, 2.3, 15, 8, 3), 0.05), mFacade, lightX, lgy + 7, LIGHT_Z);
  b.add(kit.facet(new THREE.CylinderGeometry(2.1, 2.1, 0.6, 8)), mRoof, lightX, lgy + 14.6, LIGHT_Z);
  b.add(kit.facet(new THREE.ConeGeometry(1.7, 2.4, 8)), mRoof, lightX, lgy + 17.6, LIGHT_Z);
  for (let c = 0; c < 4; c++) {
    const a = (c / 4) * Math.PI * 2 + Math.PI / 4;
    b.add(box(0.25, 1.8, 0.25, 0), mRoof, lightX + Math.cos(a) * 1.3, lgy + 15.8, LIGHT_Z + Math.sin(a) * 1.3);
  }
  const LAMP = new THREE.Vector3(lightX, lgy + 15.8, LIGHT_Z);
  const LAMP_OFF = new THREE.Color("#5a4a34"), LAMP_ON = new THREE.Color("#ffebb0");
  const lampMat = new THREE.MeshBasicMaterial({ color: LAMP_OFF });
  kit.mesh(new THREE.OctahedronGeometry(0.75, 0), lampMat, scene, LAMP.x, LAMP.y, LAMP.z);
  const lampGlow = kit.flare(scene, LAMP.x, LAMP.y, LAMP.z, 1.4);
  lampGlow.mat.color.set("#ffe6a8");
  const beamPivot = new THREE.Group();
  beamPivot.position.copy(LAMP);
  beamPivot.visible = false;
  scene.add(beamPivot);
  const beamMat = new THREE.MeshBasicMaterial({ color: "#ffe9b8", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const beamGeo = new THREE.ConeGeometry(5, 90, 10, 1, true).translate(0, -45, 0).rotateZ(Math.PI / 2);
  kit.mesh(beamGeo, beamMat, beamPivot);

  /* ---- nature: trees through the streets, vines down the face ---- */
  for (let i = 0; i < 110; i++) {
    const z = -170 + rnd() * 220, d = 4 + rnd() * 80, x = edge(z) + d, gy = groundH(x, z), s = 0.7 + rnd() * 1.1;
    const tall = rnd() < 0.35;
    b.add(kit.facet(new THREE.CylinderGeometry(0.18, 0.3, 3 * s, 5)), kit.M.bark, x, gy + 1.5 * s, z);
    if (tall) b.add(kit.facet(new THREE.ConeGeometry(1.6 * s, 6 * s, 6), 0.2), kit.M.leaf[i % 3], x, gy + 5.2 * s, z, 0, rnd() * 3);
    else b.add(kit.facet(new THREE.IcosahedronGeometry(1.9 * s, 0), 0.5), kit.M.leaf[i % 3], x, gy + 3.6 * s, z, rnd(), rnd() * 3, rnd());
  }
  for (let i = 0; i < 70; i++) {
    const z = -180 + rnd() * 240, x = edge(z) + 2 + rnd() * 6, s = 0.8 + rnd() * 1.2;
    b.add(kit.facet(new THREE.IcosahedronGeometry(1.1 * s, 0), 0.4), kit.M.leaf[(i + 1) % 3], x, groundH(x, z) + 0.4, z, rnd(), rnd() * 3, rnd());
  }
  for (let z = -170; z < 70; z += 2.2 + rnd() * 3) {
    if (rnd() < 0.4) continue;
    const len = 4 + rnd() * 12, x = edge(z) - 0.6;
    b.add(box(0.5 + rnd() * 1.2, len, 0.4, 0.15), mVine, x, TOP - len / 2 + 0.5, z, 0, 0, (rnd() - 0.5) * 0.1);
  }

  /* ---- remnants on the water, out to the horizon ---- */
  // A line of arches walking out to sea; spans fall away as it goes.
  for (let k = 0; k < 14; k++) {
    const x = -40 - k * 15, z = -95 - k * 13, h = 16 - k * 0.25;
    if (k % 5 === 3) continue;
    b.add(box(2.4, h + 4, 2.6, 0.2), mFar, x, h / 2 - 2, z, 0, -0.85);
    if (k % 3 !== 2) b.add(box(15.5, 2.2, 2.8, 0.25), mFar, x + 7.5 * 0.65, h, z + 6.5 * 0.75, 0, -0.85, k % 4 === 1 ? 0.06 : 0);
  }
  // Drowned colossus: a tilted crowned head and one open hand.
  const colossus = new THREE.Group();
  colossus.position.set(-92, -3, -40);
  colossus.rotation.set(0.15, 0.9, 0.38);
  scene.add(colossus);
  const cb = kit.batcher();
  cb.add(kit.facet(new THREE.IcosahedronGeometry(8, 1).scale(0.85, 1.1, 0.95), 0.6), mFar, 0, 4, 0);
  cb.add(box(1.8, 4, 2.4, 0.2), mFar, 0, 3.6, 7.2, -0.15);
  cb.add(box(5.5, 1.4, 2, 0.3), mFar, 0, 7.6, 6.2);
  for (let c = 0; c < 7; c++) {
    const a = -1.4 + c * 0.47;
    cb.add(kit.facet(new THREE.ConeGeometry(1.1, 5 + (c % 2) * 2.5, 4), 0.2), mFar, Math.sin(a) * 6.4, 12.6, Math.cos(a) * 5.6 - 1, Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.5);
  }
  cb.flush(colossus);
  const eyeMat = new THREE.MeshBasicMaterial({ color: "#1c2228" });
  [-2.6, 2.6].forEach((ex) => kit.mesh(new THREE.BoxGeometry(2.2, 1, 0.6), eyeMat, colossus, ex, 5.6, 7.4));
  const colEye = new THREE.Vector3();
  {
    const hx = -62, hz = -120;
    b.add(kit.facet(new THREE.CylinderGeometry(1.8, 2.4, 16, 7, 2), 0.3), mFar, hx, 6, hz, 0, 0, 0.18);
    b.add(box(5, 5, 2.4, 0.3), mFar, hx - 1.6, 15.4, hz, 0, 0.4, 0.18);
    for (let f = 0; f < 4; f++) b.add(box(0.9, 4.2, 1, 0.1), mFar, hx - 3.4 + f * 1.4, 19.6 - Math.abs(f - 1.5) * 0.5, hz, 0, 0.4, 0.15 - f * 0.05);
    b.add(box(1, 3, 1, 0.1), mFar, hx + 1.4, 16.2, hz + 0.6, 0, 0.4, -0.9);
  }
  // A leaning tower, a ring of columns, scattered islets with trees.
  b.add(facade(7, 46, 7), mFar, -168, 16, -30, 0, 0.3, 0.2);
  b.add(box(8, 1, 8), mFar, -172.6, 39, -30, 0, 0.3, 0.2);
  for (let c = 0; c < 10; c++) {
    if (c % 4 === 1) continue;
    const a = (c / 10) * Math.PI * 2, h = 6 + (c % 3) * 3;
    b.add(kit.facet(new THREE.CylinderGeometry(0.9, 1, h, 6)), mFar, -130 + Math.cos(a) * 9, h / 2 - 1.5, -150 + Math.sin(a) * 9);
  }
  for (const [x, z, r] of [[-60, -10, 5], [-112, -92, 6], [-200, -120, 9], [-150, 40, 7], [-45, -165, 4]]) {
    b.add(rock(r, 0.25).scale(1, 0.4, 1), mRock, x, 0.2, z);
    for (let k = 0; k < 3; k++) b.add(kit.facet(new THREE.IcosahedronGeometry(r * 0.28, 0), 0.5), kit.M.leaf[k % 3], x + (rnd() - 0.5) * r, r * 0.35 + 1, z + (rnd() - 0.5) * r);
  }
  // Fallen columns in the shallows below the city.
  for (let i = 0; i < 9; i++) {
    const z = -130 + rnd() * 160, x = edge(z) - 4 - rnd() * 10;
    b.add(kit.facet(new THREE.CylinderGeometry(0.8, 0.85, 5 + rnd() * 4, 6)), mFacade2, x, 0, z, Math.PI / 2, rnd() * 3, 0.2);
  }
  b.flush(scene);

  /* ---- waterfall out of the face, with a mist pool ---- */
  const FALL_Z = 6;
  const fallX = edge(FALL_Z) - 0.9;
  const fallMat = new THREE.ShaderMaterial({
    uniforms: { uSnap: U.uSnap, uTime: U.uTime, uFogColor: U.uFogColor, uFogNear: U.uFogNear, uFogFar: U.uFogFar },
    vertexShader: FALL_V,
    fragmentShader: FALL_F,
    side: THREE.DoubleSide,
  });
  kit.mesh(new THREE.PlaneGeometry(3.4, TOP - 4, 1, 4), fallMat, scene, fallX, (TOP - 4) / 2, FALL_Z, 0, -Math.PI / 2);
  const mist = new THREE.MeshBasicMaterial({ color: "#e8f0ee", transparent: true, opacity: 0.35, depthWrite: false });
  const mistPuffs = [0, 1, 2, 3].map((k) => kit.mesh(new THREE.IcosahedronGeometry(1.6 + k * 0.4, 0), mist, scene, fallX - 1.5 - k * 0.8, 0.6, FALL_Z + (k - 1.5) * 1.4));

  /* ---- foam line along the cliff foot ---- */
  const foamZ: number[] = [];
  for (let z = -210; z < 95; z += 2.4) foamZ.push(z);
  const foamPos = new Float32Array(foamZ.length * 6);
  const foamGeo = new THREE.BufferGeometry();
  foamGeo.setAttribute("position", new THREE.BufferAttribute(foamPos, 3));
  const foam = new THREE.LineSegments(foamGeo, kit.lineMat({ value: new THREE.Color("#eef2ea") }, 160));
  foam.frustumCulled = false;
  scene.add(foam);

  /* ---- gulls ---- */
  const GULLS = 14;
  const gullPos = new Float32Array(GULLS * 4 * 3);
  const gullGeo = new THREE.BufferGeometry();
  gullGeo.setAttribute("position", new THREE.BufferAttribute(gullPos, 3));
  const gulls = new THREE.LineSegments(gullGeo, kit.lineMat({ value: new THREE.Color("#f2efe4") }, 200));
  gulls.frustumCulled = false;
  scene.add(gulls);
  const gull = Array.from({ length: GULLS }, () => ({
    cx: -30 - rnd() * 40, cz: -125 + rnd() * 70, r: 8 + rnd() * 18, y: 26 + rnd() * 14, w: (0.12 + rnd() * 0.12) * (rnd() < 0.5 ? -1 : 1), ph: rnd() * 6.28,
  }));

  /* ---- eggs ---- */
  let lightT = -99, colT = -99;
  const eggs = [
    { id: "cliff-lighthouse", r: 28, at: (o: V3) => o.copy(LAMP), fire: (t: number) => { lightT = t; } },
    { id: "cliff-colossus", r: 40, at: (o: V3) => o.copy(colEye), fire: (t: number) => { colT = t; } },
  ];

  const view = kit.view;
  // Offshore, looking down the coast: cliff and city on the right, the open sea and the remnants ahead.
  const pivotWide = new THREE.Vector3(-58, 9, -96);
  // Portrait crops the sides, so aim nearer the coast to keep the cliff in frame.
  const pivotTall = new THREE.Vector3(-30, 11, -92);
  // Turned seaward so the orbit's landward end stays offshore of the cliff.
  const base = new THREE.Vector3(34, 20, 124).applyAxisAngle(THREE.Object3D.DEFAULT_UP, -0.15);
  const tmp = new THREE.Vector3();
  let tNow = 0;

  return {
    scene,
    cam,
    fog: [45, 300],
    fov: [52, 70],
    limits: { pitch: [-0.12, 0.3], zoom: [0.7, 2.6], yaw: 0.3 },
    labels: [
      { name: "Lighthouse", sub: "DARK", at: (o) => o.copy(LAMP).setY(LAMP.y + 4), sub2: () => (pulse(tNow - lightT, 9) > 0.02 ? "LIT" : "DARK") },
      { name: "Colossus", sub: "DROWNED", at: (o) => o.copy(colEye).setY(colEye.y + 11) },
      { name: "Causeway", sub: "14 ARCHES", at: (o) => o.set(-85, 20, -134) },
    ],
    eggs,
    update(t) {
      tNow = t;
      for (let i = 0; i < seaPos.count; i++) seaPos.setY(i, swell(seaXZ[i * 2], seaXZ[i * 2 + 1], t));
      seaPos.needsUpdate = true;
      seaGeo.computeVertexNormals();

      foamZ.forEach((z, i) => {
        const z2 = z + 2.4, x1 = edge(z) - 1.6 + Math.sin(t * 1.3 + z * 0.3) * 0.7, x2 = edge(z2) - 1.6 + Math.sin(t * 1.3 + z2 * 0.3) * 0.7;
        foamPos.set([x1, 0.45 + swell(x1, z, t) * 0.5, z, x2, 0.45 + swell(x2, z2, t) * 0.5, z2], i * 6);
      });
      foamGeo.attributes.position.needsUpdate = true;

      gull.forEach((g, i) => {
        const a = g.ph + t * g.w, x = g.cx + Math.cos(a) * g.r, z = g.cz + Math.sin(a) * g.r, y = g.y + Math.sin(t * 0.7 + i) * 1.5;
        const dx = -Math.sin(a) * Math.sign(g.w), dz = Math.cos(a) * Math.sign(g.w);
        const flap = Math.sin(t * 6 + i * 2) * 0.35, sx = -dz * 0.9, sz = dx * 0.9;
        gullPos.set([x + sx, y + 0.3 + flap, z + sz, x, y, z, x, y, z, x - sx, y + 0.3 + flap, z - sz], i * 12);
      });
      gullGeo.attributes.position.needsUpdate = true;

      mistPuffs.forEach((m, k) => {
        const s = 1 + Math.sin(t * 1.7 + k * 1.3) * 0.15;
        m.scale.set(s, s, s);
        m.rotation.y = t * 0.3 + k;
      });

      // Lighthouse: lit for a spell, the beam sweeping the water.
      const lit = pulse(t - lightT, 9);
      const on = Math.min(1, lit * 3);
      lampMat.color.copy(LAMP_OFF).lerp(LAMP_ON, on);
      lampGlow.g.visible = on > 0.01;
      lampGlow.mat.opacity = on * 0.6;
      lampGlow.g.quaternion.copy(cam.quaternion);
      beamPivot.visible = on > 0.01;
      beamMat.opacity = on * 0.24;
      beamPivot.rotation.set(0, (t - lightT) * 1.1 + Math.PI, -0.06);

      const wake = pulse(t - colT, 4);
      eyeMat.color.setRGB(0.11 + wake * 0.9, 0.13 + wake * 0.75, 0.16 + wake * 0.45);
      colossus.rotation.z = 0.38 - wake * 0.05;
      colossus.updateMatrixWorld();
      colEye.set(0, 5.6, 7.4).applyMatrix4(colossus.matrixWorld);

      sun.lookAt(cam.position);

      const ang = view.yaw + Math.sin(t * 0.04) * 0.06 + view.px * 0.2;
      const pivot = cam.aspect < 1 ? pivotTall : pivotWide;
      tmp.copy(base).applyAxisAngle(THREE.Object3D.DEFAULT_UP, ang);
      cam.position.copy(pivot).add(tmp);
      cam.position.y -= view.py * 2;
      cam.lookAt(pivot);
      kit.orbit(cam, pivot);
    },
    readout: () => [
      ["TIDE", pulse(tNow - lightT, 9) > 0.02 ? "LAMP LIT" : "EBBING"],
      ["SWELL", `${(0.9 + 0.3 * Math.sin(tNow * 0.8)).toFixed(1)} m`],
      ["WIND", "WSW 14 kn"],
      ["BEARING", `${kit.pad(Math.round(kit.bearing(cam)), 3)}°`],
      ["ALT", `${Math.round(TOP * 5.2)} m`],
    ],
  };
}
