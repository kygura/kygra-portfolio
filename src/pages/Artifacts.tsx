import { Link } from "react-router-dom";
import SectionHead from "@/components/SectionHead";

const Artifacts = () => {
  return (
    <>
      <div className="ptitle">
        <p className="mono mute" style={{ marginTop: 0 }}>§03 — Artifacts</p>
        <h1 className="disp">Objects</h1>
        <p>Digital objects and experiments. Things kept rather than shipped.</p>
      </div>

      <SectionHead n="03" title="Gallery" right="00 entries" />
      <div className="empty">
        <p className="mono mute">Nothing on the shelf yet</p>
        <h2 className="disp">Empty</h2>
        <p className="mono" style={{ marginTop: 20 }}>
          <Link to="/projects" className="u">Meanwhile, the software index →</Link>
        </p>
      </div>
    </>
  );
};

export default Artifacts;
