import { Fragment, useEffect, useRef } from "react";
import { BINDINGS } from "@/lib/keybindings";
import { Keys } from "./KeyBar";

interface HelpOverlayProps {
  open: boolean;
  onClose: () => void;
}

/** Keyboard map. Closes on any click, Esc or ? (both handled by the
 *  keyboard hook). Focus moves to the close button and returns on close. */
const HelpOverlay = ({ open, onClose }: HelpOverlayProps) => {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => previous?.focus?.();
  }, [open]);

  if (!open) return null;

  return (
    <div className="help" onClick={onClose}>
      <div
        className="help__box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        onClick={(e) => e.stopPropagation()}
        // The close button is the only focusable element: keep Tab on it.
        onKeyDown={(e) => {
          if (e.key === "Tab") e.preventDefault();
        }}
      >
        <div className="help__head">
          <h2 id="help-title">Keyboard map</h2>
          <button ref={closeRef} type="button" className="help__close" onClick={onClose}>
            <kbd>Esc</kbd>close
          </button>
        </div>
        <dl>
          {BINDINGS.map((b) => (
            <Fragment key={b.keys.join()}>
              <dt>
                <Keys binding={b} />
              </dt>
              <dd>{b.help}</dd>
            </Fragment>
          ))}
        </dl>
      </div>
    </div>
  );
};

export default HelpOverlay;
