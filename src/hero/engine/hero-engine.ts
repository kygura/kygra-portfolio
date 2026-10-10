/**
 * Hero engine: builds the three sheets once, renders only the active one
 * (plus the outgoing one during a dither dissolve) into a quarter-resolution
 * target, then blits through a 15-bit quantize + Bayer dither pass.
 *
 * Loaded with a dynamic import from <CartographicHero/>, so three.js stays out of every
 * other route's bundle. The render loop only runs while there is something
 * to draw: it stops when the hero is offscreen, the tab is hidden, or motion
 * is paused and nothing is dirty.
 */
import * as THREE from "three";
import type { Accent } from "@/theme/accent";
import { createKit, type SceneDef } from "./psx";
import { buildRuins } from "./ruins";
import { buildTopo } from "./topo";
import { buildAstral } from "./astral";

const POST_V = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const POST_F = `
uniform sampler2D tA; uniform sampler2D tB; uniform float uMix; uniform vec2 uLow; uniform float uLevels; varying vec2 vUv;
float b2(vec2 a){ a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float b4(vec2 a){ return b2(0.5 * a) * 0.25 + b2(a); }
void main(){
  vec2 px = floor(vUv * uLow);
  vec2 uv = (px + 0.5) / uLow;
  vec3 c = texture2D(tA, uv).rgb;
  if (uMix < 1.0) {
    vec2 blk = floor(px / 3.0);
    float n = fract(sin(dot(blk, vec2(12.9898, 78.233))) * 43758.5453);
    float th = mix(b4(blk), n, 0.55);
    c = mix(texture2D(tB, uv).rgb, c, step(th, uMix * 1.02 - 0.01));
  }
  vec2 q = vUv - 0.5; c *= 1.0 - dot(q, q) * 0.55;
  c = floor(c * uLevels + b4(px)) / uLevels;
  gl_FragColor = vec4(c, 1.0);
}`;

export interface HeroEngineOptions {
  canvas: HTMLCanvasElement;
  host: HTMLElement;
  /** Optional: landmark labels are skipped when omitted. */
  labelLayer?: HTMLElement | null;
  readKeys: HTMLElement[];
  readVals: HTMLElement[];
  compass: SVGGElement | null;
  accent: Accent;
  sheet: number;
  motion: boolean;
  psx: boolean;
  reducedMotion: boolean;
  onContextLost: () => void;
}

export interface HeroEngine {
  setAccent: (a: Accent) => void;
  setSheet: (i: number) => void;
  setPsx: (on: boolean) => void;
  setMotion: (on: boolean) => void;
  dispose: () => void;
}

