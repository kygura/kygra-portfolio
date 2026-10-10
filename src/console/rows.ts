// Shared row wiring for the section lists. The shell owns the behaviour (selection, open,
// focus sync, hover reticle); the lists only render and forward events.
import type { FocusEvent, MouseEvent } from "react";
import type { Section } from "../orrery/routes";

export interface RowApi {
  /** pointerdown: remembers whether the row was already selected (second tap opens). */
  down(section: Section, index: number): void;
  click(section: Section, index: number, e: MouseEvent<HTMLElement>): void;
  /** Native focus (Tab) keeps the selection in sync. */
  focus(section: Section, index: number, e: FocusEvent<HTMLElement>): void;
  /** Project rows preview their body with the reticle; -1 clears. */
  hover(index: number): void;
}

export interface ListProps<R> {
  rows: R[];
  /** Selected index, or -1 when this section is not the active one. */
  sel: number;
  visible: Set<number>;
  api: RowApi;
}

/** Props every row element shares (`data-row` is the key-handler DOM contract). */
export function rowProps(section: Section, index: number, sel: number, api: RowApi, cls: string) {
  const on = index === sel;
  return {
    className: `row ${cls}${on ? " sel" : ""}`,
    "data-row": "",
    "aria-current": on ? ("true" as const) : undefined,
    onPointerDown: () => api.down(section, index),
    onClick: (e: MouseEvent<HTMLElement>) => api.click(section, index, e),
    onFocus: (e: FocusEvent<HTMLElement>) => api.focus(section, index, e),
  };
}
