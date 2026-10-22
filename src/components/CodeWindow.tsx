import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { formatBytes, useTerminal, type CodeMap, type ShowcaseRepo, type TerminalStep } from "@/lib/showcase";
import { squarify, type Rect } from "@/lib/treemap";

/** Group headers get this much of a plot when it is tall enough to spare it. */
const HEADER_PX = 16;
/** Below this a plot shows no label; its title still names it on hover. */
const LABEL_MIN = { w: 44, h: 16 };
/** Languages past the third share the plain sheet. */
const TONES = 3;

type Cell = Rect & {
  key: string;
  label: string;
  title: string;
  tone: number;
  group: boolean;
  delay: number;
};

const describe = (path: string, files: number, bytes: number) =>
  `${path} · ${files} ${files === 1 ? "file" : "files"} · ${formatBytes(bytes)}`;

/**
 * Lays the map out in pixels: top-level plots squarified over the whole area,
 * then each directory's children squarified inside it, under a header strip.
 */
function layout(map: CodeMap, size: { w: number; h: number }): Cell[] {
  const rank = new Map(map.languages.map((lang, i) => [lang.name, i]));
  const tone = (lang: string | null) => Math.min(lang === null ? TONES : (rank.get(lang) ?? TONES), TONES);
  const cells: Cell[] = [];
  const groups = squarify(
    map.nodes.map((node) => node.bytes),
    { x: 0, y: 0, ...size },
  );

  map.nodes.forEach((node, i) => {
    const rect = groups[i];
    const path = `${map.base}${node.name}`;
    const delay = i * 40;
    if (!node.children?.length) {
      cells.push({ ...rect, key: node.name, label: node.name, title: describe(path, node.files, node.bytes), tone: tone(node.lang), group: false, delay });
      return;
    }
    const header = rect.h > HEADER_PX * 2.5 ? HEADER_PX : 0;
    cells.push({ ...rect, key: node.name, label: node.name, title: describe(path, node.files, node.bytes), tone: tone(node.lang), group: true, delay });
    const inner = squarify(
      node.children.map((child) => child.bytes),
      { x: rect.x, y: rect.y + header, w: rect.w, h: rect.h - header },
    );
    node.children.forEach((child, j) => {
      cells.push({
        ...inner[j],
        key: `${node.name}${child.name}`,
        label: child.name,
        title: describe(`${path}${child.name}`, child.files, child.bytes),
        tone: tone(child.lang),
        group: false,
        delay: delay + 60 + j * 25,
      });
    });
  });
  return cells;
}

/** The source tree as a survey plat: one plot per directory or file, sized by bytes. */
const CodeMapView = ({ map }: { map: CodeMap }) => {
  const plotRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const cells = useMemo(() => (size.w && size.h ? layout(map, size) : []), [map, size]);
  const key = map.languages.slice(0, 4).map((lang, i) => ({
    ...lang,
    tone: Math.min(i, TONES),
    share: Math.max(1, Math.round((lang.bytes / map.bytes) * 100)),
  }));

  return (
    <div className="code-map">
      <div ref={plotRef} className="code-map__plot" role="img" aria-label={`Source map: ${map.files} files${map.base ? ` under ${map.base}` : ""}`}>
        {cells.map((cell) => {
          const labelled = cell.w >= LABEL_MIN.w && (cell.group ? cell.h > HEADER_PX * 2.5 : cell.h >= LABEL_MIN.h);
          return (
            <div
              key={cell.key}
              className={cell.group ? "code-map__group" : "code-map__cell"}
              data-tone={cell.tone}
              title={cell.title}
              style={{
                left: cell.x,
                top: cell.y,
                width: cell.w,
                height: cell.h,
                animationDelay: `${cell.delay}ms`,
              }}
            >
              {labelled && <span>{cell.label}</span>}
            </div>
          );
        })}
      </div>
      <div className="code-map__key">
        {key.map((lang) => (
          <span key={lang.name}>
            <i data-tone={lang.tone} aria-hidden="true" />
            {lang.name} {lang.share}%
          </span>
        ))}
        <span className="code-map__count">
          {map.base && `${map.base} · `}
          {map.files} files{map.truncated && "+"}
        </span>
      </div>
    </div>
  );
};

type Cursor = { step: number; typed: number; lines: number };

const NO_STEPS: TerminalStep[] = [];

/** The next frame of the replay and how long to hold the current one, or null at the end. */
function advance(steps: TerminalStep[], at: Cursor): [Cursor, number] | null {
  const step = steps[at.step];
  if (at.typed < step.command.length) return [{ ...at, typed: Math.min(step.command.length, at.typed + 2) }, 38];
  if (at.lines < step.output.length) return [{ ...at, lines: at.lines + 1 }, at.lines === 0 ? 320 : 55];
  if (at.step < steps.length - 1) return [{ step: at.step + 1, typed: 0, lines: 0 }, 900];
  return null;
}

