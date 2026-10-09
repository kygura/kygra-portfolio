import { useState } from "react";

interface PostImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  caption?: string;
}

const PostImage = ({ src, alt, title, className, ...props }: PostImageProps) => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <figure className="my-12 group">
      <div className={[
        "relative overflow-hidden rounded-xl border border-border/50 bg-secondary/20",
        isLoading && "animate-pulse h-64 md:h-96", // Placeholder height
      ].filter(Boolean).join(" ")}>
        <img
          src={src}
          alt={alt}
          className={[
            "w-full h-auto object-cover transition-all duration-700",
            isLoading ? "scale-105 blur-lg opacity-0" : "scale-100 blur-0 opacity-100",
            "group-hover:scale-[1.02]",
            className,
          ].filter(Boolean).join(" ")}
          onLoad={() => setIsLoading(false)}
          {...props}
        />
      </div>
      {(title || alt) && (
        <figcaption className="text-center text-sm text-muted-foreground mt-3 italic">
          {title || alt}
        </figcaption>
      )}
    </figure>
  );
};

export default PostImage;
