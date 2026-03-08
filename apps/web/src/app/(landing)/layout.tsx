"use client";

import { Navbar } from "./components/navbar";
import { Footer } from "./components/footer";
import { SessionProvider } from "./components/session-context";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="relative flex min-h-screen flex-col bg-white text-navy-900">
        {/* Gradient mesh background */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-[20%] -top-[10%] h-[600px] w-[600px] rounded-full bg-teal-500/[0.04] blur-[120px]" />
          <div className="absolute -right-[15%] top-[20%] h-[500px] w-[500px] rounded-full bg-violet-500/[0.04] blur-[120px]" />
          <div className="absolute -bottom-[10%] left-[30%] h-[400px] w-[400px] rounded-full bg-gold-500/[0.03] blur-[100px]" />
        </div>

        <Navbar />
        <main className="relative flex-1">{children}</main>
        <Footer />
      </div>
    </SessionProvider>
  );
}
