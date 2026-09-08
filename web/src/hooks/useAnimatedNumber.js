import { useEffect, useRef, useState } from "react";

/**
 * Eases a displayed number from its previous value to a new `target` over
 * `duration` ms (ease-out cubic), using requestAnimationFrame.
 *
 * Purely a presentation effect for the results view — so numbers glide
 * instead of jumping when a slider changes — and must never feed back
 * into the physics (see utils/format.js's own note on that boundary).
 * Non-finite targets (NaN/null, e.g. an efficiency that isn't defined at
 * static conditions) pass straight through with no animation, so nothing
 * gets stuck mid-tween on an undefined value.
 */
export function useAnimatedNumber(target, duration = 380) {
  const [displayed, setDisplayed] = useState(target);
  const frameRef = useRef(null);
  const fromRef = useRef(target);

  useEffect(() => {
    if (!Number.isFinite(target)) {
      setDisplayed(target);
      fromRef.current = target;
      return undefined;
    }

    const from = Number.isFinite(fromRef.current) ? fromRef.current : target;
    if (from === target) {
      setDisplayed(target);
      return undefined;
    }

    const start = performance.now();
    cancelAnimationFrame(frameRef.current);

    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplayed(from + (target - from) * eased);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return displayed;
}
