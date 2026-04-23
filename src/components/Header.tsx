
import { useEffect, useRef } from "react";

export default function Header() {
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const el = headerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const progress = Math.min(
        Math.max(-rect.top / (rect.height * 0.8), 0),
        1,
      );
      el.style.setProperty("--sp", String(progress));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="bebop-header" ref={headerRef}>


      <div className="hbg"></div>

  
      {/* BASE LAYER — dark text, sits below and is visible on the cream background */}
      <div className="hero-content hero-content--base">
        <div className="hero-name fi">Works by @NCA</div>
        <div className="hero-sub fi2">
          LIVING THE DREAM & DOING THE WORK
        </div>
      </div>

      {/* INVERT LAYER — cream text, absolute to viewport, clipped to the right-hand black area */}
      <div className="hero-content hero-content--invert" aria-hidden="true">
        <div className="hero-name fi">Works by @NCA</div>
        <div className="hero-sub fi2">LIVING THE DREAM & DOING THE WORK</div>
      </div>

      {/* <div className="hstrip">
        <span>
          BOUNTY HUNTER · DIGITAL MERCENARY · MARKET OPERATOR · FREE AGENT · NO MASTERS · NO FIXED ORBIT · PERPETUAL FUTURES · SEE YOU SPACE COWBOY ·&nbsp;&nbsp;
          BOUNTY HUNTER · DIGITAL MERCENARY · MARKET OPERATOR · FREE AGENT · NO MASTERS · NO FIXED ORBIT · PERPETUAL FUTURES · SEE YOU SPACE COWBOY ·&nbsp;&nbsp;
        </span>
      </div> 
      */}
    </header>
  )
}
