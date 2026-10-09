// The Sky: three.js scene + PS1 pipeline, a TS port of initSky() in design/mock/index.html (DESIGN section 6,
// amendments A2/A3/A8). Imperative on purpose: React holds an instance in a ref and calls the methods below; the
// HUD reads projections from `onFrame`. Only load this module through loadSky() (./load.ts) so three stays in its
// own lazy chunk.
import * as THREE from "three";
import {
  A72,
  DEG,
  RAMP,
  SKY_TOKENS,
  TAU,
  TURN_FRAMES,
  TWEEN_FRAMES,
  FRAME_MS,
  baseHeight,
  bodyGoal,
  bodySpec,
  cameraPosition,
  clampRes,
  hexToRgb,
  idleDrift,
  lerpGoal,
  luminance,
  raDec,
  sectionGoal,
  sectionRotation,
  snap45,
  snapHalfDeg,
  stepDown,
  sunLevel,
  targetWidth,
  tone,
  viewOffsetFrac,
  SECTIONS,
  type CamGoal,
  type Rgb,
  type SkyTokenName,
  type SkyTokens,
} from "./math";
import { POST_FS, POST_VS, SCENE_FS, SCENE_VS, STAR_FS, STAR_VS } from "./shaders";
import { makeTextures, type SkyTextures } from "./textures";

/** Screen-space projection of one body, in CSS px relative to the canvas. Bounds are the square (x +- rad, y +- rad). */
export interface SkyProjection {
  id: string;
  x: number;
  y: number;
  rad: number;
  visible: boolean;
  /** Fake celestial readout for the HUD: hours, degrees, "au". */
  ra: number;
  dec: number;
  dist: number;
}

export interface SkyStats {
  /** Rendered frames in the last second (0 while still / paused). */
  fps: number;
  /** Current internal height (StatusBar `res:`). */
  res: number;
}

export interface SkyOptions {
  /** One body per project, in list order (project slugs). */
  bodies: readonly string[];
  /** false = reduced motion: still frames, rendered only when something changes. */
  motion?: boolean;
  /** Section index 0..4 (projects, notes, links, now, log). */
  section?: number;
  focus?: string | null;
  /** Right edge (px) of the left pane stack; centres the orrery in the open region on tablet. */
  stackRight?: () => number;
  /** Called after every rendered frame with every body's projection (reused array; read it, don't keep it). */
  onFrame?: (bodies: readonly SkyProjection[]) => void;
  /** Called once a second while animating, and whenever the internal height changes. */
  onStats?: (stats: SkyStats) => void;
}

interface MatSpec {
  c: [SkyTokenName, number];
  r?: [SkyTokenName, number];
  k?: number;
  tex?: THREE.Texture;
  rep?: number;
  amt?: number;
  lit?: number;
  fog?: number;
  wire?: boolean;
  side?: THREE.Side;
}

interface Orbit {
  id: string;
  ring: THREE.LineLoop;
  ringMat: THREE.ShaderMaterial;
  body: THREE.Mesh;
  a: number;
  b: number;
  w: number;
  phase: number;
  r: number;
}

type Uniforms = Record<string, THREE.IUniform>;

/** Constellations: region, azimuth/elevation (deg) inside it, scale, star points, edges. The first is the `K` sigil. */
const CONSTELLATIONS: { s: number; az: number; el: number; sc: number; p: [number, number][]; e: number[] }[] = [
  { s: 1, az: 0, el: 16, sc: 0.09, p: [[0, 1], [0, 0], [0, -1], [0.35, 0.45], [0.75, 1], [0.35, -0.45], [0.75, -1]], e: [0, 1, 1, 2, 1, 3, 3, 4, 1, 5, 5, 6] },
  { s: 1, az: -28, el: 30, sc: 0.07, p: [[0, 0], [0.6, 0.3], [1.2, 0.15], [1.6, 0.7], [2.1, 0.6]], e: [0, 1, 1, 2, 2, 3, 3, 4] },
  { s: 3, az: 24, el: 34, sc: 0.08, p: [[0, 0], [0.5, 0.6], [1.1, 0.5], [1.4, 0], [0.7, -0.3]], e: [0, 1, 1, 2, 2, 3, 3, 4, 4, 0] },
  { s: 0, az: -20, el: 28, sc: 0.08, p: [[0, 0], [0.7, 0.2], [1.3, -0.2], [1.9, 0.4]], e: [0, 1, 1, 2, 2, 3] },
];
const STARS = 1400;
const STAR_R = 60;

