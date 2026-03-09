"use client";

import Image from "next/image";
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
    href: "https://shelby.xyz",
    logo: "/shelby-logo.jpg",
  },
  {
    name: "Aptos",
    description: "Layer 1 Blockchain",
    href: "https://aptoslabs.com",
    logo: "/aptos-logo.png",
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
              <a
                key={partner.name}
                href={partner.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 rounded-2xl border border-navy-200/60 bg-white px-8 py-5 shadow-sm transition-all duration-300 hover:border-gold-500/30 hover:shadow-md hover:shadow-gold-500/5"
              >
                <Image
                  src={partner.logo}
                  alt={partner.name}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-lg object-contain"
                />
                <div>
                  <p className="font-display text-base font-semibold text-navy-900 transition-colors group-hover:text-gold-600">
                    {partner.name}
                  </p>
                  <p className="text-xs text-navy-400">
                    {partner.description}
                  </p>
                </div>
              </a>
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
