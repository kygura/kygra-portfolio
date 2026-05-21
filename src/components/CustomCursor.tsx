import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function CustomCursor() {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const ringX = useSpring(cursorX, { stiffness: 180, damping: 22 });
  const ringY = useSpring(cursorY, { stiffness: 180, damping: 22 });
  const [variant, setVariant] = useState<"default" | "hover" | "link">("default");
  const [accentColor, setAccentColor] = useState<string>("var(--accent-amber)");
  const isTouchRef = useRef(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    const onEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const closest = target.closest("a, button, [data-cursor], .project-tile, .box");
      if (closest) {
        const dataColor = (closest as HTMLElement).dataset.cursorColor;
        if (dataColor) setAccentColor(dataColor);
        else setAccentColor("var(--accent-amber)");
        setVariant(closest.tagName === "A" || closest.tagName === "BUTTON" ? "link" : "hover");
      }
    };

    const onLeave = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const closest = target.closest("a, button, [data-cursor], .project-tile, .box");
      if (closest) {
        setVariant("default");
        setAccentColor("var(--accent-amber)");
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseover", onEnter, { passive: true });
    document.addEventListener("mouseout", onLeave, { passive: true });

    const touchDetect = () => { isTouchRef.current = true; };
    window.addEventListener("touchstart", touchDetect, { once: true });

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onEnter);
      document.removeEventListener("mouseout", onLeave);
    };
  }, [cursorX, cursorY]);

  return (
    <>
      {/* Dot */}
      <motion.div
        style={{ x: cursorX, y: cursorY }}
        className="fixed top-0 left-0 z-[99999] pointer-events-none mix-blend-difference"
        animate={{
          width: variant === "link" ? 12 : 8,
          height: variant === "link" ? 12 : 8,
        }}
        transition={{ duration: 0.12, ease: "easeOut" }}
      >
        <div
          className="rounded-full -translate-x-1/2 -translate-y-1/2"
          style={{
            width: "100%",
            height: "100%",
            background: "white",
          }}
        />
      </motion.div>

      {/* Ring */}
      <motion.div
        style={{ x: ringX, y: ringY }}
        className="fixed top-0 left-0 z-[99998] pointer-events-none"
        animate={{
          width: variant === "hover" ? 56 : variant === "link" ? 48 : 36,
          height: variant === "hover" ? 56 : variant === "link" ? 48 : 36,
          opacity: variant === "hover" ? 0.7 : 0.4,
        }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <div
          className="rounded-full border -translate-x-1/2 -translate-y-1/2"
          style={{
            width: "100%",
            height: "100%",
            borderColor: accentColor,
            transition: "border-color 0.2s ease",
          }}
        />
      </motion.div>
    </>
  );
}
