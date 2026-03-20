import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-8xl font-bold gradient-text-gold-teal">404</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          This page could not be found.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