const Y = new THREE.Vector3(0, 1, 0);

/** WebGL2 only: the shaders use gl_VertexID and array constructors. Probing ourselves keeps three from logging a console.error. */
function webgl2(canvas: HTMLCanvasElement): WebGL2RenderingContext | null {
  try {
    return canvas.getContext("webgl2", {
      alpha: true,
      depth: true,
      stencil: true,
      antialias: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: "low-power",
      failIfMajorPerformanceCaveat: false,
    });
  } catch {
    return null;
  }
}

/** Reads the eight palette tokens from the computed custom properties on `el` (default: <html>). */
export function readSkyTokens(el: Element = document.documentElement): SkyTokens {
  const cs = getComputedStyle(el);
  return Object.fromEntries(SKY_TOKENS.map((k) => [k, cs.getPropertyValue("--" + k).trim()])) as SkyTokens;
}

export class Sky {
  onFrame: SkyOptions["onFrame"];
  onStats: SkyOptions["onStats"];

  private readonly canvas: HTMLCanvasElement;
  private readonly R: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly W = new THREE.Group();
  private readonly cam = new THREE.PerspectiveCamera(46, 1, 0.1, 150);
  private readonly U: Uniforms;
  private readonly tx: SkyTextures;
  private readonly mats = new Map<THREE.ShaderMaterial, MatSpec>();
  private readonly geos: THREE.BufferGeometry[] = [];
  private readonly mono: THREE.Mesh;
  private readonly orb: Orbit[];
  private readonly sunM: THREE.ShaderMaterial;
  private readonly tot: THREE.Group;
  private readonly conL: THREE.LineSegments[];
  private readonly rt: THREE.WebGLRenderTarget;
  private readonly pm: THREE.ShaderMaterial;
  private readonly pScene = new THREE.Scene();
  private readonly pCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly ro: ResizeObserver;
  private readonly io: IntersectionObserver;
  private readonly stackRight: () => number;
  private readonly rnd: () => number;
  private readonly projs: SkyProjection[];
  private readonly v1 = new THREE.Vector3();
  private readonly v2 = new THREE.Vector3();
  private readonly right = new THREE.Vector3();

  private TK: Record<SkyTokenName, Rgb> | null = null;
  private H: number;
  private manual = false;
  private cw = 1;
  private ch = 1;
  private t = 0;
  private sel = 0;
  private sec = 0;
  private moving = true;
  private need = true;
  private tearN = 0;
  private nextTear = 30;
  private visible = true;
  private cs: CamGoal = { t: [0, 0, 0], yaw: 0, el: 14 * DEG, d: 6 };
  private tw: { from: CamGoal; k: number } | null = null;
  private rot = { f: 0, to: 0, k: TURN_FRAMES };
  private readonly lk = { yaw: 0, el: 0, z: 1 };
  private readonly par = { x: 0, y: 0 };
  private raf = 0;
  private last = 0;
  private acc = 0;
  private slow = 0;
  private fc = 0;
  private fT = 0;
  private fps = 0;
  private disposed = false;

