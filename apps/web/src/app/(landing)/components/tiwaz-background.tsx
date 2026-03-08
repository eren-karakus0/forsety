"use client";

import { Parallax } from "@/components/motion/parallax";

interface TiwazBackgroundProps {
  variant?: "light" | "dark";
  side?: "left" | "right";
  className?: string;
}

export function TiwazBackground({
  variant = "light",
  side = "right",
  className = "",
}: TiwazBackgroundProps) {
  const strokeColor =
    variant === "light" ? "text-navy-200" : "text-navy-700";

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <Parallax speed={0.15} direction="up">
        <svg
          className={`absolute ${side === "right" ? "right-[-5%]" : "left-[-5%]"} top-1/2 -translate-y-1/2 h-[700px] w-[700px] ${strokeColor}`}
          viewBox="0 0 400 800"
          fill="none"
          style={{ opacity: 0.05 }}
        >
          {/* Main vertical line */}
          <line
            x1="200"
            y1="0"
            x2="200"
            y2="800"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          {/* Upper arms */}
          <line
            x1="200"
            y1="100"
            x2="80"
            y2="300"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <line
            x1="200"
            y1="100"
            x2="320"
            y2="300"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          {/* Lower arms */}
          <line
            x1="200"
            y1="400"
            x2="60"
            y2="600"
            stroke="currentColor"
            strokeWidth="0.8"
          />
          <line
            x1="200"
            y1="400"
            x2="340"
            y2="600"
            stroke="currentColor"
            strokeWidth="0.8"
          />
        </svg>
      </Parallax>
    </div>
  );
}
