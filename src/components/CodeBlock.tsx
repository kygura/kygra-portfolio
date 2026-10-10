import { useState } from "react";
import { Check, Copy } from "lucide-react";
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
import { cn } from "@/lib/utils";

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

/**
 * Prism theme drawn from the site tokens: comments recede to ink-3, keywords
 * take the accent, literals sit at ink-2. CSS variables keep it in step with
 * the accent switch.
 */
const base = { color: "var(--ink)", background: "none", fontFamily: "var(--f-mono)" };
const tokenTheme: Record<string, React.CSSProperties> = {
  'code[class*="language-"]': base,
  'pre[class*="language-"]': base,
  comment: { color: "var(--ink-3)", fontStyle: "italic" },
  prolog: { color: "var(--ink-3)" },
  doctype: { color: "var(--ink-3)" },
  cdata: { color: "var(--ink-3)" },
  punctuation: { color: "var(--ink-2)" },
  keyword: { color: "var(--accent)" },
  atrule: { color: "var(--accent)" },
  important: { color: "var(--accent)" },
  builtin: { color: "var(--accent)" },
  "class-name": { color: "var(--ink)", fontStyle: "italic" },
  function: { color: "var(--ink)" },
  tag: { color: "var(--accent)" },
  selector: { color: "var(--accent)" },
  "attr-name": { color: "var(--ink-2)" },
  property: { color: "var(--ink-2)" },
  string: { color: "var(--ink-2)" },
  char: { color: "var(--ink-2)" },
  "attr-value": { color: "var(--ink-2)" },
  regex: { color: "var(--ink-2)" },
  number: { color: "var(--ink-2)" },
  boolean: { color: "var(--ink-2)" },
  constant: { color: "var(--ink-2)" },
  variable: { color: "var(--ink)" },
  operator: { color: "var(--ink-2)" },
  inserted: { color: "var(--accent)" },
  deleted: { color: "var(--danger)" },
  bold: { fontWeight: 600 },
  italic: { fontStyle: "italic" },
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
    <div className={cn("codeblock relative group overflow-hidden my-6 border", className)}>
      <div className="absolute right-4 top-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={handleCopy}
          className="p-2 border border-[var(--rule-2)] bg-[var(--bg-2)] text-[var(--ink-2)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
          aria-label="Copy code"
        >
          {isCopied ? (
            <Check className="w-4 h-4 text-[var(--accent)]" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
      <div className="pt-2 pl-4 text-xs text-[var(--ink-3)] select-none uppercase tracking-wider font-mono">
        {language || "text"}
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        style={tokenTheme}
        PreTag="div"
        codeTagProps={{
          style: {
            backgroundColor: "transparent",
            fontFamily: "inherit",
          }
        }}
        customStyle={{
          margin: 0,
          padding: "1.5rem",
          background: "transparent",
          fontSize: "0.875rem",
          lineHeight: "1.6",
        }}
        showLineNumbers={true}
        lineNumberStyle={{
          minWidth: "2.5em",
          paddingRight: "1em",
          color: "var(--ink-3)",
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
