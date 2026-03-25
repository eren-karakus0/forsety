"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionValue, useSpring } from "framer-motion";

export function CursorGlow() {
  const mouseX = useMotionValue(-1000);
  const mouseY = useMotionValue(-1000);

  const springX = useSpring(mouseX, { damping: 25, stiffness: 150 });
  const springY = useSpring(mouseY, { damping: 25, stiffness: 150 });

  const [visible, setVisible] = useState(false);
  const lastX = useRef(-1000);
  const lastY = useRef(-1000);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouch) return;

    setVisible(true);

    const handleMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener("mousemove", handleMove, { passive: true });

    const tick = () => {
      const sx = springX.get();
      const sy = springY.get();
      const dx = Math.abs(sx - lastX.current);
      const dy = Math.abs(sy - lastY.current);

      if (dx > 0.5 || dy > 0.5) {
        lastX.current = sx;
        lastY.current = sy;
        document.documentElement.style.setProperty("--mx", `${sx}px`);
        document.documentElement.style.setProperty("--my", `${sy}px`);
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [mouseX, mouseY, springX, springY]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-0 z-30 hidden md:block"
      style={{
        background: "radial-gradient(600px circle at var(--mx) var(--my), rgba(55, 170, 212, 0.04), transparent 70%)",
      }}
    />
  );
}
