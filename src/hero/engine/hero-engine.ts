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
import { createKit, type SceneDef, type TouchPoint } from "./psx";
import { buildOcean } from "./ocean";
import { buildTopo } from "./topo";
import { buildAstral } from "./astral";
import { buildRuins } from "./ruins";
import { buildRail } from "./rail";
import { buildField } from "./field";

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
  /** Step the camera: yaw/pitch in radians, zoom as a multiplier (>1 = closer). */
  nudge: (yaw: number, pitch: number, zoom?: number) => void;
  /** Ease the camera back to the scene's own path. */
  resetView: () => void;
  dispose: () => void;
}

export function createHeroEngine(o: HeroEngineOptions): HeroEngine {
  const { canvas, host } = o;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "low-power" });
  // Match r128 behaviour: no output conversion (built-in materials like the motes' PointsMaterial).
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

  const kit = createKit(o.accent);
  const { U } = kit;
  const SC: SceneDef[] = [buildOcean(kit), buildTopo(kit), buildAstral(kit), buildRuins(kit), buildRail(kit), buildField(kit)];

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
  // Manual camera: targets are set by input, kit.view eases toward them.
  const view = kit.view;
  let yawT = 0, pitchT = 0, zoomT = 1;
  let yawV = 0, pitchV = 0;
  // "orbit" turns the camera; "touch" hands the drag to a scene with a touch hook.
  let drag: { id: number; x: number; y: number; mode: "orbit" | "touch"; sx: number; sy: number; at: number; prev: TouchPoint | null } | null = null;
  const clampView = () => {
    const lim = SC[cur].limits;
    if (lim.yaw !== undefined) yawT = Math.max(-lim.yaw, Math.min(lim.yaw, yawT));
    pitchT = Math.max(lim.pitch[0], Math.min(lim.pitch[1], pitchT));
    zoomT = Math.max(lim.zoom[0], Math.min(lim.zoom[1], zoomT));
  };
  const viewSettled = () =>
    !drag && Math.abs(yawV) < 1e-4 && Math.abs(pitchV) < 1e-4 &&
    Math.abs(yawT - view.yaw) < 5e-4 && Math.abs(pitchT - view.pitch) < 5e-4 && Math.abs(zoomT - view.zoom) < 5e-4;
  let cssW = 1, cssH = 1, lw = 320, lh = 180;
  const tmp = new THREE.Vector3();
  // Pointer → world for touch scenes: cast onto y=0, then re-cast onto the
  // plane at the hit's surface height a couple of times to settle on the relief.
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const ndc = new THREE.Vector2();
  const hitV = new THREE.Vector3();
  const hover = { x: 0, y: 0, on: false };
  const pick = (sc: SceneDef, cx: number, cy: number): TouchPoint | null => {
    if (!sc.touch) return null;
    const r = host.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    sc.cam.updateMatrixWorld();
    ray.setFromCamera(ndc, sc.cam);
    plane.constant = 0;
    for (let i = 0; i < 3; i++) {
      if (!ray.ray.intersectPlane(plane, hitV)) return null;
      plane.constant = -sc.touch.ground(hitV.x, hitV.z);
    }
    return { x: hitV.x, z: hitV.z };
  };

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
  const wants = () => visible && !document.hidden && (motion || dirty || mixT < 1 || !viewSettled() || Boolean(SC[cur].touch?.busy()));
  function loop(now: number) {
    raf = 0;
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    if (motion) t += dt;
    if (mixT < 1) mixT = Math.min(1, mixT + dt / 0.7);
    kit.view.px += (tpx - kit.view.px) * 0.05;
    kit.view.py += (tpy - kit.view.py) * 0.05;
    if (!drag && (yawV || pitchV)) {
      // Release inertia, frame-rate independent.
      yawT += yawV;
      pitchT += pitchV;
      const decay = Math.pow(0.9, dt * 60);
      yawV = Math.abs(yawV * decay) < 1e-4 ? 0 : yawV * decay;
      pitchV = Math.abs(pitchV * decay) < 1e-4 ? 0 : pitchV * decay;
    }
    clampView();
    const ease = 1 - Math.pow(1 - 0.16, dt * 60);
    view.yaw += (yawT - view.yaw) * ease;
    view.pitch += (pitchT - view.pitch) * ease;
    view.zoom += (zoomT - view.zoom) * ease;
    U.uTime.value = t;
    // Re-pick every frame: the camera drifts under a still cursor.
    SC[cur].touch?.aim(hover.on ? pick(SC[cur], hover.x, hover.y) : null);
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
    const tc = SC[cur].touch;
    if (tc) {
      // Mouse hover drives the reticle and wake; touch only acts while pressed.
      hover.on = e.pointerType === "mouse" && !interactive(e.target);
      hover.x = e.clientX;
      hover.y = e.clientY;
      dirty = true;
      kick();
      // The camera holds still while the pointer is working the field.
      tpx = tpy = 0;
      return;
    }
    if (!motion || drag) return;
    const r = host.getBoundingClientRect();
    tpx = (e.clientX - r.left) / r.width - 0.5;
    tpy = (e.clientY - r.top) / r.height - 0.5;
  };
  /* Drag to orbit. Vertical pans stay with the page on touch (touch-action:
     pan-y), so a sideways swipe turns the scene and an up/down swipe scrolls. */
  const RAD_PER_PX = 0.0065;
  const interactive = (el: EventTarget | null) => el instanceof Element && el.closest("button, a, input, kbd, [data-no-orbit]");
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0 || !e.isPrimary || interactive(e.target)) return;
    const sc = SC[cur];
    const mode = sc.touch && !e.shiftKey ? "touch" : "orbit";
    drag = {
      id: e.pointerId, x: e.clientX, y: e.clientY, mode, sx: e.clientX, sy: e.clientY, at: performance.now(),
      prev: mode === "touch" ? pick(sc, e.clientX, e.clientY) : null,
    };
    if (mode === "orbit") yawV = pitchV = 0;
    tpx = tpy = 0;
    host.setPointerCapture(e.pointerId);
    host.classList.add(mode === "orbit" ? "is-dragging" : "is-touching");
    dirty = true;
    kick();
  };
  const onDragMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    const tc = SC[cur].touch;
    if (drag.mode === "touch") {
      if (!tc) return;
      const p = pick(SC[cur], e.clientX, e.clientY);
      if (p && drag.prev) tc.drag(p, p.x - drag.prev.x, p.z - drag.prev.z);
      drag.prev = p;
      dirty = true;
      kick();
      return;
    }
    // Closer in = finer steering.
    const k = RAD_PER_PX / Math.sqrt(zoomT);
    yawT += dx * k;
    pitchT += dy * k;
    yawV = dx * k * 0.6;
    pitchV = dy * k * 0.6;
    clampView();
    dirty = true;
    kick();
  };
  const onUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    // A short, nearly stationary press on a touch scene is a tap.
    const tc = SC[cur].touch;
    if (tc && drag.mode === "touch" && e.type === "pointerup" &&
      Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 8 && performance.now() - drag.at < 450) {
      const p = pick(SC[cur], e.clientX, e.clientY);
      if (p) tc.tap(p);
    }
    if (e.pointerType !== "mouse") hover.on = false;
    drag = null;
    host.classList.remove("is-dragging", "is-touching");
    if (host.hasPointerCapture(e.pointerId)) host.releasePointerCapture(e.pointerId);
    kick();
  };
  // Ctrl/⌘ + wheel (also what a trackpad pinch sends) zooms; a plain wheel scrolls the page.
  const onWheel = (e: WheelEvent) => {
    if (!(e.ctrlKey || e.metaKey) || interactive(e.target)) return;
    e.preventDefault();
    zoomT *= Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.04 : 0.0022));
    clampView();
    dirty = true;
    kick();
  };
  const onDouble = (e: MouseEvent) => {
    if (interactive(e.target)) return;
    api.resetView();
  };
  const onLeave = () => {
    hover.on = false;
    dirty = true;
    kick();
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
  host.addEventListener("pointerleave", onLeave);
  host.addEventListener("pointerdown", onDown);
  host.addEventListener("pointermove", onDragMove);
  host.addEventListener("pointerup", onUp);
  host.addEventListener("pointercancel", onUp);
  host.addEventListener("wheel", onWheel, { passive: false });
  host.addEventListener("dblclick", onDouble);
  document.addEventListener("visibilitychange", onVisibility);
  canvas.addEventListener("webglcontextlost", onLost);
  const io = new IntersectionObserver((es) => {
    visible = es[0].isIntersecting;
    if (visible) { dirty = true; kick(); }
  });
  io.observe(host);
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  const markTouch = () => host.classList.toggle("is-field", Boolean(SC[cur].touch));
  buildLabels(SC[cur]);
  markTouch();
  resize();

  const api: HeroEngine = {
    setAccent(a) {
      U.uAccent.value.set(a.hex);
      U.uAccent2.value.set(a.deep);
      U.uFogColor.value.set(a.fog);
      U.uZen.value.set(a.zen);
      for (const s of SC) s.moteMat?.color.set(a.hex);
      dirty = true;
      kick();
    },
    setSheet(i) {
      i = ((i % SC.length) + SC.length) % SC.length;
      if (i === cur) return;
      prev = cur;
      cur = i;
      yawT = pitchT = yawV = pitchV = 0;
      zoomT = 1;
      hover.on = false;
      markTouch();
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
    nudge(yaw, pitch, zoom = 1) {
      yawT += yaw;
      pitchT += pitch;
      zoomT *= zoom;
      clampView();
      dirty = true;
      kick();
    },
    resetView() {
      yawT = pitchT = yawV = pitchV = 0;
      zoomT = 1;
      dirty = true;
      kick();
    },
    dispose() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      io.disconnect();
      ro.disconnect();
      host.removeEventListener("pointermove", onPointer);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onDragMove);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onUp);
      host.removeEventListener("wheel", onWheel);
      host.removeEventListener("dblclick", onDouble);
      host.classList.remove("is-dragging", "is-touching", "is-field");
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
  return api;
}
