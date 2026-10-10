// `02 NOTES` rows: date, title, read time. Real links to the Reader route.
import type { NoteRow } from "../orrery/model";
import { rowProps, type ListProps } from "./rows";

export default function NoteList({ rows, sel, visible, api }: ListProps<NoteRow>) {
  return (
    <ul>
      {rows.map((r, i) => (
        <li key={r.key} hidden={!visible.has(i)}>
          <a href={r.path} {...rowProps("notes", i, sel, api, "rn")} aria-label={`${r.title}, ${r.date}, ${r.read}`}>
            <span className="c" aria-hidden="true">
              &gt;
            </span>
            <span className="m">{r.date}</span>
            <span className="nm">{r.label}</span>
            <span className="m">{r.read}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
