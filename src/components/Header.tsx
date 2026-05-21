
import { useEffect, useRef, useState } from "react";

export default function Header() {
  const headerRef = useRef<HTMLElement>(null);
  const [shadow, setShadow] = useState({ x: 0.18, y: 0.18 });

  useEffect(() => {
    const onScroll = () => {
      const el = headerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const progress = Math.min(
        Math.max(-rect.top / (rect.height * 0.5), 0),
        1,
      );
      el.style.setProperty("--sp", String(progress));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = headerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / window.innerWidth;
      const dy = (e.clientY - cy) / window.innerHeight;
      const max = 0.28;
      setShadow({
        x: Math.max(-max, Math.min(max, -dx * 0.8)),
        y: Math.max(-max, Math.min(max, -dy * 0.8)),
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const baseShadow = `${shadow.x.toFixed(3)}em ${shadow.y.toFixed(3)}em 0 rgba(120, 116, 112, 0.35)`;
  const invertShadow = `${shadow.x.toFixed(3)}em ${shadow.y.toFixed(3)}em 0 rgba(0, 0, 0, 0.4)`;
  const subShadow = `${(shadow.x * 0.5).toFixed(3)}em ${(shadow.y * 0.5).toFixed(3)}em 0 rgba(120, 116, 112, 0.25)`;
  const subInvertShadow = `${(shadow.x * 0.5).toFixed(3)}em ${(shadow.y * 0.5).toFixed(3)}em 0 rgba(0, 0, 0, 0.3)`;

  return (
    <header className="bebop-header" ref={headerRef}>
      <div className="bebop-header__sticky">
        <div className="hbg"></div>

        {/* BASE LAYER — dark text, sits below and is visible on the cream background */}
        <div className="hero-content hero-content--base">
          <div className="hero-name fi" style={{ textShadow: baseShadow }}>Works by @NCA</div>
          <div className="hero-sub fi2" style={{ textShadow: subShadow }}>
            LIVING THE DREAM & DOING THE WORK
          </div>
        </div>

        {/* INVERT LAYER — cream text, absolute to viewport, clipped to the right-hand black area */}
        <div className="hero-content hero-content--invert" aria-hidden="true">
          <div className="hero-name fi" style={{ textShadow: invertShadow }}>Works by @NCA</div>
          <div className="hero-sub fi2" style={{ textShadow: subInvertShadow }}>LIVING THE DREAM & DOING THE WORK</div>
        </div>
      </div>
    </header>
  )
}
