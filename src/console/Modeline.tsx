// Bottom bar (DESIGN §7): mode, position, `g-` leader hint, contextual chips and transient messages.
import { modelineChips } from "../orrery/keys";
import { position, type State } from "../orrery/state";
import KeyChip from "./KeyChip";

export default function Modeline({ state, hidden }: { state: State; hidden: boolean }) {
  const { index, total } = position(state);
  const q = state.filter[state.section];
  const r = state.reader;
  const pos =
    `${state.section} ${index}/${total}` +
    (q ? ` /${q}` : "") +
    (r ? ` | ${r.kind === "404" ? "E404" : r.kind}${r.slug ? " " + r.slug : ""}` : state.inspector ? " | inspect" : "");
  return (
    <footer id="modeline" className={hidden ? "bar hid" : "bar"}>
      <span id="mode">{state.mode}</span>
      <span id="pos">{pos}</span>
      <span id="pend">{state.pending ? "g-" : ""}</span>
      <span id="keys" aria-hidden="true">
        {modelineChips(state).map((c) => (
          <span key={c.label}>
            <KeyChip label={c.label} keys={c.keys} /> {c.text}
          </span>
        ))}
      </span>
      <span id="msg" className={state.msg?.err ? "err" : undefined} role="status" aria-live="polite">
        {state.msg?.text ?? ""}
      </span>
    </footer>
  );
}
