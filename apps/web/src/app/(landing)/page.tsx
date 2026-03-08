import { Hero } from "./components/hero";
import { Problem } from "./components/problem";
import { Features } from "./components/features";
import { HowItWorks } from "./components/how-it-works";
import { Architecture } from "./components/architecture";
import { ForDevelopers } from "./components/for-developers";
import { DemoPreview } from "./components/demo-preview";
import { Stats } from "./components/stats";
import { TrustedBy } from "./components/trusted-by";
import { CtaSection } from "./components/cta-section";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Problem />
      <Features />
      <HowItWorks />
      <Architecture />
      <ForDevelopers />
      <DemoPreview />
      <Stats />
      <TrustedBy />
      <CtaSection />
    </>
  );
}
