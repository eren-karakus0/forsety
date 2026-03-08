import Link from "next/link";
import { Button } from "@forsety/ui";
import { ArrowRight, Shield } from "lucide-react";
import { LaunchAppButton } from "./launch-app-button";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-navy-50 to-white py-24 sm:py-32 lg:py-40">
      {/* Background Pattern */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 -top-16 h-72 w-72 rounded-full bg-gold-400/10 blur-3xl" />
        <div className="absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-navy-400/10 blur-3xl" />
        {/* Tiwaz-inspired geometric lines */}
        <svg
          className="absolute right-0 top-0 h-full w-1/2 opacity-[0.03]"
          viewBox="0 0 400 800"
          fill="none"
        >
          <line x1="200" y1="0" x2="200" y2="800" stroke="currentColor" strokeWidth="2" className="text-navy-800" />
          <line x1="200" y1="100" x2="100" y2="300" stroke="currentColor" strokeWidth="2" className="text-navy-800" />
          <line x1="200" y1="100" x2="300" y2="300" stroke="currentColor" strokeWidth="2" className="text-navy-800" />
          <line x1="200" y1="400" x2="80" y2="600" stroke="currentColor" strokeWidth="1.5" className="text-navy-800" />
          <line x1="200" y1="400" x2="320" y2="600" stroke="currentColor" strokeWidth="1.5" className="text-navy-800" />
        </svg>
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-navy-200 bg-white/80 px-4 py-1.5 text-sm font-medium text-navy-700 shadow-sm backdrop-blur-sm">
            <Shield className="h-4 w-4 text-gold-500" />
            Built on Shelby Protocol
          </div>

          {/* Headline */}
          <h1 className="font-display text-4xl font-bold tracking-tight text-navy-900 sm:text-5xl lg:text-6xl">
            Evidence Layer for{" "}
            <span className="bg-gradient-to-r from-gold-500 to-gold-600 bg-clip-text text-transparent">
              Licensed AI Data
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg leading-relaxed text-navy-600 sm:text-xl">
            We prove licensed access and compliant usage. Forsety creates
            cryptographic evidence packs that verify every dataset interaction —
            from upload to consumption.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <LaunchAppButton size="lg">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </LaunchAppButton>
            <Button variant="outline" size="lg" asChild>
              <Link href="https://github.com/eren-karakus0/forsety" target="_blank" rel="noopener noreferrer">
                View on GitHub
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
