import { Card, CardContent } from "@forsety/ui";
import {
  ShieldCheck,
  Brain,
  Lock,
  Search,
  Wallet,
  Server,
} from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "Forsety Verify",
    description:
      "Cryptographic evidence packs prove every dataset access event — who accessed what, when, and under which license.",
    tag: "Phase 1",
  },
  {
    icon: Brain,
    title: "RecallVault",
    description:
      "Persistent memory for AI agents with TTL, namespaces, and Shelby backup. Every read and write is audited.",
    tag: "Phase 2",
  },
  {
    icon: Lock,
    title: "ShieldStore",
    description:
      "Client-side AES-256-GCM encryption. Your data is encrypted before it leaves your device. Zero-knowledge by design.",
    tag: "Phase 3",
  },
  {
    icon: Search,
    title: "Vector Search",
    description:
      "Semantic search across datasets and agent memories using local embeddings. No external API calls — fully private.",
    tag: "Phase 3",
  },
  {
    icon: Wallet,
    title: "SIWA Authentication",
    description:
      "Sign in with your wallet. Wallet-based identity ties dataset ownership and agent management to cryptographic keys.",
    tag: "Phase 3",
  },
  {
    icon: Server,
    title: "MCP Protocol",
    description:
      "Model Context Protocol server with stdio and SSE transports. Connect AI agents to Forsety with standard tooling.",
    tag: "Phase 3",
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="border-t border-navy-100 bg-navy-50/30 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-gold-600">
            Features
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-navy-900 sm:text-4xl">
            Everything You Need for Compliant AI
          </h2>
          <p className="mt-4 text-lg text-navy-500">
            From cryptographic proofs to encrypted storage, Forsety provides a
            complete toolkit for verifiable data access.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="group border-navy-100 bg-white transition-all hover:border-gold-300 hover:shadow-md"
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-navy-800 transition-colors group-hover:bg-gold-500">
                    <feature.icon className="h-5 w-5 text-gold-400 transition-colors group-hover:text-navy-900" />
                  </div>
                  <span className="rounded-full bg-navy-100 px-2.5 py-0.5 text-xs font-medium text-navy-600">
                    {feature.tag}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-navy-800">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-500">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
