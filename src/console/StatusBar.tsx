// Top bar, tmux-style (DESIGN §9): handle, section tabs, palette, motion, res, fps, UTC clock, swatches.
import { useEffect, useRef, type RefObject } from "react";
import { paletteLabel, type Palette } from "../orrery/palette";
import { SECTIONS, SECTION_META, type Section } from "../orrery/routes";
import KeyChip from "./KeyChip";
import PaletteSwitcher from "./PaletteSwitcher";

interface StatusBarProps {
  section: Section;
  look: boolean;
  palette: Palette;
  motion: boolean;
  res: number | null;
  gl: "pending" | "on" | "none";
  err: boolean;
  hidden: boolean;
  fpsRef: RefObject<HTMLSpanElement>;
  onSection: (s: Section) => void;
  onLook: () => void;
  onPalette: (p: Palette) => void;
  onCmd: () => void;
  onHelp: () => void;
}

const utc = () => {
  const d = new Date();
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}Z`;
};

export default function StatusBar(p: StatusBarProps) {
  const clock = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const tick = () => {
      if (clock.current) clock.current.textContent = utc();
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const tab = (label: string, on: boolean, onClick: () => void, key: string) => (
    <button key={key} type="button" aria-current={on ? "true" : undefined} onClick={onClick}>
      {label}
      {on ? "*" : ""}
    </button>
  );

  return (
    <header id="status" className={p.hidden ? "bar hid" : "bar"}>
      <span className="h">kygra</span>
      <nav id="tabs" aria-label="sections">
        {tab("0:sky", p.look, p.onLook, "sky")}
        {SECTIONS.map((s) => tab(SECTION_META[s].tab, !p.look && s === p.section, () => p.onSection(s), s))}
      </nav>
      <span className="sep dim" aria-hidden="true">
        ||
      </span>
      <span className="r">
        <span id="pal">
          pal:<span className="full">{paletteLabel(p.palette)}</span>
          <span className="short">{paletteLabel(p.palette, true)}</span>
        </span>
        <span id="mot" className={p.motion ? undefined : "off"}>
          motion:{p.motion ? "on" : "off"}
        </span>
        {p.gl === "none" ? (
          <span id="gl" className="off">
            gl:none
          </span>
        ) : (
          <>
            <span id="res">res:{p.res ?? "--"}</span>
            <span id="fps" ref={p.fpsRef}>
              --fps
            </span>
          </>
        )}
        {p.err && (
          <span id="err" className="off">
            ERR
          </span>
        )}
        <span id="clk" ref={clock}>
          --:--Z
        </span>
        <PaletteSwitcher current={p.palette} onPick={p.onPalette} variant="full" />
        <span className="mob">
          <KeyChip label=":" name="command line" onClick={p.onCmd} />
          <KeyChip label="?" name="keymap" onClick={p.onHelp} />
        </span>
      </span>
    </header>
  );
}
