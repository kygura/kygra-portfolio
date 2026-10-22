import { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

/*
 * Sizing panel for the post rail, shown only with ?tune in the URL. Each
 * slider writes one of the rail's CSS variables onto the nav; "Copy" puts
 * the chosen values on the clipboard so they can be made the defaults.
 */

type Knob = { key: string; label: string; min: number; max: number; step: number; unit: string; value: number };

const KNOBS: Knob[] = [
  { key: "--toc-bar", label: "bar length", min: 0.6, max: 3, step: 0.05, unit: "rem", value: 1.9 },
  { key: "--toc-bar-h", label: "bar thickness", min: 1, max: 6, step: 0.5, unit: "px", value: 3 },
  { key: "--toc-step", label: "spacing", min: 0.6, max: 2.4, step: 0.05, unit: "rem", value: 1.45 },
  { key: "--toc-label", label: "numeral width", min: 0, max: 10, step: 0.25, unit: "rem", value: 5 },
  { key: "--toc-label-size", label: "numeral size", min: 0.6, max: 1.6, step: 0.01, unit: "rem", value: 1 },
  { key: "--toc-edge", label: "edge gap", min: 0.5, max: 6, step: 0.25, unit: "rem", value: 2 },
  { key: "--toc-max-h", label: "max height", min: 30, max: 90, step: 1, unit: "vh", value: 70 },
];

const STORE = "post-toc-tune";

const load = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? "{}");
  } catch {
    return {};
  }
};

const TocTuner = ({ target }: { target: RefObject<HTMLElement> }) => {
  const [enabled] = useState(() => new URLSearchParams(window.location.search).has("tune"));
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(KNOBS.map((k) => [k.key, load()[k.key] ?? k.value])),
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const el = target.current;
    if (!enabled || !el) return;
    for (const k of KNOBS) el.style.setProperty(k.key, `${values[k.key]}${k.unit}`);
    try {
      localStorage.setItem(STORE, JSON.stringify(values));
    } catch {
      // Private mode: the values still apply, they just won't persist.
    }
  }, [enabled, values, target]);

  if (!enabled) return null;

  const css = KNOBS.map((k) => `${k.key}: ${values[k.key]}${k.unit};`).join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(css);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      window.prompt("Copy these values", css);
    }
  };

  // Portalled: the rail is transformed, which would pin this to it.
  return createPortal(
    <div className="toc-tuner">
      <p className="toc-tuner__head">( Rail size )</p>
      {KNOBS.map((k) => (
        <label key={k.key} className="toc-tuner__row">
          <span>{k.label}</span>
          <input
            type="range"
            min={k.min}
            max={k.max}
            step={k.step}
            value={values[k.key]}
            onChange={(e) => setValues((v) => ({ ...v, [k.key]: Number(e.target.value) }))}
          />
          <output>
            {values[k.key]}
            {k.unit}
          </output>
        </label>
      ))}
      <div className="toc-tuner__actions">
        <button type="button" onClick={copy}>
          {copied ? "copied" : "copy values"}
        </button>
        <button type="button" onClick={() => setValues(Object.fromEntries(KNOBS.map((k) => [k.key, k.value])))}>
          reset
        </button>
      </div>
    </div>,
    document.body,
  );
};

export default TocTuner;
