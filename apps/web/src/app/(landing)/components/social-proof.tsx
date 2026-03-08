"use client";

import { Code2, Lock, Shield } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import {
  StaggerChildren,
  StaggerItem,
} from "@/components/motion/stagger-children";

const technologies = [
  "Shelby Protocol",
  "Aptos",
  "Next.js",
  "TypeScript",
  "PostgreSQL",
  "MCP",
  "Drizzle ORM",
  "Vercel",
];

const metrics = [
  {
    icon: Code2,
    label: "Open Source",
    detail: "MIT License",
    color: "text-gold-500",
  },
  {
    icon: Lock,
    label: "Type-Safe",
    detail: "End-to-end TypeScript",
    color: "text-teal-500",
  },
  {
    icon: Shield,
    label: "Verifiable",
    detail: "Cryptographic proofs",
    color: "text-violet-500",
  },
];

function MarqueeRow({ reverse = false }: { reverse?: boolean }) {
  return (
    <div className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <div
        className={`flex shrink-0 gap-8 py-4 ${reverse ? "animate-marquee direction-reverse" : "animate-marquee"}`}
        style={reverse ? { animationDirection: "reverse" } : undefined}
      >
        {[...technologies, ...technologies].map((name, i) => (
          <div
            key={`${name}-${i}`}
            className="flex items-center gap-2 whitespace-nowrap rounded-full border border-navy-200/60 bg-white/60 px-5 py-2.5 text-sm font-medium text-navy-500 backdrop-blur-sm transition-all hover:border-gold-500/30 hover:text-navy-700 hover:shadow-[0_0_12px_rgba(212,175,55,0.15)]"
          >
            <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-gold-400 to-teal-400" />
            {name}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SocialProof() {
  return (
    <section className="relative overflow-hidden bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <ScrollReveal>
          <FadeIn className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-gold-400">
              Built With
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold text-navy-900 sm:text-3xl">
              Trusted Infrastructure
            </h2>
          </FadeIn>
        </ScrollReveal>

        <div className="mt-12 space-y-2">
          <MarqueeRow />
          <MarqueeRow reverse />
        </div>

        <StaggerChildren
          className="mx-auto mt-16 grid max-w-3xl gap-8 sm:grid-cols-3"
          staggerDelay={0.12}
        >
          {metrics.map((metric) => (
            <StaggerItem key={metric.label}>
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-navy-200/60 bg-navy-50">
                  <metric.icon className={`h-6 w-6 ${metric.color}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy-900">
                    {metric.label}
                  </p>
                  <p className="mt-1 text-xs text-navy-400">{metric.detail}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}
