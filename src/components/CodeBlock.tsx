import { useState } from "react";
import SyntaxHighlighter from "react-syntax-highlighter/dist/esm/prism-light";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import diff from "react-syntax-highlighter/dist/esm/languages/prism/diff";
import go from "react-syntax-highlighter/dist/esm/languages/prism/go";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
import markup from "react-syntax-highlighter/dist/esm/languages/prism/markup";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import rust from "react-syntax-highlighter/dist/esm/languages/prism/rust";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml";
import { toast } from "sonner";

/**
 * The full `Prism` export bundles every language refractor ships with —
 * ~780kB on the post route. Registering the grammars posts actually use
 * keeps highlighting while cutting the chunk by an order of magnitude.
 */
const LANGUAGES = {
  bash, css, diff, go, javascript, json, jsx, markdown, markup,
  python, rust, sql, tsx, typescript, yaml,
};
for (const [name, grammar] of Object.entries(LANGUAGES)) {
  SyntaxHighlighter.registerLanguage(name, grammar);
}
// Common aliases so a fence tagged `js`/`ts`/`sh`/`html` still highlights.
SyntaxHighlighter.registerLanguage("js", javascript);
SyntaxHighlighter.registerLanguage("ts", typescript);
SyntaxHighlighter.registerLanguage("sh", bash);
SyntaxHighlighter.registerLanguage("shell", bash);
SyntaxHighlighter.registerLanguage("html", markup);
SyntaxHighlighter.registerLanguage("xml", markup);
SyntaxHighlighter.registerLanguage("yml", yaml);

// Token colours read the Sheet palette, so both bases and every accent
// retint highlighted code without a second theme.
const sheetStyle: Record<string, React.CSSProperties> = {
  'code[class*="language-"]': { color: "var(--text-primary)" },
  'pre[class*="language-"]': { color: "var(--text-primary)" },
  comment: { color: "var(--text-secondary)", fontStyle: "italic" },
  prolog: { color: "var(--text-secondary)" },
  punctuation: { color: "var(--text-secondary)" },
  keyword: { color: "var(--accent)" },
  operator: { color: "var(--text-secondary)" },
  string: { color: "var(--draft-ink)" },
  char: { color: "var(--draft-ink)" },
  "attr-value": { color: "var(--draft-ink)" },
  number: { color: "var(--accent-sage)" },
  boolean: { color: "var(--accent-sage)" },
  function: { color: "var(--text-primary)", fontWeight: 500 },
  "class-name": { color: "var(--accent-sage)" },
  tag: { color: "var(--accent)" },
  inserted: { color: "var(--accent-sage)" },
  deleted: { color: "var(--accent-terracotta)" },
};

interface CodeBlockProps {
  language?: string;
  value: string;
}

const CodeBlock = ({ language, value }: CodeBlockProps) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
      toast.success("Code copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy code");
    }
  };

  return (
    <div className="codeblock">
      <div className="codeblock__bar">
        <span>{language || "text"}</span>
        <button type="button" onClick={handleCopy} aria-label="Copy code">
          {isCopied ? "copied" : "copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        style={sheetStyle}
        PreTag="div"
        codeTagProps={{
          style: {
            backgroundColor: "transparent",
            fontFamily: "inherit",
          }
        }}
        customStyle={{
          margin: 0,
          padding: "8px 16px 14px",
          overflowX: "auto",
          background: "transparent",
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          fontSize: "13px",
          lineHeight: "1.55",
        }}
        showLineNumbers={true}
        lineNumberStyle={{
          minWidth: "2.5em",
          paddingRight: "1em",
          color: "var(--text-secondary)",
          textAlign: "right",
        }}
        wrapLines={true}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

export default CodeBlock;
