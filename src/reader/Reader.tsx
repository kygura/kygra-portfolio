// Reader pane (DESIGN A4): an opaque Pane with a title tab (`READ <slug>`, `DOSSIER <name>`, `CV`,
// `ABOUT`, `E404`), `[O]` where an external URL exists and `[esc]`. It scrolls internally on
// desktop/tablet; the shell drives `j`/`k`/`gg`/`G` through the `.rb` scroller.
import { forwardRef } from "react";
import KeyChip from "../console/KeyChip";
import { getProjectBySlug } from "../lib/projects";
import type { NoteRow, ProjectRow } from "../orrery/model";
import type { Reader as ReaderState } from "../orrery/state";
import AboutReader from "./AboutReader";
import CvReader from "./CvReader";
import DossierReader from "./DossierReader";
import { ReaderSay, type Say } from "./msg";
import NotFoundReader from "./NotFoundReader";
import PostReader from "./PostReader";

interface ReaderProps {
  reader: ReaderState;
  path: string;
  /** The dossier's project row (null when the slug is unknown). */
  project: ProjectRow | null;
  note: NoteRow | null;
  onClose: () => void;
  onExternal: () => void;
  /** The post or dossier does not exist: the shell swaps in the 404 Reader. */
  onMissing: () => void;
  say: Say;
}

function title(r: ReaderState, project: ProjectRow | null): string {
  switch (r.kind) {
    case "post":
      return `READ ${r.slug ?? ""}`;
    case "dossier":
      return project ? `DOSSIER ${project.title}` : "E404";
    case "cv":
      return "CV";
    case "about":
      return "ABOUT";
    default:
      return "E404";
  }
}

const Reader = forwardRef<HTMLElement, ReaderProps>(function Reader(
  { reader, path, project, note, onClose, onExternal, onMissing, say },
  ref,
) {
  const external = reader.kind === "dossier" && project?.primary;
  let body;
  if (reader.kind === "post" && reader.slug) {
    body = <PostReader key={reader.slug} slug={reader.slug} note={note} onMissing={onMissing} />;
  } else if (reader.kind === "dossier" && project) {
    body = <DossierReader row={project} project={getProjectBySlug(project.slug) ?? null} />;
  } else if (reader.kind === "cv") {
    body = <CvReader />;
  } else if (reader.kind === "about") {
    body = <AboutReader />;
  } else {
    body = <NotFoundReader path={path} />;
  }
  const tab = title(reader, project);
  return (
    <section ref={ref} id="reader" className="pane" aria-label={`reader: ${tab.toLowerCase()}`} tabIndex={-1}>
      <div className="ph">
        <span className="rtab">{tab}</span>
        <span className="r">
          {external && <KeyChip label="O" name="open in a new tab" onClick={onExternal} />}
          <KeyChip label="esc" name="close reader" onClick={onClose} />
        </span>
      </div>
      <div className="rb">
        <ReaderSay.Provider value={say}>{body}</ReaderSay.Provider>
      </div>
    </section>
  );
});

export default Reader;
