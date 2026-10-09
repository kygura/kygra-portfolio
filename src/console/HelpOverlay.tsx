// Full keymap (DESIGN §9), generated from the production keymap in orrery/keys.
import { useEffect, useRef } from "react";
import { KEYMAP } from "../orrery/keys";

export default function HelpOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) close.current?.focus();
  }, [open]);

  return (
    <section id="help" className="pane" hidden={!open} role="dialog" aria-label="keymap">
      <div className="ph">
        <h2 className="st">KEYS</h2>
        <span className="r">
          <button ref={close} type="button" className="chip" data-k="? esc" aria-label="close keymap" onClick={onClose}>
            [?]
          </button>
        </span>
      </div>
      <div className="tb">
        <table>
          <tbody>
            {KEYMAP.map(([k, a]) => (
              <tr key={k}>
                <td>{k}</td>
                <td>{a}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
