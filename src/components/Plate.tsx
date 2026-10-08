import crank from "../plates/plate-crank.svg?raw";
import gears from "../plates/plate-gears.svg?raw";
import switchPlate from "../plates/plate-switch.svg?raw";
import worm from "../plates/plate-worm.svg?raw";

// Generated line art. Each SVG carries its own role="img" and aria-label;
// strokes use currentColor, dimension lines .acc, labels .lbl (see home.css).
const PLATES = { crank, gears, switch: switchPlate, worm } as const;

export type PlateName = keyof typeof PLATES;

interface PlateProps {
  name: PlateName;
  className?: string;
}

const Plate = ({ name, className }: PlateProps) => (
  <div
    className={className ? `plate-img ${className}` : "plate-img"}
    dangerouslySetInnerHTML={{ __html: PLATES[name] }}
  />
);

export default Plate;
