"use client";

import { type ReactNode, useRef, useState, useEffect, useCallback } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /** Max rotation in degrees */
  maxTilt?: number;
  /** Perspective distance in px */
  perspective?: number;
  /** Inner content parallax multiplier */
  innerScale?: number;
  /** Glow on hover */
  glowColor?: string;
}

function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

export function TiltCard({
  children,
  className,
  maxTilt = 10,
  perspective = 1000,
  innerScale = 1.02,
  glowColor,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsTouch(isTouchDevice());
  }, []);

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const scale = useMotionValue(1);

  const springX = useSpring(rotateX, { stiffness: 200, damping: 25 });
  const springY = useSpring(rotateY, { stiffness: 200, damping: 25 });
  const springScale = useSpring(scale, { stiffness: 300, damping: 20 });

  const handleMouse = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      rotateX.set(-y * maxTilt);
      rotateY.set(x * maxTilt);
      scale.set(innerScale);
    },
    [maxTilt, innerScale, rotateX, rotateY, scale]
  );

  const handleLeave = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
    scale.set(1);
  }, [rotateX, rotateY, scale]);

  if (prefersReducedMotion || !mounted || isTouch) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div style={{ perspective }}>
      <motion.div
        ref={ref}
        className={className}
        style={{
          rotateX: springX,
          rotateY: springY,
          scale: springScale,
          transformStyle: "preserve-3d",
          boxShadow: glowColor
            ? `0 0 0px ${glowColor}`
            : undefined,
        }}
        whileHover={
          glowColor
            ? { boxShadow: `0 0 50px ${glowColor}` }
            : undefined
        }
        onMouseMove={handleMouse}
        onMouseLeave={handleLeave}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
