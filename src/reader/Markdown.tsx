// Reader markdown (DESIGN A4) via react-markdown + remark-gfm. No raw HTML is rendered and
// react-markdown's default URL transform drops unsafe protocols. Headings are shifted so the
// outline sits under the Reader title; `> [!NOTE]` blockquotes become callouts.
import { Children, cloneElement, isValidElement, useMemo, type ReactElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { Link } from "react-router-dom";
import remarkGfm from "remark-gfm";
import Alert from "./Alert";
import CodeBlock from "./CodeBlock";
import PostImage from "./PostImage";
import { calloutType, headingShift, shiftedLevel, stripCallout } from "./prose";

type WithChildren = { children?: ReactNode };

function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<WithChildren>(node)) return textOf(node.props.children);
  return "";
}

/** Removes the `[!TYPE]` marker from the first string it appears in (depth-first). */
function stripFirst(nodes: ReactNode): ReactNode {
  let done = false;
  const walk = (n: ReactNode): ReactNode =>
    Children.map(n, (child) => {
      if (done) return child;
      if (typeof child === "string") {
        if (calloutType(child)) {
          done = true;
          return stripCallout(child);
        }
        return child;
      }
      if (isValidElement<WithChildren>(child) && child.props.children != null) {
        return cloneElement(child as ReactElement<WithChildren>, {}, walk(child.props.children));
      }
      return child;
    });
  return walk(nodes);
}

const isExternal = (href: string) => /^(https?:)?\/\//i.test(href) || /^mailto:/i.test(href);

function components(shift: number): Components {
  const heading =
    (level: number) =>
    ({ node, children, ...rest }: WithChildren & { node?: unknown }) => {
      const H = `h${shiftedLevel(level, shift)}` as "h3";
      return (
        <H className={level <= 2 ? "hl" : "hs"} {...rest}>
          {children}
        </H>
      );
    };
  return {
    h1: heading(1),
    h2: heading(2),
    h3: heading(3),
    h4: heading(4),
    h5: heading(5),
    h6: heading(6),
    a({ node, href = "", children, ...rest }) {
      if (href.startsWith("/") && !href.startsWith("//")) {
        return (
          <Link to={href} {...rest}>
            {children}
          </Link>
        );
      }
      return (
        <a href={href} {...(isExternal(href) && !href.startsWith("mailto:") ? { target: "_blank", rel: "noopener noreferrer" } : {})} {...rest}>
          {children}
        </a>
      );
    },
    pre({ children }) {
      const code = Children.toArray(children)[0];
      if (isValidElement<WithChildren & { className?: string }>(code)) {
        const lang = /language-([\w+-]+)/.exec(code.props.className ?? "")?.[1];
        return <CodeBlock language={lang} value={textOf(code.props.children).replace(/\n$/, "")} />;
      }
      return <pre>{children}</pre>;
    },
    img: PostImage,
    table({ node, children, ...rest }) {
      return (
        <div className="tw">
          <table {...rest}>{children}</table>
        </div>
      );
    },
    blockquote({ node, children, ...rest }) {
      const items = Children.toArray(children);
      const first = items.findIndex((c) => (typeof c === "string" ? c.trim() !== "" : true));
      const type = first < 0 ? null : calloutType(textOf(items[first]));
      if (!type) return <blockquote {...rest}>{children}</blockquote>;
      return <Alert type={type}>{[...items.slice(0, first), stripFirst(items[first]), ...items.slice(first + 1)]}</Alert>;
    },
  };
}

export default function Markdown({ source }: { source: string }) {
  const comps = useMemo(() => components(headingShift(source)), [source]);
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={comps}>
      {source}
    </ReactMarkdown>
  );
}
