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
}

// ── Crystal shaders with curated palette ───────────────────────────────────
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

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vObjectNormal;

// ── Curated 5-colour palette (site theme) ──────────────────────────────
vec3 getPaletteColor(float i) {
  float idx = floor(mod(i, 5.0));
  if (idx < 1.0) return vec3(0.894, 0.659, 0.327); // amber   #e4a853
  if (idx < 2.0) return vec3(0.780, 0.365, 0.227); // terracotta #c75d3a
  if (idx < 3.0) return vec3(0.478, 0.620, 0.494); // sage    #7a9e7e
  if (idx < 4.0) return vec3(0.831, 0.518, 0.604); // pink    #d4849a
  return vec3(0.365, 0.494, 0.710);                  // blue    #5d7db5
}

void main() {
  vec3 n = normalize(vNormal);
  vec3 objN = normalize(vObjectNormal);

  // ── Diffused light from hover point ─────────────────────────────────
  float dist = distance(vWorldPosition, uHoverPoint);
  float proximity = exp(-dist * dist * 0.35);

  vec3 toHover = normalize(uHoverPoint - vWorldPosition);
  float faceAlignment = max(dot(n, toHover), 0.0);
  float diffusion = proximity * (0.3 + 0.7 * faceAlignment) * uHoverActive;

  float hoverLen = length(uHoverNormal);
  float similarity = hoverLen > 0.001
    ? max(dot(objN, normalize(uHoverNormal)), 0.0)
    : 0.0;
  float hotSpot = smoothstep(0.85, 1.0, similarity) * uHoverActive * 0.3;

  float ambientGlow = 0.05 * uHoverActive;
  float pulse = 1.0 + sin(uTime * 1.5) * 0.06;
  float light = max((diffusion + hotSpot) * pulse, ambientGlow);

  // ── Quantised palette selection (5 colours) ─────────────────────────
  float faceId = abs(objN.x) * 3.0 + abs(objN.y) * 5.0 + abs(objN.z) * 7.0;
  float paletteIndex = floor(mod(faceId * 5.0, 5.0));
  vec3 baseColor = getPaletteColor(paletteIndex);

  // Per-face brightness variation within the same palette slot
  float brightness = 0.82 + 0.18 * fract(faceId * 3.7);
  baseColor *= brightness;

  // Shift toward an adjacent palette entry with mouse, subtle
  float shiftIdx = paletteIndex + sign(uMouse.x + uMouse.y) * step(0.3, abs(uMouse.x)) * light;
  vec3 shiftedColor = getPaletteColor(shiftIdx);
  baseColor = mix(baseColor, shiftedColor, light * 0.2);

  // ── Final colour ────────────────────────────────────────────────────
  vec3 idleColor = vec3(0.10, 0.09, 0.13); // #1a1820
  vec3 color = mix(idleColor, baseColor, light);

  // Iridescent tint from view angle within lit area
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float viewDot = abs(dot(viewDir, n));
  float iriTint = pow(1.0 - viewDot, 2.0) * 0.15 * light;
  color = mix(color, baseColor * 1.3, iriTint);

  // Time drift within lit area
  float driftIdx = paletteIndex + sin(uTime * 0.4) * light * 0.8;
  vec3 driftColor = getPaletteColor(driftIdx);
  color = mix(color, driftColor, light * 0.08);

  // Specular highlight
  vec3 lightDir = normalize(vec3(3.0, 4.0, 2.0));
  vec3 halfDir = normalize(viewDir + lightDir);
  float spec = pow(max(dot(n, halfDir), 0.0), 48.0);
  color += vec3(1.0, 0.95, 0.9) * spec * 0.45 * light;

  // Edge / fresnel glow — always visible, stronger where light diffuses
  float fresnel = pow(1.0 - viewDot, 3.5);
  float fresnelStrength = mix(0.08, 0.28, light);
  color += vec3(0.894, 0.659, 0.327) * fresnel * fresnelStrength;

  float alpha = mix(0.5, 0.88, light);
  gl_FragColor = vec4(color, alpha);
}
`;

// ── Main crystal mesh (hexagonal lathe crystal) ───────────────────────────
function CrystalMesh({ mouseState }: { mouseState: React.MutableRefObject<MouseState> }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.LineSegments>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const pointer = useMemo(() => new THREE.Vector2(), []);

  // Icosahedron with aggressive vertical stretch + vertex displacement
  // for irregular, sharper facets with pronounced tips.
  const geo = useMemo(() => {
    const base = new THREE.IcosahedronGeometry(1.3, 0);
    const pos = base.attributes.position;
    // Strong vertical stretch
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, pos.getY(i) * 2.2);
    }
    // Per-vertex displacement along its radial direction — deterministic
    // hash makes some vertices poke out (sharp ridges) and some recede
    // (flatter facets), giving the crystal varied, angular edges.
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const len = Math.sqrt(x * x + y * y + z * z);
      if (len < 0.001) continue;
      const h = Math.sin(x * 12.9898 + y * 78.233 + z * 45.164) * 43758.5453;
      const disp = (h - Math.floor(h)) * 0.4 - 0.1; // -0.1 → +0.3
      // Extra outward push near top/bottom tips for sharper points
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
    }),
    [],
  );

  useFrame((state, delta) => {
    const ms = mouseState.current;

    // ── Rotate first so raycast matches the render frame ──────────────
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.12;
    }

    // ── Raycast against crystal to find hover point ────────────────────
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

    // Smooth hover transition
    ms.hoverActive = THREE.MathUtils.lerp(
      ms.hoverActive,
      ms.hoverTarget,
      Math.min(delta * 6, 1),
    );

    // ── Update shader uniforms ────────────────────────────────────────
    if (matRef.current) {
      matRef.current.uniforms.uMouse.value.set(ms.relX, ms.relY);
      matRef.current.uniforms.uHoverActive.value = ms.hoverActive;
      matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      matRef.current.uniforms.uHoverNormal.value.copy(ms.hoverNormal);
      matRef.current.uniforms.uHoverPoint.value.copy(ms.hoverPoint);
    }

    // ── Wireframe sync (Y-only rotation) ──────────────────────────────
    if (wireRef.current) {
      wireRef.current.rotation.y = meshRef.current?.rotation.y ?? 0;

      const lm = wireRef.current.material as THREE.LineBasicMaterial;
      const h = ms.hoverActive;
      lm.color.setRGB(0.89 + h * 0.11, 0.66 + h * 0.34, 0.33 + h * 0.67);
      lm.opacity = 0.38 + h * 0.35;
    }
  });

  return (
    <group>
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

// ── Floating secondary shards ─────────────────────────────────────────────
function Shard({
  position,
  scale,
  mouseState,
  paletteIdx,
}: {
  position: [number, number, number];
  scale: number;
  mouseState: React.MutableRefObject<MouseState>;
  paletteIdx: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const lineRef = useRef<THREE.LineSegments>(null);

  const geo = useMemo(() => {
    const base = new THREE.OctahedronGeometry(scale, 0);
    const pos = base.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, pos.getY(i) * 1.4);
    }
    pos.needsUpdate = true;
    base.computeVertexNormals();
    return base;
  }, [scale]);

  const edges = useMemo(() => new THREE.EdgesGeometry(geo, 15), [geo]);

  // Pick emissive from the curated palette
  const paletteRGB: [number, number, number][] = [
    [0.894, 0.659, 0.327], // amber
    [0.780, 0.365, 0.227], // terracotta
    [0.478, 0.620, 0.494], // sage
    [0.831, 0.518, 0.604], // pink
    [0.365, 0.494, 0.710], // blue
  ];
  const emissiveColor = useMemo(
    () => new THREE.Color(...(paletteRGB[paletteIdx % paletteRGB.length] ?? paletteRGB[0])),
    [paletteIdx],
  );
  const idleColor = useMemo(() => new THREE.Color("#1a1820"), []);

  useFrame((state) => {
    if (!groupRef.current || !meshRef.current) return;
    const t = state.clock.elapsedTime;
    const h = mouseState.current.hoverActive;

    groupRef.current.rotation.y = t * 0.08 + position[0];
    groupRef.current.rotation.z = t * 0.05;
    groupRef.current.position.y = position[1] + Math.sin(t * 0.4 + position[0] * 2) * 0.15;

    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.emissive.copy(idleColor).lerp(emissiveColor, h * 0.6);
    mat.emissiveIntensity = h * 0.8;
    mat.opacity = 0.55 + h * 0.2;

    if (lineRef.current) {
      const lm = lineRef.current.material as THREE.LineBasicMaterial;
      lm.opacity = 0.28 + h * 0.3;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh ref={meshRef} geometry={geo}>
        <meshStandardMaterial
          color="#1a1820"
          roughness={0.4}
          metalness={0.65}
          flatShading
          transparent
          opacity={0.55}
          emissive="#1a1820"
          emissiveIntensity={0}
        />
      </mesh>
      <lineSegments ref={lineRef} geometry={edges}>
        <lineBasicMaterial color="#c75d3a" transparent opacity={0.28} />
      </lineSegments>
    </group>
  );
}

// ── Static SVG fallback for reduced motion ────────────────────────────────
function CrystalStatic() {
  return (
    <svg
      viewBox="0 0 200 340"
      fill="none"
      className="hero-crystal__static"
      aria-hidden="true"
    >
      {/* Hexagonal crystal outline */}
      <g stroke="var(--accent-amber)" strokeWidth="1.2" opacity="0.5">
        <polygon points="100,5 170,110 170,230 100,335 30,230 30,110" />
        <line x1="100" y1="5" x2="100" y2="335" />
        <line x1="30" y1="110" x2="170" y2="230" />
        <line x1="170" y1="110" x2="30" y2="230" />
      </g>
      {/* Palette-tinted facets */}
      <polygon points="100,5 170,110 100,170" fill="#e4a853" fillOpacity="0.06" />
      <polygon points="100,5 30,110 100,170" fill="#c75d3a" fillOpacity="0.06" />
      <polygon points="170,110 170,230 100,170" fill="#7a9e7e" fillOpacity="0.05" />
      <polygon points="30,110 30,230 100,170" fill="#5d7db5" fillOpacity="0.05" />
      <polygon points="170,230 100,335 100,170" fill="#d4849a" fillOpacity="0.05" />
      <polygon points="30,230 100,335 100,170" fill="#e4a853" fillOpacity="0.04" />
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
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      mouseState.current.ndcX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseState.current.ndcY = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseState.current.relX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseState.current.relY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onLeave = () => {
      mouseState.current.hoverTarget = 0;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  if (reduced) {
    return (
      <div className="hero-crystal hero-crystal--static">
        <CrystalStatic />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="hero-crystal">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 7], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 4, 2]} intensity={0.6} color="#e4a853" />
        <directionalLight position={[-2, -1, 3]} intensity={0.25} color="#c75d3a" />
        <CrystalMesh mouseState={mouseState} />
        <Shard position={[2.2, 1.0, -1.5]} scale={0.3} mouseState={mouseState} paletteIdx={0} />
        <Shard position={[-2.4, -0.6, -2]} scale={0.25} mouseState={mouseState} paletteIdx={2} />
        <Shard position={[1.0, -1.6, -1]} scale={0.2} mouseState={mouseState} paletteIdx={4} />
        <Shard position={[-1.3, 1.8, -2.5]} scale={0.16} mouseState={mouseState} paletteIdx={3} />
      </Canvas>
    </div>
  );
}
