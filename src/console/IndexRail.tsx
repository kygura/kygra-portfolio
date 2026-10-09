// Section list with numbers and `[g?]` chord chips; the current section is inverse (DESIGN §9).
import { SECTIONS, SECTION_META, type Section } from "../orrery/routes";
import KeyChip from "./KeyChip";

interface IndexRailProps {
  section: Section;
  hidden: boolean;
  flash: boolean;
  onSection: (s: Section) => void;
}

export default function IndexRail({ section, hidden, flash, onSection }: IndexRailProps) {
  return (
    <nav id="index" className={`pane${hidden ? " hid" : ""}${flash ? " flash" : ""}`} aria-label="index">
      <div className="ph">index</div>
      <ul>
        {SECTIONS.map((s) => {
          const m = SECTION_META[s];
          const on = s === section;
          return (
            <li key={s}>
              <button type="button" aria-current={on ? "true" : undefined} onClick={() => onSection(s)}>
                <span className="c" aria-hidden="true">
                  {on ? ">" : ""}
                </span>
                <span>
                  {m.num} {s}
                </span>
                <KeyChip label={`g${m.chord}`} />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
