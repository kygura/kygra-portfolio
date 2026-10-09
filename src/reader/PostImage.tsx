// Markdown image (DESIGN A4): 1px `--rule` border, no radius, normal (non-pixelated) scaling,
// caption from the title or alt text in `--dim`. Spans, not <figure>: markdown puts images inside <p>.
import type { ImgHTMLAttributes } from "react";

type PostImageProps = ImgHTMLAttributes<HTMLImageElement> & { node?: unknown };

const PostImage = ({ src, alt, title, node, ...props }: PostImageProps) => {
  const caption = title || alt;
  return (
    <span className="img">
      <img src={src} alt={alt ?? ""} title={title} loading="lazy" decoding="async" {...props} />
      {/* Alt-only captions repeat the alt text, so screen readers skip them. */}
      {caption && <span aria-hidden={caption === alt ? true : undefined}>{caption}</span>}
    </span>
  );
};

export default PostImage;
