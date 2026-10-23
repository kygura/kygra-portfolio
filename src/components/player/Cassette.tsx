/**
 * The cassette in the deck's window: a label strip, two reels whose tape
 * packs trade size with progress, and the shell's notched foot. The hubs spin
 * from CSS while the deck is live (`.deck[data-live]`), so this only redraws
 * when the progress or the label changes.
 */

const HUB_TEETH = [0, 60, 120, 180, 240, 300];

function Reel({ fill }: { fill: number }) {
  // Tape pack radius: an empty hub is 15, a full reel 44 (viewBox units).
  const pack = 15 + 29 * Math.min(1, Math.max(0, fill));
  return (
    <svg className="reel" viewBox="-50 -50 100 100" aria-hidden="true">
      <circle className="reel__pack" r={pack} />
      <g className="reel__hub">
        <circle className="reel__ring" r={14} />
        {HUB_TEETH.map((a) => (
          <rect key={a} className="reel__tooth" x={-2.5} y={-14} width={5} height={5} transform={`rotate(${a})`} />
        ))}
        <circle className="reel__core" r={7.5} />
      </g>
    </svg>
  );
}

interface CassetteProps {
  title: string;
  meta: string;
  side: string;
  progress: number;
}

export default function Cassette({ title, meta, side, progress }: CassetteProps) {
  return (
    <div className="cassette">
      <span className="cassette__screw" data-at="tl" />
      <span className="cassette__screw" data-at="tr" />
      <span className="cassette__screw" data-at="bl" />
      <span className="cassette__screw" data-at="br" />
      <div className="cassette__label">
        <span className="cassette__side">{side}</span>
        <span className="cassette__text">
          <span className="cassette__title">{title}</span>
          <span className="cassette__meta">{meta}</span>
        </span>
      </div>
      <div className="cassette__window">
        <Reel fill={1 - progress} />
        <span className="cassette__glass" />
        <Reel fill={progress} />
      </div>
      <div className="cassette__foot">
        <i />
        <i />
      </div>
    </div>
  );
}
