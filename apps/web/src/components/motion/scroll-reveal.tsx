"use client";

import { type ReactNode, useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** Offset from viewport bottom where animation begins (0 = top of viewport, 1 = bottom) */
  startOffset?: number;
  /** Offset from viewport where animation completes */
  endOffset?: number;
}

export function ScrollReveal({
  children,
  className,
  startOffset = 0.85,
  endOffset = 0.35,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: [`start ${startOffset}`, `start ${endOffset}`],
  });

  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [60, 0]);

  if (prefersReducedMotion || !mounted) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div ref={ref} style={{ opacity, y }} className={className}>
      {children}
    </motion.div>
  );
}
