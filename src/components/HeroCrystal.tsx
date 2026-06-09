import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ── Reduced-motion detection ──────────────────────────────────────────────
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return reduced;
}

// ── HSL → RGB helper ───────────────────────────────────────────────────────
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [r, g, b];
}

function generateChromaticPalette(): THREE.Vector3[] {
  const colors: THREE.Vector3[] = [];
  const golden = 0.618033988749895;
  let hue = Math.random();
  for (let i = 0; i < 8; i++) {
    hue += golden;
    hue %= 1;
    const s = 0.7 + Math.random() * 0.3;
    const l = 0.42 + Math.random() * 0.28;
    const [r, g, b] = hslToRgb(hue, s, l);
    colors.push(new THREE.Vector3(r, g, b));
  }
  return colors;
}

// ── Shared mouse state (mutated via refs – zero React re-renders) ─────────
interface MouseState {
  ndcX: number;
  ndcY: number;
  relX: number;
  relY: number;
  hoverNormal: THREE.Vector3;
  hoverPoint: THREE.Vector3;
  hoverActive: number;
  hoverTarget: number;
  // drag rotate
  isDragging: boolean;
  lastDragX: number;
  lastDragY: number;
  // accumulated world-space Euler offsets applied to the group
  accRotX: number; // pitch (x-axis)
  accRotZ: number; // roll/yaw (z-axis, driven by horizontal drag)
  // inertia velocities (radians per frame at 60 fps)
  inertiaX: number;
  inertiaZ: number;
  // whether user has ever dragged (suppresses default mouse-tilt)
  everDragged: boolean;
}

// ── Crystal shaders ───────────────────────────────────────────────────────
const vertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vObjectNormal;

