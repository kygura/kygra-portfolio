// Markdown callout (`> [!NOTE]` and friends, DESIGN A4): a ruled box with a Silkscreen 8px label,
// `--acc2` for NOTE / TIP / IMPORTANT and `--glitch` for WARNING / CAUTION.
import type { ReactNode } from "react";
import { calloutTone, type CalloutType } from "./prose";

interface AlertProps {
  type: CalloutType;
  children: ReactNode;
}

const Alert = ({ type, children }: AlertProps) => (
  <aside className={`co ${calloutTone(type)}`} aria-label={type.toLowerCase()}>
    <b className="fm">{type}</b>
    {children}
  </aside>
);

export default Alert;
