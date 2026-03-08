"use client";

import { type ReactNode } from "react";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerChildren, StaggerItem } from "@/components/motion/stagger-children";
import { Counter } from "@/components/motion/counter";

function FadeInWrapper({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  return <FadeIn delay={delay}>{children}</FadeIn>;
}

function StaggerWrapper({
  children,
  className,
  staggerDelay,
}: {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  return (
    <StaggerChildren className={className} staggerDelay={staggerDelay}>
      {children}
    </StaggerChildren>
  );
}

function StaggerItemWrapper({
  children,
}: {
  children: ReactNode;
}) {
  return <StaggerItem>{children}</StaggerItem>;
}

function CounterWrapper({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return <Counter value={value} className={className} />;
}

export { FadeInWrapper, StaggerWrapper, StaggerItemWrapper, CounterWrapper };
