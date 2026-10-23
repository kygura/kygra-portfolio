import { lazy, Suspense, useEffect, useState } from "react";

const Companion = lazy(() => import("./Companion"));

/**
 * Keeps Moss out of the first paint: the sprite and its page reader load
 * once the browser is idle after the page has rendered.
 */
export default function CompanionHost() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Safari has no requestIdleCallback; a short timeout stands in.
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setReady(true), { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(id);
  }, []);

  if (!ready) return null;

  return (
    <Suspense fallback={null}>
      <Companion />
    </Suspense>
  );
}