  /** Throws when WebGL2 is unavailable; loadSky() turns that into the `gl:none` fallback. */
  constructor(canvas: HTMLCanvasElement, opts: SkyOptions) {
    const gl = webgl2(canvas);
    if (!gl) throw new Error("webgl2 unavailable");
    THREE.ColorManagement.enabled = false;
    this.canvas = canvas;
    this.R = new THREE.WebGLRenderer({
      canvas,
      context: gl as unknown as WebGLRenderingContext,
      antialias: false,
      powerPreference: "low-power",
    });
    this.R.setPixelRatio(1);
    this.onFrame = opts.onFrame;
    this.onStats = opts.onStats;
    this.stackRight = opts.stackRight ?? (() => 0);
    this.H = baseHeight(innerWidth);
    this.moving = opts.motion ?? true;

    let seed = 7;
    const rnd = (this.rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647);
    const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
    const { W, scene } = this;
    scene.add(W);
    const U = (this.U = {
      uSnap: { value: new THREE.Vector2(213, 120) },
      uT: { value: 0 },
      uFogC: { value: new THREE.Color() },
      uL: { value: V3(0.5, 0.75, 0.45).normalize() },
      uL2: { value: V3(-0.9, 0.25, 0.35).normalize() },
    });
    const TX = (this.tx = makeTextures(rnd));
    const M = (o: MatSpec) => {
      const m = new THREE.ShaderMaterial({
        uniforms: {
          ...U,
          uCol: { value: new THREE.Color() },
          uRim: { value: new THREE.Color(0) },
          uTex: { value: o.tex || TX.noise },
          uRep: { value: o.rep || 1 },
          uAmt: { value: o.amt || 0 },
          uLit: { value: o.lit ?? 1 },
          uFog: { value: o.fog ?? 1 },
        },
        vertexShader: SCENE_VS,
        fragmentShader: SCENE_FS,
        wireframe: !!o.wire,
        side: o.side ?? THREE.FrontSide,
      });
      this.mats.set(m, o);
      return m;
    };
    const keep = <G extends THREE.BufferGeometry>(g: G) => (this.geos.push(g), g);
    /** Flat shading: non-indexed geometry, so computed normals are per face. */
    const flat = (g: THREE.BufferGeometry) => {
      g = g.index ? g.toNonIndexed() : g;
      g.computeVertexNormals();
      return keep(g);
    };
    /** Removes faces (by non-indexed face index) where keepFace is false. */
    const drop = (g: THREE.BufferGeometry, keepFace: (f: number) => boolean) => {
      g = g.index ? g.toNonIndexed() : g;
      const n = new THREE.BufferGeometry();
      for (const k of ["position", "uv"]) {
        const a = g.attributes[k] as THREE.BufferAttribute;
        const s = a.itemSize * 3;
        const o: number[] = [];
        for (let f = 0; f < a.count / 3; f++) if (keepFace(f)) o.push(...Array.from(a.array.slice(f * s, f * s + s)));
        n.setAttribute(k, new THREE.Float32BufferAttribute(o, a.itemSize));
      }
      n.computeVertexNormals();
      return keep(n);
    };
    const place = <O extends THREE.Object3D>(o: O, s: number, d: number, y: number) => {
      o.position.copy(V3(0, y, -d).applyAxisAngle(Y, -s * A72));
      W.add(o);
      return o;
    };

    // monolith, 1:4:9
    this.mono = new THREE.Mesh(keep(new THREE.BoxGeometry(1.2, 2.7, 0.3)), M({ c: ["fg", 0.55], r: ["acc2", 0.55], tex: TX.gly, amt: 1 }));
    W.add(this.mono);

    // orbits + bodies: tetra, octa, dodeca, icosa, low torus, broken icosa (3 faces removed), cycling
    const GEO = [
      flat(new THREE.TetrahedronGeometry(1)),
      flat(new THREE.OctahedronGeometry(1)),
      flat(new THREE.DodecahedronGeometry(1)),
      flat(new THREE.IcosahedronGeometry(1)),
      flat(new THREE.TorusGeometry(0.8, 0.35, 4, 6)),
      drop(new THREE.IcosahedronGeometry(1), (f) => ![3, 9, 16].includes(f)),
    ];
    this.orb = opts.bodies.map((id, i) => {
      const sp = bodySpec(i);
      const g = new THREE.Group();
      g.rotation.set(...sp.tilt);
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k < 24; k++) pts.push(V3(Math.cos((k / 24) * TAU) * sp.a, 0, Math.sin((k / 24) * TAU) * sp.b));
      const ringMat = M({ c: ["rule", 0.2], lit: 0 });
      const ring = new THREE.LineLoop(keep(new THREE.BufferGeometry().setFromPoints(pts)), ringMat);
      const body = new THREE.Mesh(
        GEO[sp.kind],
        M({ c: ["fg", 0.8], tex: TX.noise, amt: 0.45, side: sp.kind === 5 ? THREE.DoubleSide : THREE.FrontSide }),
      );
      body.scale.setScalar(sp.scale);
      g.add(ring, body);
      W.add(g);
      return { id, ring, ringMat, body, a: sp.a, b: sp.b, w: sp.w, phase: sp.phase, r: sp.scale };
    });

