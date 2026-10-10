// Modeline reporter for Reader children (CodeBlock copy): `say(text, err)` dispatches a `msg`.
import { createContext } from "react";

export type Say = (text: string, err?: boolean) => void;

export const ReaderSay = createContext<Say>(() => {});
