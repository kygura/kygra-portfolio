import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { displayHost, type ShowcaseRepo } from "@/lib/showcase";

// The frame lays the site out at a desktop width, then scales it down to
// the card, so a phone shows the same composition as a monitor.
const FRAME_WIDTH = 1280;
const FRAME_HEIGHT = 800;

type RepoPreviewProps = {
  repo: ShowcaseRepo;
};

/**
 * A browser window onto the repo's deployment. Sites that allow framing load
 * live once scrolled near, inert until clicked: then the site takes hover,
 * scroll and clicks until the pointer leaves, Escape, or "Exit" (touch has
 * no leave). The rest show their og:image or GitHub's card, or a drawn tile
 * when there is no image at all (private repos have no card), and link out.
 * The card also sits under every frame until it finishes loading.
 */
const RepoPreview = ({ repo }: RepoPreviewProps) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [near, setNear] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [exploring, setExploring] = useState(false);
  const frame = repo.preview.kind === "frame" ? repo.preview.src : null;
  const image = repo.preview.kind === "image" ? repo.preview.src : repo.card;
  const showTile = imageFailed || !image;

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || !frame) return;

    const resize = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / FRAME_WIDTH));
    resize.observe(el);

    const visible = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          visible.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    visible.observe(el);

    return () => {
      resize.disconnect();
      visible.disconnect();
    };
  }, [frame]);

  useEffect(() => {
    if (!exploring) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setExploring(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exploring]);

  const backdrop = showTile ? (
    <div className="repo-window__fallback" aria-hidden="true">
      <span>{repo.name}</span>
    </div>
  ) : (
    <img
      src={image}
      alt=""
      loading="lazy"
      decoding="async"
      className="repo-window__image"
      data-hidden={Boolean(frame) && loaded}
      onError={() => setImageFailed(true)}
    />
  );

  return (
    <div className="repo-window" data-exploring={exploring} onMouseLeave={() => setExploring(false)}>
      <div className="repo-window__bar">
        <span className="repo-window__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="repo-window__address">{displayHost(repo.liveUrl)}</span>
        {frame && (
          <span className="repo-window__live" data-on={loaded} aria-hidden="true">
            {exploring ? "exploring" : "live"}
          </span>
        )}
        <a
          href={repo.liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="repo-window__open"
          aria-label={`Open ${repo.name} in a new tab`}
        >
          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
        </a>
      </div>

      <div ref={viewportRef} className="repo-window__viewport">
        {frame ? (
          <>
            {backdrop}
            {near && scale > 0 && (
              <iframe
                src={frame}
                title={`${repo.name} live preview`}
                loading="lazy"
                tabIndex={exploring ? 0 : -1}
                aria-hidden={!exploring}
                sandbox="allow-scripts allow-same-origin allow-forms"
                referrerPolicy="no-referrer"
                className="repo-window__frame"
                data-loaded={loaded}
                onLoad={() => setLoaded(true)}
                style={{
                  width: FRAME_WIDTH,
                  height: FRAME_HEIGHT,
                  transform: `scale(${scale})`,
                }}
              />
            )}
            {exploring ? (
              <button type="button" className="repo-window__exit" onClick={() => setExploring(false)}>
                Exit
              </button>
            ) : (
              <button
                type="button"
                className="repo-window__explore"
                onClick={() => setExploring(true)}
                aria-label={`Explore ${repo.name} here`}
              >
                <span>Click to explore</span>
              </button>
            )}
          </>
        ) : (
          <a
            href={repo.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="repo-window__link"
            aria-label={`Open ${repo.name} live`}
          >
            {backdrop}
          </a>
        )}
      </div>
    </div>
  );
};

export default RepoPreview;