    // ruin grid: 40x40 plane, 12x12 cells, ~15% removed, vertices displaced +-0.2
    {
      const g = new THREE.PlaneGeometry(40, 40, 12, 12);
      g.rotateX(-Math.PI / 2);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setY(i, (rnd() - 0.5) * 0.4);
      const gone = [...Array(144)].map(() => rnd() < 0.15);
      const m = new THREE.Mesh(drop(g, (f) => !gone[f >> 1]), M({ c: ["dim", 0.3], tex: TX.chk, rep: 6, amt: 1 }));
      g.dispose();
      m.position.y = -6;
      W.add(m);
    }

    // dead sun (region 3, now): icosa detail 1 + wireframe shell 1.15x
    this.sunM = M({ c: ["dim", 0.8], lit: 0, tex: TX.noise, amt: 0.35 });
    const sun = place(new THREE.Group(), 3, 22, 5);
    sun.add(
      new THREE.Mesh(keep(new THREE.IcosahedronGeometry(4.2, 1)), this.sunM),
      new THREE.Mesh(keep(new THREE.IcosahedronGeometry(4.2 * 1.15, 1)), M({ c: ["rule", 0.3], lit: 0, wire: true })),
    );

    // totem (region 2, links): cone, box, sphere, box, ring
    this.tot = place(new THREE.Group(), 2, 24, -6);
    const tm = M({ c: ["fg", 1], tex: TX.noise, amt: 0.3, side: THREE.DoubleSide });
    (
      [
        [new THREE.ConeGeometry(0.9, 2.2, 6), 1.1],
        [new THREE.BoxGeometry(0.8, 1.6, 0.5), 3],
        [new THREE.SphereGeometry(0.45, 6, 4), 4.25],
        [new THREE.BoxGeometry(2.4, 0.25, 0.25), 4.95],
        [new THREE.RingGeometry(0.4, 0.7, 6), 5.8],
      ] as [THREE.BufferGeometry, number][]
    ).forEach(([g, y]) => {
      const m = new THREE.Mesh(keep(g), tm);
      m.position.y = y;
      this.tot.add(m);
    });
    this.tot.scale.setScalar(1.4);

