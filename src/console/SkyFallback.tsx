// No-WebGL sky (DESIGN section 6 fallbacks, A8): a 2px Bayer pattern in --rule on --bg with a static ASCII orrery
// on top. Shown when three fails to load or WebGL2 is missing; the StatusBar then reads `gl:none`.
const ORRERY = `     .        *          ______        .
  *       .      .      |      |   [ ]      *
   ___________ _________|  MO  |_________
  /     .        [ ]    |  NO  |      .  \\
 |   [ ]          .     |  LI  |    [ ]   |
  \\_____________ _______|  TH  |_________/
        *               |______|     .`;

export default function SkyFallback() {
  return (
    <div className="skyfb" aria-hidden="true">
      <pre>{ORRERY}</pre>
    </div>
  );
}
