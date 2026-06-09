interface Geo1Props { className?: string }
export const Geo1 = ({ className }: Geo1Props) => {
  return (
    <svg viewBox="0 0 200 280" fill="none" className={className} aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.5">
        <rect x="15" y="15" width="85" height="60" className="df" />
        <rect x="32" y="32" width="85" height="60" className="df" />
        <rect x="49" y="49" width="85" height="60" fill="currentColor" />
        <polygon points="100,135 18,255 182,255" strokeWidth="1.5" className="d2" />
        <polygon points="100,150 42,240 158,240" strokeDasharray="4 3" className="d2" />
        <line x1="100" y1="135" x2="100" y2="255" />
        <circle cx="55" cy="78" r="8" fill="currentColor" />
        <circle cx="100" cy="195" r="13" className="df" />
        <circle cx="100" cy="195" r="5" fill="currentColor" />
      </g>
    </svg>
  );
};
