type AlertType = "NOTE" | "TIP" | "IMPORTANT" | "WARNING" | "CAUTION";

interface AlertProps {
  type: AlertType;
  title?: string;
  children: React.ReactNode;
}

const Alert = ({ type, title, children }: AlertProps) => (
  <aside className="callout" role="note">
    <div className="callout__head mono">
      <i aria-hidden="true" />
      <span>{title || type}</span>
    </div>
    <div className="callout__body">{children}</div>
  </aside>
);

export default Alert;
