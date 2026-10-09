import { useLocation, useParams } from "react-router-dom";

export type Section = "projects" | "notes" | "links" | "now" | "log";
export type ReaderKind = "post" | "dossier" | "cv" | "about" | "404";

export interface ConsoleRoute {
  /** null keeps the current section (only `/about`). */
  section: Section | null;
  reader: ReaderKind | null;
}

/** T1 stub: prints the parsed route. T4 replaces it with the persistent shell. */
export default function Console({ route }: { route: ConsoleRoute }) {
  const { pathname } = useLocation();
  const { slug } = useParams();

  return (
    <main style={{ padding: 16 }}>
      <pre>
        {[
          `path    ${pathname}`,
          `section ${route.section ?? "(keep)"}`,
          `reader  ${route.reader ?? "-"}`,
          `slug    ${slug ?? "-"}`,
        ].join("\n")}
      </pre>
    </main>
  );
}
