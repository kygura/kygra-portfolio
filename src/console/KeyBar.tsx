// Mobile-only sticky bottom bar (DESIGN §3): 44px tap targets for cmd, motion, keys and the palettes.
import type { Palette } from "../orrery/palette";
import PaletteSwitcher from "./PaletteSwitcher";

interface KeyBarProps {
  palette: Palette;
  onCmd: () => void;
  onMotion: () => void;
  onHelp: () => void;
  onPalette: (p: Palette) => void;
}

export default function KeyBar({ palette, onCmd, onMotion, onHelp, onPalette }: KeyBarProps) {
  return (
    <nav id="keybar" aria-label="keys">
      <button type="button" data-k=":" onClick={onCmd}>
        <span aria-hidden="true">[:]</span>cmd
      </button>
      <button type="button" data-k="m" onClick={onMotion}>
        <span aria-hidden="true">[m]</span>motion
      </button>
      <button type="button" data-k="?" onClick={onHelp}>
        <span aria-hidden="true">[?]</span>keys
      </button>
      <PaletteSwitcher current={palette} onPick={onPalette} variant="short" />
    </nav>
  );
}
