// Four palette swatches (A1): `full` sits in the desktop StatusBar (name + [n] chip),
// `short` in the mobile KeyBar (`1 sod`). Keys 1-4 and `:theme` do the same thing.
import { PALETTES, type Palette } from "../orrery/palette";
import KeyChip from "./KeyChip";

interface PaletteSwitcherProps {
  current: Palette;
  onPick: (p: Palette) => void;
  variant: "full" | "short";
}

export default function PaletteSwitcher({ current, onPick, variant }: PaletteSwitcherProps) {
  const swatches = PALETTES.map((p, i) => (
    <button
      key={p}
      type="button"
      className="sw"
      data-p={p}
      data-k={String(i + 1)}
      aria-pressed={p === current}
      aria-label={`palette ${p}`}
      onClick={() => onPick(p)}
    >
      <b />
      {variant === "full" ? (
        <>
          <span>{p}</span>
          <KeyChip label={String(i + 1)} />
        </>
      ) : (
        `${i + 1} ${p.slice(0, 3)}`
      )}
    </button>
  ));
  if (variant === "short") return <>{swatches}</>;
  return (
    <span id="sws" role="group" aria-label="palette">
      {swatches}
    </span>
  );
}