const finished = (steps: TerminalStep[]): Cursor => {
  const last = steps.length - 1;
  return { step: last, typed: steps[last].command.length, lines: steps[last].output.length };
};

/** Replays a generated session: commands type out, output prints a line at a time. */
const TerminalView = ({ repo }: { repo: ShowcaseRepo }) => {
  const { data, error, isPending } = useTerminal(repo.name, repo.pushedAt, true);
  const still = Boolean(useReducedMotion());
  const steps = data?.steps ?? NO_STEPS;
  const [cursor, setCursor] = useState<Cursor>({ step: 0, typed: 0, lines: 0 });
  const [run, setRun] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const done = steps.length > 0 && advance(steps, cursor) === null;

  useEffect(() => {
    if (!steps.length) return;
    if (still) {
      setCursor(finished(steps));
      return;
    }
    setCursor({ step: 0, typed: 0, lines: 0 });
  }, [steps, still, run]);

  useEffect(() => {
    if (!steps.length || still) return;
    const next = advance(steps, cursor);
    if (!next) return;
    const timer = window.setTimeout(() => setCursor(next[0]), next[1]);
    return () => window.clearTimeout(timer);
  }, [steps, cursor, still]);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [cursor]);

  let body: ReactNode;
  if (isPending) {
    body = (
      <p className="code-term__status">
        reading the source<span className="code-term__caret" aria-hidden="true" />
      </p>
    );
  } else if (error) {
    body = <p className="code-term__status">No session right now ({error.message}).</p>;
  } else if (!steps.length) {
    body = <p className="code-term__status">Nothing here runs on its own. The map tells this one better.</p>;
  } else {
    body = (
      <>
        <p className="code-term__note"># illustrative session, scripted from the source</p>
        {steps.slice(0, cursor.step + 1).map((step, i) => {
          const current = i === cursor.step;
          const typed = current ? step.command.slice(0, cursor.typed) : step.command;
          const lines = current ? step.output.slice(0, cursor.lines) : step.output;
          return (
            <div key={i} className="code-term__step">
              <p>
                <span className="code-term__prompt">{step.prompt}</span> {typed}
                {current && !done && cursor.typed < step.command.length && (
                  <span className="code-term__caret" aria-hidden="true" />
                )}
              </p>
              {lines.map((line, j) => (
                <p key={j} className="code-term__out">
                  {line || " "}
                </p>
              ))}
            </div>
          );
        })}
        {done && (
          <p>
            <span className="code-term__prompt">{steps[steps.length - 1].prompt}</span>{" "}
            <span className="code-term__caret" aria-hidden="true" />
          </p>
        )}
      </>
    );
  }

  return (
    <div className="code-term">
      <div ref={bodyRef} className="code-term__body" aria-live="polite" aria-busy={isPending}>
        {body}
      </div>
      {done && !still && (
        <button type="button" className="code-term__replay" onClick={() => setRun((n) => n + 1)}>
          Replay
        </button>
      )}
    </div>
  );
};

type Tab = "map" | "run";

/**
 * The window for a repo with no site to frame: its source as a map, and,
 * when the endpoint is configured, a terminal tab that asks for a generated
 * session the first time it opens.
 */
const CodeWindow = ({ repo, map, terminal }: { repo: ShowcaseRepo; map: CodeMap; terminal: boolean }) => {
  const [tab, setTab] = useState<Tab>("map");
  const tabs: Tab[] = terminal ? ["map", "run"] : ["map"];

  return (
    <div className="repo-window repo-window--code">
      <div className="repo-window__bar">
        <span className="repo-window__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="repo-window__address">~/{repo.name}</span>
        {tabs.length > 1 && (
          <span className="repo-window__tabs" role="tablist" aria-label={`${repo.name} views`}>
            {tabs.map((name) => (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={tab === name}
                className="repo-window__tab"
                onClick={() => setTab(name)}
              >
                {name}
              </button>
            ))}
          </span>
        )}
        <a
          href={repo.url}
          target="_blank"
          rel="noopener noreferrer"
          className="repo-window__open"
          aria-label={`Open ${repo.name}'s source in a new tab`}
        >
          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
        </a>
      </div>

      <div className="repo-window__viewport" role="tabpanel">
        {tab === "map" ? <CodeMapView map={map} /> : <TerminalView repo={repo} />}
      </div>
    </div>
  );
};

export default CodeWindow;
