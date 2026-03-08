import { Hero } from "./components/hero";
import { ValueProp } from "./components/value-prop";
import { FeatureSection } from "./components/feature-section";
import {
  VerifyIllustration,
  RecallIllustration,
  ShieldIllustration,
} from "./components/feature-illustrations";
import { HowItWorks } from "./components/how-it-works";
import { SocialProof } from "./components/social-proof";
import { CtaSection } from "./components/cta-section";

const verifyFeature = {
  number: "01",
  kicker: "VERIFY",
  title: "Cryptographic Evidence Packs",
  description:
    "Generate tamper-proof bundles containing licenses, access logs, and cryptographic proofs. Every dataset interaction is recorded and verifiable, ready to share with auditors or stakeholders.",
  highlights: [
    "Immutable records of every data access event",
    "Licenses, policies, and proofs bundled together",
    "Shareable, auditor-ready evidence format",
    "Built on Shelby Protocol for decentralized storage",
  ],
  accentColor: "gold" as const,
  id: "verify",
};

const recallFeature = {
  number: "02",
  kicker: "RECALL",
  title: "Persistent Agent Memory",
  description:
    "Give AI agents persistent, namespace-scoped memory with automatic TTL expiration. Every memory operation is logged, creating a complete audit trail of agent behavior.",
  highlights: [
    "Key-value storage scoped by agent and namespace",
    "Automatic expiration with configurable TTL",
    "Full audit trail of all memory operations",
    "Optional backup to decentralized storage",
  ],
  accentColor: "teal" as const,
  id: "recall",
};

const shieldFeature = {
  number: "03",
  kicker: "SHIELD",
  title: "Policy Engine & Access Control",
  description:
    "Define granular access policies for your datasets. Control who can access data, how many times, and until when. Every policy decision is enforced and logged automatically.",
  highlights: [
    "Granular per-dataset access policies",
    "Time-based and usage-limit enforcement",
    "Versioned policy history with atomic updates",
    "Secure agent authentication and authorization",
  ],
  accentColor: "violet" as const,
  id: "shield",
};

export default function LandingPage() {
  return (
    <>
      <Hero />
      <ValueProp />
      <FeatureSection {...verifyFeature} variant="dark" tiwazSide="right" illustration={<VerifyIllustration />} />
      <FeatureSection {...recallFeature} variant="light" tiwazSide="left" illustration={<RecallIllustration />} />
      <FeatureSection {...shieldFeature} variant="dark" tiwazSide="right" illustration={<ShieldIllustration />} />
      <div className="section-tinted">
        <HowItWorks />
      </div>
      <SocialProof />
      <div className="section-tinted">
        <CtaSection />
      </div>
    </>
  );
}
