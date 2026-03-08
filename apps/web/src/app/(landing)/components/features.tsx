"use client";

import {
  ShieldCheck,
  Brain,
  Lock,
  Search,
  Wallet,
  Server,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerChildren, StaggerItem } from "@/components/motion/stagger-children";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  tag: string;
  glowColor: string;
  iconColor: string;
}

const features: Feature[] = [
  {
    icon: ShieldCheck,
    title: "Forsety Verify",
    description:
      "Cryptographic evidence packs prove every dataset access event — who accessed what, when, and under which license.",
    tag: "Phase 1",
    glowColor: "rgba(212, 175, 55, 0.15)",
    iconColor: "text-gold-400",
  },
  {
    icon: Brain,
    title: "RecallVault",
    description:
      "Persistent memory for AI agents with TTL, namespaces, and Shelby backup. Every read and write is audited.",
    tag: "Phase 2",
    glowColor: "rgba(55, 170, 212, 0.15)",
    iconColor: "text-teal-400",
  },
  {
    icon: Lock,
    title: "ShieldStore",
    description:
      "Client-side AES-256-GCM encryption. Your data is encrypted before it leaves your device. Zero-knowledge by design.",
    tag: "Phase 3",
    glowColor: "rgba(97, 55, 212, 0.15)",
    iconColor: "text-violet-400",
  },
  {
    icon: Search,
    title: "Vector Search",
    description:
      "Semantic search across datasets and agent memories using local embeddings. No external API calls — fully private.",
    tag: "Phase 3",
    glowColor: "rgba(55, 170, 212, 0.15)",
    iconColor: "text-teal-400",
  },
  {
    icon: Wallet,
    title: "SIWA Authentication",
    description:
      "Sign in with your wallet. Wallet-based identity ties dataset ownership and agent management to cryptographic keys.",
    tag: "Phase 3",
    glowColor: "rgba(212, 175, 55, 0.15)",
    iconColor: "text-gold-400",
  },
  {
    icon: Server,
    title: "MCP Protocol",
    description:
      "Model Context Protocol server with stdio and SSE transports. Connect AI agents to Forsety with standard tooling.",
    tag: "Phase 3",
    glowColor: "rgba(97, 55, 212, 0.15)",
    iconColor: "text-violet-400",
  },
];

function FeatureCard({ feature }: { feature: Feature }) {
  const hoverStyle = {
    boxShadow: `0 0 40px ${feature.glowColor}`,
  };

  return (
    <motion.div
      className="group glass-card p-6 transition-colors duration-300 hover:bg-navy-100/80"
      whileHover={hoverStyle}
      whileTap={hoverStyle}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-navy-100 transition-colors group-hover:bg-navy-200/60">
          <feature.icon
            className={`h-5 w-5 ${feature.iconColor} transition-transform duration-300 group-hover:scale-110`}
          />
        </div>
        <span className="rounded-full border border-navy-200 bg-navy-50 px-2.5 py-0.5 text-xs font-medium text-navy-500">
          {feature.tag}
        </span>
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-navy-900">
        {feature.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-navy-400">
        {feature.description}
      </p>
    </motion.div>
  );
}

export function Features() {
  return (
    <section
      id="features"
      className="border-t border-navy-100 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-6">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-gold-400">
            Features
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-navy-900 sm:text-4xl">
            Everything You Need for Compliant AI
          </h2>
          <p className="mt-4 text-lg text-navy-400">
            From cryptographic proofs to encrypted storage, Forsety provides a
            complete toolkit for verifiable data access.
          </p>
        </FadeIn>

        <StaggerChildren className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <StaggerItem key={feature.title}>
              <FeatureCard feature={feature} />
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}
