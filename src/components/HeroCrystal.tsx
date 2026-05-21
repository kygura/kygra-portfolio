import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, type ThreeElements } from "@react-three/fiber";
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

// ── Crystal geometry (memoized) ───────────────────────────────────────────
function CrystalMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.LineSegments>(null);

  const geo = useMemo(() => {
    const base = new THREE.IcosahedronGeometry(1.6, 0);
    // Stretch vertically into a crystal prism
    const pos = base.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      pos.setY(i, y * 1.7);
    }
    pos.needsUpdate = true;
    base.computeVertexNormals();
    return base;
  }, []);

  const edges = useMemo(() => new THREE.EdgesGeometry(geo, 15), [geo]);

  // Animate rotation via useFrame — no React state, pure ref mutation
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.12;
      meshRef.current.rotation.x += delta * 0.04;
    }
    if (wireRef.current) {
      wireRef.current.rotation.y += delta * 0.12;
      wireRef.current.rotation.x += delta * 0.04;
    }
  });

  return (
    <group>
      {/* Faceted crystal body */}
      <mesh ref={meshRef} geometry={geo}>
        <meshStandardMaterial
          color="#1a1820"
          roughness={0.35}
          metalness={0.7}
          flatShading
          transparent
          opacity={0.72}
        />
      </mesh>
      {/* Wireframe edge overlay */}
      <lineSegments ref={wireRef} geometry={edges}>
        <lineBasicMaterial color="#e4a853" transparent opacity={0.38} />
      </lineSegments>
    </group>
  );
}

// ── Floating secondary shards ─────────────────────────────────────────────
function Shard({ position, scale }: { position: [number, number, number]; scale: number }) {
  const ref = useRef<THREE.Group>(null);
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

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = t * 0.08 + position[0];
    ref.current.rotation.z = t * 0.05;
    ref.current.position.y = position[1] + Math.sin(t * 0.4 + position[0] * 2) * 0.15;
  });

  return (
    <group ref={ref} position={position}>
      <mesh geometry={geo}>
        <meshStandardMaterial
          color="#1a1820"
          roughness={0.4}
          metalness={0.65}
          flatShading
          transparent
          opacity={0.55}
        />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#c75d3a" transparent opacity={0.28} />
      </lineSegments>
    </group>
  );
}

// ── ASCII trace layer (CSS-animated, no JS loop) ─────────────────────────
const ASCII_FRAGMENTS = [
  { text: "╔══╗", top: "12%", left: "8%", delay: "0s" },
  { text: "║██║", top: "14%", left: "9%", delay: "0.4s" },
  { text: "╚══╝", top: "16%", left: "8%", delay: "0.8s" },
  { text: "┌─┐", top: "28%", right: "10%", delay: "1.2s" },
  { text: "│△│", top: "30%", right: "11%", delay: "1.6s" },
  { text: "└─┘", top: "32%", right: "10%", delay: "2s" },
  { text: "◇─◇", bottom: "24%", left: "14%", delay: "0.6s" },
  { text: "╳ ╳", bottom: "22%", left: "16%", delay: "1s" },
  { text: "△▽△", top: "18%", right: "22%", delay: "1.4s" },
  { text: "◈◈◈", bottom: "30%", right: "16%", delay: "0.2s" },
  { text: "╱╲╱╲", top: "38%", left: "5%", delay: "1.8s" },
  { text: "┼──┼", bottom: "18%", right: "6%", delay: "2.2s" },
];

function AsciiTraces() {
  return (
    <div className="hero-crystal__ascii" aria-hidden="true">
      {ASCII_FRAGMENTS.map((f, i) => (
        <span
          key={i}
          className="hero-crystal__ascii-frag"
          style={{
            top: f.top,
            left: f.left,
            right: f.right,
            bottom: f.bottom,
            animationDelay: f.delay,
          }}
        >
          {f.text}
        </span>
      ))}
    </div>
  );
}

// ── Static SVG fallback for reduced motion ────────────────────────────────
function CrystalStatic() {
  return (
    <svg
      viewBox="0 0 200 320"
      fill="none"
      className="hero-crystal__static"
      aria-hidden="true"
    >
      <g stroke="var(--accent-amber)" strokeWidth="1.2" opacity="0.5">
        {/* Stylised crystal prism outline */}
        <polygon points="100,10 160,140 140,300 60,300 40,140" />
        <line x1="100" y1="10" x2="60" y2="300" />
        <line x1="100" y1="10" x2="140" y2="300" />
        <line x1="40" y1="140" x2="160" y2="140" />
        <line x1="40" y1="140" x2="100" y2="10" />
        <line x1="160" y1="140" x2="100" y2="10" />
        {/* Inner facet */}
        <polygon points="100,70 130,200 70,200" strokeOpacity="0.25" />
      </g>
    </svg>
  );
}

// ── Main exported component ────────────────────────────────────────────────
export default function HeroCrystal() {
  const reduced = usePrefersReducedMotion();

  if (reduced) {
    return (
      <div className="hero-crystal hero-crystal--static">
        <CrystalStatic />
        <AsciiTraces />
      </div>
    );
  }

  return (
    <div className="hero-crystal">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 5.5], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 4, 2]} intensity={0.6} color="#e4a853" />
        <directionalLight position={[-2, -1, 3]} intensity={0.25} color="#c75d3a" />
        <CrystalMesh />
        <Shard position={[2.2, 1.0, -1.5]} scale={0.35} />
        <Shard position={[-2.4, -0.6, -2]} scale={0.28} />
        <Shard position={[1.0, -1.6, -1]} scale={0.22} />
        <Shard position={[-1.3, 1.8, -2.5]} scale={0.18} />
      </Canvas>
      <AsciiTraces />
    </div>
  );
}
