// `05 LOG` (DESIGN A3): `+ sign` first, entries `YYYY-MM-DD  name~  message~` (Enter expands
// inline), `+ more` last while older pages exist. `+ sign` / `:sign` open the inline INSERT form:
// `name:` (optional, default anon) and `msg:` with an `n/280` counter. Enter sends, Esc cancels.
// The form only collects text (no maxLength on msg: the counter counts code points and turns `off`
// past 280); sign() checks on send for UX and the database enforces the limits.
import { useEffect, useRef, type FocusEvent } from "react";
import { LOG_DEFAULT_NAME, LOG_MAX, LOG_NAME_MAX, charCount, type LogRow } from "../orrery/model";
import KeyChip from "./KeyChip";
import { rowProps, type ListProps } from "./rows";

export interface LogDraft {
  name: string;
  msg: string;
}

interface LogPaneProps extends ListProps<LogRow> {
  expanded: string | null;
  online: boolean;
  loading: boolean;
  /** INSERT mode: the form is open. */
  insert: boolean;
  draft: LogDraft;
  onDraft: (d: LogDraft) => void;
  onSend: () => void;
  onCancel: () => void;
}

function SignForm({ draft, onDraft, onSend, onCancel }: Pick<LogPaneProps, "draft" | "onDraft" | "onSend" | "onCancel">) {
  const form = useRef<HTMLFormElement>(null);
  const msg = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    msg.current?.focus();
  }, []);
  const n = charCount(draft.msg);
  // Clicking away from the form leaves INSERT (the window losing focus does not).
  const blur = (e: FocusEvent<HTMLFormElement>) => {
    const next = e.relatedTarget as Node | null;
    if (next && !form.current?.contains(next)) onCancel();
  };
  return (
    <form
      ref={form}
      id="logf"
      aria-label="sign the log"
      onBlur={blur}
      onSubmit={(e) => {
        e.preventDefault();
        onSend();
      }}
    >
      <label>
        <span className="dim">name:</span>
        <input
          name="name"
          autoComplete="nickname"
          spellCheck={false}
          maxLength={LOG_NAME_MAX}
          placeholder={LOG_DEFAULT_NAME}
          value={draft.name}
          onChange={(e) => onDraft({ ...draft, name: e.target.value })}
        />
      </label>
      <label>
        <span className="dim">msg:</span>
        <textarea
          ref={msg}
          name="msg"
          rows={3}
          aria-describedby="logn"
          value={draft.msg}
          onChange={(e) => onDraft({ ...draft, msg: e.target.value })}
        />
      </label>
      <p className="lfb">
        <span id="logn" className={n > LOG_MAX ? "off" : "dim"} aria-label={`${n} of ${LOG_MAX} characters`}>
          {n}/{LOG_MAX}
        </span>
        <span className="r">
          <button type="submit" className="chip" data-k="enter">
            [enter] send
          </button>
          <KeyChip label="esc" name="cancel" onClick={onCancel} />
        </span>
      </p>
    </form>
  );
}

export default function LogPane({ rows, sel, visible, api, expanded, online, loading, insert, ...form }: LogPaneProps) {
  return (
    <>
      <ul>
        {rows.map((r, i) => (
          <li key={r.key} hidden={!visible.has(i)}>
            {r.kind === "entry" ? (
              <button
                type="button"
                {...rowProps("log", i, sel, api, `rg${expanded === r.key ? " x" : ""}${r.pending ? " pend" : ""}`)}
                aria-expanded={expanded === r.key}
              >
                <span className="c" aria-hidden="true">
                  &gt;
                </span>
                <span className="m">{r.date}</span>
                <span className="m">{expanded === r.key ? r.fullName : r.name}</span>
                <span className="nm">{expanded === r.key ? r.fullMessage : r.message}</span>
              </button>
            ) : (
              <button type="button" {...rowProps("log", i, sel, api, "rw")} aria-expanded={r.kind === "sign" ? insert : undefined}>
                <span className="c" aria-hidden="true">
                  &gt;
                </span>
                <span className="nm">{r.text}</span>
              </button>
            )}
            {r.kind === "sign" && insert && <SignForm {...form} />}
          </li>
        ))}
      </ul>
      {!online && <p className="upd">-- log offline --</p>}
      {online && loading && <p className="upd">-- reading log --</p>}
      {online && !loading && rows.length === 1 && <p className="upd">-- no entries yet --</p>}
    </>
  );
}
