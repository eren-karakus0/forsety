import Link from "next/link";

const navLinks = [
  { href: "/dashboard", label: "Datasets", icon: "M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z" },
  { href: "/dashboard/upload", label: "Upload", icon: "M12 5v14M5 12h14" },
];

function NavIcon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-navy-50/40">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b border-navy-200/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-navy-800">
              <span className="font-display text-sm font-bold text-gold-400">F</span>
            </div>
            <span className="font-display text-lg font-semibold tracking-tight text-navy-800">
              Forsety
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-navy-600 transition-colors hover:bg-navy-100 hover:text-navy-800"
              >
                <NavIcon d={link.icon} />
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
            <span className="text-xs font-medium text-navy-500">Shelbynet</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {children}
      </main>
    </div>
  );
}
