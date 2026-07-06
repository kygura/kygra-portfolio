import { formatDistanceToNow } from 'date-fns';

interface GuestbookEntryProps {
  name: string;
  message: string;
  created_at: string;
}

export const GuestbookEntry = ({ name, message, created_at }: GuestbookEntryProps) => {
  return (
    <div className="w-full p-4 rounded-lg bg-card/30 border border-muted/40 border-l-2 border-l-transparent hover:bg-card/50 hover:border-l-[var(--accent-amber)] hover:translate-x-1 transition-[background-color,border-color,transform] duration-300">
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-sm font-medium text-foreground/80">{name}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
          {formatDistanceToNow(new Date(created_at), { addSuffix: true })}
        </span>
      </div>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
        {message}
      </p>
    </div>
  );
};
