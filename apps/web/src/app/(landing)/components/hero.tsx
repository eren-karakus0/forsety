"use client";

import Link from "next/link";
import { Button } from "@forsety/ui";
import { ArrowRight, Shield, ChevronDown } from "lucide-react";
import { LaunchAppButton } from "./launch-app-button";
import { FadeIn } from "@/components/motion/fade-in";
import { GradientOrb } from "@/components/motion/gradient-orb";
import { motion } from "framer-motion";

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden pt-16">
      {/* Animated Gradient Orbs */}
      <GradientOrb color="gold" size={500} className="-left-[10%] top-[10%]" blur={100} />
      <GradientOrb color="teal" size={400} className="-right-[5%] top-[30%]" blur={90} />
      <GradientOrb color="violet" size={350} className="bottom-[10%] left-[20%]" blur={80} />

      {/* Tiwaz geometric pattern */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.04]">
        <svg className="absolute right-0 top-0 h-full w-1/2" viewBox="0 0 400 800" fill="none">
          <line x1="200" y1="0" x2="200" y2="800" stroke="currentColor" strokeWidth="1" className="text-navy-300" />
          <line x1="200" y1="100" x2="100" y2="300" stroke="currentColor" strokeWidth="1" className="text-navy-300" />
          <line x1="200" y1="100" x2="300" y2="300" stroke="currentColor" strokeWidth="1" className="text-navy-300" />
          <line x1="200" y1="400" x2="80" y2="600" stroke="currentColor" strokeWidth="0.5" className="text-navy-300" />
          <line x1="200" y1="400" x2="320" y2="600" stroke="currentColor" strokeWidth="0.5" className="text-navy-300" />
        </svg>
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <FadeIn delay={0.1}>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-navy-200 bg-navy-50 px-4 py-1.5 text-sm font-medium text-navy-700 backdrop-blur-sm">
              <Shield className="h-4 w-4 text-gold-400" />
              Built on Shelby Protocol
            </div>
          </FadeIn>

          {/* Headline */}
          <FadeIn delay={0.2}>
            <h1 className="font-display text-4xl font-bold tracking-tight text-navy-900 sm:text-5xl lg:text-7xl">
              Evidence Layer for{" "}
              <span className="gradient-text-gold-teal">
                Licensed AI Data
              </span>
            </h1>
          </FadeIn>

          {/* Subtitle */}
          <FadeIn delay={0.35}>
            <p className="mt-6 text-lg leading-relaxed text-navy-500 sm:text-xl">
              We prove licensed access and compliant usage. Forsety creates
              cryptographic evidence packs that verify every dataset interaction —
              from upload to consumption.
            </p>
          </FadeIn>

          {/* CTAs */}
          <FadeIn delay={0.5}>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <LaunchAppButton
                size="lg"
                className="bg-gradient-to-r from-gold-500 to-teal-500 text-white font-semibold hover:from-gold-400 hover:to-teal-400 border-0 glow-gold"
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </LaunchAppButton>
              <Button
                variant="outline"
                size="lg"
                className="border-navy-300 bg-navy-50 text-navy-700 hover:bg-navy-100 hover:text-navy-900 backdrop-blur-sm"
                asChild
              >
                <Link
                  href="https://github.com/eren-karakus0/forsety"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on GitHub
                </Link>
              </Button>
            </div>
          </FadeIn>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <ChevronDown className="h-6 w-6 text-navy-300" />
      </motion.div>
    </section>
  );
}
