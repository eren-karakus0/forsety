"use client";

import { type ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { GradientOrb } from "@/components/motion/gradient-orb";
import { Parallax } from "@/components/motion/parallax";
import { TiwazBackground } from "./tiwaz-background";

interface FeatureSectionProps {
  number: string;
  kicker: string;
  title: string;
  description: string;
  highlights: string[];
  accentColor: "gold" | "teal" | "violet";
  variant: "dark" | "light";
  tiwazSide: "left" | "right";
  id?: string;
  illustration?: ReactNode;
}

const accentMap = {
  gold: {
    kicker: "text-gold-400",
    check: "text-gold-400",
    glow: "gold" as const,
    numberColor: "text-gold-500/10",
  },
  teal: {
    kicker: "text-teal-400",
    check: "text-teal-400",
    glow: "teal" as const,
    numberColor: "text-teal-500/10",
  },
  violet: {
    kicker: "text-violet-400",
    check: "text-violet-400",
    glow: "violet" as const,
    numberColor: "text-violet-500/10",
  },
};

export function FeatureSection({
  number,
  kicker,
  title,
  description,
  highlights,
  accentColor,
  variant,
  tiwazSide,
  id,
  illustration,
}: FeatureSectionProps) {
  const isDark = variant === "dark";
  const accent = accentMap[accentColor];
  const isReversed = tiwazSide === "left";

  return (
    <section
      id={id}
      className={`section-fullscreen relative overflow-hidden ${
        isDark
          ? "bg-navy-900 text-white"
          : "bg-white text-navy-900"
      }`}
    >
      <TiwazBackground
        variant={isDark ? "dark" : "light"}
        side={tiwazSide}
      />

      {/* Decorative orb */}
      <Parallax speed={0.2} direction="down">
        <GradientOrb
          color={accent.glow}
          size={450}
          className={`${isReversed ? "-right-[10%]" : "-left-[10%]"} top-[20%]`}
          blur={100}
        />
      </Parallax>

      <div className="relative mx-auto max-w-7xl px-6">
        <div
          className={`grid items-center gap-12 lg:grid-cols-2 lg:gap-20 ${
            isReversed ? "lg:[direction:rtl] lg:[&>*]:[direction:ltr]" : ""
          }`}
        >
          {/* Text content */}
          <div>
            <ScrollReveal>
              <FadeIn>
                <p
                  className={`text-sm font-semibold uppercase tracking-wider ${accent.kicker}`}
                >
                  {kicker}
                </p>
                <h2
                  className={`mt-4 font-display text-3xl font-bold sm:text-4xl lg:text-5xl ${
                    isDark ? "text-white" : "text-navy-900"
                  }`}
                >
                  {title}
                </h2>
                <p
                  className={`mt-6 max-w-lg text-lg leading-relaxed ${
                    isDark ? "text-navy-300" : "text-navy-500"
                  }`}
                >
                  {description}
                </p>

                <ul className="mt-8 space-y-3">
                  {highlights.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2
                        className={`mt-0.5 h-5 w-5 shrink-0 ${accent.check}`}
                      />
                      <span
                        className={`text-sm ${
                          isDark ? "text-navy-200" : "text-navy-600"
                        }`}
                      >
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </FadeIn>
            </ScrollReveal>
          </div>

          {/* Illustration + section number overlay */}
          <div className="relative flex items-center justify-center">
            {illustration ? (
              <ScrollReveal>
                <FadeIn delay={0.2}>
                  {/* Section number behind illustration */}
                  <span
                    className={`pointer-events-none absolute inset-0 flex select-none items-center justify-center font-display text-[10rem] font-bold leading-none ${
                      isDark ? "text-white/[0.03]" : accent.numberColor
                    }`}
                    style={{
                      WebkitTextStroke: isDark ? "1px rgba(255,255,255,0.02)" : "1px currentColor",
                      WebkitTextFillColor: "transparent",
                    }}
                    aria-hidden="true"
                  >
                    {number}
                  </span>
                  {illustration}
                </FadeIn>
              </ScrollReveal>
            ) : (
              <FadeIn delay={0.2}>
                <span
                  className={`section-number select-none ${isDark ? "text-white/[0.04]" : accent.numberColor}`}
                  aria-hidden="true"
                >
                  {number}
                </span>
              </FadeIn>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
