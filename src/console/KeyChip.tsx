// `[k]` key chip (DESIGN §7). `keys` is the space-separated `data-k` list the global key
// handler matches to flash the chip inverse for 4 frames. With `onClick` it is a real button.
import type { MouseEventHandler } from "react";

interface KeyChipProps {
  label: string;
  /** `data-k` keys; defaults to the label. */
  keys?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /** Accessible name for the button form. */
  name?: string;
}

export default function KeyChip({ label, keys, onClick, name }: KeyChipProps) {
  if (onClick) {
    return (
      <button type="button" className="chip" data-k={keys ?? label} aria-label={name} onClick={onClick}>
        [{label}]
      </button>
    );
  }
  return (
    <span className="chip" data-k={keys ?? label} aria-hidden="true">
      [{label}]
    </span>
  );
}
