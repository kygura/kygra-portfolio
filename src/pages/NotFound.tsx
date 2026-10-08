import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="empty">
      <p className="mono mute">404 — off the map</p>
      <h1 className="disp">Not here</h1>
      <p className="mono" style={{ marginTop: 20, wordBreak: "break-all" }}>
        <span className="mute">{location.pathname}</span>
      </p>
      <p className="mono" style={{ marginTop: 20 }}>
        <Link to="/" className="u">← Back to the index</Link>
      </p>
    </div>
  );
};

export default NotFound;
