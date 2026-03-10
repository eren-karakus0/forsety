"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function CursorGlow() {
  const mouseX = useMotionValue(-1000);
  const mouseY = useMotionValue(-1000);

  const springX = useSpring(mouseX, { damping: 25, stiffness: 150 });
  const springY = useSpring(mouseY, { damping: 25, stiffness: 150 });

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouch) return;

    setVisible(true);

    const handleMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, [mouseX, mouseY]);

  if (!visible) {
    return null;
  }

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-30 hidden md:block"
      style={{
        background: "radial-gradient(600px circle at var(--mx) var(--my), rgba(55, 170, 212, 0.04), transparent 70%)",
      }}
    >
      <motion.div
        className="absolute h-0 w-0"
        style={{ x: springX, y: springY }}
        onUpdate={({ x, y }) => {
          document.documentElement.style.setProperty("--mx", `${x}px`);
          document.documentElement.style.setProperty("--my", `${y}px`);
        }}
      />
    </motion.div>
  );
}
