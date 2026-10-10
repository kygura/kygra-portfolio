// `04 NOW`: status line, up to 3 items, `updated <date>`, then the fortune (A6).
import { now } from "../content/site";
import type { NowRow, Quote } from "../orrery/model";
import { rowProps, type ListProps } from "./rows";

export default function NowBlock({ rows, sel, visible, api, quote }: ListProps<NowRow> & { quote: Quote | null }) {
  return (
    <>
      <p className="nowst">{now.status}</p>
      <ul>
        {rows.map((r, i) => (
          <li key={r.key} hidden={!visible.has(i)}>
            <button type="button" {...rowProps("now", i, sel, api, "rw")}>
              <span className="c" aria-hidden="true">
                &gt;
              </span>
              <span className="nm">{r.item}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="upd">updated {now.updated}</p>
      {quote && (
        <figure className="fortune">
          <b>FORTUNE</b>
          <blockquote>{quote.text}</blockquote>
          {quote.translation && <p className="tl">{quote.translation}</p>}
        </figure>
      )}
    </>
  );
}