void main() {
  vObjectNormal = normal;
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform vec2 uMouse;
uniform float uHoverActive;
uniform float uTime;
uniform vec3 uHoverNormal;
uniform vec3 uHoverPoint;
uniform vec3 uChromatic[8];
uniform float uLightBoost;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vObjectNormal;

// ── Random chromatic palette ───────────────────────────────────────
vec3 getChromaticColor(float i) {
  int idx = int(floor(mod(i, 8.0)));
  if (idx == 0) return uChromatic[0];
  if (idx == 1) return uChromatic[1];
  if (idx == 2) return uChromatic[2];
  if (idx == 3) return uChromatic[3];
  if (idx == 4) return uChromatic[4];
  if (idx == 5) return uChromatic[5];
  if (idx == 6) return uChromatic[6];
  return uChromatic[7];
}

// Slight dimming so faces don't blow out at rest
#define DIM 0.85

// Deterministic hash for per-face randomisation
float hash3(vec3 p) {
  return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
}

void main() {
  vec3 n = normalize(vNormal);
  vec3 objN = normalize(vObjectNormal);

  // ── Hover illumination: origin face brightest, neighbours decremental ─
  float dist = distance(vWorldPosition, uHoverPoint);
  float falloff = exp(-dist * dist * 0.8);

  vec3 toHover = normalize(uHoverPoint - vWorldPosition);
  float faceAlignment = max(dot(n, toHover), 0.0);
  float diffusion = falloff * (0.1 + 0.9 * faceAlignment) * uHoverActive;

  float hoverLen = length(uHoverNormal);
  float similarity = hoverLen > 0.001
    ? max(dot(objN, normalize(uHoverNormal)), 0.0)
    : 0.0;
  float directHit = smoothstep(0.88, 1.0, similarity) * uHoverActive;

  float pulse = 1.0 + sin(uTime * 2.0) * 0.08;
  float light = max(diffusion, directHit) * pulse;

  // ── Randomised chromatic palette selection ──────────────────────────
  float faceRand = hash3(objN * 10.0);
  float paletteIndex = floor(mod(faceRand * 8.0, 8.0));
  vec3 baseColor = getChromaticColor(paletteIndex) * DIM;

  // Per-face random brightness (0.6 – 1.0)
  float brightness = 0.6 + 0.4 * hash3(objN * 17.3 + vec3(1.0, 2.0, 3.0));
  baseColor *= brightness;

  // Palette shift driven by mouse position
  float shiftIdx = paletteIndex + sign(uMouse.x + uMouse.y) * step(0.15, abs(uMouse.x)) * light;
  vec3 shiftedColor = getChromaticColor(shiftIdx) * DIM;
  baseColor = mix(baseColor, shiftedColor, light * 0.45);

  // ── Final colour ────────────────────────────────────────────────────
  vec3 idleColor = vec3(0.10, 0.09, 0.13); // #1a1820
  float colorMix = pow(light, 0.7);
  vec3 color = mix(idleColor, baseColor * 1.15, colorMix);

  // Iridescent tint from view angle
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float viewDot = abs(dot(viewDir, n));
  float iriTint = pow(1.0 - viewDot, 2.0) * 0.3 * light;
  color = mix(color, baseColor * 1.5, iriTint);

  // Time drift
  float driftIdx = paletteIndex + sin(uTime * 0.6) * light * 1.2;
  vec3 driftColor = getChromaticColor(driftIdx) * DIM;
  color = mix(color, driftColor, light * 0.18);

  // Specular highlight
  vec3 lightDir = normalize(vec3(3.0, 4.0, 2.0));
  vec3 halfDir = normalize(viewDir + lightDir);
  float spec = pow(max(dot(n, halfDir), 0.0), 32.0);
  color += vec3(1.0, 0.97, 0.92) * spec * 0.7 * light;

  // Edge / fresnel glow
  float fresnel = pow(1.0 - viewDot, 3.0);
  float fresnelStrength = mix(0.1, 0.5, light);
  vec3 fresnelTint = mix(getChromaticColor(0.0) * DIM, baseColor, 0.4);
  color += fresnelTint * fresnel * fresnelStrength;

  // Boost luminosity on hover
  color *= uLightBoost;

  float alpha = mix(0.5, 0.92, light);
  gl_FragColor = vec4(color, alpha);
}
`;

// ── Lights that respond to hover ──────────────────────────────────────────
function ResponsiveLights({ mouseState }: { mouseState: React.MutableRefObject<MouseState> }) {
  const ambRef = useRef<THREE.AmbientLight>(null);
  const dir1Ref = useRef<THREE.DirectionalLight>(null);
  const dir2Ref = useRef<THREE.DirectionalLight>(null);
  const pointRef = useRef<THREE.PointLight>(null);
  const pointPos = useMemo(() => new THREE.Vector3(), []);

  useFrame((_state, delta) => {
    const h = mouseState.current.hoverActive;
    if (ambRef.current) ambRef.current.intensity = THREE.MathUtils.lerp(ambRef.current.intensity, 0.35 + h * 1.0, delta * 4);
    if (dir1Ref.current) dir1Ref.current.intensity = THREE.MathUtils.lerp(dir1Ref.current.intensity, 0.6 + h * 2.0, delta * 4);
    if (dir2Ref.current) dir2Ref.current.intensity = THREE.MathUtils.lerp(dir2Ref.current.intensity, 0.25 + h * 1.2, delta * 4);
    if (pointRef.current) {
      pointRef.current.intensity = THREE.MathUtils.lerp(pointRef.current.intensity, h * 5.0, delta * 4);
      pointPos.lerp(mouseState.current.hoverPoint, delta * 6);
      pointRef.current.position.copy(pointPos);
    }
  });

  return (
    <>
      <ambientLight ref={ambRef} intensity={0.35} />
      <directionalLight ref={dir1Ref} position={[3, 4, 2]} intensity={0.6} color="#e4a853" />
      <directionalLight ref={dir2Ref} position={[-2, -1, 3]} intensity={0.25} color="#c75d3a" />
      <pointLight ref={pointRef} color="#fff5e0" intensity={0} distance={10} decay={2} />
    </>
  );
}

// ── Bridge hover state out to CSS custom property ───────────────────────────
function HoverBridge({ mouseState }: { mouseState: React.MutableRefObject<MouseState> }) {
  useFrame(() => {
    document.documentElement.style.setProperty("--crystal-hover", String(mouseState.current.hoverActive));
  });
  return null;
}

// ── Main crystal mesh ─────────────────────────────────────────────────────
function CrystalMesh({ mouseState, chromatic }: { mouseState: React.MutableRefObject<MouseState>; chromatic: THREE.Vector3[] }) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.LineSegments>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const pointer = useMemo(() => new THREE.Vector2(), []);

  // Icosahedron with aggressive vertical stretch + vertex displacement
  // for irregular, sharper facets with pronounced tips.
  const geo = useMemo(() => {
    const base = new THREE.IcosahedronGeometry(1.25, 0);
    const pos = base.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, pos.getY(i) * 2.2);
    }
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const len = Math.sqrt(x * x + y * y + z * z);
      if (len < 0.001) continue;
      const h = Math.sin(x * 12.9898 + y * 78.233 + z * 45.164) * 43758.5453;
      const disp = (h - Math.floor(h)) * 0.4 - 0.1;
      const tipBoost = Math.abs(y) > 1.8 ? 0.25 : 0;
      const total = disp + tipBoost;
      pos.setX(i, x + (x / len) * total);
      pos.setY(i, y + (y / len) * total);
      pos.setZ(i, z + (z / len) * total);
    }
    pos.needsUpdate = true;
    const flat = base.toNonIndexed();
    flat.computeVertexNormals();
    base.dispose();
    return flat;
  }, []);

  const edges = useMemo(() => new THREE.EdgesGeometry(geo, 15), [geo]);

  const uniforms = useMemo(
    () => ({
      uMouse: { value: new THREE.Vector2(0, 0) },
      uHoverActive: { value: 0 },
      uTime: { value: 0 },
      uHoverNormal: { value: new THREE.Vector3(0, 0, 0) },
      uHoverPoint: { value: new THREE.Vector3(0, 0, 0) },
      uChromatic: { value: chromatic.slice(0, 8) },
      uLightBoost: { value: 1.0 },
    }),
    [chromatic],
  );

  useFrame((state, delta) => {
    const ms = mouseState.current;

    // ── Inertia decay (runs only when not dragging) ───────────────────
    if (!ms.isDragging) {
      ms.inertiaX *= 0.88;
      ms.inertiaZ *= 0.88;
      ms.accRotX += ms.inertiaX;
      ms.accRotZ += ms.inertiaZ;
    }

    // ── Group rotation ────────────────────────────────────────────────
    if (groupRef.current) {
      const targetScale = 1 + ms.hoverActive * 0.1;
      groupRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        Math.min(delta * 4, 1),
      );

      if (ms.everDragged) {
        // After first drag: always use accumulated drag rotation
        groupRef.current.rotation.x = ms.accRotX;
        groupRef.current.rotation.z = ms.accRotZ;
      } else {
        // Before any drag: gentle mouse-tilt
        const targetTiltX = ms.ndcY * 0.2;
        const targetTiltZ = -ms.ndcX * 0.2;
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetTiltX, delta * 3);
        groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetTiltZ, delta * 3);
      }
    }

    if (meshRef.current) {
      const spinSpeed = ms.isDragging ? 0 : 0.12 + ms.hoverActive * 0.35;
      meshRef.current.rotation.y += delta * spinSpeed;
    }

    const mesh = meshRef.current;
    if (mesh) {
      pointer.set(ms.ndcX, ms.ndcY);
      raycaster.setFromCamera(pointer, state.camera);
      mesh.updateMatrixWorld(true);
      const intersects = raycaster.intersectObject(mesh, false);
      if (intersects.length > 0 && intersects[0].face) {
        ms.hoverNormal.copy(intersects[0].face.normal);
        ms.hoverPoint.copy(intersects[0].point);
        ms.hoverTarget = 1;
      } else {
        ms.hoverTarget = 0;
      }
    }

    ms.hoverActive = THREE.MathUtils.lerp(
      ms.hoverActive,
      ms.hoverTarget,
      Math.min(delta * 6, 1),
    );

    if (matRef.current) {
      matRef.current.uniforms.uMouse.value.set(ms.relX, ms.relY);
      matRef.current.uniforms.uHoverActive.value = ms.hoverActive;
      matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      matRef.current.uniforms.uHoverNormal.value.copy(ms.hoverNormal);
      matRef.current.uniforms.uHoverPoint.value.copy(ms.hoverPoint);
      matRef.current.uniforms.uLightBoost.value = 1.0 + ms.hoverActive * 1.5;
    }

    if (wireRef.current) {
      wireRef.current.rotation.y = meshRef.current?.rotation.y ?? 0;
      const lm = wireRef.current.material as THREE.LineBasicMaterial;
      const h = ms.hoverActive;
      lm.color.setRGB(0.89 + h * 0.11, 0.66 + h * 0.34, 0.33 + h * 0.67);
      lm.opacity = 0.38 + h * 0.35;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} geometry={geo}>
        <shaderMaterial
          ref={matRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments ref={wireRef} geometry={edges}>
        <lineBasicMaterial color="#e4a853" transparent opacity={0.38} />
      </lineSegments>
    </group>
  );
}

// ── Static SVG fallback for reduced motion ────────────────────────────────
function CrystalStatic({ chromatic }: { chromatic: THREE.Vector3[] }) {
  const toHex = (v: THREE.Vector3) => {
    const r = Math.round(v.x * 255).toString(16).padStart(2, "0");
    const g = Math.round(v.y * 255).toString(16).padStart(2, "0");
    const b = Math.round(v.z * 255).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`;
  };
  const c = chromatic.map(toHex);

  return (
    <svg
      viewBox="0 0 200 340"
      fill="none"
      className="hero-crystal__static"
      aria-hidden="true"
    >
      <g stroke={c[0]} strokeWidth="1.4" opacity="0.6">
        <polygon points="100,5 170,110 170,230 100,335 30,230 30,110" />
        <line x1="100" y1="5" x2="100" y2="335" />
        <line x1="30" y1="110" x2="170" y2="230" />
        <line x1="170" y1="110" x2="30" y2="230" />
      </g>
      <polygon points="100,5 170,110 100,170" fill={c[0]} fillOpacity="0.12" />
      <polygon points="100,5 30,110 100,170" fill={c[1]} fillOpacity="0.12" />
      <polygon points="170,110 170,230 100,170" fill={c[2]} fillOpacity="0.1" />
      <polygon points="30,110 30,230 100,170" fill={c[3]} fillOpacity="0.1" />
      <polygon points="170,230 100,335 100,170" fill={c[1]} fillOpacity="0.1" />
      <polygon points="30,230 100,335 100,170" fill={c[2]} fillOpacity="0.08" />
    </svg>
  );
}

