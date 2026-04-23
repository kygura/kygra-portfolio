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

      const maxOffset = 0.28;
      setOffset({
        x: Math.max(-maxOffset, Math.min(maxOffset, -dx * 0.8)),
        y: Math.max(-maxOffset, Math.min(maxOffset, -dy * 0.8)),
      });
    };

    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  const shadow = `${offset.x.toFixed(3)}em ${offset.y.toFixed(3)}em 0 rgba(120, 116, 112, 0.35)`;

  return (
    <div
      ref={ref}
      className="editorial-header"
      aria-label="Ars Libera"
    >
      <span
        className="editorial-header__text"
        style={{ textShadow: shadow }}
      >
        Ars Libera
      </span>
    </div>
  );
};

export default EditorialHeader;
