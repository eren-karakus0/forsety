"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Upload, FileCheck, ShieldCheck, type LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { FadeIn } from "@/components/motion/fade-in";

interface Step {
  number: string;
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
  glowColor: string;
  iconColor: string;
  details: string[];
}

const steps: Step[] = [
  {
    number: "01",
    icon: Upload,
    title: "Upload & License",
    description:
      "Upload your dataset to Shelby Protocol. Attach a license and define access policies — who can read, how many times, until when.",
    gradient: "from-gold-500 to-gold-600",
    glowColor: "rgba(212, 175, 55, 0.15)",
    iconColor: "text-gold-400",
    details: [
      "SPDX license types supported",
      "Granular policy rules",
      "Shelby blob storage",
    ],
  },
  {
    number: "02",
    icon: FileCheck,
    title: "Access & Audit",
    description:
      "Every data access is logged with cryptographic proofs. AI agents authenticate, policies are enforced, and every operation is recorded.",
    gradient: "from-teal-500 to-teal-600",
    glowColor: "rgba(55, 170, 212, 0.15)",
    iconColor: "text-teal-400",
    details: [
      "SHA-256 content hashes",
      "Agent API key auth",
      "Real-time audit trail",
    ],
  },
  {
    number: "03",
    icon: ShieldCheck,
    title: "Prove Compliance",
    description:
      "Generate an evidence pack — a verifiable bundle of licenses, policies, access logs, and proofs. Share it with auditors or stakeholders.",
    gradient: "from-violet-500 to-violet-600",
    glowColor: "rgba(97, 55, 212, 0.15)",
    iconColor: "text-violet-400",
    details: [
      "JSON evidence bundle",
      "Cryptographic proofs",
      "Auditor-ready format",
    ],
  },
];

const lineVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 1.2, ease: "easeInOut" as const },
  },
};

function StepCard({
  step,
  index,
  activeStep,
  onActivate,
}: {
  step: Step;
  index: number;
  activeStep: number | null;
  onActivate: (idx: number | null) => void;
}) {
  const isActive = activeStep === index;
  const isDimmed = activeStep !== null && activeStep !== index;

  const handleInteraction = useCallback(() => {
    onActivate(isActive ? null : index);
  }, [isActive, index, onActivate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleInteraction();
      }
    },
    [handleInteraction]
  );

  return (
    <motion.div
      className="relative cursor-pointer text-center outline-none focus-visible:ring-2 focus-visible:ring-gold-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-2xl"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.5,
        delay: index * 0.15,
        ease: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number],
      }}
      onClick={handleInteraction}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => onActivate(index)}
      onMouseLeave={() => onActivate(null)}
      tabIndex={0}
      role="button"
      aria-expanded={isActive}
      aria-label={`Step ${step.number}: ${step.title}`}
      style={{
        opacity: isDimmed ? 0.4 : 1,
        transition: "opacity 0.3s ease",
      }}
    >
      {/* Step Container */}
      <div
        className="mx-auto flex h-28 w-28 items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300"
        style={{
          boxShadow: isActive ? `0 0 50px ${step.glowColor}` : "none",
          borderColor: isActive ? step.glowColor : "",
        }}
      >
        <step.icon
          className={`h-10 w-10 ${step.iconColor} transition-transform duration-300 ${isActive ? "scale-110" : ""}`}
        />
      </div>

      {/* Number Badge */}
      <div
        className={`absolute -right-1 -top-1 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r ${step.gradient} text-xs font-bold text-white shadow-lg lg:-top-2 lg:left-1/2 lg:ml-12 lg:right-auto`}
      >
        {step.number}
      </div>

      <h3 className="mt-6 font-display text-xl font-semibold text-white">
        {step.title}
      </h3>
      <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-white/50">
        {step.description}
      </p>

      {/* Detail chips - visible on active (hover, click/tap, focus) */}
      <motion.div
        className="mt-4 flex flex-wrap justify-center gap-2"
        initial={false}
        animate={{
          opacity: isActive ? 1 : 0,
          height: isActive ? "auto" : 0,
        }}
        transition={{ duration: 0.3 }}
      >
        {step.details.map((detail) => (
          <span
            key={detail}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60"
          >
            {detail}
          </span>
        ))}
      </motion.div>
    </motion.div>
  );
}

function AnimatedConnector() {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return (
      <div className="absolute left-0 right-0 top-[3.5rem] hidden h-px bg-gradient-to-r from-transparent via-white/20 to-transparent lg:block" />
    );
  }

  return (
    <div className="absolute left-0 right-0 top-[3.5rem] hidden lg:block">
      <svg
        className="h-px w-full overflow-visible"
        viewBox="0 0 1000 2"
        preserveAspectRatio="none"
      >
        <motion.line
          x1="100"
          y1="1"
          x2="900"
          y2="1"
          stroke="url(#connectorGradient)"
          strokeWidth="2"
          strokeDasharray="6 4"
          variants={lineVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        />
        <defs>
          <linearGradient
            id="connectorGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="rgba(212, 175, 55, 0.4)" />
            <stop offset="50%" stopColor="rgba(55, 170, 212, 0.4)" />
            <stop offset="100%" stopColor="rgba(97, 55, 212, 0.4)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Animated flow dot */}
      <motion.div
        className="absolute top-0 h-1.5 w-1.5 rounded-full bg-gold-400"
        style={{ left: "10%" }}
        animate={{
          left: ["10%", "90%"],
          backgroundColor: [
            "rgb(212, 175, 55)",
            "rgb(55, 170, 212)",
            "rgb(97, 55, 212)",
          ],
          opacity: [0, 1, 1, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          repeatDelay: 2,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        sectionRef.current &&
        !sectionRef.current.contains(e.target as Node)
      ) {
        setActiveStep(null);
      }
    }
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  return (
    <section
      id="how-it-works"
      className="border-t border-white/5 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-6">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-gold-400">
            How it Works
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">
            Three Steps to Verifiable Compliance
          </h2>
          <p className="mt-4 text-lg text-white/50">
            From upload to evidence generation — a seamless, auditable pipeline.
          </p>
        </FadeIn>

        <div className="relative mt-16" ref={sectionRef}>
          <AnimatedConnector />

          <div className="grid gap-12 lg:grid-cols-3 lg:gap-8">
            {steps.map((step, index) => (
              <StepCard
                key={step.number}
                step={step}
                index={index}
                activeStep={activeStep}
                onActivate={setActiveStep}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
