import { useEffect, useRef, useState } from "react";
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
 * live (only once scrolled near, never interactive); the rest show their
 * og:image or GitHub's card, and a drawn tile when there is no image at all
 * (private repos have no card). The card also sits under every frame until
 * it finishes loading.
 */
const RepoPreview = ({ repo }: RepoPreviewProps) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [near, setNear] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
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

  return (
    <div className="repo-window">
      <div className="repo-window__bar" aria-hidden="true">
        <span className="repo-window__dots">
          <i />
          <i />
          <i />
        </span>
        <span className="repo-window__address">
          {displayHost(repo.liveUrl)}
        </span>
        {frame && <span className="repo-window__live" data-on={loaded}>live</span>}
      </div>

      <div ref={viewportRef} className="repo-window__viewport">
        {showTile ? (
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
        )}
        {frame && near && scale > 0 && (
          <iframe
            src={frame}
            title={`${repo.name} live preview`}
            loading="lazy"
            tabIndex={-1}
            aria-hidden="true"
            sandbox="allow-scripts allow-same-origin"
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
      </div>
    </div>
  );
};

export default RepoPreview;
