"use client";

import { type ReactNode, useState, useEffect } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

interface TextRevealProps {
  children: string;
  className?: string;
  variant?: "word" | "line" | "char";
  /** Tag to render — defaults to span */
  as?: "span" | "h1" | "h2" | "h3" | "p";
  staggerDelay?: number;
  duration?: number;
}

const containerVariants: Variants = {
  hidden: {},
  visible: (stagger: number) => ({
    transition: { staggerChildren: stagger },
  }),
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (duration: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration,
      ease: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number],
    },
  }),
};

export function TextReveal({
  children,
  className,
  variant = "word",
  as: Tag = "span",
  staggerDelay,
  duration = 0.5,
}: TextRevealProps) {
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (prefersReducedMotion || !mounted) {
    return <Tag className={className}>{children}</Tag>;
  }

  const defaultStagger = variant === "char" ? 0.02 : variant === "word" ? 0.04 : 0.08;
  const stagger = staggerDelay ?? defaultStagger;

  let segments: string[];
  if (variant === "char") {
    segments = children.split("");
  } else if (variant === "line") {
    segments = children.split("\n");
  } else {
    segments = children.split(" ");
  }

  return (
    <Tag className={className}>
      <motion.span
        className="inline"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        custom={stagger}
        aria-label={children}
      >
        {segments.map((segment, i) => (
          <motion.span
            key={`${i}-${segment}`}
            className="inline-block"
            variants={itemVariants}
            custom={duration}
            aria-hidden
          >
            {segment}
            {variant === "word" && i < segments.length - 1 ? "\u00A0" : ""}
          </motion.span>
        ))}
      </motion.span>
    </Tag>
  );
}

/** Wrapper for mixed content (text + JSX children) — reveals children as a group word-by-word */
interface TextRevealGroupProps {
  children: ReactNode;
  className?: string;
}

export function TextRevealGroup({ children, className }: TextRevealGroupProps) {
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (prefersReducedMotion || !mounted) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  );
}
