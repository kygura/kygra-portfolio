import { useContext, type CSSProperties } from "react";
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
import { ReaderSay } from "./msg";

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
 * Palette-token syntax theme (DESIGN A4): only fg / dim / acc / acc2, no hex, no italics.
 * Colors are CSS custom properties so a palette switch recolors code with everything else.
 */
const C = { fg: "var(--fg)", dim: "var(--dim)", acc: "var(--acc)", acc2: "var(--acc2)" };
const paint = (color: string, keys: string[]): Record<string, CSSProperties> =>
  Object.fromEntries(keys.map((k) => [k, { color }]));
const THEME: Record<string, CSSProperties> = {
  'pre[class*="language-"]': { margin: 0, padding: "8px 12px", overflow: "auto", background: "transparent", color: C.fg },
  'code[class*="language-"]': { fontFamily: "inherit", fontSize: "inherit", background: "transparent", color: C.fg },
  ...paint(C.dim, ["comment", "prolog", "doctype", "cdata", "punctuation", "deleted"]),
  ...paint(C.acc, ["keyword", "atrule", "important", "tag", "selector", "boolean", "rule"]),
  ...paint(C.acc2, ["string", "char", "attr-value", "regex", "inserted", "url", "template-string"]),
  ...paint(C.fg, ["function", "class-name", "number", "constant", "symbol", "property", "builtin", "variable", "operator", "entity", "attr-name"]),
  italic: { fontStyle: "normal" },
  bold: { fontWeight: 600 },
};

interface CodeBlockProps {
  language?: string;
  value: string;
}

const CodeBlock = ({ language, value }: CodeBlockProps) => {
  const say = useContext(ReaderSay);

  const copy = () => {
    try {
      navigator.clipboard.writeText(value).then(
        () => say("yanked code"),
        () => say("E: clipboard blocked", true),
      );
    } catch {
      say("E: clipboard blocked", true);
    }
  };

  return (
    <figure className="code">
      <figcaption className="ph">
        <span>{language || "text"}</span>
        <span className="r">
          <button type="button" className="chip" onClick={copy} aria-label="copy code">
            [copy]
          </button>
        </span>
      </figcaption>
      <SyntaxHighlighter
        language={language || "text"}
        style={THEME}
        showLineNumbers
        lineNumberStyle={{ color: C.dim, minWidth: "3ch", paddingRight: "1ch" }}
      >
        {value}
      </SyntaxHighlighter>
    </figure>
  );
};

export default CodeBlock;
