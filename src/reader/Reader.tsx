// Reader pane dock (A4). T4 stub: title tab, chips and a short lede so every Reader route
// lands somewhere real; T5 replaces the body with the post, dossier, CV, About and 404 readers.
import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { cv, manifesto } from "../content/site";
import KeyChip from "../console/KeyChip";
import type { NoteRow, ProjectRow } from "../orrery/model";
import type { Reader as ReaderState } from "../orrery/state";

interface ReaderProps {
  reader: ReaderState;
  path: string;
  project: ProjectRow | null;
  note: NoteRow | null;
  onClose: () => void;
  onExternal: () => void;
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

const Reader = forwardRef<HTMLElement, ReaderProps>(function Reader({ reader, path, project, note, onClose, onExternal }, ref) {
  const missing = reader.kind === "404" || (reader.kind === "dossier" && !project) || (reader.kind === "post" && !note);
  const external = reader.kind === "dossier" && project?.primary;
  let body;
  if (missing && reader.kind !== "post") {
    body = (
      <>
        <p className="e404">E404: {path} not found</p>
        <p>
          <Link to="/">&gt; back to index</Link>
        </p>
      </>
    );
  } else if (reader.kind === "post") {
    body = note ? (
      <>
        <h1>{note.title}</h1>
        <p className="dim">
          {note.date} / {note.read}
        </p>
        {note.excerpt && <p>{note.excerpt}</p>}
      </>
    ) : (
      <p className="dim">loading {reader.slug}</p>
    );
  } else if (reader.kind === "dossier" && project) {
    body = (
      <>
        <h1>{project.title}</h1>
        <p className="dim">{project.type}</p>
        <p>{project.summary}</p>
      </>
    );
  } else if (reader.kind === "cv") {
    body = (
      <>
        <h1>{cv.title}</h1>
        <p>{cv.summary}</p>
        <p>
          <a href={cv.pdf.href}>&gt; cv.pdf</a>
        </p>
      </>
    );
  } else {
    body = (
      <>
        <h1>{manifesto.title}</h1>
        {manifesto.paragraphs.map((t) => (
          <p key={t.slice(0, 24)}>{t}</p>
        ))}
      </>
    );
  }
  return (
    <section ref={ref} id="reader" className="pane" aria-label="reader">
      <div className="ph">
        <span>{title(reader, project)}</span>
        <span className="r">
          {external && <KeyChip label="O" name="open in a new tab" onClick={onExternal} />}
          <KeyChip label="esc" name="close reader" onClick={onClose} />
        </span>
      </div>
      <div className="rb">{body}</div>
    </section>
  );
});

export default Reader;
