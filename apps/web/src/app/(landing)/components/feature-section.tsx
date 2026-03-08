"use client";

import { CheckCircle2 } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { GradientOrb } from "@/components/motion/gradient-orb";
import { Parallax } from "@/components/motion/parallax";
import { TiwazBackground } from "./tiwaz-background";
import { SectionLabel } from "./section-label";

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

          {/* Decorative number + accent graphic */}
          <div className="relative flex items-center justify-center">
            <FadeIn delay={0.2}>
              <SectionLabel
                number={number}
                className={isDark ? "text-white/[0.04]" : accent.numberColor}
              />
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}
