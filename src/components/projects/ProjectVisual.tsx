import type { Project } from "@/lib/projects";

interface ProjectVisualProps {
  palette: Project["palette"];
}

const ProjectVisual = ({ palette }: ProjectVisualProps) => {
  if (palette === "meridian") {
    return (
      <svg viewBox="0 0 220 220" fill="none" className="project-visual__svg">
        <g stroke="currentColor" strokeWidth="1.1">
          <circle cx="110" cy="110" r="78" />
          <ellipse cx="110" cy="110" rx="78" ry="22" />
          <ellipse cx="110" cy="110" rx="78" ry="46" />
          <ellipse cx="110" cy="110" rx="78" ry="64" strokeDasharray="4 4" />
          <ellipse cx="110" cy="110" rx="26" ry="78" />
          <ellipse cx="110" cy="110" rx="52" ry="78" />
          <ellipse cx="110" cy="110" rx="52" ry="78" transform="rotate(45 110 110)" />
          <path d="M110 32 Q168 110 110 188 Q52 110 110 32Z" />
          <circle cx="68" cy="74" r="5" fill="currentColor" stroke="none" />
          <circle cx="158" cy="132" r="4" fill="currentColor" stroke="none" />
          <rect x="26" y="26" width="36" height="36" />
          <line x1="44" y1="33" x2="44" y2="55" />
          <line x1="33" y1="44" x2="55" y2="44" />
        </g>
      </svg>
    );
  }

  if (palette === "zknull") {
    return (
      <div className="project-visual project-visual--zknull" aria-hidden="true">
        <span className="project-visual__chip">zk</span>
        <span className="project-visual__grid" />
        <span className="project-visual__grid project-visual__grid--offset" />
      </div>
    );
  }

  if (palette === "lexis") {
    return (
      <svg viewBox="0 0 220 220" fill="none" className="project-visual__svg">
        <g stroke="currentColor" strokeWidth="1.15">
          <rect x="30" y="34" width="160" height="152" />
          <rect x="48" y="52" width="124" height="116" />
          <line x1="64" y1="84" x2="156" y2="84" />
          <line x1="64" y1="102" x2="156" y2="102" />
          <line x1="64" y1="120" x2="144" y2="120" />
          <line x1="64" y1="138" x2="150" y2="138" />
          <line x1="64" y1="156" x2="128" y2="156" />
          <rect x="146" y="34" width="44" height="44" />
          <path d="M152 62 L166 48 L183 65" stroke="var(--project-accent-2)" strokeWidth="2" />
          <circle cx="72" cy="62" r="6" fill="currentColor" stroke="none" />
        </g>
      </svg>
    );
  }

  return (
    <div className="project-visual project-visual--equilibria" aria-hidden="true">
      <span className="project-visual__band">TRANCHE / BALANCE / FLOW</span>
      <span className="project-visual__bar project-visual__bar--a" />
      <span className="project-visual__bar project-visual__bar--b" />
      <span className="project-visual__bar project-visual__bar--c" />
    </div>
  );
};

export default ProjectVisual;
