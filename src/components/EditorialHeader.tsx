import { useEffect, useRef, useState } from "react";

const EditorialHeader = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0.35, y: 0.35 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const dx = (e.clientX - cx) / window.innerWidth;
      const dy = (e.clientY - cy) / window.innerHeight;

      const maxOffset = 0.55;
      setOffset({
        x: Math.max(-maxOffset, Math.min(maxOffset, -dx * 1.4)),
        y: Math.max(-maxOffset, Math.min(maxOffset, -dy * 1.4)),
      });
    };

    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  const steps = 16;
  const shadowLayers = Array.from({ length: steps }, (_, i) => {
    const t = (i + 1) / steps;
    const sx = offset.x * t;
    const sy = offset.y * t;
    const opacity = 0.85 - t * 0.55;
    return `${sx.toFixed(3)}em ${sy.toFixed(3)}em 0 rgba(10, 10, 10, ${opacity.toFixed(3)})`;
  }).join(", ");

  return (
    <div
      ref={ref}
      className="editorial-header"
      aria-label="Ars Libera"
    >
      <span
        className="editorial-header__text"
        style={{ textShadow: shadowLayers }}
      >
        Ars Libera
      </span>
    </div>
  );
};

export default EditorialHeader;
