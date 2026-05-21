interface AxisProps { className?: string }
export const Axis = ({ className }: AxisProps) => {
  return (
    <svg viewBox="0 0 400 280" fill="none" className={className} aria-hidden="true">
      <g stroke="currentColor" strokeWidth="0.9">
        <circle cx="200" cy="140" r="110" strokeWidth="1.8" />
        <ellipse cx="200" cy="140" rx="110" ry="25" />
        <ellipse cx="200" cy="140" rx="110" ry="50" />
        <ellipse cx="200" cy="140" rx="110" ry="75" />
        <ellipse cx="200" cy="140" rx="25" ry="110" />
        <ellipse cx="200" cy="140" rx="50" ry="110" />
        <ellipse cx="200" cy="140" rx="75" ry="110" />
        <ellipse cx="200" cy="140" rx="40" ry="110" transform="rotate(45 200 140)" />
        <ellipse cx="200" cy="140" rx="75" ry="110" transform="rotate(45 200 140)" />
        <ellipse cx="200" cy="140" rx="40" ry="110" transform="rotate(-45 200 140)" />
        <ellipse cx="200" cy="140" rx="75" ry="110" transform="rotate(-45 200 140)" />
        <path d="M200 90 Q 230 140 200 190 Q 170 140 200 90 Z" fill="none" strokeWidth="1.2" transform="rotate(45 200 140)" />
        <circle cx="102" cy="108" r="7.5" fill="currentColor" />
        <rect x="30" y="40" width="45" height="45" strokeWidth="1.2" />
        <path d="M42 45 Q 45 53 53 56 Q 45 59 42 67 Q 39 59 31 56 Q 39 53 42 45" fill="none" strokeWidth="1.2" />
        <path d="M60 62 Q 63 68 69 70 Q 63 72 60 78 Q 57 72 51 70 Q 57 68 60 62" fill="none" strokeWidth="1.2" />
        <rect x="325" y="195" width="45" height="45" strokeWidth="1.2" />
        <circle cx="347.5" cy="217.5" r="4" strokeWidth="1.2" />
        <circle cx="347.5" cy="217.5" r="10" strokeWidth="1.2" />
        <circle cx="347.5" cy="217.5" r="16" strokeWidth="1.2" />
      </g>
      <line x1="145" y1="80" x2="245" y2="200" stroke="var(--accent-terracotta)" strokeWidth="1.5" strokeDasharray="6 5" />
      <circle cx="148" cy="83" r="5" fill="var(--accent-terracotta)" />
      <circle cx="242" cy="197" r="5" fill="var(--accent-terracotta)" />
    </svg>
  );
};
