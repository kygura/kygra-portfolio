/**
 * The cassette, drawn flat: a hairline shell, the window lit in the accent
 * like the one lamp in a dark scene, and two reels whose tape packs trade
 * size with progress. The hubs spin from CSS while the deck is live
 * (`.deck[data-live]`), so this only redraws when the progress changes.
 */

function Reel({ cx, fill }: { cx: number; fill: number }) {
  // Tape pack radius: an empty hub is 9, a full reel 25 (viewBox units).
  const pack = 9 + 16 * Math.min(1, Math.max(0, fill));
  return (
    <g>
      <circle className="cassette__pack" cx={cx} cy={50} r={pack} />
      <g className="cassette__hub" style={{ transformOrigin: `${cx}px 50px` }}>
        <circle cx={cx} cy={50} r={7} />
        <path d={`M${cx} 43v14M${cx - 6.1} 46.5l12.2 7M${cx - 6.1} 53.5l12.2-7`} />
      </g>
    </g>
  );
}

export default function Cassette({ progress }: { progress: number }) {
  return (
    <svg className="cassette" viewBox="0 0 200 110" aria-hidden="true">
      <rect className="cassette__shell" x="0.5" y="0.5" width="199" height="109" />
      <clipPath id="deck-window">
        <rect x="40" y="30" width="120" height="40" />
      </clipPath>
      <rect className="cassette__window" x="40" y="30" width="120" height="40" />
      <g clipPath="url(#deck-window)">
        <Reel cx={64} fill={1 - progress} />
        <Reel cx={136} fill={progress} />
      </g>
      <path className="cassette__shell" d="M50 109.5 58 90h84l8 19.5" />
    </svg>
  );
}
