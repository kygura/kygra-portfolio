// `03 LINKS`: `label ........ handle  [y]`, dot leaders drawn as text (DESIGN §9, A6).
import type { LinkRow } from "../orrery/model";
import KeyChip from "./KeyChip";
import { rowProps, type ListProps } from "./rows";

export default function LinkTable({ rows, sel, visible, api }: ListProps<LinkRow>) {
  return (
    <ul>
      {rows.map((r, i) => (
        <li key={r.key} hidden={!visible.has(i)}>
          <a href={r.href} {...rowProps("links", i, sel, api, "rl")} aria-label={`${r.label}: ${r.handle}`}>
            <span className="c" aria-hidden="true">
              &gt;
            </span>
            <span className="nm">{r.leader}</span>
            <span>{r.handle}</span>
            <KeyChip label="y" />
          </a>
        </li>
      ))}
    </ul>
  );
}
