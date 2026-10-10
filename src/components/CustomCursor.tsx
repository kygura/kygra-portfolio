import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";

/**
 * Returns true only for devices that actually have a hovering pointer.
 * On touch there is no cursor to replace, so the whole component — three
 * fixed layers plus two springs driven by every mouse move — stays
 * unmounted rather than animating invisibly.
 */
function useHasPointer() {
  const [hasPointer, setHasPointer] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setHasPointer(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);

  return hasPointer;
}

export default function CustomCursor() {
  const hasPointer = useHasPointer();
  return hasPointer ? <Cursor /> : null;
}

function Cursor() {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const ringX = useSpring(cursorX, { stiffness: 180, damping: 22 });
  const ringY = useSpring(cursorY, { stiffness: 180, damping: 22 });
  const [isHovering, setIsHovering] = useState(false);
  const [accentColor, setAccentColor] = useState<string>("var(--accent-amber)");

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    const onEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const closest = target.closest("a, button, [data-cursor]");
      if (closest) {
        const dataColor = (closest as HTMLElement).dataset.cursorColor;
        if (dataColor) setAccentColor(dataColor);
        else setAccentColor("var(--accent-amber)");
        setIsHovering(true);
      }
    };

    const onLeave = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const closest = target.closest("a, button, [data-cursor]");
      if (closest) {
        setIsHovering(false);
        setAccentColor("var(--accent-amber)");
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseover", onEnter, { passive: true });
    document.addEventListener("mouseout", onLeave, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onEnter);
      document.removeEventListener("mouseout", onLeave);
    };
  }, [cursorX, cursorY]);

  return (
    <>
      {/* Dot — always visible, shrinks slightly on hover.
          Painted in the theme's ink rather than mix-blend-difference:
          a blended fixed layer forces the browser to re-blend against the
          page backdrop, which defeats layer isolation for the animating
          hero canvas underneath. */}
      <motion.div
        style={{ x: cursorX, y: cursorY }}
        className="fixed top-0 left-0 z-[99999] pointer-events-none"
        animate={{
          width: isHovering ? 6 : 8,
          height: isHovering ? 6 : 8,
          opacity: isHovering ? 0 : 1,
        }}
        transition={{ duration: 0.15, ease: "easeOut" }}
      >
        <div
          className="-translate-x-1/2 -translate-y-1/2"
          style={{
            width: "100%",
            height: "100%",
            background: "var(--text-primary)",
          }}
        />
      </motion.div>

      {/* Default ring — small, subtle, always present */}
      <motion.div
        style={{ x: ringX, y: ringY }}
        className="fixed top-0 left-0 z-[99998] pointer-events-none"
        animate={{
          width: 36,
          height: 36,
        }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <div
          className="-translate-x-1/2 -translate-y-1/2"
          style={{
            width: "100%",
            height: "100%",
            border: "1px solid color-mix(in srgb, var(--text-primary) 35%, transparent)",
            opacity: isHovering ? 0 : 1,
            transition: "opacity 0.3s ease",
          }}
        />
      </motion.div>

      {/* Hover ring — fades in only over clickable elements */}
      <AnimatePresence>
        {isHovering && (
          <motion.div
            key="hover-ring"
            style={{ x: ringX, y: ringY }}
            className="fixed top-0 left-0 z-[99998] pointer-events-none"
            initial={{ width: 36, height: 36, opacity: 0 }}
            animate={{ width: 60, height: 60, opacity: 1 }}
            exit={{ width: 36, height: 36, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div
              className="-translate-x-1/2 -translate-y-1/2"
              style={{
                width: "100%",
                height: "100%",
                border: `1px solid ${accentColor}`,
                background: `color-mix(in srgb, ${accentColor} 9%, transparent)`,
                transition: "border-color 0.2s ease, background 0.2s ease",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
