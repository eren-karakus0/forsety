import { Card, CardContent } from "@forsety/ui";
import { AlertTriangle, Eye, FileWarning } from "lucide-react";

const painPoints = [
  {
    icon: FileWarning,
    title: "No Proof of License",
    description:
      "AI companies use datasets without verifiable evidence of proper licensing. When audited, there is no trail to prove compliance.",
  },
  {
    icon: Eye,
    title: "Opaque Data Access",
    description:
      "Dataset access is invisible — no one knows who accessed what, when, or under which policy. Disputes are unresolvable.",
  },
  {
    icon: AlertTriangle,
    title: "Agent Accountability Gap",
    description:
      "AI agents consume data autonomously with zero audit trail. There is no way to verify what data they read or modified.",
  },
];

export function Problem() {
  return (
    <section className="border-t border-navy-100 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-gold-600">
            The Problem
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-navy-900 sm:text-4xl">
            AI Data Compliance Is Broken
          </h2>
          <p className="mt-4 text-lg text-navy-500">
            As AI scales, the gap between data usage and verifiable compliance
            widens. Current solutions rely on trust — not proof.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {painPoints.map((point) => (
            <Card
              key={point.title}
              className="border-navy-100 bg-navy-50/50 transition-shadow hover:shadow-md"
            >
              <CardContent className="pt-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-navy-800">
                  <point.icon className="h-5 w-5 text-gold-400" />
                </div>
                <h3 className="font-display text-lg font-semibold text-navy-800">
                  {point.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-500">
                  {point.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
