import { lazy, Suspense, useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform, type Variants, type Transition } from "framer-motion";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const HeroCrystal = lazy(() => import("./HeroCrystal"));

export default function Header() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLSpanElement>(null);
  const secondaryRef = useRef<HTMLSpanElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);

  // Mouse parallax values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 60, damping: 18 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 18 });

  // Layer parallax transforms (different speeds)
  const primaryX = useTransform(springX, (v) => v * -18);
  const primaryY = useTransform(springY, (v) => v * -12);
  const secondaryX = useTransform(springX, (v) => v * 28);
  const secondaryY = useTransform(springY, (v) => v * 20);
  const eyebrowX = useTransform(springX, (v) => v * 10);
  const eyebrowY = useTransform(springY, (v) => v * 8);
  const shapeAX = useTransform(springX, (v) => v * -40);
  const shapeAY = useTransform(springY, (v) => v * -30);
  const shapeBX = useTransform(springX, (v) => v * 50);
  const shapeBY = useTransform(springY, (v) => v * 35);
  const shapeCX = useTransform(springX, (v) => v * -25);
  const shapeCY = useTransform(springY, (v) => v * 20);
  const crystalX = useTransform(springX, (v) => v * 14);
  const crystalY = useTransform(springY, (v) => v * 10);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      mouseX.set((e.clientX - cx) / cx);
      mouseY.set((e.clientY - cy) / cy);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [mouseX, mouseY]);

  // GSAP scroll fade-out + background color inversion
  useEffect(() => {
    const ctx = gsap.context(() => {
      const section = sectionRef.current;
      const content = contentRef.current;
      if (!section || !content) return;

      const stConfig = {
        trigger: section,
        start: "top top",
        end: "bottom top",
        scrub: 0.6,
      };

      // Fade out content
      gsap.to(content, {
        opacity: 0,
        y: -40,
        scale: 0.96,
        ease: "none",
        scrollTrigger: stConfig,
      });
    });
    return () => ctx.revert();
  }, []);

  // Letter entrance animation
  const letterVariants: Variants = {
    hidden: { opacity: 0, y: 60, skewY: 4 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      skewY: 0,
      transition: {
        delay: 0.08 + i * 0.04,
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1] as Transition["ease"],
      },
    }),
  };

  const primaryText = "Ventures by NCA";
  const secondaryText = "Frontier Software Studio";

  return (
    <section ref={sectionRef} className="kinetic-hero">
      {/* Background decorative shapes */}
      <motion.div className="kinetic-hero__bg-shape kinetic-hero__bg-shape--a" style={{ x: shapeAX, y: shapeAY }} />
      <motion.div className="kinetic-hero__bg-shape kinetic-hero__bg-shape--b" style={{ x: shapeBX, y: shapeBY }} />
      <motion.div className="kinetic-hero__bg-shape kinetic-hero__bg-shape--c" style={{ x: shapeCX, y: shapeCY }} />

      {/* 3D Crystal above hero text */}
      <motion.div
        className="kinetic-hero__crystal"
        style={{ x: crystalX, y: crystalY }}
      >
        <Suspense fallback={null}>
          <HeroCrystal />
        </Suspense>
      </motion.div>

      {/* Content layers */}
      <div ref={contentRef} className="kinetic-hero__content">
        {/* Eyebrow */}
        

        {/* Primary headline — letter by letter */}
        <motion.div
          className="overflow-hidden"
          style={{ x: primaryX, y: primaryY }}
        >
          <motion.span
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          >
            <motion.span
              ref={primaryRef}
              className="kinetic-hero__primary"
              initial="hidden"
              animate="visible"
              aria-label={primaryText}
              style={{ mixBlendMode: "difference" }}
            >
              <i>
                {primaryText.split("").map((char, i) => (
                  <motion.span
                    key={i}
                    custom={i}
                    variants={letterVariants}
                    style={{ display: "inline-block", whiteSpace: char === " " ? "pre" : "normal" }}
                  >
                    {char}
                  </motion.span>
                ))}
              </i>
            </motion.span>
          </motion.span>
        </motion.div>

        {/* Secondary line */}
        <motion.span
          ref={secondaryRef}
          className="kinetic-hero__secondary"
          style={{ x: secondaryX, y: secondaryY, mixBlendMode: "difference" }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.span
            animate={{ y: [0, -4, 0], opacity: [1, 0.85, 1] }}
            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
          >
            {secondaryText}
          </motion.span>
        </motion.span>
      </div>

      {/* Scroll hint */}
      <motion.div
        ref={scrollHintRef}
        className="kinetic-hero__scroll-hint"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.8 }}
      >
        <span style={{ mixBlendMode: "difference" }}>scroll</span>
        <div className="kinetic-hero__scroll-line" />
      </motion.div>
    </section>
  );
}
