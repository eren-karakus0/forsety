"use client";

import { AlertTriangle, Eye, FileWarning, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerChildren, StaggerItem } from "@/components/motion/stagger-children";

interface PainPoint {
  icon: LucideIcon;
  title: string;
  description: string;
  glowColor: string;
  iconColor: string;
}

const painPoints: PainPoint[] = [
  {
    icon: FileWarning,
    title: "No Proof of License",
    description:
      "AI companies use datasets without verifiable evidence of proper licensing. When audited, there is no trail to prove compliance.",
    glowColor: "rgba(212, 175, 55, 0.15)",
    iconColor: "text-gold-400",
  },
  {
    icon: Eye,
    title: "Opaque Data Access",
    description:
      "Dataset access is invisible — no one knows who accessed what, when, or under which policy. Disputes are unresolvable.",
    glowColor: "rgba(55, 170, 212, 0.15)",
    iconColor: "text-teal-400",
  },
  {
    icon: AlertTriangle,
    title: "Agent Accountability Gap",
    description:
      "AI agents consume data autonomously with zero audit trail. There is no way to verify what data they read or modified.",
    glowColor: "rgba(97, 55, 212, 0.15)",
    iconColor: "text-violet-400",
  },
];

function ProblemCard({ point }: { point: PainPoint }) {
  return (
    <motion.div
      className="glass-card group p-6 transition-colors duration-300 hover:bg-navy-100/80"
      whileHover={{ boxShadow: `0 0 40px ${point.glowColor}` }}
      whileTap={{ boxShadow: `0 0 40px ${point.glowColor}` }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-navy-100 transition-colors group-hover:bg-navy-200/60">
        <point.icon className={`h-5 w-5 ${point.iconColor}`} />
      </div>
      <h3 className="font-display text-lg font-semibold text-navy-900">
        {point.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-navy-400">
        {point.description}
      </p>
    </motion.div>
  );
}

export function Problem() {
  return (
    <section className="border-t border-navy-100 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-gold-400">
            The Problem
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-navy-900 sm:text-4xl">
            AI Data Compliance Is Broken
          </h2>
          <p className="mt-4 text-lg text-navy-400">
            As AI scales, the gap between data usage and verifiable compliance
            widens. Current solutions rely on trust — not proof.
          </p>
        </FadeIn>

        <StaggerChildren className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {painPoints.map((point) => (
            <StaggerItem key={point.title}>
              <ProblemCard point={point} />
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}
