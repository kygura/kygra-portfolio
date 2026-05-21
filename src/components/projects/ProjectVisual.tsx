import type { Project } from "@/lib/projects";

interface ProjectVisualProps {
  palette: Project["palette"];
}

const ProjectVisual = ({ palette }: ProjectVisualProps) => {
  if (palette === "meridian") {
    // Brutalist compass / coordinate rings — cartography identity
    return (
      <svg viewBox="0 0 220 220" fill="none" className="project-visual__svg" aria-hidden="true">
        <g stroke="currentColor" strokeWidth="1.8">
          <rect x="14" y="14" width="192" height="192" />
          <circle cx="110" cy="110" r="78" />
          <circle cx="110" cy="110" r="58" />
          <circle cx="110" cy="110" r="38" />
          <line x1="14" y1="110" x2="206" y2="110" />
          <line x1="110" y1="14" x2="110" y2="206" />
          <line x1="42" y1="42" x2="178" y2="178" strokeDasharray="5 5" />
          <line x1="178" y1="42" x2="42" y2="178" strokeDasharray="5 5" />
        </g>
        <g fill="currentColor">
          <polygon points="110,32 118,110 110,188 102,110" />
          <polygon points="32,110 110,102 188,110 110,118" opacity="0.55" />
          <rect x="20" y="20" width="14" height="14" />
          <rect x="186" y="186" width="14" height="14" />
          <circle cx="110" cy="110" r="6" />
        </g>
      </svg>
    );
  }

  if (palette === "zknull") {
    // Brutalist cipher cube / zk grid — privacy identity
    return (
      <svg viewBox="0 0 220 220" fill="none" className="project-visual__svg" aria-hidden="true">
        <g stroke="currentColor" strokeWidth="1.8">
          <rect x="30" y="30" width="160" height="160" />
          <rect x="30" y="30" width="160" height="160" transform="rotate(8 110 110)" strokeDasharray="4 4" />
          <line x1="30" y1="70" x2="190" y2="70" />
          <line x1="30" y1="110" x2="190" y2="110" />
          <line x1="30" y1="150" x2="190" y2="150" />
          <line x1="70" y1="30" x2="70" y2="190" />
          <line x1="110" y1="30" x2="110" y2="190" />
          <line x1="150" y1="30" x2="150" y2="190" />
        </g>
        <g fill="currentColor">
          <rect x="30" y="30" width="40" height="40" />
          <rect x="110" y="70" width="40" height="40" />
          <rect x="70" y="110" width="40" height="40" />
          <rect x="150" y="150" width="40" height="40" />
          <rect x="70" y="30" width="40" height="40" opacity="0.35" />
          <rect x="150" y="110" width="40" height="40" opacity="0.35" />
        </g>
        <g fill="currentColor" fontFamily="Space Mono, monospace" fontSize="11" letterSpacing="2">
          <text x="38" y="54">ZK</text>
        </g>
      </svg>
    );
  }

  if (palette === "equilibria") {
    // Brutalist balance / tranches — algorithmic flatcoin identity
    return (
      <svg viewBox="0 0 220 220" fill="none" className="project-visual__svg" aria-hidden="true">
        <g stroke="currentColor" strokeWidth="1.8">
          <line x1="20" y1="110" x2="200" y2="110" />
          <line x1="110" y1="28" x2="110" y2="180" />
          <polygon points="110,180 80,200 140,200" />
          <rect x="30" y="72" width="60" height="24" />
          <rect x="130" y="72" width="60" height="24" />
          <rect x="42" y="52" width="36" height="20" />
          <rect x="142" y="52" width="36" height="20" />
          <line x1="30" y1="96" x2="90" y2="96" />
          <line x1="130" y1="96" x2="190" y2="96" />
        </g>
        <g fill="currentColor">
          <rect x="50" y="132" width="24" height="48" />
          <rect x="86" y="144" width="24" height="36" opacity="0.7" />
          <rect x="122" y="120" width="24" height="60" opacity="0.85" />
          <rect x="158" y="138" width="24" height="42" opacity="0.6" />
          <circle cx="110" cy="110" r="5" />
          <polygon points="30,108 30,112 40,110" />
          <polygon points="190,108 190,112 180,110" />
        </g>
      </svg>
    );
  }

  if (palette === "hyperagent") return null;

  if (palette === "airmy") {
    // Radar sweep / concentric rings — defense intelligence identity
    return (
      <svg viewBox="0 0 220 220" fill="none" className="project-visual__svg" aria-hidden="true">
        <g stroke="currentColor" strokeWidth="1.8">
          <circle cx="110" cy="110" r="85" />
          <circle cx="110" cy="110" r="60" />
          <circle cx="110" cy="110" r="35" />
          <line x1="25" y1="110" x2="195" y2="110" />
          <line x1="110" y1="25" x2="110" y2="195" />
          <line x1="50" y1="50" x2="170" y2="170" strokeDasharray="5 5" />
          <line x1="170" y1="50" x2="50" y2="170" strokeDasharray="5 5" />
        </g>
        <g fill="currentColor" opacity="0.12">
          <path d="M110,110 L110,25 A85,85 0 0,1 195,110 Z" />
        </g>
        <g fill="currentColor">
          <circle cx="110" cy="110" r="5" />
          <circle cx="155" cy="75" r="4" opacity="0.8" />
          <circle cx="130" cy="55" r="3" opacity="0.6" />
          <circle cx="170" cy="100" r="3" opacity="0.5" />
          <rect x="106" y="18" width="8" height="8" opacity="0.7" />
        </g>
        <g stroke="currentColor" strokeWidth="1.2" opacity="0.4">
          <line x1="110" y1="110" x2="155" y2="75" />
          <line x1="110" y1="110" x2="130" y2="55" />
          <line x1="110" y1="110" x2="170" y2="100" />
        </g>
      </svg>
    );
  }

  if (palette === "colony") {
    // Grid of connected dots — collective infrastructure identity
    return (
      <svg viewBox="0 0 220 220" fill="none" className="project-visual__svg" aria-hidden="true">
        <g stroke="currentColor" strokeWidth="1" opacity="0.35">
          <line x1="40" y1="40" x2="90" y2="40" />
          <line x1="90" y1="40" x2="140" y2="40" />
          <line x1="140" y1="40" x2="190" y2="40" />
          <line x1="40" y1="90" x2="90" y2="90" />
          <line x1="90" y1="90" x2="140" y2="90" />
          <line x1="140" y1="90" x2="190" y2="90" />
          <line x1="40" y1="140" x2="90" y2="140" />
          <line x1="90" y1="140" x2="140" y2="140" />
          <line x1="140" y1="140" x2="190" y2="140" />
          <line x1="40" y1="190" x2="90" y2="190" />
          <line x1="90" y1="190" x2="140" y2="190" />
          <line x1="40" y1="40" x2="40" y2="90" />
          <line x1="90" y1="40" x2="90" y2="90" />
          <line x1="140" y1="40" x2="140" y2="90" />
          <line x1="190" y1="40" x2="190" y2="90" />
          <line x1="40" y1="90" x2="40" y2="140" />
          <line x1="90" y1="90" x2="90" y2="140" />
          <line x1="140" y1="90" x2="140" y2="140" />
          <line x1="190" y1="90" x2="190" y2="140" />
          <line x1="40" y1="140" x2="40" y2="190" />
          <line x1="90" y1="140" x2="90" y2="190" />
          <line x1="140" y1="140" x2="140" y2="190" />
          <line x1="90" y1="90" x2="140" y2="140" />
          <line x1="40" y1="140" x2="90" y2="90" />
        </g>
        <g fill="currentColor">
          <circle cx="40" cy="40" r="5" />
          <circle cx="90" cy="40" r="5" />
          <circle cx="140" cy="40" r="4" opacity="0.6" />
          <circle cx="190" cy="40" r="3" opacity="0.4" />
          <circle cx="40" cy="90" r="4" opacity="0.6" />
          <circle cx="90" cy="90" r="6" />
          <circle cx="140" cy="90" r="5" />
          <circle cx="190" cy="90" r="3" opacity="0.4" />
          <circle cx="40" cy="140" r="5" />
          <circle cx="90" cy="140" r="4" opacity="0.7" />
          <circle cx="140" cy="140" r="6" />
          <circle cx="190" cy="140" r="4" opacity="0.5" />
          <circle cx="40" cy="190" r="3" opacity="0.4" />
          <circle cx="90" cy="190" r="5" />
          <circle cx="140" cy="190" r="4" opacity="0.6" />
        </g>
      </svg>
    );
  }

  if (palette === "gaia") {
    // Circle with latitude/longitude arcs — earth systems identity
    return (
      <svg viewBox="0 0 220 220" fill="none" className="project-visual__svg" aria-hidden="true">
        <g stroke="currentColor" strokeWidth="1.8">
          <circle cx="110" cy="110" r="85" />
          <ellipse cx="110" cy="110" rx="85" ry="35" />
          <ellipse cx="110" cy="110" rx="85" ry="60" />
          <line x1="110" y1="25" x2="110" y2="195" />
          <ellipse cx="110" cy="70" rx="55" ry="18" />
          <ellipse cx="110" cy="150" rx="55" ry="18" />
        </g>
        <g stroke="currentColor" strokeWidth="1" opacity="0.35">
          <ellipse cx="110" cy="110" rx="35" ry="85" />
        </g>
        <g fill="currentColor" opacity="0.08">
          <path d="M25,110 A85,85 0 0,1 110,25 L110,110 Z" />
        </g>
        <g fill="currentColor">
          <circle cx="110" cy="110" r="4" />
          <circle cx="110" cy="25" r="3" />
          <circle cx="110" cy="195" r="3" />
          <circle cx="25" cy="110" r="3" />
          <circle cx="195" cy="110" r="3" />
          <rect x="14" y="106" width="10" height="8" opacity="0.6" />
          <rect x="196" y="106" width="10" height="8" opacity="0.6" />
        </g>
      </svg>
    );
  }

  // lexis — Brutalist editorial document / margin notes
  return (
    <svg viewBox="0 0 220 220" fill="none" className="project-visual__svg" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.8">
        <rect x="26" y="20" width="150" height="184" />
        <line x1="60" y1="20" x2="60" y2="204" />
        <line x1="26" y1="52" x2="176" y2="52" />
        <line x1="70" y1="74" x2="162" y2="74" />
        <line x1="70" y1="88" x2="168" y2="88" />
        <line x1="70" y1="102" x2="140" y2="102" />
        <line x1="70" y1="124" x2="164" y2="124" />
        <line x1="70" y1="138" x2="158" y2="138" />
        <line x1="70" y1="152" x2="132" y2="152" />
        <line x1="70" y1="174" x2="154" y2="174" />
        <line x1="70" y1="188" x2="120" y2="188" />
        <rect x="176" y="38" width="22" height="58" />
      </g>
      <g fill="currentColor">
        <rect x="36" y="76" width="14" height="80" opacity="0.35" />
        <polygon points="176,38 198,38 198,60" opacity="0.6" />
        <rect x="36" y="32" width="14" height="14" />
        <circle cx="43" cy="180" r="4" />
        <rect x="70" y="30" width="70" height="14" opacity="0.85" />
      </g>
      <g fill="currentColor" fontFamily="Space Mono, monospace" fontSize="9" letterSpacing="1.5">
        <text x="180" y="202">LEX</text>
      </g>
    </svg>
  );
};

export default ProjectVisual;
