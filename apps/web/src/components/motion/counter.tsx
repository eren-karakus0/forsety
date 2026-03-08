"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

interface CounterProps {
  value: string;
  className?: string;
}

export function Counter({ value, className }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const prefersReducedMotion = useReducedMotion();

  // Extract numeric part and suffix (e.g., "114+" -> 114, "+")
  const numMatch = value.match(/^(\d+)(.*)$/);
  const targetNum = numMatch ? parseInt(numMatch[1], 10) : 0;
  const suffix = numMatch ? numMatch[2] : value;

  const [displayNum, setDisplayNum] = useState(0);

  useEffect(() => {
    if (!isInView || prefersReducedMotion || !numMatch) return;

    let frame: number;
    const duration = 1500;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayNum(Math.floor(eased * targetNum));

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [isInView, targetNum, prefersReducedMotion, numMatch]);

  if (!numMatch || prefersReducedMotion) {
    return (
      <span ref={ref} className={className}>
        {value}
      </span>
    );
  }

  return (
    <span ref={ref} className={className}>
      {isInView ? `${displayNum}${suffix}` : `0${suffix}`}
    </span>
  );
}
