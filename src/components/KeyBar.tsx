import { Fragment } from "react";
import { BINDINGS, type Binding } from "@/lib/keybindings";
import { useAccent } from "@/hooks/useKeyboardNav";

export function Keys({ binding }: { binding: Binding }) {
  return (
    <>
      {binding.keys.map((k, i) => (
        <Fragment key={k}>
          {i > 0 && binding.sep ? `${binding.sep} ` : null}
          <kbd>{k}</kbd>
        </Fragment>
      ))}
    </>
  );
}

/** Fixed legend on fine-pointer desktops; CSS hides it elsewhere. Decorative:
 *  the same table is reachable through the help overlay. */
const KeyBar = () => {
  const accent = useAccent();
  return (
    <div className="keybar" aria-hidden="true">
      {BINDINGS.filter((b) => b.bar).map((b) => (
        <span key={b.keys.join()}>
          <Keys binding={b} />
          {b.bar}
        </span>
      ))}
      <span className="keybar__accent">SHEET 01 · {accent}</span>
    </div>
  );
};

export default KeyBar;
