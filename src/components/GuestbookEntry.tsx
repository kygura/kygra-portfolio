import { format } from 'date-fns';

interface GuestbookEntryProps {
  name: string;
  message: string;
  created_at: string;
}

export const GuestbookEntry = ({ name, message, created_at }: GuestbookEntryProps) => {
  return (
    <tr>
      <td className="ledger__fig">{format(new Date(created_at), 'yyyy-MM-dd')}</td>
      <td className="ledger__title">
        <b>{name}</b>
        <span>{message}</span>
      </td>
    </tr>
  );
};
