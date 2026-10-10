/**
 * Additive keyboard layer: g-chords for the nav routes, `g g` to the top,
 * `1`–`4` for the accent, `?` for the help sheet. Pages add their own keys
 * (the hero listens for `[` `]`). Nothing fires while typing in a field or
 * with a modifier held, so the terminal's Ctrl+K and the backtick stay put.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { setAccent } from "./accent";
import { CHORDS, isTyping } from "./keymap";

const K = ({ k }: { k: string }) => <kbd>{k}</kbd>;

function HelpOverlay({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "?") {
        e.preventDefault();
        e.stopImmediatePropagation();
        onClose();
      } else if (e.key === "Tab") {
        // the close button is the only control: keep focus inside the dialog
        e.preventDefault();
        closeRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="help-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="help" role="dialog" aria-modal="true" aria-labelledby="help-h">
        <div className="help-top">
          <h2 id="help-h">Keys</h2>
          <button ref={closeRef} className="help-close" type="button" onClick={onClose}>
            <kbd>Esc</kbd> Close
          </button>
        </div>
        <div className="help-cols">
          <div>
            <h3>Go to</h3>
            <dl>
              {Object.entries(CHORDS).map(([k, v]) => (
                <div key={k}>
                  <dt><K k="g" /> <K k={k} /></dt>
                  <dd>{v.label}</dd>
                </div>
              ))}
              <div>
                <dt><K k="g" /> <K k="g" /></dt>
                <dd>Top of page</dd>
              </div>
            </dl>
          </div>
          <div>
            <h3>View</h3>
            <dl>
              <div><dt><K k="1" />–<K k="4" /></dt><dd>Accent</dd></div>
              <div><dt><K k="[" /> <K k="]" /></dt><dd>Previous / next hero scene (home)</dd></div>
              <div><dt><K k="A" /> <K k="D" /></dt><dd>Previous / next quote</dd></div>
              <div><dt><K k="`" /></dt><dd>Terminal</dd></div>
              <div><dt><K k="?" /></dt><dd>This sheet</dd></div>
              <div><dt><K k="Esc" /></dt><dd>Close, leave a field</dd></div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Keys() {
  const navigate = useNavigate();
  const [help, setHelp] = useState(false);
  const chord = useRef(false);
  const timer = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      if (isTyping(e.target)) {
        if (e.key === "Escape") (e.target as HTMLElement).blur();
        return;
      }
      if (chord.current) {
        chord.current = false;
        window.clearTimeout(timer.current);
        if (e.key === "g") {
          e.preventDefault();
          window.scrollTo({ top: 0 });
          return;
        }
        const target = CHORDS[e.key];
        if (target) {
          // Claim the key so other single-key listeners (the footer's
          // quote keys) don't also act on the second half of the chord.
          e.preventDefault();
          navigate(target.to);
        }
        return;
      }
      switch (e.key) {
        case "g":
          chord.current = true;
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => (chord.current = false), 1400);
          return;
        case "?":
          e.preventDefault();
          setHelp(true);
          return;
        case "1":
        case "2":
        case "3":
        case "4":
          setAccent(Number(e.key) - 1);
          return;
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(timer.current);
    };
  }, [navigate]);

  return help ? <HelpOverlay onClose={() => setHelp(false)} /> : null;
}
