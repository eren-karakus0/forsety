"use client";

import { Navbar } from "./components/navbar";
import { Footer } from "./components/footer";
import { SessionProvider } from "./components/session-context";
import { ScrollProgress } from "@/components/motion/scroll-progress";
import { MeshGradient } from "@/components/effects/mesh-gradient";
import { NoiseOverlay } from "@/components/effects/noise-overlay";
import { CursorGlow } from "@/components/effects/cursor-glow";
import { NetworkProvider } from "@/lib/network-context";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NetworkProvider>
      <SessionProvider>
        <div className="relative flex min-h-screen flex-col bg-background text-navy-900">
          {/* Scroll progress bar */}
          <ScrollProgress />

          {/* Animated mesh gradient background */}
          <MeshGradient />

          {/* Subtle noise texture for depth */}
          <NoiseOverlay />

          {/* Mouse-following glow (desktop only) */}
          <CursorGlow />

          <Navbar />
          <main className="relative flex-1">{children}</main>
          <Footer />
        </div>
      </SessionProvider>
    </NetworkProvider>
  );
}
