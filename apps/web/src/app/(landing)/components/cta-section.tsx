import Link from "next/link";
import { Button } from "@forsety/ui";
import { ArrowRight, Github } from "lucide-react";

export function CtaSection() {
  return (
    <section className="border-t border-navy-100 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-navy-900 sm:text-4xl">
            Ready to Prove Compliance?
          </h2>
          <p className="mt-4 text-lg text-navy-500">
            Start building with Forsety today. Open source, TypeScript-first,
            and built for the AI era.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" asChild>
              <Link href="/dashboard">
                Launch Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link
                href="https://github.com/eren-karakus0/forsety"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="mr-2 h-4 w-4" />
                Star on GitHub
              </Link>
            </Button>
          </div>

          <p className="mt-6 text-xs text-navy-400">
            Open source under MIT license. Contributions welcome.
          </p>
        </div>
      </div>
    </section>
  );
}
