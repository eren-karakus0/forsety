import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify Evidence - Forsety",
  description: "Verify the integrity of a Forsety evidence pack",
};

export default function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-navy-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-2.5">
          <Image
            src="/logo-icon.svg"
            alt="Forsety"
            width={24}
            height={24}
            className="h-6 w-6 brightness-0 invert"
          />
          <span className="font-display text-sm font-semibold tracking-tight text-white">
            Forsety
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="flex flex-1 items-start justify-center px-6 py-12">
        <div className="w-full max-w-4xl">{children}</div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-6">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs text-navy-400">
            Verified by Forsety &mdash; Evidence Layer for Licensed AI Data Access
          </p>
        </div>
      </footer>
    </div>
  );
}
