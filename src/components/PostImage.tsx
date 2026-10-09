interface PostImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  caption?: string;
}

const PostImage = ({ src, alt, title, ...props }: PostImageProps) => (
  <figure>
    <img src={src} alt={alt} loading="lazy" {...props} />
    {(title || alt) && <figcaption>{title || alt}</figcaption>}
  </figure>
);

export default PostImage;
