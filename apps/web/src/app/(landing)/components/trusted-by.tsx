"use client";

import { FadeIn } from "@/components/motion/fade-in";

const partners = [
  "Shelby Protocol",
  "Aptos",
  "PostgreSQL",
  "Drizzle ORM",
  "MCP",
  "TypeScript",
  "Next.js",
  "Vercel",
];

function MarqueeRow({ reverse = false }: { reverse?: boolean }) {
  return (
    <div className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <div
        className={`flex shrink-0 gap-8 py-4 ${reverse ? "animate-marquee direction-reverse" : "animate-marquee"}`}
        style={reverse ? { animationDirection: "reverse" } : undefined}
      >
        {[...partners, ...partners].map((name, i) => (
          <div
            key={`${name}-${i}`}
            className="flex items-center gap-2 whitespace-nowrap rounded-full border border-navy-200/60 bg-white/60 px-5 py-2.5 text-sm font-medium text-navy-500 backdrop-blur-sm transition-colors hover:border-gold-500/30 hover:text-navy-700"
          >
            <div className="h-1.5 w-1.5 rounded-full bg-gold-400" />
            {name}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrustedBy() {
  return (
    <section className="py-16 sm:py-20">
      <div className="section-divider mx-auto max-w-5xl mb-16 sm:mb-20" />
      <div className="mx-auto max-w-7xl px-6">
        <FadeIn className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-gold-400">
            Built With
          </p>
          <h2 className="mt-3 font-display text-2xl font-bold text-navy-900 sm:text-3xl">
            Industry-Leading Infrastructure
          </h2>
        </FadeIn>

        <div className="mt-12 space-y-2">
          <MarqueeRow />
          <MarqueeRow reverse />
        </div>
      </div>
    </section>
  );
}
