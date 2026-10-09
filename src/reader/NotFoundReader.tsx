// 404 (A4): `E404: <path> not found` in `--glitch` plus `> back to index`. The shell runs the
// 6-frame tear and the StatusBar `ERR`; nothing is logged to the console.
import { Link } from "react-router-dom";

export default function NotFoundReader({ path }: { path: string }) {
  return (
    <article>
      <h2 className="rt e404">E404: {path} not found</h2>
      <p className="lk">
        <Link to="/">back to index</Link>
      </p>
    </article>
  );
}
