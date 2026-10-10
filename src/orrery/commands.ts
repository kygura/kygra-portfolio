// CommandLine table (DESIGN A7) and fuzzy lookup. Commands are plain data: running one
// dispatches its `action` through the same reducer as the keys.

import { rank, type FuzzyMatch } from "./fuzzy.ts";
import { PALETTES } from "./palette.ts";
import { SECTIONS, SECTION_META } from "./routes.ts";
import type { NoteRow, ProjectRow } from "./model.ts";
import type { Action } from "./state.ts";

export interface Command {
  name: string;
  desc: string;
  /** KeyChip shown on the right of the result row, or null. */
  key: string | null;
  action: Action;
}

export interface CommandResult {
  command: Command;
  match: FuzzyMatch;
}

/** At most this many result rows grow upward above the Modeline. */
export const COMMAND_LIMIT = 8;

export const RES_STEPS = [120, 180, 240] as const;

export interface CommandSource {
  projects: readonly Pick<ProjectRow, "title">[];
  notes: readonly Pick<NoteRow, "title" | "path">[];
}

export function buildCommands(src: CommandSource): Command[] {
  return [
    ...SECTIONS.map(
      (s): Command => ({
        name: s,
        desc: `go to ${SECTION_META[s].title.toLowerCase()}`,
        key: `g${SECTION_META[s].chord}`,
        action: { type: "section", to: s },
      }),
    ),
    ...src.projects.map(
      (p, index): Command => ({
        name: `open ${p.title.toLowerCase()}`,
        desc: "inspect project",
        key: null,
        action: { type: "openProject", index },
      }),
    ),
    ...src.notes.map(
      (n): Command => ({
        name: `read ${n.title.toLowerCase()}`,
        desc: "open note",
        key: null,
        action: { type: "navigate", to: n.path },
      }),
    ),
    { name: "cv", desc: "curriculum vitae", key: null, action: { type: "navigate", to: "/cv" } },
    { name: "about", desc: "manifesto", key: null, action: { type: "navigate", to: "/about" } },
    { name: "sign", desc: "sign the log", key: null, action: { type: "sign" } },
    { name: "fortune", desc: "reroll the fortune", key: null, action: { type: "fortune" } },
    ...PALETTES.map(
      (p, i): Command => ({
        name: `theme ${p}`,
        desc: `palette ${i + 1}`,
        key: String(i + 1),
        action: { type: "palette", palette: p },
      }),
    ),
    { name: "motion on", desc: "animate the sky", key: "m", action: { type: "motion", on: true } },
    { name: "motion off", desc: "still frame, no tear", key: "m", action: { type: "motion", on: false } },
    ...RES_STEPS.map(
      (h): Command => ({ name: `res ${h}`, desc: `internal height ${h}px`, key: null, action: { type: "res", h } }),
    ),
    { name: "look", desc: "hide panes, orbit the sky", key: "f", action: { type: "look", on: true } },
    { name: "yank email", desc: "copy the email address", key: "y", action: { type: "yank", target: "email" } },
    { name: "help", desc: "show the keymap", key: "?", action: { type: "help", on: true } },
    { name: "boot", desc: "replay the boot sequence", key: null, action: { type: "boot" } },
  ];
}

export function matchCommands(commands: readonly Command[], query: string, limit = COMMAND_LIMIT): CommandResult[] {
  return rank(query.trim(), commands, (c) => c.name, limit).map(({ item, match }) => ({ command: item, match }));
}