export function createHeroEngine(o: HeroEngineOptions): HeroEngine {
  const { canvas, host } = o;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "low-power" });
  // Match r128 behaviour: no output conversion (built-in materials like the motes' PointsMaterial).
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

  const kit = createKit(o.accent);
  const { U } = kit;
  const SC: SceneDef[] = [buildRuins(kit, o.accent.hex), buildTopo(kit), buildAstral(kit)];

  /* ---- post: two low-res targets, dissolve + dither/quantize blit ---- */
  const rtOpt = { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true, stencilBuffer: false };
  const rtA = new THREE.WebGLRenderTarget(320, 180, rtOpt);
  const rtB = new THREE.WebGLRenderTarget(320, 180, rtOpt);
  const postMat = new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    uniforms: {
      tA: { value: rtA.texture }, tB: { value: rtB.texture }, uMix: { value: 1 },
      uLow: { value: new THREE.Vector2(320, 180) }, uLevels: { value: 31.0 },
    },
    vertexShader: POST_V,
    fragmentShader: POST_F,
  });
  const postScene = new THREE.Scene();
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat);
  quad.frustumCulled = false;
  postScene.add(quad);

  /* ---- state ---- */
  let motion = o.motion;
  let psxOn = o.psx;
  let cur = Math.max(0, Math.min(SC.length - 1, o.sheet));
  let prev = cur;
  let mixT = 1;
  let t = 18;
  let last = performance.now();
  let dirty = true;
  let visible = true;
  let frameN = 0;
  let raf = 0;
  let tpx = 0, tpy = 0;
  let cssW = 1, cssH = 1, lw = 320, lh = 180;
  const tmp = new THREE.Vector3();

  /* ---- pinned labels ---- */
  let activeLabels: { l: SceneDef["labels"][number]; el: HTMLDivElement; em: HTMLElement }[] = [];
  const buildLabels = (sc: SceneDef) => {
    if (!o.labelLayer) return;
    const layer = o.labelLayer;
    layer.replaceChildren();
    activeLabels = sc.labels.map((l) => {
      const el = document.createElement("div");
      el.className = "lbl";
      const span = document.createElement("span");
      span.append(`${l.name} `);
      const em = document.createElement("em");
      em.textContent = l.sub;
      span.append(em);
      el.append(span);
      layer.append(el);
      return { l, el, em };
    });
  };
  const placeLabels = (sc: SceneDef) => {
    for (const L of activeLabels) {
      L.l.at(tmp);
      tmp.project(sc.cam);
      const vis = tmp.z < 1 && tmp.x > -0.95 && tmp.x < 0.8 && tmp.y > -0.25 && tmp.y < 0.85;
      L.el.style.opacity = vis ? "1" : "0";
      if (vis) L.el.style.transform = `translate(${Math.round(((tmp.x + 1) / 2) * cssW)}px,${Math.round(((1 - tmp.y) / 2) * cssH)}px)`;
      if (L.l.sub2 && (frameN % 10 === 0 || !L.em.textContent)) L.em.textContent = L.l.sub2();
    }
  };
  const readouts = (sc: SceneDef) => {
    const r = sc.readout();
    for (let i = 0; i < 5; i++) {
      if (o.readKeys[i]) o.readKeys[i].textContent = r[i][0];
      if (o.readVals[i]) o.readVals[i].textContent = r[i][1];
    }
    o.compass?.setAttribute("transform", `rotate(${(-kit.bearing(sc.cam)).toFixed(1)})`);
  };

  /* ---- sizing ---- */
  const setSnap = () => {
    if (psxOn) U.uSnap.value.set(lw * 0.5, lh * 0.5);
    else U.uSnap.value.set(1e5, 1e5);
  };
  const resize = () => {
    cssW = Math.max(1, host.clientWidth);
    cssH = Math.max(1, host.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(cssW, cssH, false);
    for (const s of SC) {
      s.cam.aspect = cssW / cssH;
      s.cam.fov = s.cam.aspect < 1 ? s.fov[1] : s.fov[0];
      s.cam.updateProjectionMatrix();
    }
    lw = Math.max(200, Math.min(360, Math.round(cssW / 3.6)));
    lh = Math.max(120, Math.round((lw * cssH) / cssW));
    rtA.setSize(lw, lh);
    rtB.setSize(lw, lh);
    postMat.uniforms.uLow.value.set(lw, lh);
    setSnap();
    dirty = true;
    kick();
  };

  /* ---- render loop ---- */
  const apply = (sc: SceneDef) => {
    U.uFogNear.value = sc.fog[0];
    U.uFogFar.value = sc.fog[1];
  };
  const render = () => {
    const sc = SC[cur];
    if (psxOn) {
      if (mixT < 1) {
        const ps = SC[prev];
        apply(ps);
        renderer.setRenderTarget(rtB);
        renderer.render(ps.scene, ps.cam);
      }
      apply(sc);
      renderer.setRenderTarget(rtA);
      renderer.render(sc.scene, sc.cam);
      postMat.uniforms.uMix.value = mixT;
      renderer.setRenderTarget(null);
      renderer.render(postScene, postCam);
    } else {
      apply(sc);
      renderer.setRenderTarget(null);
      renderer.render(sc.scene, sc.cam);
    }
  };
  const wants = () => visible && !document.hidden && (motion || dirty || mixT < 1);
  function loop(now: number) {
    raf = 0;
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    if (motion) t += dt;
    if (mixT < 1) mixT = Math.min(1, mixT + dt / 0.7);
    kit.view.px += (tpx - kit.view.px) * 0.05;
    kit.view.py += (tpy - kit.view.py) * 0.05;
    U.uTime.value = t;
    SC[cur].update(t);
    if (mixT < 1) SC[prev].update(t);
    render();
    placeLabels(SC[cur]);
    if (frameN++ % 6 === 0 || dirty) readouts(SC[cur]);
    dirty = false;
    if (wants()) raf = requestAnimationFrame(loop);
  }
  function kick() {
    if (raf || !wants()) return;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  /* ---- observers ---- */
  const onPointer = (e: PointerEvent) => {
    if (!motion) return;
    const r = host.getBoundingClientRect();
    tpx = (e.clientX - r.left) / r.width - 0.5;
    tpy = (e.clientY - r.top) / r.height - 0.5;
  };
  const onVisibility = () => {
    if (!document.hidden) { dirty = true; kick(); }
  };
  const onLost = (e: Event) => {
    e.preventDefault();
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    visible = false;
    o.onContextLost();
  };
  host.addEventListener("pointermove", onPointer);
  document.addEventListener("visibilitychange", onVisibility);
  canvas.addEventListener("webglcontextlost", onLost);
  const io = new IntersectionObserver((es) => {
    visible = es[0].isIntersecting;
    if (visible) { dirty = true; kick(); }
  });
  io.observe(host);
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  buildLabels(SC[cur]);
  resize();

  return {
    setAccent(a) {
      U.uAccent.value.set(a.hex);
      U.uAccent2.value.set(a.deep);
      U.uFogColor.value.set(a.fog);
      U.uZen.value.set(a.zen);
      SC[0].moteMat?.color.set(a.hex);
      dirty = true;
      kick();
    },
    setSheet(i) {
      i = ((i % SC.length) + SC.length) % SC.length;
      if (i === cur) return;
      prev = cur;
      cur = i;
      mixT = psxOn && !o.reducedMotion ? 0 : 1;
      buildLabels(SC[cur]);
      dirty = true;
      kick();
    },
    setPsx(on) {
      psxOn = on;
      setSnap();
      dirty = true;
      kick();
    },
    setMotion(on) {
      motion = on;
      dirty = true;
      kick();
    },
    dispose() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      io.disconnect();
      ro.disconnect();
      host.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onLost);
      const geos = new Set<THREE.BufferGeometry>();
      const mats = new Set<THREE.Material>();
      for (const s of [...SC.map((x) => x.scene), postScene]) {
        s.traverse((obj) => {
          const m = obj as THREE.Mesh;
          if (m.geometry) geos.add(m.geometry);
          if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => mats.add(x));
        });
      }
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      Object.values(kit.tex).forEach((tx) => tx.dispose());
      rtA.dispose();
      rtB.dispose();
      renderer.dispose();
      o.labelLayer?.replaceChildren();
    },
  };
}
