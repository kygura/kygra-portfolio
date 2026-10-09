type AlertType = "NOTE" | "TIP" | "IMPORTANT" | "WARNING" | "CAUTION";

interface AlertProps {
  type: AlertType;
  title?: string;
  children: React.ReactNode;
}

// Rule and label colour per callout, from the Sheet tokens.
const colors: Record<AlertType, string> = {
  NOTE: "var(--draft-ink)",
  TIP: "var(--accent-sage)",
  IMPORTANT: "var(--accent)",
  WARNING: "var(--accent)",
  CAUTION: "var(--accent-terracotta)",
};

const titles: Record<AlertType, string> = {
  NOTE: "Note",
  TIP: "Tip",
  IMPORTANT: "Important",
  WARNING: "Warning",
  CAUTION: "Caution",
};

const Alert = ({ type, title, children }: AlertProps) => (
  <div className="callout" style={{ "--callout": colors[type] } as React.CSSProperties}>
    <span className="callout__label">{title || titles[type]}</span>
    <div>{children}</div>
  </div>
);

export default Alert;
