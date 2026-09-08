import { useEffect, useRef, useState } from "react";

/**
 * Tracks whether the element a ref is attached to has scrolled into view,
 * so a section can fade/slide itself in as the user scrolls down to it
 * instead of rendering fully visible up front. Fires once, then stays
 * revealed — purely a presentation effect, like useAnimatedNumber.
 */
export function useScrollReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, visible];
}

