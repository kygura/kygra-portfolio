import { useState } from "react";

type PostImageProps = React.ImgHTMLAttributes<HTMLImageElement>;

const PostImage = ({ src, alt, title, ...props }: PostImageProps) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <figure className="fig">
      <div className="fig__img" style={loaded ? undefined : { minHeight: 200 }}>
        <img src={src} alt={alt} loading="lazy" onLoad={() => setLoaded(true)} {...props} />
      </div>
      {(title || alt) && <figcaption className="mono">{title || alt}</figcaption>}
    </figure>
  );
};

export default PostImage;
