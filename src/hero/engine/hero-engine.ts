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
import { buildOcean } from "./ocean";
import { buildTopo } from "./topo";
import { buildAstral } from "./astral";
import { buildRuins } from "./ruins";
import { buildRail } from "./rail";

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
  /** Ease any user-driven camera offset back to the scene's own path. */
  resetCamera: () => void;
  dispose: () => void;
}

export function createHeroEngine(o: HeroEngineOptions): HeroEngine {
  const { canvas, host } = o;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "low-power" });
  // Match r128 behaviour: no output conversion (built-in materials like the motes' PointsMaterial).
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

  const kit = createKit(o.accent);
  const { U } = kit;
  const SC: SceneDef[] = [buildOcean(kit), buildTopo(kit), buildAstral(kit), buildRuins(kit), buildRail(kit)];

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

  /* ---- camera navigation: a user offset layered over each scene's own path ---- */
  const NAV_IDLE = 5; // seconds after the last input before the camera drifts home
  const PITCH_MAX = 0.7;
  const ZOOM_MIN = 0.7, ZOOM_MAX = 2.4;
  const nav = { yaw: 0, pitch: 0, zoom: 1, yawT: 0, pitchT: 0, zoomT: 1, vYaw: 0, vPitch: 0, idle: 0, drag: false, hover: false };
  const pointers = new Map<number, { x: number; y: number }>();
  let pinch = 0;
  const UP = new THREE.Vector3(0, 1, 0);
  const off = new THREE.Vector3();
  const axis = new THREE.Vector3();
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  const navActive = () =>
    nav.drag || nav.idle < NAV_IDLE + 2 ||
    Math.abs(nav.yaw - nav.yawT) + Math.abs(nav.pitch - nav.pitchT) + Math.abs(nav.zoom - nav.zoomT) > 1e-3 ||
    Math.abs(nav.yaw) + Math.abs(nav.pitch) + Math.abs(nav.zoom - 1) > 1e-3;
  const nudge = (dYaw: number, dPitch: number) => {
    nav.yawT += dYaw;
    nav.pitchT = clamp(nav.pitchT + dPitch, -PITCH_MAX, PITCH_MAX);
    nav.idle = 0;
  };
  const zoomBy = (f: number) => {
    nav.zoomT = clamp(nav.zoomT * f, ZOOM_MIN, ZOOM_MAX);
    nav.idle = 0;
  };
  const stepNav = (dt: number) => {
    if (!nav.drag) {
      nav.idle += dt;
      // Inertia after a flick, then a slow drift back to the authored path.
      nav.yawT += nav.vYaw;
      nav.pitchT = clamp(nav.pitchT + nav.vPitch, -PITCH_MAX, PITCH_MAX);
      const damp = Math.pow(0.9, dt * 60);
      nav.vYaw *= damp;
      nav.vPitch *= damp;
      if (nav.idle > NAV_IDLE) {
        const k = 1 - Math.pow(0.5, dt / 0.9);
        nav.yawT -= nav.yawT * k;
        nav.pitchT -= nav.pitchT * k;
        nav.zoomT += (1 - nav.zoomT) * k;
      }
    }
    const e = 1 - Math.pow(0.001, dt * 1.6);
    nav.yaw += (nav.yawT - nav.yaw) * e;
    nav.pitch += (nav.pitchT - nav.pitch) * e;
    nav.zoom += (nav.zoomT - nav.zoom) * e;
    if (Math.abs(nav.yaw) < 1e-4 && Math.abs(nav.yawT) < 1e-4 && !nav.drag) { nav.yaw = 0; nav.yawT = 0; }
  };
  const applyNav = (sc: SceneDef) => {
    const cam = sc.cam;
    if (Math.abs(nav.yaw) > 1e-4 || Math.abs(nav.pitch) > 1e-4) {
      if (sc.pivot) {
        // Orbit: swing the camera round the scene's centre.
        const [px, py, pz] = sc.pivot;
        off.set(cam.position.x - px, cam.position.y - py, cam.position.z - pz);
        off.applyAxisAngle(UP, -nav.yaw);
        axis.crossVectors(UP, off).normalize();
        off.applyAxisAngle(axis, -nav.pitch);
        cam.position.set(px + off.x, py + off.y, pz + off.z);
        cam.lookAt(px, py, pz);
      } else {
        // Look round from where the camera stands.
        cam.rotateOnWorldAxis(UP, nav.yaw);
        cam.rotateX(nav.pitch);
      }
    }
    if (Math.abs(cam.zoom - nav.zoom) > 1e-3) {
      cam.zoom = nav.zoom;
      cam.updateProjectionMatrix();
    }
  };
  const resetNav = () => {
    nav.yawT = nav.pitchT = nav.vYaw = nav.vPitch = 0;
    nav.zoomT = 1;
    nav.idle = NAV_IDLE + 1;
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
  const wants = () => visible && !document.hidden && (motion || dirty || mixT < 1 || navActive());
  function loop(now: number) {
    raf = 0;
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    if (motion) t += dt;
    if (mixT < 1) mixT = Math.min(1, mixT + dt / 0.7);
    kit.view.px += (tpx - kit.view.px) * 0.05;
    kit.view.py += (tpy - kit.view.py) * 0.05;
    U.uTime.value = t;
    stepNav(dt);
    SC[cur].update(t);
    applyNav(SC[cur]);
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
    if (nav.drag) return;
    if (!motion) return;
    const r = host.getBoundingClientRect();
    tpx = (e.clientX - r.left) / r.width - 0.5;
    tpy = (e.clientY - r.top) / r.height - 0.5;
  };
  const onDown = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, a") || (e.pointerType === "mouse" && e.button !== 0)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    host.setPointerCapture?.(e.pointerId);
    nav.drag = true;
    nav.vYaw = nav.vPitch = 0;
    nav.idle = 0;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
    host.style.cursor = "grabbing";
    kick();
  };
  const onDrag = (e: PointerEvent) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch > 0 && d > 0) zoomBy(d / pinch);
      pinch = d;
    } else {
      // Radians per pixel scales with the view, so a drag across the stage is a fixed sweep.
      const k = 2.6 / cssW;
      const kp = e.pointerType === "touch" ? 0 : 2.6 / cssW;
      nudge(dx * k, dy * kp);
      nav.vYaw = dx * k * 0.35;
      nav.vPitch = dy * kp * 0.35;
    }
    kick();
  };
  const onUp = (e: PointerEvent) => {
    if (!pointers.delete(e.pointerId)) return;
    host.releasePointerCapture?.(e.pointerId);
    if (pointers.size === 0) {
      nav.drag = false;
      nav.idle = 0;
      host.style.cursor = "";
    } else nav.vYaw = nav.vPitch = 0;
    pinch = 0;
    kick();
  };
  const onWheel = (e: WheelEvent) => {
    // Only ctrl/⌘-wheel (and trackpad pinch, which reports ctrlKey) zooms; plain wheel keeps scrolling the page.
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    zoomBy(Math.exp(-e.deltaY * 0.01));
    kick();
  };
  const onKey = (e: KeyboardEvent) => {
    if (!nav.hover || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    const step = e.shiftKey ? 0.4 : 0.15;
    if (e.key === "ArrowLeft") nudge(step, 0);
    else if (e.key === "ArrowRight") nudge(-step, 0);
    else if (e.shiftKey && e.key === "ArrowUp") nudge(0, step);
    else if (e.shiftKey && e.key === "ArrowDown") nudge(0, -step);
    else if (e.key === "+" || e.key === "=") zoomBy(1.15);
    else if (e.key === "-" || e.key === "_") zoomBy(1 / 1.15);
    else if (e.key === "0") resetNav();
    else return;
    e.preventDefault();
    kick();
  };
  const onEnter = () => { nav.hover = true; };
  const onLeave = () => { nav.hover = false; };
  const onDbl = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, a")) return;
    resetNav();
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
  host.addEventListener("pointerdown", onDown);
  host.addEventListener("pointermove", onDrag);
  host.addEventListener("pointerup", onUp);
  host.addEventListener("pointercancel", onUp);
  host.addEventListener("wheel", onWheel, { passive: false });
  host.addEventListener("dblclick", onDbl);
  host.addEventListener("pointerenter", onEnter);
  host.addEventListener("pointerleave", onLeave);
  document.addEventListener("keydown", onKey);
  // Vertical swipes still scroll the page on touch; horizontal ones turn the camera.
  host.style.touchAction = "pan-y";
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
      for (const s of SC) s.moteMat?.color.set(a.hex);
      dirty = true;
      kick();
    },
    setSheet(i) {
      i = ((i % SC.length) + SC.length) % SC.length;
      if (i === cur) return;
      prev = cur;
      cur = i;
      SC[prev].cam.zoom = 1;
      SC[prev].cam.updateProjectionMatrix();
      nav.yaw = nav.pitch = 0;
      nav.zoom = 1;
      resetNav();
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
    resetCamera() {
      resetNav();
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
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onDrag);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onUp);
      host.removeEventListener("wheel", onWheel);
      host.removeEventListener("dblclick", onDbl);
      host.removeEventListener("pointerenter", onEnter);
      host.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("keydown", onKey);
      host.style.touchAction = "";
      host.style.cursor = "";
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
