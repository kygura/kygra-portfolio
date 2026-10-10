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

/* Two-colour syntax: paper for text, spot for the few things worth marking. */
const INK: Record<string, React.CSSProperties> = {
  'code[class*="language-"]': { color: "var(--paper)" },
  'pre[class*="language-"]': { color: "var(--paper)" },
  comment: { opacity: 0.45, fontStyle: "italic" },
  prolog: { opacity: 0.45 },
  doctype: { opacity: 0.45 },
  cdata: { opacity: 0.45 },
  punctuation: { opacity: 0.7 },
  keyword: { color: "var(--spot)" },
  string: { color: "var(--spot)", opacity: 0.85 },
  "attr-value": { color: "var(--spot)", opacity: 0.85 },
  tag: { color: "var(--spot)" },
  selector: { color: "var(--spot)" },
  function: { textDecoration: "underline", textDecorationColor: "var(--spot)", textUnderlineOffset: "0.2em" },
  "class-name": { fontWeight: 700 },
  number: { fontWeight: 700 },
  boolean: { fontWeight: 700 },
  operator: { opacity: 0.8 },
  inserted: { color: "var(--spot)" },
  deleted: { opacity: 0.5, textDecoration: "line-through" },
};

interface CodeBlockProps {
  language?: string;
  value: string;
  className?: string;
}

const CodeBlock = ({ language, value, className }: CodeBlockProps) => {
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
    <div className={["code", className].filter(Boolean).join(" ")}>
      <div className="code__bar mono">
        <span>{language || "text"}</span>
        <button type="button" onClick={handleCopy} aria-label="Copy code">
          {isCopied ? "copied" : "copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        style={INK}
        PreTag="pre"
        useInlineStyles={true}
        codeTagProps={{ style: { fontFamily: "inherit", background: "transparent" } }}
        customStyle={{ margin: 0, padding: "14px 16px", background: "transparent", fontSize: "inherit", lineHeight: "inherit" }}
        showLineNumbers={true}
        lineNumberStyle={{ minWidth: "2.5em", paddingRight: "1em", opacity: 0.4, textAlign: "right" }}
        wrapLines={true}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

export default CodeBlock;
