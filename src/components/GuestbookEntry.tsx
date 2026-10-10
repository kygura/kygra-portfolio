import { formatDistanceToNow } from "date-fns";

interface GuestbookEntryProps {
  name: string;
  message: string;
  created_at: string;
}

export const GuestbookEntry = ({ name, message, created_at }: GuestbookEntryProps) => {
  return (
    <div className="gb__entry">
      <span className="mono">{name}</span>
      <span className="mono mute">{formatDistanceToNow(new Date(created_at), { addSuffix: true })}</span>
      <p>{message}</p>
    </div>
  );
};
