import React from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMarkdownPost } from "../hooks/useMarkdownPosts";
import CodeBlock from "../components/CodeBlock";
import PostImage from "../components/PostImage";
import Alert from "../components/Alert";
import { resolvePostTags } from "../lib/postTagFallbacks";

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

function formatPostDate(date: string): string | null {
  const parsedDate = new Date(date);

  if (!date || Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const Post = () => {
  const { slug } = useParams();
  const { post, loading, error } = useMarkdownPost(slug);

  if (loading || error) {
    return (
      <div className="sheet page">
        <table className="ledger">
          <tbody>
            <tr>
              <td className={error ? "ledger__state ledger__state--error" : "ledger__state"}>
                {error || "Loading post…"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  // Handle post not found
  if (!post) {
    return <Navigate
      to="/writings"
      replace />;
  }

  const formattedDate = formatPostDate(post.date);
  const tags = resolvePostTags(post);

  return (
    <div className="sheet page post-cols">
      <aside className="post-margin">
        <dl>
          <div>
            <dt>Date</dt>
            <dd>{formattedDate ?? "—"}</dd>
          </div>
          <div>
            <dt>Read</dt>
            <dd>{post.readTime} min</dd>
          </div>
          {tags.length > 0 && (
            <div>
              <dt>Tags</dt>
              <dd>{tags.join(" · ")}</dd>
            </div>
          )}
        </dl>
        <Link to="/writings" className="back"><kbd>2</kbd>← contents</Link>
      </aside>

      <div className="post-body">
        <h1 className="page-title">{post.title}</h1>

        <article className="prose">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // react-markdown v10 no longer passes `inline` to `code`, so
              // fenced blocks are handled here, where the parent is `pre`;
              // every other `code` renders as a plain inline span.
              pre({ children }) {
                const code = React.Children.toArray(children)[0];
                if (!React.isValidElement<{ className?: string; children?: React.ReactNode }>(code)) {
                  return <pre>{children}</pre>;
                }
                const match = /language-(\w+)/.exec(code.props.className || "");
                return (
                  <CodeBlock
                    language={match ? match[1] : undefined}
                    value={String(code.props.children).replace(/\n$/, "")}
                  />
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
      </div>
    </div>
  );
};

export default Post;
