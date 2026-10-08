
import { useState, useEffect, useRef } from "react";
import { shouldIgnoreKey } from "@/lib/keybindings";
import { useNavigate } from "react-router-dom";
import { X, Minus, Terminal as TerminalIcon } from "lucide-react";

type HistoryItem = {
  type: "command" | "output";
  content: React.ReactNode;
};

// One palette, read from the Sheet tokens so it follows base and accent.
const c = {
  text: "text-[var(--text-primary)]",
  textMuted: "text-[var(--text-secondary)]",
  prompt: "text-[var(--accent)]",
  path: "text-[var(--draft-ink)]",
  command: "text-[var(--text-primary)]",
  success: "text-[var(--accent-sage)]",
  error: "text-[var(--accent-terracotta)]",
  warning: "text-[var(--draft-ink)]",
  info: "text-[var(--accent)]",
  accent: "text-[var(--accent)]",
};

interface TerminalProps {
  /** Mount already open — the host lazily loads this chunk on first invocation. */
  defaultOpen?: boolean;
}

export const Terminal = ({ defaultOpen = false }: TerminalProps = {}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([
    {
      type: "output",
      content: (
        <span>
          Welcome to the <span className={c.accent}>N.CA</span> terminal{" "}
          <span className={c.warning}>v1.0.0</span>
        </span>
      ),
    },
    {
      type: "output",
      content: (
        <span>
          Type <span className={c.info}>help</span> for available
          commands.
        </span>
      ),
    },
  ]);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Toggle with Ctrl+K or backtick; ":" opens (outside text fields)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === "k") || e.key === "`") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === ":" && !shouldIgnoreKey(e)) {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Scroll to bottom on history update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const handleCommand = (cmd: string) => {
    const parts = cmd.trim().split(" ");
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    const newHistory: HistoryItem[] = [
      ...history,
      { type: "command", content: cmd },
    ];

    switch (command) {
      case "help":
        newHistory.push({
          type: "output",
          content: (
            <div className="flex flex-col gap-1">
              <div className={`${c.info} mb-2`}>Available commands:</div>
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <span className={c.info}>help</span>
                <span className={c.textMuted}>Show this help message</span>

                <span className={c.info}>ls</span>
                <span className={c.textMuted}>List available pages</span>

                <span className={c.info}>cd</span>
                <span className={c.textMuted}>Navigate to a page (usage: cd [page])</span>

                <span className={c.info}>whoami</span>
                <span className={c.textMuted}>Display current user</span>

                <span className={c.info}>date</span>
                <span className={c.textMuted}>Show current date/time</span>

                <span className={c.info}>clear</span>
                <span className={c.textMuted}>Clear terminal history</span>

                <span className={c.info}>exit</span>
                <span className={c.textMuted}>Close terminal</span>
              </div>
            </div>
          ),
        });
        break;
      case "ls":
        newHistory.push({
          type: "output",
          content: (
            <div className="flex gap-4">
              <span className={c.success}>index</span>
              <span className={c.success}>writings</span>
              <span className={c.success}>projects</span>
              <span className={c.success}>artifacts</span>
              <span className={c.success}>guestbook</span>
            </div>
          ),
        });
        break;
      case "cd":
      case "goto":
        if (args.length === 0) {
          newHistory.push({
            type: "output",
            content: (
              <span>
                Usage: <span className={c.warning}>cd [page]</span>
              </span>
            ),
          });
        } else {
          const target = args[0].toLowerCase();
          const routes: Record<string, string> = {
            index: "/",
            home: "/",
            writings: "/writings",
            projects: "/projects",
            artifacts: "/artifacts",
            gallery: "/artifacts",
            guestbook: "/guestbook",
          };

          if (routes[target]) {
            newHistory.push({
              type: "output",
              content: (
                <span>
                  Navigating to <span className={c.success}>{target}</span>
                  ...
                </span>
              ),
            });
            navigate(routes[target]);
            setIsOpen(false); // Optional: close on navigation
          } else {
            newHistory.push({
              type: "output",
              content: (
                <span className={c.error}>
                  Directory not found: {target}
                </span>
              ),
            });
          }
        }
        break;
      case "whoami":
        newHistory.push({
          type: "output",
          content: (
            <span className={`${c.accent} font-bold`}>Only you can ever truly know yourself.</span>
          ),
        });
        break;
      case "date":
        newHistory.push({
          type: "output",
          content: <span className={c.warning}>{new Date().toLocaleString()}</span>,
        });
        break;
      case "clear":
        setHistory([]);
        return; // Return early to avoid setting history with 'clear' command
      case "exit":
        setIsOpen(false);
        break;
      case "":
        break;
      default:
        newHistory.push({
          type: "output",
          content: (
            <span>
              Command not found: <span className={c.error}>{command}</span>
            </span>
          ),
        });
    }

    setHistory(newHistory);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCommand(input);
      setInput("");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[color-mix(in_srgb,var(--bg-primary)_80%,transparent)]"
      onClick={() => setIsOpen(false)}
    >
      <div
        data-terminal
        role="dialog"
        aria-label="Terminal"
        className="relative w-full max-w-2xl h-96 flex flex-col font-mono text-sm overflow-hidden bg-[var(--bg-secondary)] border border-[var(--rule)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-8 border-b border-[var(--rule)] flex items-center justify-between px-3 select-none">
          <div className={`flex items-center gap-2 ${c.textMuted}`}>
            <TerminalIcon size={14} aria-hidden="true" />
            <span className="text-xs">guest@nca:~</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Minimize terminal"
              className={`${c.textMuted} hover:text-[var(--text-primary)] transition-colors`}
            >
              <Minus size={14} />
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close terminal"
              className={`${c.textMuted} hover:text-[var(--accent-terracotta)] transition-colors`}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          className={`flex-1 p-4 overflow-y-auto ${c.text}`}
          style={{ scrollbarWidth: "thin", scrollbarColor: "var(--rule) transparent" }}
          onClick={() => inputRef.current?.focus()}
        >
          {history.map((item, i) => (
            <div key={i} className="mb-1 whitespace-pre-wrap break-words">
              {item.type === "command" ? (
                <div className={`flex gap-2 ${c.command}`}>
                  <span className={c.prompt}>➜</span>
                  <span className={c.path}>~</span>
                  <span className="font-bold">{item.content}</span>
                </div>
              ) : (
                <div className="ml-6">{item.content}</div>
              )}
            </div>
          ))}

          <div className={`flex gap-2 items-center ${c.command} mt-1`}>
            <span className={c.prompt}>➜</span>
            <span className={c.path}>~</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Terminal command"
              className={`flex-1 bg-transparent border-none outline-none ${c.command}`}
              autoFocus
            />
          </div>
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
};
