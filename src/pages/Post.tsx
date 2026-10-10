import React from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import SectionHead from "@/components/SectionHead";
import { resolvePostTags } from "../lib/postTagFallbacks";
import { formatLogDate, formatLongDate } from "@/lib/format";
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
  const { post, loading, error } = useMarkdownPost(slug);

  if (loading) {
    return <div className="notice">Loading the entry…</div>;
  }

  if (error) {
    return <div className="notice notice--err">{error}</div>;
  }

  // Handle post not found
  if (!post) {
    return <Navigate
      to="/writings"
      replace />;
  }

  const longDate = formatLongDate(post.date);
  const tags = resolvePostTags(post);

  return (
    <>
      <div className="ptitle">
        <p className="mono mute" style={{ marginTop: 0 }}>
          <Link to="/writings" className="u">← Logbook</Link> · {formatLogDate(post.date)}
        </p>
        <h1 className="disp" style={{ fontSize: "clamp(2.8rem, 8vw, 6.5rem)" }}>{post.title}</h1>
        {post.excerpt && <p>{post.excerpt}</p>}
      </div>

      <SectionHead n="02" title="Entry" right={`${post.readTime} min read`} />

      <div className="read">
        <aside className="read__margin read__margin--l mono">
          <ul>
            {longDate && <li>Filed {longDate}</li>}
            <li>{post.readTime} min</li>
            {tags.map((t) => <li key={t}>#{t}</li>)}
          </ul>
        </aside>
      <article className="read__body prose">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            pre({ children }) {
              // Return a fragment or unstyled div to avoid double styling by prose-minimal pre
              return <>{children}</>;
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
                <PostImage {...props} />
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
        <aside className="read__margin read__margin--r mono" aria-hidden="true">
          <ul>
            <li>§02</li>
            <li>N.CA</li>
          </ul>
        </aside>
      </div>

      <div className="colophon__end mono">
        <Link to="/writings" className="u">← All entries</Link>
        <Link to="/guestbook" className="u">Argue in the guestbook →</Link>
      </div>
    </>
  );
};

export default Post;
