// Project detail (DESIGN §8, A6). Floats next to the body on desktop (HudLayer docks it in 8px
// snaps); a pane in the stack on tablet and mobile.
import { forwardRef } from "react";
import { Link } from "react-router-dom";
import type { ProjectRow } from "../orrery/model";
import KeyChip from "./KeyChip";

interface InspectorProps {
  project: ProjectRow | null;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}

const Inspector = forwardRef<HTMLElement, InspectorProps>(function Inspector({ project: p, open, onOpen, onClose }, ref) {
  return (
    <aside ref={ref} id="insp" className="pane" data-inspector="" aria-label="inspector" hidden={!open || !p}>
      <div className="ph">
        <span>inspect</span>
        <span className="r">
          <KeyChip label="o" keys="o enter" name="open dossier" onClick={onOpen} />
          <KeyChip label="esc" name="close inspector" onClick={onClose} />
        </span>
      </div>
      {p && (
        <>
          <h2>{p.title}</h2>
          <div className="bd">
            <p>{p.summary}</p>
            <dl>
              <dt>year</dt>
              <dd>{p.year}</dd>
              <dt>stack</dt>
              <dd>{p.stack}</dd>
              <dt>type</dt>
              <dd>{p.type}</dd>
              <dt>status</dt>
              <dd>{p.status}</dd>
            </dl>
            <div className="lk">
              {p.src && (
                <a href={p.src} target="_blank" rel="noopener noreferrer">
                  src
                </a>
              )}
              {p.live && (
                <a href={p.live} target="_blank" rel="noopener noreferrer">
                  live
                </a>
              )}
              <Link to={p.dossier}>dossier</Link>
            </div>
          </div>
        </>
      )}
    </aside>
  );
});

export default Inspector;
