"use client";

import { useState, useEffect } from "react";

const hasTouch = () =>
  "ontouchstart" in window || navigator.maxTouchPoints > 0;

/**
 * Detects mobile devices via touch capability + viewport width.
 * SSR-safe: returns false on server.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    setIsMobile(hasTouch() || mql.matches);

    const onChange = (e: MediaQueryListEvent) => {
      setIsMobile(hasTouch() || e.matches);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
