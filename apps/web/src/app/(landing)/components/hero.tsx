"use client";

import Link from "next/link";
import { useRef } from "react";
import { Button } from "@forsety/ui";
import { ArrowRight, Shield, ChevronDown } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { GradientOrb } from "@/components/motion/gradient-orb";
import { Magnetic } from "@/components/motion/magnetic";
import { TextReveal } from "@/components/motion/text-reveal";
import { motion, useMotionValue, useTransform, useScroll } from "framer-motion";

function useMouseParallax(strength: number = 0.02) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const handleMouse = (e: React.MouseEvent) => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    x.set((e.clientX - centerX) * strength);
    y.set((e.clientY - centerY) * strength);
  };

  return { x, y, handleMouse };
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const { x, y, handleMouse } = useMouseParallax(0.03);

  // Scroll-linked opacity fade for transition to next section
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8, 1], [1, 1, 0.3]);

  // Orb parallax transforms — must be at top level (hook rules)
  const tealOrbX = useTransform(x, (v) => v * -0.7);
  const tealOrbY = useTransform(y, (v) => v * -0.7);
  const violetOrbX = useTransform(x, (v) => v * 0.5);
  const violetOrbY = useTransform(y, (v) => v * 0.5);

  return (
    <motion.section
      ref={sectionRef}
      className="relative flex min-h-screen items-center overflow-hidden pt-16"
      onMouseMove={handleMouse}
      style={{ opacity: heroOpacity }}
    >
      {/* Animated Gradient Orbs with mouse parallax */}
      <motion.div className="pointer-events-none" style={{ x, y }}>
        <GradientOrb color="gold" size={500} className="-left-[10%] top-[10%]" blur={100} />
      </motion.div>
      <motion.div
        className="pointer-events-none"
        style={{ x: tealOrbX, y: tealOrbY }}
      >
        <GradientOrb color="teal" size={400} className="-right-[5%] top-[30%]" blur={90} />
      </motion.div>
      <motion.div
        className="pointer-events-none"
        style={{ x: violetOrbX, y: violetOrbY }}
      >
        <GradientOrb color="violet" size={350} className="bottom-[10%] left-[20%]" blur={80} />
      </motion.div>

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

          {/* Headline with word-by-word reveal */}
          <FadeIn delay={0.15}>
            <h1 className="font-display text-4xl font-bold tracking-tight text-navy-900 sm:text-5xl lg:text-7xl">
              <TextReveal variant="word" as="span" staggerDelay={0.05} duration={0.6}>
                Evidence Layer for
              </TextReveal>{" "}
              <span className="gradient-text-gold-teal">
                <TextReveal variant="word" as="span" staggerDelay={0.05} duration={0.6}>
                  Licensed AI Data
                </TextReveal>
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

          {/* CTAs with Magnetic wrapper */}
          <FadeIn delay={0.5}>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Magnetic strength={0.15}>
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-gold-500 to-teal-500 text-white font-semibold hover:from-gold-400 hover:to-teal-400 border-0 glow-gold"
                  asChild
                >
                  <Link href="/dashboard">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </Magnetic>
              <Magnetic strength={0.15}>
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
              </Magnetic>
            </div>
          </FadeIn>
        </div>
      </div>

      {/* Scroll indicator with enhanced pulse */}
      <motion.div
        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="text-[10px] font-medium uppercase tracking-widest text-navy-300">
          Scroll
        </span>
        <ChevronDown className="h-5 w-5 text-navy-300 animate-pulse" />
      </motion.div>
    </motion.section>
  );
}
