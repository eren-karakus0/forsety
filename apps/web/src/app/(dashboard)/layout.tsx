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
  Separator,
} from "@forsety/ui";
import {
  Database,
  Users,
  ClipboardList,
  Upload,
  Menu,
} from "lucide-react";
import { WalletDisplay } from "./components/wallet-display";

// Dynamic import with ssr:false ensures wallet providers (Aptos adapter)
// never evaluate on the server, preventing indexedDB/storage errors during build.
const Providers = dynamic(
  () => import("../providers").then((mod) => ({ default: mod.Providers })),
  { ssr: false }
);

const navLinks = [
  { href: "/dashboard", label: "Datasets", icon: Database },
  { href: "/dashboard/agents", label: "Agents", icon: Users },
  { href: "/dashboard/audit", label: "Audit", icon: ClipboardList },
  { href: "/dashboard/upload", label: "Upload", icon: Upload },
];

function NavItems({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {navLinks.map((link) => {
        const isActive =
          link.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onClick}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Providers>
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            {/* Mobile Menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <SheetTitle className="font-display text-lg font-semibold">
                  Navigation
                </SheetTitle>
                <Separator className="my-3" />
                <nav className="flex flex-col gap-1">
                  <NavItems onClick={() => setMobileOpen(false)} />
                </nav>
              </SheetContent>
            </Sheet>

            <Link href="/dashboard" className="flex items-center gap-2.5">
              <Image
                src="/logo-icon.svg"
                alt="Forsety"
                width={32}
                height={32}
                className="h-8 w-8"
              />
              <span className="font-display text-lg font-semibold tracking-tight text-foreground">
                Forsety
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 md:flex">
            <NavItems />
          </nav>

          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
            <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
              Shelbynet
            </span>
            <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />
            <WalletDisplay />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
    </Providers>
  );
}
