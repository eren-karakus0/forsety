"use client";

import dynamic from "next/dynamic";
import { Navbar } from "./components/navbar";
import { Footer } from "./components/footer";

const Providers = dynamic(
  () => import("../providers").then((mod) => ({ default: mod.Providers })),
  { ssr: false }
);

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </Providers>
  );
}
