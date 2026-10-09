
type AlertType = "NOTE" | "TIP" | "IMPORTANT" | "WARNING" | "CAUTION";

interface AlertProps {
  type: AlertType;
  title?: string;
  children: React.ReactNode;
}

const styles = {
  NOTE: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200",
  TIP: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200",
  IMPORTANT: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200",
  WARNING: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200",
  CAUTION: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200",
};

const titles = {
  NOTE: "Note",
  TIP: "Tip",
  IMPORTANT: "Important",
  WARNING: "Warning",
  CAUTION: "Caution",
};

const Alert = ({ type, title, children }: AlertProps) => {
  const style = styles[type];
  const defaultTitle = titles[type];

  return (
    <div className={`my-6 rounded-lg border p-4 ${style}`}>
      <div className="flex items-center gap-2 mb-2 font-semibold">
        <span>{title || defaultTitle}</span>
      </div>
      <div className="text-sm opacity-90 [&>p]:mb-0">
        {children}
      </div>
    </div>
  );
};

export default Alert;
