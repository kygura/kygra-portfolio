// `:` command palette (DESIGN §7, A7): a full-width bar above the Modeline, results growing
// upward, subsequence matches in --acc. Keys (Ctrl-n/p, arrows, Tab, Enter, Esc) go through
// the global handler; this component renders and forwards typing and clicks.
import { useEffect, useRef } from "react";
import { segments } from "../orrery/fuzzy";
import type { CommandResult } from "../orrery/commands";
import KeyChip from "./KeyChip";

interface CommandLineProps {
  open: boolean;
  query: string;
  index: number;
  results: CommandResult[];
  onQuery: (q: string) => void;
  onRun: (i: number) => void;
}

export default function CommandLine({ open, query, index, results, onQuery, onRun }: CommandLineProps) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  return (
    <div id="cmd" hidden={!open} role="dialog" aria-label="command line">
      <ul id="clist" role="listbox" aria-label="commands">
        {results.map((r, j) => (
          <li
            key={r.command.name}
            id={`cmd-${j}`}
            role="option"
            aria-selected={j === index}
            className={j === index ? "sel" : undefined}
            onClick={() => onRun(j)}
          >
            <span>
              {segments(r.command.name, r.match.ranges).map((s, k) => (s.hit ? <em key={k}>{s.text}</em> : s.text))}
            </span>
            <span className="dim">{r.command.desc}</span>
            <span>{r.command.key ? <KeyChip label={r.command.key} /> : null}</span>
          </li>
        ))}
      </ul>
      <div className="cin">
        <span aria-hidden="true">:</span>
        <input
          ref={input}
          id="cin"
          aria-label="command"
          aria-controls="clist"
          aria-activedescendant={results.length ? `cmd-${index}` : undefined}
          autoComplete="off"
          spellCheck={false}
          size={Math.max(1, query.length)}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
        <span className="cur" aria-hidden="true">
          █
        </span>
      </div>
    </div>
  );
}
