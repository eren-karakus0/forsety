"use client";

import { motion, useReducedMotion } from "framer-motion";

interface GradientOrbProps {
  color: "gold" | "teal" | "violet";
  size?: number;
  className?: string;
  blur?: number;
}

const colorMap = {
  gold: "bg-gold-500/10",
  teal: "bg-teal-500/10",
  violet: "bg-violet-500/10",
};

export function GradientOrb({
  color,
  size = 400,
  className = "",
  blur = 80,
}: GradientOrbProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={`pointer-events-none absolute rounded-full ${colorMap[color]} ${className}`}
      style={{
        width: size,
        height: size,
        filter: `blur(${blur}px)`,
      }}
      animate={
        prefersReducedMotion
          ? {}
          : {
              scale: [1, 1.1, 1],
              opacity: [0.15, 0.25, 0.15],
            }
      }
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}
