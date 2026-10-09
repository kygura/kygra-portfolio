// `01 PROJECTS` rows: caret, name, year, lang (DESIGN §9, SPEC 5.3).
import type { ProjectRow } from "../orrery/model";
import { rowProps, type ListProps } from "./rows";

export default function ProjectList({ rows, sel, visible, api }: ListProps<ProjectRow>) {
  return (
    <ul>
      {rows.map((r, i) => (
        <li key={r.key} hidden={!visible.has(i)}>
          <button
            type="button"
            {...rowProps("projects", i, sel, api, "rp")}
            aria-label={`${r.title}, ${r.year}, ${r.lang}`}
            onPointerEnter={() => api.hover(i)}
            onPointerLeave={() => api.hover(-1)}
          >
            <span className="c" aria-hidden="true">
              &gt;
            </span>
            <span className="nm">{r.name}</span>
            <span className="m">{r.year}</span>
            <span className="m">{r.lang}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
