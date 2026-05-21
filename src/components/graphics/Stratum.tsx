interface StratumProps { className?: string }
export const Stratum = ({ className }: StratumProps) => {
  return (
    <svg viewBox="0 0 500 420" fill="none" className={className} aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1">
        <circle cx="250" cy="210" r="150" strokeWidth="1.6" />
        <ellipse cx="250" cy="210" rx="150" ry="20" strokeWidth="0.8" />
        <ellipse cx="250" cy="210" rx="147" ry="55" strokeWidth="0.8" />
        <ellipse cx="250" cy="210" rx="139" ry="90" strokeWidth="0.8" />
        <ellipse cx="250" cy="210" rx="120" ry="120" strokeWidth="0.8" strokeDasharray="3 2" />
        <ellipse cx="250" cy="210" rx="139" ry="90" transform="rotate(180 250 210)" strokeWidth="0.6" />
        <ellipse cx="250" cy="210" rx="147" ry="55" transform="rotate(180 250 210)" strokeWidth="0.6" />
        <ellipse cx="250" cy="210" rx="30" ry="150" strokeWidth="0.8" />
        <ellipse cx="250" cy="210" rx="80" ry="150" strokeWidth="0.8" />
        <ellipse cx="250" cy="210" rx="120" ry="150" strokeWidth="0.8" />
        <ellipse cx="250" cy="210" rx="30" ry="150" transform="rotate(45 250 210)" strokeWidth="0.6" />
        <ellipse cx="250" cy="210" rx="80" ry="150" transform="rotate(45 250 210)" strokeWidth="0.6" />
        <ellipse cx="250" cy="210" rx="120" ry="150" transform="rotate(45 250 210)" strokeWidth="0.6" />
        <circle cx="250" cy="60" r="4" fill="currentColor" />
        <circle cx="250" cy="360" r="4" fill="currentColor" />
        <circle cx="100" cy="210" r="4" fill="currentColor" />
        <circle cx="400" cy="210" r="4" fill="currentColor" />
        <line x1="20" y1="20" x2="50" y2="20" strokeWidth="1.2" />
        <line x1="20" y1="20" x2="20" y2="50" strokeWidth="1.2" />
        <line x1="480" y1="400" x2="450" y2="400" strokeWidth="1.2" />
        <line x1="480" y1="400" x2="480" y2="370" strokeWidth="1.2" />
        <rect x="70" y="50" width="40" height="40" strokeWidth="1.2" />
        <line x1="90" y1="60" x2="90" y2="80" strokeWidth="1.2" />
        <line x1="80" y1="70" x2="100" y2="70" strokeWidth="1.2" />
        <circle cx="50" cy="100" r="10" fill="currentColor" />
        <rect x="390" y="320" width="40" height="40" strokeWidth="1.2" />
        <path d="M395 330 Q 400 325 405 330 T 415 330 T 425 330" strokeWidth="1.2" fill="none" />
        <path d="M395 340 Q 400 335 405 340 T 415 340 T 425 340" strokeWidth="1.2" fill="none" />
        <path d="M395 350 Q 400 345 405 350 T 415 350 T 425 350" strokeWidth="1.2" fill="none" />
      </g>
    </svg>
  );
};
