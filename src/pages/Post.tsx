import React, { useMemo } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMarkdownPost } from "../hooks/useMarkdownPosts";
import CodeBlock from "../components/CodeBlock";
import PostImage from "../components/PostImage";
import Alert from "../components/Alert";

type MarkdownCodeProps = React.ComponentPropsWithoutRef<"code"> & {
  inline?: boolean;
  node?: unknown;
};

type MarkdownImageProps = React.ComponentPropsWithoutRef<"img"> & {
  node?: unknown;
};

type MarkdownBlockquoteProps = React.ComponentPropsWithoutRef<"blockquote"> & {
  node?: unknown;
};

type AlertType = "NOTE" | "TIP" | "IMPORTANT" | "WARNING" | "CAUTION";

const alertTypes: Record<AlertType, AlertType> = {
  NOTE: "NOTE",
  TIP: "TIP",
  IMPORTANT: "IMPORTANT",
  WARNING: "WARNING",
  CAUTION: "CAUTION",
};

const Post = () => {
  const { slug } = useParams();
  const post = useMarkdownPost(slug);

  // Handle post not found
  if (!post) {
    return <Navigate
      to="/writings"
      replace />;
  }

  return (
    <div className="px-6 md:px-12 lg:px-16 py-16 md:py-24 max-w-3xl mx-auto animate-fade-in">
      <div className="mb-12 pb-6 border-b-[4px] border-foreground relative">
        <Link
          to="/writings"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors duration-300 mb-8 mt-2"
        >
          <ArrowLeft className="w-4 h-4" />
          BACK TO WRITINGS
        </Link>

        <h1 className="text-4xl md:text-6xl font-['Bebas_Neue'] tracking-widest text-foreground uppercase leading-[0.9] mb-8">
          {post.title}
        </h1>

        {(post.date || post.readTime) && (
          <div className="flex items-center gap-6 text-xs font-bold uppercase tracking-widest text-muted-foreground">
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
      </div>

      <article className="prose-minimal text-lg leading-relaxed text-foreground">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            pre({ children }) {
              // Return a fragment or unstyled div to avoid double styling by prose-minimal pre
              return <div className="not-prose my-6">{children}</div>;
            },
            code({ inline, className, children, ...props }: MarkdownCodeProps) {
              const match = /language-(\w+)/.exec(className || "");

              if (!inline) {
                return (
                  <CodeBlock
                    language={match ? match[1] : undefined}
                    value={String(children).replace(/\n$/, "")}
                    className={className}
                  />
                );
              }

              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
            img(props: MarkdownImageProps) {
              return (
                <PostImage
                  {...props}
                  className="w-full h-auto rounded-lg shadow-md"
                />
              );
            },
            blockquote({ children, ...props }: MarkdownBlockquoteProps) {
              // Helper to recursively extract text content from React nodes
              const extractText = (node: React.ReactNode): string => {
                if (!node) return "";
                if (typeof node === "string") return node;
                if (Array.isArray(node)) return node.map(extractText).join("");
                if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
                  return extractText(node.props.children);
                }
                return "";
              };

              const childrenArray = React.Children.toArray(children);

              // Find the first meaningful child (ignore whitespace strings)
              const firstContentIndex = childrenArray.findIndex(child => {
                if (typeof child === 'string') return child.trim().length > 0;
                return true; // Elements are content
              });

              if (firstContentIndex !== -1) {
                const contentChild = childrenArray[firstContentIndex];
                const textContent = extractText(contentChild);

                if (textContent) {
                  // Relaxed regex to handle potential leading whitespace or newlines
                  const match = textContent.match(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/);
                  if (match) {
                    const type = alertTypes[match[1] as AlertType];
                    const pattern = /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/;

                    const processChildren = (nodes: React.ReactNode): React.ReactNode => {
                      let found = false;
                      return React.Children.map(nodes, (child) => {
                        if (found) return child;

                        if (typeof child === 'string') {
                          if (child.match(pattern)) {
                            found = true;
                            return child.replace(pattern, '');
                          }
                          return child;
                        }

                        if (React.isValidElement<{ children?: React.ReactNode }>(child) && child.props.children) {
                          const processed = processChildren(child.props.children);
                          return React.cloneElement(child, {}, processed);
                        }
                        return child;
                      });
                    };

                    // Transform the specific child that contains the trigger
                    const newContentChild = React.isValidElement(contentChild)
                      ? React.cloneElement(contentChild as React.ReactElement, {}, processChildren(contentChild.props.children))
                      : (typeof contentChild === 'string' ? contentChild.replace(pattern, '') : contentChild);

                    /* 
                       Reconstruct children: 
                       0..firstContentIndex-1 (whitespace)
                       newContentChild (stripped trigger)
                       firstContentIndex+1..end (rest)
                    */
                    const newChildren = [
                      ...childrenArray.slice(0, firstContentIndex),
                      newContentChild,
                      ...childrenArray.slice(firstContentIndex + 1)
                    ];

                    return (
                      <Alert type={type}>
                        {newChildren}
                      </Alert>
                    );
                  }
                }
              }

              return <blockquote {...props}>{children}</blockquote>;
            }
          }}
        >
          {post.content}
        </ReactMarkdown>
      </article>
    </div>
  );
};

export default Post;
