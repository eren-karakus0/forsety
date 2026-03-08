import Link from "next/link";
import Image from "next/image";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
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
    <footer className="border-t border-navy-200 bg-navy-50">
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
            </div>
            <p className="mt-3 text-sm leading-relaxed text-navy-400">
              Evidence layer for licensed AI data access. Built on Shelby
              Protocol.
            </p>

            {/* Powered by Shelby badge */}
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-navy-200 bg-navy-100 px-3 py-1 text-xs font-medium text-navy-500">
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
                    <Link
                      href={link.href}
                      className="text-sm text-navy-400 transition-colors hover:text-navy-600"
                      {...(link.href.startsWith("http")
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                    >
                      {link.label}
                    </Link>
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
              className="text-navy-400 hover:text-navy-600"
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
