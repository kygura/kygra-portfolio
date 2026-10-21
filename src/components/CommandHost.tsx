import { lazy, Suspense, useEffect, useState } from "react";
import { isTyping } from "@/theme/keymap";

const CommandPalette = lazy(() => import("./CommandPalette"));

/**
 * Keeps the command palette out of the initial bundle, like TerminalHost.
 * `:` (vim's command line) or ⌘K opens it; Ctrl+K stays with the terminal.
 */
export default function CommandHost() {
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const cmdK = e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === "k";
      const colon = e.key === ":" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target);
      if (!cmdK && !colon) return;
      e.preventDefault();
      setArmed(true);
      setOpen((o) => (cmdK ? !o : true));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!armed) return null;

  return (
    <Suspense fallback={null}>
      <CommandPalette open={open} onOpenChange={setOpen} />
    </Suspense>
  );
}
