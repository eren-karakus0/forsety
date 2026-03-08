"use client";

import { Code2, Lock, Shield } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import {
  StaggerChildren,
  StaggerItem,
} from "@/components/motion/stagger-children";

const partners = [
  {
    name: "Shelby Protocol",
    description: "Decentralized Storage",
    logo: (
      <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none">
        <rect width="32" height="32" rx="8" fill="#0066FF" />
        <path d="M16 6L16 26M16 10L9 16M16 10L23 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    name: "Aptos",
    description: "Layer 1 Blockchain",
    logo: (
      <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none">
        <rect width="32" height="32" rx="8" fill="#000000" />
        <path d="M22.5 10.5H18.5L16 13.5L13.5 10.5H9.5L14 16L9.5 21.5H13.5L16 18.5L18.5 21.5H22.5L18 16L22.5 10.5Z" fill="white" />
      </svg>
    ),
  },
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

export function SocialProof() {
  return (
    <section className="relative overflow-hidden bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <ScrollReveal>
          <FadeIn className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-gold-400">
              Built On
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold text-navy-900 sm:text-3xl">
              Trusted Infrastructure
            </h2>
          </FadeIn>
        </ScrollReveal>

        {/* Partner logos */}
        <FadeIn delay={0.15}>
          <div className="mx-auto mt-12 flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {partners.map((partner) => (
              <div
                key={partner.name}
                className="group flex items-center gap-4 rounded-2xl border border-navy-200/60 bg-white px-8 py-5 shadow-sm transition-all duration-300 hover:border-gold-500/30 hover:shadow-md hover:shadow-gold-500/5"
              >
                {partner.logo}
                <div>
                  <p className="font-display text-base font-semibold text-navy-900 transition-colors group-hover:text-gold-600">
                    {partner.name}
                  </p>
                  <p className="text-xs text-navy-400">
                    {partner.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>

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