    // starfield + constellations
    const pos = new Float32Array(STARS * 3);
    const aB = new Float32Array(STARS);
    const aP = new Float32Array(STARS);
    const dirOf = (az: number, el: number) => V3(-Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
    let ni = 0;
    this.conL = CONSTELLATIONS.map((c) => {
      const d = dirOf(-c.s * A72 + c.az * DEG, c.el * DEG);
      const rt = V3(0, 1, 0).cross(d).normalize();
      const up = d.clone().cross(rt).normalize();
      const ids = c.p.map(([x, y]) => {
        const v = d.clone().addScaledVector(rt, -x * c.sc).addScaledVector(up, y * c.sc).normalize().multiplyScalar(STAR_R);
        pos.set([v.x, v.y, v.z], ni * 3);
        aB[ni] = 0.9;
        return ni++;
      });
      const lp: number[] = [];
      c.e.forEach((i) => lp.push(...pos.slice(ids[i] * 3, ids[i] * 3 + 3)));
      const g = keep(new THREE.BufferGeometry());
      g.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
      const l = new THREE.LineSegments(g, M({ c: ["dim", 0.5], lit: 0, fog: 0 }));
      W.add(l);
      return l;
    });
    for (let i = ni; i < STARS; i++) {
      const v = V3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize().multiplyScalar(STAR_R);
      pos.set([v.x, v.y, v.z], i * 3);
      aB[i] = rnd() < 0.03 ? 1 : 0.15 + rnd() * 0.75;
    }
    for (let i = 0; i < STARS; i++) aP[i] = rnd();
    const sg = keep(new THREE.BufferGeometry());
    sg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    sg.setAttribute("aB", new THREE.BufferAttribute(aB, 1));
    sg.setAttribute("aP", new THREE.BufferAttribute(aP, 1));
    const starM = new THREE.ShaderMaterial({ uniforms: { ...U, uSpr: { value: TX.star } }, vertexShader: STAR_VS, fragmentShader: STAR_FS });
    W.add(new THREE.Points(sg, starM));

    // post pass
    this.rt = new THREE.WebGLRenderTarget(2, 2, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false });
    this.pm = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tD: { value: this.rt.texture },
        uRes: { value: new THREE.Vector2() },
        uRamp: { value: RAMP.map(() => new THREE.Color()) },
        uFg: { value: new THREE.Color() },
        uGl: { value: new THREE.Color() },
        uBg: { value: new THREE.Color() },
        uBgL: { value: 0 },
        uLock: { value: 0.8 },
        uDis: { value: 1 },
        uTear: { value: new THREE.Vector3() },
      },
      vertexShader: POST_VS,
      fragmentShader: POST_FS,
    });
    const pq = new THREE.Mesh(keep(new THREE.PlaneGeometry(2, 2)), this.pm);
    pq.frustumCulled = false;
    this.pScene.add(pq);

    this.projs = this.orb.map((o) => ({ id: o.id, x: 0, y: 0, rad: 0, visible: false, ra: 0, dec: 0, dist: 0 }));

    this.ro = new ResizeObserver(() => {
      if (!this.manual) {
        const h = baseHeight(innerWidth);
        if (h !== this.H && (this.H === 120 || this.H === 240)) this.H = h;
      }
      this.resize();
    });
    this.ro.observe(canvas);
    this.io = new IntersectionObserver((es) => {
      this.visible = es[es.length - 1].isIntersecting;
    });
    this.io.observe(canvas);

    this.setPalette();
    if (opts.focus != null) this.focus(opts.focus, true);
    this.section(opts.section ?? 0, true);
    this.resize();
    this.raf = requestAnimationFrame(this.loop);
  }

  // ---------------------------------------------------------------- public API

  /** Selects a project body. On section 0 the camera retargets in a 12-frame stepped tween (instant under reduced motion). */
  focus(id: string | null, instant = false): void {
    const i = id == null ? -1 : this.orb.findIndex((o) => o.id === id);
    if (i < 0) return;
    const changed = i !== this.sel;
    this.sel = i;
    if (this.sec === 0 && changed) this.tw = this.moving && !instant ? { from: this.copyCs(), k: 0 } : null;
    this.need = true;
  }

  /** Turns the orrery 72 degrees per section to region i (0..4) over 8 frames. */
  section(i: number, instant = false): void {
    const s = ((i % SECTIONS) + SECTIONS) % SECTIONS;
    if (s === this.sec && !instant) return;
    const tween = this.moving && !instant;
    this.rot = { f: this.W.rotation.y, to: sectionRotation(this.W.rotation.y, s), k: tween ? 0 : TURN_FRAMES };
    if (!tween) this.W.rotation.y = this.rot.to;
    this.sec = s;
    this.tw = tween ? { from: this.copyCs(), k: 0 } : null;
    this.need = true;
  }

  /**
   * Recolours fog, clear colour, materials and the post-pass ramp. With no argument it re-reads the CSS tokens
   * from <html>, so call it after changing `data-pal`. The palette-switch tear is the caller's: `tear(2)`.
   */
  setPalette(tokens: SkyTokens = readSkyTokens()): void {
    const TK = Object.fromEntries(SKY_TOKENS.map((k) => [k, hexToRgb(tokens[k] ?? "")])) as Record<SkyTokenName, Rgb>;
    this.TK = TK;
    const col = (k: SkyTokenName) => new THREE.Color(...TK[k]);
    this.U.uFogC.value.copy(col("bg"));
    this.R.setClearColor(col("bg"));
    const u = this.pm.uniforms;
    u.uRamp.value = RAMP.map(col);
    u.uFg.value.copy(col("fg"));
    u.uGl.value.copy(col("glitch"));
    u.uBg.value.copy(col("bg"));
    u.uBgL.value = luminance(TK.bg);
    this.mats.forEach((_, m) => this.recol(m));
    this.need = true;
  }

  /** `:res 120|180|240`. Pins the height (no automatic step-down or breakpoint switch afterwards). */
  setRes(h: number): void {
    this.manual = true;
    this.H = clampRes(h);
    this.resize();
  }

  /** Current internal height. */
  res(): number {
    return this.H;
  }

  /** Motion on/off. Off renders still frames only when something changes; no tween, tear, twinkle or drift. */
  motion(on: boolean): void {
    this.moving = on;
    this.need = true;
  }

  /** Tears n frames (2 on palette switch and errors, 6 on 404). Ignored under reduced motion. */
  tear(n: number): void {
    if (this.moving) this.tearN = n;
  }

  /** Pointer parallax, x and y in -1..1 across the viewport. */
  pointer(x: number, y: number): void {
    this.par.x = x;
    this.par.y = y;
  }

  /** LOOK mode orbit: yaw/pitch in degrees, zoom in steps (+1 out, -1 in). */
  look(dyaw: number, dpitch: number, dzoom = 0): void {
    const lk = this.lk;
    lk.yaw += dyaw;
    lk.el = Math.max(-40, Math.min(60, lk.el + dpitch));
    lk.z = Math.max(0.4, Math.min(2.5, lk.z + dzoom * 0.15));
    this.need = true;
  }

  lookReset(): void {
    this.lk.yaw = this.lk.el = 0;
    this.lk.z = 1;
    this.need = true;
  }

  /** Boot dither dissolve, 0 (all bg) to 1 (fully drawn), in 1/16 steps. */
  dissolve(v: number): void {
    this.pm.uniforms.uDis.value = v;
    this.need = true;
  }

  /** Boot constellation draw-in: fraction 0..1 of segments shown. */
  constellations(f: number): void {
    const total = this.conL.reduce((a, l) => a + l.geometry.attributes.position.count / 2, 0);
    let left = Math.round(total * f);
    this.conL.forEach((l) => {
      const n = l.geometry.attributes.position.count / 2;
      const k = Math.min(n, left);
      left -= k;
      l.geometry.setDrawRange(0, k * 2);
    });
    this.need = true;
  }

  /** Asks for a render on the next tick (needed under reduced motion, e.g. after a hover change). */
  invalidate(): void {
    this.need = true;
  }

  /** Current screen projection of one body, or null for an unknown id. */
  project(id: string): SkyProjection | null {
    const i = this.orb.findIndex((o) => o.id === id);
    if (i < 0) return null;
    this.cam.updateMatrixWorld();
    return { ...this.projectBody(i, this.projs[i]) };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.io.disconnect();
    this.geos.forEach((g) => g.dispose());
    this.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      m?.dispose?.();
    });
    this.pm.dispose();
    Object.values(this.tx).forEach((t) => t.dispose());
    this.rt.dispose();
    this.R.dispose();
  }

  // ---------------------------------------------------------------- internals

  private copyCs(): CamGoal {
    const c = this.cs;
    return { t: [...c.t], yaw: c.yaw, el: c.el, d: c.d };
  }

  private recol(m: THREE.ShaderMaterial): void {
    const TK = this.TK;
    const o = this.mats.get(m);
    if (!TK || !o) return;
    m.uniforms.uCol.value.setRGB(...tone(TK[o.c[0]], o.c[1] * (o.k ?? 1)));
    if (o.r) m.uniforms.uRim.value.setRGB(...tone(TK[o.r[0]], o.r[1]));
  }

  private resize(): void {
    const { canvas, cam, R } = this;
    const cw = (this.cw = Math.max(2, canvas.clientWidth));
    const ch = (this.ch = Math.max(2, canvas.clientHeight));
    R.setSize(cw, ch, false);
    cam.aspect = cw / ch;
    const f = viewOffsetFrac(innerWidth, cw, this.stackRight());
    cam.setViewOffset(cw, ch, -f * cw, 0, cw, ch);
    cam.updateProjectionMatrix();
    const w = targetWidth(this.H, cw, ch);
    this.rt.setSize(w, this.H);
    this.U.uSnap.value.set(w / 2, this.H / 2);
    this.pm.uniforms.uRes.value.set(w, this.H);
    this.need = true;
    this.onStats?.({ fps: this.fps, res: this.H });
  }

  private goal(): CamGoal {
    if (this.sec === 0 && this.orb.length) {
      const p = this.orb[this.sel].body.getWorldPosition(this.v1);
      return bodyGoal([p.x, p.y, p.z]);
    }
    return sectionGoal(this.sec);
  }

  private frame(dt: number): void {
    const t = (this.t += dt);
    const { W, cam, lk, par } = this;
    this.U.uT.value = t;
    for (const o of this.orb) {
      const a = o.phase + t * o.w;
      o.body.position.set(Math.cos(a) * o.a, 0, Math.sin(a) * o.b);
      o.body.rotation.set(t * 0.3, t * 0.5, 0);
    }
    this.mono.rotation.y = t * 0.05;
    const rot = this.rot;
    if (rot.k < TURN_FRAMES) {
      rot.k++;
      W.rotation.y = rot.f + ((rot.to - rot.f) * rot.k) / TURN_FRAMES;
    }
    this.mats.get(this.sunM).k = sunLevel(t);
    this.recol(this.sunM);
    W.updateMatrixWorld(true);
    const g = this.goal();
    const tw = this.tw;
    if (tw && tw.k < TWEEN_FRAMES) {
      tw.k++;
      this.cs = lerpGoal(tw.from, g, tw.k / TWEEN_FRAMES);
    } else this.cs = g;
    const cs = this.cs;
    const drift = idleDrift(t);
    const yaw = cs.yaw + drift.yaw + snapHalfDeg(-par.x * 3) + lk.yaw * DEG;
    const el = cs.el + drift.el + snapHalfDeg(par.y * 3) + lk.el * DEG;
    cam.position.set(...cameraPosition(cs.t, yaw, el, cs.d * lk.z));
    cam.lookAt(...cs.t);
    cam.updateMatrixWorld();
    {
      const tp = this.tot.getWorldPosition(this.v2);
      this.tot.rotation.y = snap45(Math.atan2(cam.position.x - tp.x, cam.position.z - tp.z) - W.rotation.y);
    }
    this.orb.forEach((o, i) => {
      this.mats.get(o.ringMat).c = this.sec === 0 && i === this.sel ? ["acc2", 0.75] : ["rule", 0.2];
      this.recol(o.ringMat);
    });
    if (this.moving && t > this.nextTear) {
      this.tearN = 2;
      this.nextTear = t + 25 + this.rnd() * 20;
    }
    const tv = this.pm.uniforms.uTear.value as THREE.Vector3;
    if (this.tearN > 0) {
      this.tearN--;
      tv.set(Math.floor(this.rnd() * this.H), 4 + Math.floor(this.rnd() * 9), 1);
    } else tv.z = 0;
    this.R.setRenderTarget(this.rt);
    this.R.render(this.scene, cam);
    this.R.setRenderTarget(null);
    this.R.render(this.pScene, this.pCam);
    if (this.onFrame) {
      this.projs.forEach((p, i) => this.projectBody(i, p));
      this.onFrame(this.projs);
    }
  }

  private projectBody(i: number, out: SkyProjection): SkyProjection {
    const { cam, v1: v, v2: q, cw, ch } = this;
    const o = this.orb[i];
    o.body.getWorldPosition(v);
    const { ra, dec } = raDec(v.x, v.y, v.z);
    out.ra = ra;
    out.dec = dec;
    out.dist = v.distanceTo(cam.position) / 2.4;
    this.right.setFromMatrixColumn(cam.matrixWorld, 0);
    q.copy(v).addScaledVector(this.right, o.r * 1.15).project(cam);
    v.project(cam);
    out.x = ((v.x + 1) / 2) * cw;
    out.y = ((1 - v.y) / 2) * ch;
    out.rad = (Math.abs(q.x - v.x) / 2) * cw;
    out.visible = v.z < 1 && v.z > -1;
    return out;
  }

  /** 30fps cap via a timestamp accumulator; pauses while hidden or offscreen; steps the resolution down when slow. */
  private loop = (ts: number): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    if (document.hidden || !this.visible) {
      this.last = ts;
      return;
    }
    if (!this.moving) {
      if (this.need) {
        this.need = false;
        this.frame(0);
      }
      this.last = ts;
      return;
    }
    const el = ts - this.last;
    this.last = ts;
    this.acc += Math.min(el, 200);
    if (this.acc < FRAME_MS) return;
    if (el > 40 && !this.manual) {
      if (++this.slow >= 10 && this.H > 120) {
        this.H = stepDown(this.H);
        this.slow = 0;
        this.resize();
      }
    } else this.slow = 0;
    this.acc = Math.min(this.acc - FRAME_MS, FRAME_MS);
    this.fc++;
    if (ts - this.fT >= 1000) {
      this.fps = this.fc;
      this.onStats?.({ fps: this.fps, res: this.H });
      this.fc = 0;
      this.fT = ts;
    }
    this.need = false;
    this.frame(1 / 30);
  };
}
