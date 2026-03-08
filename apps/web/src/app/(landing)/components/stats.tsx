"use client";

import { StaggerChildren, StaggerItem } from "@/components/motion/stagger-children";
import { Counter } from "@/components/motion/counter";

const stats = [
  { value: "8", label: "Database Tables", description: "Comprehensive schema" },
  { value: "171+", label: "Tests Passing", description: "Quality assured" },
  { value: "6", label: "MCP Tools", description: "Agent integration" },
  { value: "8", label: "SDK Services", description: "Full-stack SDK" },
];

export function Stats() {
  return (
    <section className="border-t border-navy-100 bg-gradient-to-b from-navy-50 to-transparent py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-6">
        <StaggerChildren className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {stats.map((stat) => (
            <StaggerItem key={stat.label}>
              <div className="glass-card p-6 text-center transition-all duration-300 hover:bg-navy-100/80">
                <Counter
                  value={stat.value}
                  className="font-display text-4xl font-bold gradient-text-gold-teal sm:text-5xl"
                />
                <div className="mt-2 text-sm font-semibold text-navy-900">
                  {stat.label}
                </div>
                <div className="mt-1 text-xs text-navy-300">
                  {stat.description}
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}
