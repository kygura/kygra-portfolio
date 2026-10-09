// Boot log (DESIGN §8): typed line by line, skippable by any key or click (the shell handles both).
export default function BootScreen({ lines, shown }: { lines: string[]; shown: number }) {
  return (
    <div id="boot" aria-hidden="true">
      <pre>{lines.slice(0, shown).join("\n")}</pre>
    </div>
  );
}
