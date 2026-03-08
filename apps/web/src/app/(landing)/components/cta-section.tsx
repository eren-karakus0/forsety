"use client";

import Link from "next/link";
import { Button } from "@forsety/ui";
import { ArrowRight, Github } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { GradientOrb } from "@/components/motion/gradient-orb";
import { Magnetic } from "@/components/motion/magnetic";
import { TextReveal } from "@/components/motion/text-reveal";
import { Parallax } from "@/components/motion/parallax";
import { ScrollReveal } from "@/components/motion/scroll-reveal";

export function CtaSection() {
  return (
    <section className="relative overflow-hidden border-t border-navy-100 py-20 sm:py-28">
      {/* Decorative orbs with parallax */}
      <Parallax speed={0.2} direction="up">
        <GradientOrb color="gold" size={300} className="-left-[10%] top-[20%]" blur={80} />
      </Parallax>
      <Parallax speed={0.3} direction="down">
        <GradientOrb color="teal" size={250} className="-right-[5%] bottom-[10%]" blur={70} />
      </Parallax>

      <div className="relative mx-auto max-w-7xl px-6">
        <ScrollReveal>
          <FadeIn className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold text-navy-900 sm:text-4xl lg:text-5xl">
              <TextReveal variant="word" as="span">
                Ready to
              </TextReveal>{" "}
              <span className="gradient-text-gold-teal">
                <TextReveal variant="word" as="span">
                  Prove Compliance
                </TextReveal>
              </span>
              ?
            </h2>
            <p className="mt-4 text-lg text-navy-400">
              Start building with Forsety today. Open source, TypeScript-first,
              and built for the AI era.
            </p>

            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Magnetic strength={0.15}>
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-gold-500 to-teal-500 text-white font-semibold hover:from-gold-400 hover:to-teal-400 border-0 glow-gold"
                  asChild
                >
                  <Link href="/dashboard">
                    Launch Dashboard
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
                    <Github className="mr-2 h-4 w-4" />
                    Star on GitHub
                  </Link>
                </Button>
              </Magnetic>
            </div>

            <p className="mt-6 text-xs text-navy-300">
              Open source under MIT license. Contributions welcome.
            </p>
          </FadeIn>
        </ScrollReveal>
      </div>
    </section>
  );
}
