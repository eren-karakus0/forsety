import { Upload, FileCheck, ShieldCheck } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Upload & License",
    description:
      "Upload your dataset to Shelby Protocol. Attach a license and define access policies — who can read, how many times, until when.",
  },
  {
    number: "02",
    icon: FileCheck,
    title: "Access & Audit",
    description:
      "Every data access is logged with cryptographic proofs. AI agents authenticate, policies are enforced, and every operation is recorded.",
  },
  {
    number: "03",
    icon: ShieldCheck,
    title: "Prove Compliance",
    description:
      "Generate an evidence pack — a verifiable bundle of licenses, policies, access logs, and proofs. Share it with auditors or stakeholders.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-t border-navy-100 bg-white py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-gold-600">
            How it Works
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-navy-900 sm:text-4xl">
            Three Steps to Verifiable Compliance
          </h2>
        </div>

        <div className="relative mt-16">
          {/* Connector Line (desktop only) */}
          <div className="absolute left-0 right-0 top-[3.25rem] hidden h-px bg-gradient-to-r from-transparent via-navy-200 to-transparent lg:block" />

          <div className="grid gap-12 lg:grid-cols-3 lg:gap-8">
            {steps.map((step) => (
              <div key={step.number} className="relative text-center">
                {/* Step Circle */}
                <div className="mx-auto flex h-[6.5rem] w-[6.5rem] items-center justify-center rounded-2xl border-2 border-navy-200 bg-white shadow-sm">
                  <step.icon className="h-8 w-8 text-navy-700" />
                </div>

                {/* Number Badge */}
                <div className="absolute -right-2 -top-2 mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-gold-500 text-xs font-bold text-navy-900 shadow-md lg:left-auto lg:right-auto lg:-top-3 lg:left-1/2 lg:ml-10">
                  {step.number}
                </div>

                <h3 className="mt-6 font-display text-xl font-semibold text-navy-800">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-navy-500">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
