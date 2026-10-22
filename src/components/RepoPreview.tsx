import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import CodeWindow from "@/components/CodeWindow";
import { displayHost, type ShowcaseRepo } from "@/lib/showcase";

type RepoPreviewProps = {
  repo: ShowcaseRepo;
  /** Code-only windows offer a generated terminal session. */
  terminal?: boolean;
};

/** A rendered screenshot of the deployment, for sites with no og:image of their own. */
const screenshotOf = (url: string) => `https://image.thum.io/get/width/1200/crop/750/noanimate/${url}`;

/**
 * A browser window onto the repo's deployment, linking out to it in a new
 * tab. The picture is the site's og:image when it has one, else a screenshot
 * of the page, then GitHub's card, then a drawn tile (private repos have no
 * card).
 */
const SiteWindow = ({ repo }: { repo: ShowcaseRepo }) => {
  // Only code-only repos lack a live URL, and those take the code window.
  const liveUrl = repo.liveUrl ?? repo.url;
  const ogImage = repo.preview.kind === "image" && repo.preview.src !== repo.card ? repo.preview.src : null;
  const sources = [ogImage ?? screenshotOf(liveUrl), repo.card].filter((src): src is string => Boolean(src));
  const [failed, setFailed] = useState(0);
  const image = sources[failed];
  const showTile = !image;

  return (
    <div className="repo-window">
      <div className="repo-window__bar">
        <span className="repo-window__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="repo-window__address">{displayHost(liveUrl)}</span>
        <a
          href={liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="repo-window__open"
          aria-label={`Open ${repo.name} in a new tab`}
        >
          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
        </a>
      </div>

      <div className="repo-window__viewport">
        <a
          href={liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="repo-window__link"
          aria-label={`Open ${repo.name} live`}
        >
          {showTile ? (
            <div className="repo-window__fallback" aria-hidden="true">
              <span>{repo.name}</span>
            </div>
          ) : (
            <img
              key={image}
              src={image}
              alt=""
              loading="lazy"
              decoding="async"
              className="repo-window__image"
              onError={() => setFailed((count) => count + 1)}
            />
          )}
        </a>
      </div>
    </div>
  );
};

/** A link to the deployment when there is one; otherwise the source, as a map and a terminal. */
const RepoPreview = ({ repo, terminal = false }: RepoPreviewProps) =>
  repo.preview.kind === "map" ? (
    <CodeWindow repo={repo} map={repo.preview.map} terminal={terminal} />
  ) : (
    <SiteWindow repo={repo} />
  );

export default RepoPreview;
