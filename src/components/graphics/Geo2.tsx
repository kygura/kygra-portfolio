interface Geo2Props { className?: string }
export const Geo2 = ({ className }: Geo2Props) => {
  return (
    <svg viewBox="0 0 240 240" fill="none" className={className} aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.5">
        <rect x="20" y="20" width="200" height="200" className="d2" />
        <rect x="45" y="45" width="150" height="150" transform="rotate(15 120 120)" className="d2" />
        <rect x="70" y="70" width="100" height="100" transform="rotate(30 120 120)" className="d" />
        <rect x="95" y="95" width="50" height="50" transform="rotate(45 120 120)" className="df" />
        <circle cx="120" cy="120" r="6" fill="currentColor" />
        <line x1="20" y1="20" x2="30" y2="20" /><line x1="20" y1="20" x2="20" y2="30" />
        <line x1="220" y1="20" x2="210" y2="20" /><line x1="220" y1="20" x2="220" y2="30" />
        <line x1="20" y1="220" x2="30" y2="220" /><line x1="20" y1="220" x2="20" y2="210" />
        <line x1="220" y1="220" x2="210" y2="220" /><line x1="220" y1="220" x2="220" y2="210" />
        <line x1="20" y1="20" x2="220" y2="220" strokeDasharray="6 4" strokeWidth="0.8" />
        <line x1="220" y1="20" x2="20" y2="220" strokeDasharray="6 4" strokeWidth="0.8" />
      </g>
    </svg>
  );
};
