import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0e27]">
      <div className="text-center">
        <h1 className="text-8xl font-bold gradient-text-gold-teal">404</h1>
        <p className="mt-4 text-lg text-slate-400">
          This page could not be found.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-lg bg-[#d4a937] px-6 py-3 text-sm font-semibold text-[#0a0e27] transition-opacity hover:opacity-90"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
