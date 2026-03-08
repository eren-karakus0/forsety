"use client";

import Link from "next/link";
import { Button } from "@forsety/ui";
import { ArrowRight, Github } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { GradientOrb } from "@/components/motion/gradient-orb";

export function CtaSection() {
  return (
    <section className="relative overflow-hidden border-t border-navy-100 py-20 sm:py-28">
      {/* Decorative orbs */}
      <GradientOrb color="gold" size={300} className="-left-[10%] top-[20%]" blur={80} />
      <GradientOrb color="teal" size={250} className="-right-[5%] bottom-[10%]" blur={70} />

      <div className="relative mx-auto max-w-7xl px-6">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-navy-900 sm:text-4xl lg:text-5xl">
            Ready to{" "}
            <span className="gradient-text-gold-teal">Prove Compliance</span>?
          </h2>
          <p className="mt-4 text-lg text-navy-400">
            Start building with Forsety today. Open source, TypeScript-first,
            and built for the AI era.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
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
          </div>

          <p className="mt-6 text-xs text-navy-300">
            Open source under MIT license. Contributions welcome.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
