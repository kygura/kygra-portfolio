import { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock } from "lucide-react";
import { useMarkdownPosts } from "../hooks/useMarkdownPosts";

const Writings = () => {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  
  const posts = useMarkdownPosts();

  const allTags = Array.from(new Set(posts.flatMap((post) => post.tags)));

  const filteredPosts = selectedTag
    ? posts.filter((post) => post.tags.includes(selectedTag))
    : posts;

  return (
    <div className="px-6 md:px-12 lg:px-16 py-16 md:py-24 max-w-5xl animate-fade-in">
      <h1 className="text-5xl md:text-6xl font-display font-light mb-4">Writings</h1>
      <p className="text-lg text-muted-foreground mb-12">
        Thoughts on tech, engineering, the existential and esoteric knowledge.
      </p>

      <div className="flex flex-wrap gap-3 mb-12">
        <button
          onClick={() => setSelectedTag(null)}
          className={`px-4 py-2 text-sm rounded-sm transition-colors duration-300 ${selectedTag === null
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
        >
          All
        </button>
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`px-4 py-2 text-sm rounded-sm transition-colors duration-300 ${selectedTag === tag
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="space-y-12">
        {filteredPosts.map((post) => (
          <article
            key={post.slug}
            className="border-b border-border pb-12 last:border-0 hover:translate-x-1 transition-transform duration-300"
          >
            <Link to={`/writings/${post.slug}`} className="block group">
              <h2 className="text-3xl md:text-4xl font-display font-light mb-3 group-hover:text-muted-foreground transition-colors duration-300">
                {post.title}
              </h2>
              <p className="text-lg text-muted-foreground mb-4 leading-relaxed">
                {post.excerpt}
              </p>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                {post.date && (
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(post.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                )}
                {post.readTime && (
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {post.readTime} min read
                  </span>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 text-xs bg-secondary text-secondary-foreground rounded-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
};

export default Writings;