// ── Main exported component ────────────────────────────────────────────────
export default function HeroCrystal() {
  const reduced = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseState = useRef<MouseState>({
    ndcX: 0,
    ndcY: 0,
    relX: 0,
    relY: 0,
    hoverNormal: new THREE.Vector3(0, 0, 0),
    hoverPoint: new THREE.Vector3(0, 0, 0),
    hoverActive: 0,
    hoverTarget: 0,
    isDragging: false,
    lastDragX: 0,
    lastDragY: 0,
    accRotX: 0,
    accRotZ: 0,
    inertiaX: 0,
    inertiaZ: 0,
    everDragged: false,
  });
  const chromatic = useMemo(() => generateChromaticPalette(), []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const ms = mouseState.current;
      ms.ndcX = (e.clientX / window.innerWidth) * 2 - 1;
      ms.ndcY = -(e.clientY / window.innerHeight) * 2 + 1;
      ms.relX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ms.relY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (ms.isDragging) {
        const dx = e.clientX - ms.lastDragX;
        const dy = e.clientY - ms.lastDragY;
        const dRotX = dy * 0.008;
        const dRotZ = -dx * 0.008;
        ms.accRotX += dRotX;
        ms.accRotZ += dRotZ;
        // track velocity for inertia (smoothed)
        ms.inertiaX = ms.inertiaX * 0.6 + dRotX * 0.4;
        ms.inertiaZ = ms.inertiaZ * 0.6 + dRotZ * 0.4;
        ms.lastDragX = e.clientX;
        ms.lastDragY = e.clientY;
      }
    };

    const onDown = (e: PointerEvent) => {
      const ms = mouseState.current;
      ms.isDragging = true;
      ms.everDragged = true;
      ms.lastDragX = e.clientX;
      ms.lastDragY = e.clientY;
      ms.inertiaX = 0;
      ms.inertiaZ = 0;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
    };

    const onUp = (e: PointerEvent) => {
      mouseState.current.isDragging = false;
      el.releasePointerCapture(e.pointerId);
      el.style.cursor = "grab";
    };

    const onLeave = () => {
      mouseState.current.hoverTarget = 0;
    };

    el.style.cursor = "grab";
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  if (reduced) {
    return (
      <div className="hero-crystal hero-crystal--static">
        <CrystalStatic chromatic={chromatic} />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="hero-crystal">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 7.5], fov: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <ResponsiveLights mouseState={mouseState} />
        <HoverBridge mouseState={mouseState} />
        <CrystalMesh mouseState={mouseState} chromatic={chromatic} />
      </Canvas>
    </div>
  );
}
