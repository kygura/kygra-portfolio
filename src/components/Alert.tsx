import { AlertCircle, AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertType = "NOTE" | "TIP" | "IMPORTANT" | "WARNING" | "CAUTION";

interface AlertProps {
  type: AlertType;
  title?: string;
  children: React.ReactNode;
}

const icons = {
  NOTE: Info,
  TIP: CheckCircle,
  IMPORTANT: AlertCircle,
  WARNING: AlertTriangle,
  CAUTION: XCircle,
};

// Ruled asides in the survey palette: the accent marks notes, the danger
// ink marks the two that warn.
const styles = {
  NOTE: "bg-[var(--bg-2)] border-[var(--rule-2)] border-l-[var(--accent)] text-[var(--ink)]",
  TIP: "bg-[var(--bg-2)] border-[var(--rule-2)] border-l-[var(--accent)] text-[var(--ink)]",
  IMPORTANT: "bg-[var(--bg-2)] border-[var(--rule-2)] border-l-[var(--accent)] text-[var(--ink)]",
  WARNING: "bg-[var(--bg-2)] border-[var(--rule-2)] border-l-[var(--danger)] text-[var(--ink)]",
  CAUTION: "bg-[var(--bg-2)] border-[var(--rule-2)] border-l-[var(--danger)] text-[var(--ink)]",
};

const titles = {
  NOTE: "Note",
  TIP: "Tip",
  IMPORTANT: "Important",
  WARNING: "Warning",
  CAUTION: "Caution",
};

const Alert = ({ type, title, children }: AlertProps) => {
  const Icon = icons[type];
  const style = styles[type];
  const defaultTitle = titles[type];

  return (
    <div className={cn("my-6 rounded-lg border p-4", style)}>
      <div className="flex items-center gap-2 mb-2 font-mono text-xs uppercase tracking-[0.08em] text-[var(--ink-2)]">
        <Icon className="w-5 h-5" />
        <span>{title || defaultTitle}</span>
      </div>
      <div className="text-sm opacity-90 [&>p]:mb-0">
        {children}
      </div>
    </div>
  );
};

export default Alert;
