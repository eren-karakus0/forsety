"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Button } from "@forsety/ui";
import { ArrowRight } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { ScrollReveal } from "@/components/motion/scroll-reveal";

interface TerminalLine {
  text: string;
  type: "command" | "success" | "json" | "comment";
  delay: number;
}

const terminalLines: TerminalLine[] = [
  { text: "$ forsety upload training-data.csv", type: "command", delay: 0 },
  { text: "✓ Uploaded to Shelby Protocol", type: "success", delay: 800 },
  { text: "", type: "comment", delay: 400 },
  { text: "$ forsety evidence generate abc123", type: "command", delay: 600 },
  { text: "✓ Evidence pack created", type: "success", delay: 800 },
  { text: "", type: "comment", delay: 200 },
  { text: "{", type: "json", delay: 300 },
  { text: '  "version": "2.0.0",', type: "json", delay: 150 },
  { text: '  "licenses": ["Apache-2.0"],', type: "json", delay: 150 },
  { text: '  "proofs": [{ "hash": "sha256:a1b2..." }],', type: "json", delay: 150 },
  { text: '  "auditTrail": { "events": 42 }', type: "json", delay: 150 },
  { text: "}", type: "json", delay: 150 },
];

const lineColors: Record<string, string> = {
  command: "text-navy-100",
  success: "text-emerald-400",
  json: "text-gold-400/80",
  comment: "text-navy-500",
};

function TerminalDemo() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [started, setStarted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runAnimation = useCallback(() => {
    setVisibleLines(0);
    setStarted(true);

    let currentLine = 0;
    let totalDelay = 0;

    const showLine = () => {
      if (currentLine >= terminalLines.length) {
        // Restart after pause
        timerRef.current = setTimeout(() => {
          runAnimation();
        }, 4000);
        return;
      }

      totalDelay = terminalLines[currentLine]!.delay;
      currentLine++;

      timerRef.current = setTimeout(() => {
        setVisibleLines(currentLine);
        showLine();
      }, totalDelay);
    };

    showLine();
  }, []);

  useEffect(() => {
    if (!started) {
      const initTimer = setTimeout(() => runAnimation(), 500);
      return () => clearTimeout(initTimer);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [started, runAnimation]);

  return (
    <div className="glass-card overflow-hidden shadow-[0_0_60px_rgba(13,20,36,0.1)]">
      {/* Terminal header */}
      <div className="flex items-center gap-2 border-b border-navy-800 bg-navy-900 px-4 py-3">
        <div className="h-3 w-3 rounded-full bg-red-400/80" />
        <div className="h-3 w-3 rounded-full bg-yellow-400/80" />
        <div className="h-3 w-3 rounded-full bg-emerald-400/80" />
        <span className="ml-2 text-xs text-navy-400 font-mono">forsety-cli</span>
      </div>

      {/* Terminal body */}
      <pre className="bg-navy-900 p-5 text-sm leading-relaxed font-mono min-h-[280px]">
        <code>
          {terminalLines.slice(0, visibleLines).map((line, i) => (
            <span key={i}>
              <span className={lineColors[line.type]}>{line.text}</span>
              {"\n"}
            </span>
          ))}
          {visibleLines < terminalLines.length && (
            <span className="inline-block h-4 w-2 animate-blink bg-gold-400" />
          )}
        </code>
      </pre>
    </div>
  );
}

export function DemoPreview() {
  return (
    <section className="py-20 sm:py-28">
      <div className="section-divider mx-auto max-w-5xl mb-20 sm:mb-28" />
      <div className="mx-auto max-w-7xl px-6">
        <ScrollReveal>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left column — text */}
            <FadeIn>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-gold-400">
                  See It in Action
                </p>
                <h2 className="mt-3 font-display text-3xl font-bold text-navy-900 sm:text-4xl">
                  From Upload to Evidence in Seconds
                </h2>
                <p className="mt-4 text-lg text-navy-400 leading-relaxed">
                  Upload a dataset, attach a license, and generate a cryptographic
                  evidence pack — all through a simple CLI or SDK call. Every step
                  is logged and verifiable.
                </p>
                <div className="mt-8">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-gold-500 to-teal-500 text-white font-semibold hover:from-gold-400 hover:to-teal-400 border-0 glow-gold-lg"
                    asChild
                  >
                    <Link href="/dashboard">
                      Try Dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </FadeIn>

            {/* Right column — terminal */}
            <FadeIn delay={0.2}>
              <TerminalDemo />
            </FadeIn>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
