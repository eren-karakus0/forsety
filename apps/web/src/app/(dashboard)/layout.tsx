"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Button,
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@forsety/ui";
import {
  LayoutDashboard,
  Database,
  Layers,
  Shield,
  Users,
  ClipboardList,
  Upload,
  Menu,
  ArrowLeft,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { WalletDisplay } from "./components/wallet-display";
import { DashboardWatermark } from "./components/dashboard-watermark";
import { NetworkProvider } from "@/lib/network-context";
import { AuthProvider } from "@/lib/auth-context";
import { NetworkSelector, NetworkSelectorCompact } from "@/components/network-selector";
import { WalletSelector } from "@/components/wallet-selector";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { AuthErrorBanner } from "./components/auth-error-banner";

// Dynamic import with ssr:false ensures wallet providers (Aptos adapter)
// never evaluate on the server, preventing indexedDB/storage errors during build.
const Providers = dynamic(
  () => import("../providers").then((mod) => ({ default: mod.Providers })),
  { ssr: false }
);

const navLinks = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/datasets", label: "Datasets", icon: Database },
  { href: "/dashboard/evidence", label: "Evidence", icon: Layers },
  { href: "/dashboard/policies", label: "Policies", icon: Shield },
  { href: "/dashboard/agents", label: "Agents", icon: Users },
  { href: "/dashboard/audit", label: "Audit", icon: ClipboardList },
  { href: "/dashboard/upload", label: "Upload", icon: Upload },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
    >
      <Sun className="h-3.5 w-3.5 dark:hidden" />
      <Moon className="hidden h-3.5 w-3.5 dark:block" />
      <span className="dark:hidden">Dark Mode</span>
      <span className="hidden dark:block">Light Mode</span>
    </button>
  );
}

function SidebarContent({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <Image
          src="/logo-icon.svg"
          alt="Forsety"
          width={28}
          height={28}
          className="h-7 w-7"
        />
        <span className="font-display text-base font-semibold tracking-tight text-foreground">
          Forsety
        </span>
      </div>

      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-navy-200/40 to-transparent" />

      {/* Nav Links */}
      <nav aria-label="Dashboard navigation" className="mt-4 flex flex-1 flex-col gap-1 px-3">
        {navLinks.map((link) => {
          const isActive = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClick}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "nav-link-active"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <link.icon className={`h-4 w-4 ${isActive ? "text-gold-500" : ""}`} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="mt-auto border-t border-border/40 px-4 py-4">
        <NetworkSelector />
        <ThemeToggle />
        <a
          href={process.env.NEXT_PUBLIC_LANDING_DOMAIN ? `https://${process.env.NEXT_PUBLIC_LANDING_DOMAIN}` : "/"}
          className="mt-3 flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Home
        </a>
      </div>
    </div>
  );
}

function LayoutWalletSelector() {
  const { selectorOpen, setSelectorOpen } = useAuthGuard();
  return <WalletSelector open={selectorOpen} onOpenChange={setSelectorOpen} />;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <NetworkProvider>
      <Providers>
        <AuthProvider>
          <div className="min-h-screen bg-background">
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg focus:ring-2 focus:ring-gold-500"
            >
              Skip to main content
            </a>

            {/* Desktop Sidebar */}
            <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 border-r border-border/50 bg-background/80 backdrop-blur-xl lg:block">
              <SidebarContent />
            </aside>

            {/* Mobile Top Bar */}
            <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl lg:hidden">
              <div className="flex h-14 items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Menu className="h-5 w-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-56 p-0">
                      <SheetTitle className="sr-only">Navigation</SheetTitle>
                      <SidebarContent onClick={() => setMobileOpen(false)} />
                    </SheetContent>
                  </Sheet>
                  <Link href="/dashboard" className="flex items-center gap-2">
                    <Image
                      src="/logo-icon.svg"
                      alt="Forsety"
                      width={28}
                      height={28}
                      className="h-7 w-7"
                    />
                    <span className="font-display text-base font-semibold tracking-tight text-foreground">
                      Forsety
                    </span>
                  </Link>
                </div>
                <WalletDisplay />
              </div>
            </header>

            {/* Desktop Top Bar */}
            <header className="fixed left-56 right-0 top-0 z-30 hidden h-14 items-center justify-end gap-3 border-b border-border/40 bg-background/70 px-6 backdrop-blur-xl lg:flex">
              <NetworkSelectorCompact />
              <WalletDisplay />
            </header>

            {/* Decorative watermark */}
            <DashboardWatermark />

            {/* Content */}
            <main id="main-content" className="relative z-10 lg:pl-56">
              <div className="mx-auto max-w-6xl px-6 py-8 pt-8 lg:pt-20 animate-fade-in">
                <AuthErrorBanner />
                {children}
              </div>
            </main>
          </div>
          <LayoutWalletSelector />
        </AuthProvider>
      </Providers>
    </NetworkProvider>
  );
}
