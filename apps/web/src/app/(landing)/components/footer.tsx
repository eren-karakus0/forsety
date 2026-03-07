import Link from "next/link";

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
    <footer className="border-t border-navy-200 bg-navy-50/50">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-navy-800">
                <span className="font-display text-sm font-bold text-gold-400">
                  F
                </span>
              </div>
              <span className="font-display text-lg font-semibold tracking-tight text-navy-800">
                Forsety
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-navy-500">
              Evidence layer for licensed AI data access. Built on Shelby
              Protocol.
            </p>
          </div>

          {/* Link Groups */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold text-navy-800">{title}</h3>
              <ul className="mt-3 space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-navy-500 transition-colors hover:text-navy-700"
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
          <p className="text-center text-xs text-navy-400">
            &copy; {new Date().getFullYear()} Forsety. Built by{" "}
            <Link
              href="https://github.com/eren-karakus0"
              target="_blank"
              rel="noopener noreferrer"
              className="text-navy-500 hover:text-navy-700"
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
