"use client";

import { AlertTriangle, Eye, Scale } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { TiwazBackground } from "./tiwaz-background";

const painPoints = [
  {
    icon: AlertTriangle,
    text: "No proof of licensed access",
    color: "text-gold-500",
  },
  {
    icon: Eye,
    text: "No visibility into data usage",
    color: "text-teal-500",
  },
  {
    icon: Scale,
    text: "No audit trail for compliance",
    color: "text-violet-500",
  },
];

export function ValueProp() {
  return (
    <section className="section-fullscreen relative overflow-hidden bg-white dark:bg-navy-950">
      <TiwazBackground variant="light" side="left" />

      <div className="relative mx-auto max-w-7xl px-6">
        <ScrollReveal>
          <FadeIn className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-gold-400">
              The Problem
            </p>
            <h2 className="mt-4 font-display text-3xl font-bold text-navy-900 dark:text-navy-100 sm:text-4xl lg:text-5xl">
              AI Uses Your Data.{" "}
              <span className="gradient-text-gold-teal">
                But Can You Prove It Was Licensed?
              </span>
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-navy-500 dark:text-navy-300">
              Data providers license content to AI companies, but there&apos;s no
              verifiable record of access or compliance. When disputes arise,
              both sides lack evidence. Forsety changes that.
            </p>
          </FadeIn>
        </ScrollReveal>

        <FadeIn delay={0.3}>
          <div className="mx-auto mt-16 grid max-w-3xl gap-8 sm:grid-cols-3">
            {painPoints.map((point) => (
              <div key={point.text} className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-navy-200/60 bg-navy-50 dark:border-navy-700 dark:bg-navy-800">
                  <point.icon className={`h-6 w-6 ${point.color}`} />
                </div>
                <p className="text-sm font-medium text-navy-600 dark:text-navy-200">{point.text}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
