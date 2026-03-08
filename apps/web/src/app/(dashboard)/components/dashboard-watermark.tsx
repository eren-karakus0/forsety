"use client";

import { motion, useReducedMotion } from "framer-motion";

export function DashboardWatermark() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden lg:left-56">
      <motion.svg
        className="absolute -bottom-20 -right-20 h-[500px] w-[500px] text-navy-200"
        viewBox="0 0 400 800"
        fill="none"
        style={{ opacity: 0.03 }}
        animate={
          prefersReducedMotion
            ? {}
            : { y: [0, -8, 0], rotate: [0, 0.5, 0] }
        }
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <line x1="200" y1="0" x2="200" y2="800" stroke="currentColor" strokeWidth="2" />
        <line x1="200" y1="100" x2="80" y2="300" stroke="currentColor" strokeWidth="1.5" />
        <line x1="200" y1="100" x2="320" y2="300" stroke="currentColor" strokeWidth="1.5" />
        <line x1="200" y1="400" x2="60" y2="600" stroke="currentColor" strokeWidth="1" />
        <line x1="200" y1="400" x2="340" y2="600" stroke="currentColor" strokeWidth="1" />
      </motion.svg>
    </div>
  );
}
