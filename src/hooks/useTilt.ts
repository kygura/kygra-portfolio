import { useRef } from "react";
import { useMotionValue, useSpring } from "framer-motion";

export function useTilt(maxAngle = 10) {
  const ref = useRef<HTMLElement>(null);
  const rotateX = useSpring(useMotionValue(0), { stiffness: 300, damping: 28 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 300, damping: 28 });

  const onMouseMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    rotateX.set(-y * maxAngle);
    rotateY.set(x * maxAngle);
  };

  const onMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return { ref, rotateX, rotateY, onMouseMove, onMouseLeave };
}
