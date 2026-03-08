"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { FadeIn } from "@/components/motion/fade-in";

type LayerKey = "app" | "sdk" | "data" | null;

interface LayerInfo {
  key: Exclude<LayerKey, null>;
  label: string;
  description: string;
}

const layerDescriptions: LayerInfo[] = [
  {
    key: "app",
    label: "Application Layer",
    description:
      "User-facing interfaces: Dashboard UI, MCP Server for AI agents, REST API for integrations, and CLI for automation.",
  },
  {
    key: "sdk",
    label: "Forsety SDK",
    description:
      "Core business logic: dataset management, evidence generation, policy engine, agent auth, RecallVault, and audit trail.",
  },
  {
    key: "data",
    label: "Storage Layer",
    description:
      "Persistent storage: Neon PostgreSQL for structured data, Shelby Protocol for immutable blob storage and commitments.",
  },
];

function DataFlowArrow({ active }: { active: boolean }) {
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div className="flex justify-center py-1">
      <div className="relative h-8 w-8">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          {mounted ? (
            <motion.path
              d="M16 4v24M8 20l8 8 8-8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={active ? "text-gold-400" : "text-navy-200"}
              initial={false}
              animate={{ opacity: active ? 1 : 0.3 }}
              transition={{ duration: 0.3 }}
            />
          ) : (
            <path
              d="M16 4v24M8 20l8 8 8-8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-navy-200"
              opacity={0.3}
            />
          )}
        </svg>

        {active && !prefersReducedMotion && mounted && (
          <motion.div
            className="absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-gold-400"
            animate={{
              top: ["0%", "100%"],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatDelay: 0.5,
              ease: "easeInOut",
            }}
          />
        )}
      </div>
    </div>
  );
}

