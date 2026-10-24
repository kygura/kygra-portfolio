/** Sheet · Rift: the wasteland in a mountain valley at the end of the day.
 *  Steep walls close in on a dry floor; spires crown every ridge in
 *  silhouette, blades as tall as the walls jut out of them and lean in over
 *  the valley, and a colossal shard lies wedged from wall to wall. Down the
 *  middle runs a river of broken glass. Ash drifts down, stone hangs in the
 *  gap, islands float upside down against an ember sky, and the sun sits in
 *  the notch at the valley's far end.
 *
 *  The palette is fixed (slate violet rock, ember dusk); only the seams, the
 *  glints in the glass river and the ash take the site accent.
 *  Tap the wedged shard to wake its seams, the glass river to light it, the
 *  sun to flare it. */
import * as THREE from "three";
import { pulse, type PsxKit, type SceneDef } from "./psx";
import { createWaste } from "./wasteland";

const P = {
  zen: "#1a2140",
  mid: "#5a4868",
  hor: "#ec9a60",
  fog: "#86707e",
  glow: "#ffb070",
  sun: "#fff0d8",
  mist: "#a08890",
};

const SKY_V = `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SKY_F = `
uniform vec3 uZen; uniform vec3 uMid; uniform vec3 uHor; uniform vec3 uFog; uniform vec3 uGlow; uniform vec3 uSunDir; uniform float uFlare; uniform float uTime; varying vec3 vDir;
float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
void main(){
  vec3 d = normalize(vDir); float h = d.y;
  vec3 c = mix(uHor, uMid, smoothstep(0.0, 0.14, h));
  c = mix(c, uZen, smoothstep(0.12, 0.6, h));
  float s = max(dot(d, uSunDir), 0.0);
  c += uGlow * (pow(s, 6.0) * 0.35 + pow(s, 50.0) * 0.5) * (1.0 + uFlare * 1.6);
  vec3 q = floor(d * 150.0); float st = hash(q);
  c += vec3(step(0.997, st) * smoothstep(0.35, 0.7, h) * (0.5 + 0.5 * sin(uTime * 1.5 + st * 60.0))) * 0.7;
  c = mix(c, uFog, smoothstep(0.02, -0.06, h));
  gl_FragColor = vec4(c, 1.0);
}`;

export function buildRift(kit: PsxKit): SceneDef {
  const { U, rnd, facet, tex, view } = kit;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(54, 16 / 9, 0.5, 3000);
  const fog: [number, number] = [40, 640];

  const fogU = { value: new THREE.Color(P.fog) };
  const own = <M extends THREE.ShaderMaterial>(m: M) => {
    m.uniforms.uFogColor = fogU;
    return m;
  };
  const lit = { amb: "#5e5276", sun: "#ffb48a" };
  const mRock = own(kit.psx({ map: tex.tStone, tint: "#94889e", ...lit }));
  const mSpire = own(kit.psx({ map: tex.tStone, tint: "#5a5070", ...lit }));
  const mDark = own(kit.psx({ map: tex.tPlain, tint: "#2e2a40", ...lit }));
  const mBlade = own(kit.psx({ map: tex.tPlain, tint: "#8a7c90", ...lit }));
  const mGlass = own(kit.psx({ map: tex.tGlass, tint: "#7c88a8", ...lit }));
  const mDebris = own(kit.psx({ map: tex.tStone, tint: "#968a98", ...lit }));
  const mRust = own(kit.psx({ map: tex.tBark, tint: "#9a5e4a", ...lit }));
  const mSeam = own(kit.psx({ map: tex.tPlain, tint: "#000000", emit: 1, fogAmt: 0.3 }));
  const mCore = own(kit.psx({ map: tex.tPlain, tint: "#000000", emit: 1, fogAmt: 0.25 }));
  const mRiver = own(kit.psx({ map: tex.tPlain, tint: "#000000", emit: 0.6, fogAmt: 0.4 }));
  const W = createWaste(kit, { debris: mDebris, rust: mRust, seam: mSeam });
  const { between } = W;

  /* ---- sky, and the sun in the notch at the far end ---- */
  const SUN = new THREE.Vector3(40, 90, -1300);
  const sunDir = new THREE.Vector3();
  const skyU = {
    uZen: { value: new THREE.Color(P.zen) }, uMid: { value: new THREE.Color(P.mid) }, uHor: { value: new THREE.Color(P.hor) },
    uFog: fogU, uGlow: { value: new THREE.Color(P.glow) }, uSunDir: { value: sunDir }, uFlare: { value: 0 }, uTime: U.uTime,
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1500, 24, 16),
    new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: skyU, vertexShader: SKY_V, fragmentShader: SKY_F }),
  );
  sky.renderOrder = -1;
  scene.add(sky);
  const sun = kit.sunDisc(scene, SUN.x, SUN.y, SUN.z, 34, P.sun, P.glow);

  /* ---- the valley: a dry floor between two walls that run away from the eye ---- */
  const Wv = (z: number) => 52 + 12 * Math.sin(z * 0.012 + 1) + 5 * Math.sin(z * 0.031);
  const noise = (x: number, z: number) =>
    10 * Math.sin(x * 0.03 + z * 0.017) * Math.cos(z * 0.021 - x * 0.011) + 4 * Math.sin(x * 0.07 - z * 0.05) + 1.5 * Math.sin(x * 0.19 + z * 0.13);
  const wall = (d: number, side: number, z: number) =>
    190 * (1 - Math.exp(-d / 95)) * (0.7 + 0.22 * Math.sin(z * 0.013 + side * 1.9)) + 40 * Math.max(0, Math.sin(d * 0.03 + z * 0.01 + side)) * Math.min(1, d / 80);
  const groundH = (x: number, z: number) => {
    const n = noise(x, z), w = Wv(z), ax = Math.abs(x), d = ax - w;
    let h = n * 0.08 + Math.pow(Math.min(1, ax / w), 2) * 2;
    if (d > 0) h += wall(d, Math.sign(x), z) + n * Math.min(1.3, d / 25);
    return h;
  };
  {
    const geo = new THREE.PlaneGeometry(1000, 1500, 130, 180);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, -550);
    const p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = groundH(x, z);
      p.setY(i, y);
      // Skewed planar UVs with height in v, so the sheer walls keep their texture.
      uv.setXY(i, (x + z * 0.6) * 0.06, (z - x * 0.6) * 0.06 + y * 0.08);
    }
    kit.mesh(facet(geo, 1), mRock, scene);
  }

  const b = W.batch();
  const side = () => (rnd() > 0.5 ? 1 : -1);
  // Spires crowning the slopes and ridges, in silhouette against the dusk.
  for (let i = 0; i < 90; i++) {
    const s = side(), z = between(-950, 60), d = between(50, 170), x = s * (Wv(z) + d), h = between(14, 50) * (1 + d / 160);
    W.spire(b, x, groundH(x, z) - 3, z, h, [mSpire, mDark, mGlass], true, { lean: 1.6 });
  }
  // Blades as tall as the walls, driven into them and leaning in over the floor.
  for (let i = 0; i < 22; i++) {
    const s = side(), z = between(-760, -60), x = s * (Wv(z) + between(10, 40)), h = between(30, 80), w = h * between(0.1, 0.16);
    b.add(W.blade(w, h, w * 0.3, Math.min(h * 0.4, w * 2)), mBlade, x, groundH(x, z) - 6, z, between(-0.15, 0.15), between(-0.3, 0.3), s * between(0.45, 0.95));
  }
  // On the floor: broken stacks and obelisks, and the wreckage between them.
  for (let i = 0; i < 16; i++) {
    const z = between(-700, -110), x = (rnd() - 0.5) * 1.4 * Wv(z);
    if (Math.abs(x - 6 * Math.sin(z * 0.02)) < 4) continue;
    W.spire(b, x, groundH(x, z) - 1, z, between(8, 30), [mSpire, mDark], true);
  }
  for (let i = 0; i < 70; i++) {
    const z = between(-640, 34), x = (rnd() - 0.5) * 1.6 * Wv(z);
    W.junk(b, x, groundH(x, z), z, between(0.5, 2));
  }
  for (let i = 0; i < 6; i++) b.add(W.island(between(6, 14)), mSpire, (rnd() - 0.5) * 80, between(110, 200), between(-220, -720), 0, rnd() * 3, 0);
  b.flush(scene);

  // The glass river: a braid of small dark shards down the middle of the floor, some of them lit.
  {
    const rb = W.batch();
    for (let i = 0; i < 240; i++) {
      const z = between(-820, 44), x = 6 * Math.sin(z * 0.02) + (rnd() - 0.5) * (3 + -z * 0.004);
      rb.add(W.shard(between(0.25, 0.7), between(0.8, 3.6), 3), i % 7 ? mGlass : mRiver, x, groundH(x, z) - 0.2, z, (rnd() - 0.5) * 1.6, 0, (rnd() - 0.5) * 1.6);
    }
    rb.flush(scene);
  }

  // The wedge: a colossal shard lying from wall to wall, caught at the height where the walls close on it.
  const WZ = -270, WY = 46;
  const wedge = new THREE.Group();
  wedge.position.set(0, WY, WZ);
  wedge.rotation.set(0.06, 0.12, 0.1);
  scene.add(wedge);
  {
    const span = 2 * (Wv(WZ) + 60), wb = W.batch();
    wb.add(W.shard(7, span, 4).rotateZ(Math.PI / 2).translate(span / 2, 0, 0), mBlade, 0, 0, 0);
    wb.add(facet(new THREE.BoxGeometry(span * 0.6, 0.8, 0.8)), mCore, 0, 0, 3.6);
    wb.add(facet(new THREE.BoxGeometry(span * 0.4, 0.8, 0.8)), mCore, -span * 0.08, 2.4, 3.2);
    for (let i = 0; i < 9; i++) wb.add(W.shard(between(0.6, 1.4), between(4, 12), 3).rotateX(Math.PI), mBlade, between(-span * 0.35, span * 0.35), -2, between(-2, 2));
    wb.flush(wedge);
  }

  const hang = W.hanging(scene, 24, [mDebris, mDark, mRust], (s) => {
    const z = between(-300, -20);
    return [(rnd() - 0.5) * 1.6 * Wv(z), between(10, 42) + s, z];
  });

  // Mist pooled on the floor.
  for (const [y, o] of [[3.5, 0.22], [1.6, 0.16]]) {
    const m = kit.mesh(
      new THREE.PlaneGeometry(500, 1400).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: P.mist, transparent: true, opacity: o, depthWrite: false }),
      scene, 0, y, -560,
    );
    m.renderOrder = 1;
  }

  // Ash coming down through the valley.
  const NA = 160, ashPos = new Float32Array(NA * 3);
  const ashSeed = Array.from({ length: NA }, () => [(rnd() - 0.5) * 80, rnd() * 50, between(-160, 50), rnd() * 6.28]);
  const ashGeo = new THREE.BufferGeometry();
  ashGeo.setAttribute("position", new THREE.BufferAttribute(ashPos, 3));
  const moteMat = new THREE.PointsMaterial({ color: U.uAccent.value.clone(), size: 1.4, sizeAttenuation: false });
  const ash = new THREE.Points(ashGeo, moteMat);
  ash.frustumCulled = false;
  scene.add(ash);

  /* ---- eggs ---- */
  let wedgeT = -99, riverT = -99, sunT = -99, tNow = 0;

  return {
    scene,
    cam,
    fog,
    fov: [54, 70],
    limits: { pitch: [-0.3, 0.5], zoom: [0.8, 2.8], yaw: 0.7 },
    labels: [
      { name: "Wedge", sub: "WALL TO WALL", at: (v) => { v.set(0, WY + 14, WZ); } },
      { name: "River", sub: "GLASS, DRY", at: (v) => { v.set(0, 4, -90); } },
    ],
    eggs: [
      { id: "rift-wedge", r: 60, at: (v) => { v.set(0, WY, WZ); }, fire: (t) => { wedgeT = t; } },
      { id: "rift-river", r: 40, at: (v) => { v.set(6 * Math.sin(-60 * 0.02), 1, -60); }, fire: (t) => { riverT = t; } },
      { id: "rift-sun", r: 46, at: (v) => { v.copy(SUN); }, fire: (t) => { sunT = t; } },
    ],
    moteMat,
    update(t) {
      tNow = t;
      hang(t);
      const ew = pulse(t - wedgeT, 4), er = pulse(t - riverT, 3);
      mCore.uniforms.uEmit.value = 0.6 + 0.25 * Math.sin(t * 0.9) + ew * 2.4;
      mRiver.uniforms.uEmit.value = 0.45 + 0.2 * Math.sin(t * 2.3) + er * 2.5;
      const es = t - sunT;
      sun.scale.setScalar(1 + 0.4 * pulse(es, 1.6));
      skyU.uFlare.value = pulse(es, 2.4);

      for (let i = 0; i < NA; i++) {
        const [x, y0, z, ph] = ashSeed[i];
        ashPos[i * 3] = x + Math.sin(t * 0.3 + ph) * 2;
        ashPos[i * 3 + 1] = 50 - ((50 - y0 + t * 1.1) % 50);
        ashPos[i * 3 + 2] = z + Math.cos(t * 0.2 + ph) * 2;
      }
      ashGeo.attributes.position.needsUpdate = true;

      // Standing on the floor, looking down the valley toward the notch.
      const x = Math.sin(t * 0.03) * 4 + view.px * 2, z = 64 + Math.sin(t * 0.02) * 6;
      cam.position.set(x, groundH(x, z) + 16 - view.py * 0.5, z);
      cam.lookAt(view.px * 8 + Math.sin(t * 0.025) * 6, 34 - view.py * 6, -400);
      kit.look(cam);
      sky.position.copy(cam.position);
      sunDir.copy(SUN).sub(cam.position).normalize();
      sun.lookAt(cam.position);
    },
    readout: () => [
      ["ALT", `${Math.round(1240 + cam.position.y * 6)} m`],
      ["ASH", `${Math.round(20 + 6 * Math.sin(tNow * 0.11))} g/m²`],
      ["WALLS", "170 m"],
      ["BRG", `${kit.pad(Math.round(kit.bearing(cam)), 3)}°`],
      ["SUN", "IN THE NOTCH"],
    ],
  };
}
