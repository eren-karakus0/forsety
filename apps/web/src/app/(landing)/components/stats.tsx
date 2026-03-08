"use client";

import { StaggerChildren, StaggerItem } from "@/components/motion/stagger-children";
import { Counter } from "@/components/motion/counter";
import { TiltCard } from "@/components/motion/tilt-card";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { GradientOrb } from "@/components/motion/gradient-orb";

const stats = [
  { value: "8", label: "Database Tables", description: "Comprehensive schema" },
  { value: "171+", label: "Tests Passing", description: "Quality assured" },
  { value: "6", label: "MCP Tools", description: "Agent integration" },
  { value: "8", label: "SDK Services", description: "Full-stack SDK" },
];

export function Stats() {
  return (
    <section className="relative border-t border-navy-100 overflow-hidden bg-gradient-to-b from-navy-50 to-transparent py-16 sm:py-20">
      {/* Background orbs */}
      <GradientOrb color="gold" size={300} className="-left-[10%] top-[20%]" blur={100} />
      <GradientOrb color="teal" size={250} className="-right-[10%] bottom-[10%]" blur={80} />

      <div className="relative mx-auto max-w-7xl px-6">
        <ScrollReveal>
          <StaggerChildren className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {stats.map((stat) => (
              <StaggerItem key={stat.label}>
                <TiltCard className="h-full">
                  <div className="glass-card h-full p-6 text-center transition-all duration-300 hover:bg-navy-100/80 hover:shadow-lg">
                    <Counter
                      value={stat.value}
                      className="font-display text-5xl font-bold gradient-text-gold-teal sm:text-6xl"
                    />
                    <div className="mt-2 text-sm font-semibold text-navy-900">
                      {stat.label}
                    </div>
                    <div className="mt-1 text-xs text-navy-300">
                      {stat.description}
                    </div>
                  </div>
                </TiltCard>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </ScrollReveal>
      </div>
    </section>
  );
}
