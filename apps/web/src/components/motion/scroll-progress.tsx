"use client";

import { useState, useEffect } from "react";
import { motion, useScroll, useSpring, useReducedMotion } from "framer-motion";

interface ScrollProgressProps {
  className?: string;
}

export function ScrollProgress({ className }: ScrollProgressProps) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (prefersReducedMotion || !mounted) return null;

  return (
    <motion.div
      className={`fixed left-0 right-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-gold-500 via-teal-500 to-violet-500 ${className ?? ""}`}
      style={{ scaleX }}
    />
  );
}
