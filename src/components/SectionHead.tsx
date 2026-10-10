import { Link } from "react-router-dom";

interface SectionHeadProps {
  n: string;
  title: string;
  right?: string;
  to?: string;
}

/** "§01  Projects — selected ............ 06 entries" */
export default function SectionHead({ n, title, right, to }: SectionHeadProps) {
  return (
    <div className="shead mono">
      <div>
        <span className="shead__n">§{n}</span>
        {title}
      </div>
      {right && (to ? (
        <Link to={to} className="shead__r u">{right}</Link>
      ) : (
        <span className="shead__r">{right}</span>
      ))}
    </div>
  );
}
