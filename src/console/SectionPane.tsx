// The swapping section pane (DESIGN §3/§8): title tab that decodes over 6 frames, count,
// inline `/` filter, `[/]` `[?]` chips, and the list for its section.
import { forwardRef, useEffect, useRef, useState, type ReactNode } from "react";
import { SECTION_META, sectionIndex, type Section } from "../orrery/routes";
import KeyChip from "./KeyChip";

const GLYPHS = "#%&*+=?@/\\|<>ABCDEFGHJKLMNPRSTUVXYZ0123456789";

interface SectionPaneProps {
  section: Section;
  active: boolean;
  /** Painted under the wipe while the new pane replaces it. */
  old: boolean;
  hidden: boolean;
  flash: boolean;
  /** Bumped when this pane becomes active through an animated switch: replays the title decode. */
  decode: number;
  count: number;
  query: string;
  filtering: boolean;
  empty: ReactNode;
  onQuery: (q: string) => void;
  onFilter: () => void;
  onHelp: () => void;
  children: ReactNode;
}

const SectionPane = forwardRef<HTMLElement, SectionPaneProps>(function SectionPane(p, ref) {
  const title = SECTION_META[p.section].title;
  const [shown, setShown] = useState(title);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!p.decode) return;
    let f = 0;
    const t = setInterval(() => {
      f++;
      setShown(
        [...title]
          .map((c, i) => (c === " " || i < (title.length * f) / 6 ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0]))
          .join(""),
      );
      if (f >= 6) clearInterval(t);
    }, 33);
    return () => {
      clearInterval(t);
      setShown(title);
    };
  }, [p.decode, title]);

  useEffect(() => {
    if (p.filtering && p.active) input.current?.focus();
  }, [p.filtering, p.active]);

  const showFilter = (p.filtering && p.active) || p.query !== "";
  const cls = `pane sec${p.active ? " on" : ""}${p.old ? " old" : ""}${p.hidden ? " hid" : ""}${p.flash ? " flash" : ""}`;

  return (
    <section ref={ref} id={`s${sectionIndex(p.section)}`} className={cls} data-s={p.section} aria-label={p.section}>
      <div className="ph">
        <h2 className="st" aria-label={title}>
          {shown}
        </h2>
        <span className="r">
          <span className="cnt">{p.count}</span>
          {showFilter && (
            <span className="flt">
              /
              <input
                ref={input}
                aria-label={`filter ${p.section}`}
                size={Math.max(1, p.query.length)}
                autoComplete="off"
                spellCheck={false}
                readOnly={!p.active}
                value={p.query}
                onChange={(e) => p.onQuery(e.target.value)}
              />
              {p.filtering && p.active && (
                <span className="cur" aria-hidden="true">
                  █
                </span>
              )}
            </span>
          )}
          <KeyChip label="/" name="filter" onClick={p.onFilter} />
          <KeyChip label="?" name="keymap" onClick={p.onHelp} />
        </span>
      </div>
      <div className="list">
        {p.children}
        {p.empty}
      </div>
    </section>
  );
});

export default SectionPane;
