import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMarkdownPost } from "../hooks/useMarkdownPosts";

const WritingPost = () => {
  const { slug } = useParams();
  const post = useMarkdownPost(slug);

  // Handle post not found
  if (!post) {
    return <Navigate
      to="/writings"
      replace />;
  }

  return (
    <div className="px-6 md:px-12 lg:px-16 py-16 md:py-24 max-w-3xl animate-fade-in">
      <Link
        to="/writings"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-300 mb-12"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to writings
      </Link>

      <article className="prose-minimal">
        <h1 className="text-2xl md:text-5xl font-display font-light mb-6">
          {post.title}
        </h1>

        {(post.date || post.readTime) && (
          <div className="flex items-center gap-6 text-sm text-muted-foreground mb-12">
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
                {post.readTime} read
              </span>
            )}
          </div>
        )}

        <div className="prose-minimal">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.content}
          </ReactMarkdown>
        </div>
      </article>
    </div>
  );
};

export default WritingPost;
