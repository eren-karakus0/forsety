"use client";

import { type ReactNode, useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-is-mobile";

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
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Hooks must always be called (Rules of Hooks)
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

  // Mobile: use IntersectionObserver-based whileInView (one-shot, no scroll listener)
  if (isMobile) {
    return (
      <motion.div
        ref={ref}
        className={className}
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    );
  }

  // Desktop: continuous scroll-linked progressive reveal
  return (
    <motion.div ref={ref} style={{ opacity, y }} className={className}>
      {children}
    </motion.div>
  );
}