function LayerInfoPanel({
  activeLayer,
  onSelectLayer,
}: {
  activeLayer: LayerKey;
  onSelectLayer: (key: LayerKey) => void;
}) {
  return (
    <div className="glass-card overflow-hidden p-5">
      <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-navy-300">
        Layer Details
      </div>

      <AnimatePresence mode="wait">
        {activeLayer ? (
          <motion.div
            key={activeLayer}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <h4 className="font-display text-sm font-semibold text-navy-900">
              {layerDescriptions.find((l) => l.key === activeLayer)?.label}
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-navy-400">
              {
                layerDescriptions.find((l) => l.key === activeLayer)
                  ?.description
              }
            </p>
          </motion.div>
        ) : (
          <motion.p
            key="default"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm text-navy-300"
          >
            Tap or hover over a layer to see details.
          </motion.p>
        )}
      </AnimatePresence>

      {/* Layer Legend */}
      <div className="mt-6 space-y-2.5 border-t border-navy-200 pt-4">
        {layerDescriptions.map((layer) => (
          <button
            key={layer.key}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs transition-all ${
              activeLayer === layer.key
                ? "bg-navy-100 text-navy-900"
                : "text-navy-400 hover:bg-navy-50 hover:text-navy-600"
            }`}
            onClick={() =>
              onSelectLayer(activeLayer === layer.key ? null : layer.key)
            }
            onMouseEnter={() => onSelectLayer(layer.key)}
            onMouseLeave={() => onSelectLayer(null)}
          >
            <div
              className={`h-2 w-2 rounded-full transition-all ${
                activeLayer === layer.key
                  ? "bg-gold-400 shadow-[0_0_8px_rgba(212,175,55,0.5)]"
                  : "bg-navy-200"
              }`}
            />
            {layer.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Architecture() {
  const [activeLayer, setActiveLayer] = useState<LayerKey>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  const handleLayerInteraction = useCallback(
    (key: LayerKey) => {
      setActiveLayer(key);
    },
    []
  );

  const handleLayerClick = useCallback(
    (key: Exclude<LayerKey, null>) => {
      setActiveLayer((prev) => (prev === key ? null : key));
    },
    []
  );

  const handleLayerKeyDown = useCallback(
    (e: React.KeyboardEvent, key: Exclude<LayerKey, null>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleLayerClick(key);
      }
    },
    [handleLayerClick]
  );

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        sectionRef.current &&
        !sectionRef.current.contains(e.target as Node)
      ) {
        setActiveLayer(null);
      }
    }
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  const getLayerOpacity = (layerKey: LayerKey): number => {
    if (activeLayer === null) return 1;
    return activeLayer === layerKey ? 1 : 0.35;
  };

  return (
    <section className="border-t border-navy-100 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-gold-400">
            Architecture
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-navy-900 sm:text-4xl">
            Built on Shelby Protocol
          </h2>
          <p className="mt-4 text-lg text-navy-400">
            Forsety leverages Shelby&apos;s decentralized storage for immutable
            data anchoring and blob management.
          </p>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div
            className="mx-auto mt-12 grid gap-8 lg:grid-cols-[1fr_280px]"
            ref={sectionRef}
          >
            {/* Architecture Diagram */}
            <div className="space-y-1">
              {/* Layer 1: Apps */}
              <motion.div
                className="glass-card cursor-pointer p-5 outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-gold-400/50 rounded-2xl"
                animate={{ opacity: getLayerOpacity("app") }}
                onClick={() => handleLayerClick("app")}
                onKeyDown={(e) => handleLayerKeyDown(e, "app")}
                onMouseEnter={() => handleLayerInteraction("app")}
                onMouseLeave={() => handleLayerInteraction(null)}
                tabIndex={0}
                role="button"
                aria-pressed={activeLayer === "app"}
                aria-label="Application Layer"
                style={{
                  boxShadow:
                    activeLayer === "app"
                      ? "0 0 30px rgba(13, 20, 36, 0.08)"
                      : "none",
                }}
              >
                <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-navy-300">
                  Application Layer
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {["Dashboard", "MCP Server", "REST API", "CLI"].map(
                    (app, i) => (
                      <motion.div
                        key={app}
                        className="rounded-lg bg-navy-50 px-3 py-2.5 text-center text-sm font-medium text-navy-600 transition-colors hover:bg-navy-100 hover:text-navy-900"
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 + i * 0.05 }}
                      >
                        {app}
                      </motion.div>
                    )
                  )}
                </div>
              </motion.div>

              <DataFlowArrow
                active={activeLayer === "app" || activeLayer === "sdk"}
              />

              {/* Layer 2: Forsety SDK */}
              <motion.div
                className="cursor-pointer rounded-2xl border border-gold-500/30 bg-gold-500/[0.08] p-5 shadow-xl outline-none backdrop-blur-xl transition-all duration-300 focus-visible:ring-2 focus-visible:ring-gold-400/50"
                animate={{ opacity: getLayerOpacity("sdk") }}
                onClick={() => handleLayerClick("sdk")}
                onKeyDown={(e) => handleLayerKeyDown(e, "sdk")}
                onMouseEnter={() => handleLayerInteraction("sdk")}
                onMouseLeave={() => handleLayerInteraction(null)}
                tabIndex={0}
                role="button"
                aria-pressed={activeLayer === "sdk"}
                aria-label="Forsety SDK Layer"
                style={{
                  boxShadow:
                    activeLayer === "sdk"
                      ? "0 0 40px rgba(212, 175, 55, 0.15)"
                      : "0 0 20px rgba(212, 175, 55, 0.05)",
                }}
              >
                <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-gold-400">
                  Forsety SDK
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {[
                    "Dataset Service",
                    "Evidence Pack",
                    "RecallVault",
                    "ShieldStore",
                    "Policy Engine",
                    "Agent Auth",
                    "Vector Search",
                    "Audit Trail",
                  ].map((service, i) => (
                    <motion.div
                      key={service}
                      className="rounded-lg bg-navy-100 px-3 py-2.5 text-center text-xs font-medium text-navy-700 transition-colors hover:bg-navy-200/60 hover:text-navy-900"
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + i * 0.04 }}
                    >
                      {service}
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <DataFlowArrow
                active={activeLayer === "sdk" || activeLayer === "data"}
              />

              {/* Layer 3: Data */}
              <motion.div
                className="grid gap-3 sm:grid-cols-2"
                animate={{ opacity: getLayerOpacity("data") }}
              >
                <div
                  className="glass-card cursor-pointer p-5 outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-gold-400/50 rounded-2xl"
                  onClick={() => handleLayerClick("data")}
                  onKeyDown={(e) => handleLayerKeyDown(e, "data")}
                  onMouseEnter={() => handleLayerInteraction("data")}
                  onMouseLeave={() => handleLayerInteraction(null)}
                  tabIndex={0}
                  role="button"
                  aria-pressed={activeLayer === "data"}
                  aria-label="Database Layer"
                  style={{
                    boxShadow:
                      activeLayer === "data"
                        ? "0 0 30px rgba(55, 170, 212, 0.12)"
                        : "none",
                  }}
                >
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-teal-400">
                    Database (Neon PostgreSQL)
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Datasets",
                      "Licenses",
                      "Policies",
                      "Access Logs",
                      "Evidence",
                      "Agents",
                      "Memories",
                      "Audit",
                    ].map((table) => (
                      <span
                        key={table}
                        className="rounded-md bg-navy-50 px-2 py-1 text-xs font-medium text-navy-500 transition-colors hover:bg-teal-500/10 hover:text-teal-600"
                      >
                        {table}
                      </span>
                    ))}
                  </div>
                </div>

                <div
                  className="glass-card cursor-pointer p-5 outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-gold-400/50 rounded-2xl"
                  onClick={() => handleLayerClick("data")}
                  onKeyDown={(e) => handleLayerKeyDown(e, "data")}
                  onMouseEnter={() => handleLayerInteraction("data")}
                  onMouseLeave={() => handleLayerInteraction(null)}
                  tabIndex={0}
                  role="button"
                  aria-pressed={activeLayer === "data"}
                  aria-label="Shelby Protocol Layer"
                  style={{
                    boxShadow:
                      activeLayer === "data"
                        ? "0 0 30px rgba(97, 55, 212, 0.12)"
                        : "none",
                  }}
                >
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-violet-400">
                    Shelby Protocol
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Blob Storage",
                      "Commitments",
                      "Content Hash",
                      "Devnet",
                    ].map((item) => (
                      <span
                        key={item}
                        className="rounded-md bg-navy-100 px-2 py-1 text-xs font-medium text-navy-500 transition-colors hover:bg-violet-500/10 hover:text-violet-600"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Info Panel - visible on all screen sizes */}
            <div>
              <div className="sticky top-32">
                <LayerInfoPanel
                  activeLayer={activeLayer}
                  onSelectLayer={setActiveLayer}
                />
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
