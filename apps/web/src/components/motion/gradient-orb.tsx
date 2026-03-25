"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-is-mobile";

interface GradientOrbProps {
  color: "gold" | "teal" | "violet";
  size?: number;
  className?: string;
  blur?: number;
}

const colorMap = {
  gold: "bg-gold-500/25",
  teal: "bg-teal-500/25",
  violet: "bg-violet-500/25",
};

export function GradientOrb({
  color,
  size = 400,
  className = "",
  blur = 80,
}: GradientOrbProps) {
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  if (isMobile || prefersReducedMotion) {
    const mobileSize = Math.round(size * 0.6);
    const mobileBlur = Math.min(blur, 50);
    return (
      <div
        className={`pointer-events-none absolute rounded-full ${colorMap[color]} ${className}`}
        style={{
          width: mobileSize,
          height: mobileSize,
          filter: `blur(${mobileBlur}px)`,
          opacity: 0.25,
        }}
      />
    );
  }

  return (
    <motion.div
      className={`pointer-events-none absolute rounded-full ${colorMap[color]} ${className}`}
      style={{
        width: size,
        height: size,
        filter: `blur(${blur}px)`,
      }}
      animate={{
        scale: [1, 1.18, 1],
        opacity: [0.22, 0.38, 0.22],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}
