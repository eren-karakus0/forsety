import Link from "next/link";
import Image from "next/image";
import { FooterDashboardLink } from "./footer-dashboard-link";

const footerLinks = {
  Product: [
    { label: "Features", href: "#verify" },
    { label: "How it Works", href: "#how-it-works" },
    { label: "Dashboard", href: "/dashboard" },
  ],
  Developers: [
    { label: "Documentation", href: "https://github.com/eren-karakus0/forsety" },
    { label: "SDK Reference", href: "https://github.com/eren-karakus0/forsety" },
    { label: "MCP Tools", href: "https://github.com/eren-karakus0/forsety" },
  ],
  Community: [
    { label: "GitHub", href: "https://github.com/eren-karakus0/forsety" },
    { label: "Shelby Protocol", href: "https://shelby.xyz" },
    { label: "Feedback", href: "https://github.com/eren-karakus0/forsety/issues" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-gradient-to-b from-navy-50/80 to-white">
      <div className="mx-auto max-w-7xl h-px bg-gradient-to-r from-transparent via-gold-400/20 to-transparent" />
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5">
              <Image
                src="/logo-icon.svg"
                alt="Forsety"
                width={32}
                height={32}
                className="h-8 w-8"
              />
              <span className="font-display text-lg font-semibold tracking-tight text-navy-900">
                Forsety
              </span>
              {/* Subtle Tiwaz accent */}
              <svg width="24" height="24" viewBox="0 0 400 800" fill="none" className="opacity-[0.08] text-navy-900">
                <line x1="200" y1="0" x2="200" y2="800" stroke="currentColor" strokeWidth="8" />
                <line x1="200" y1="100" x2="100" y2="300" stroke="currentColor" strokeWidth="6" />
                <line x1="200" y1="100" x2="300" y2="300" stroke="currentColor" strokeWidth="6" />
              </svg>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-navy-400">
              Evidence layer for licensed AI data access. Built on Shelby
              Protocol.
            </p>
            <p className="mt-1 text-xs font-medium italic text-gold-400/60">
              &ldquo;Evidence Layer for Licensed AI Data&rdquo;
            </p>

            {/* Powered by Shelby badge */}
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-navy-200/80 bg-navy-100/60 px-3 py-1 text-xs font-medium text-navy-500">
              Powered by Shelby Protocol
            </div>
          </div>

          {/* Link Groups */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold text-navy-700">{title}</h3>
              <ul className="mt-3 space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.href === "/dashboard" ? (
                      <FooterDashboardLink />
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-navy-400 transition-colors hover:text-gold-500"
                        {...(link.href.startsWith("http")
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-navy-200 pt-6">
          <p className="text-center text-xs text-navy-300">
            &copy; {new Date().getFullYear()} Forsety. Built by{" "}
            <Link
              href="https://github.com/eren-karakus0"
              target="_blank"
              rel="noopener noreferrer"
              className="text-navy-400 hover:text-gold-500"
            >
              eren-karakus0
            </Link>
            . Open source under MIT license.
          </p>
        </div>
      </div>
    </footer>
  );
}
