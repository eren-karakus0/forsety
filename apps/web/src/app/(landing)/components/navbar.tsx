"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@forsety/ui";
import { Menu, X } from "lucide-react";
import { LaunchAppButton } from "./launch-app-button";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it Works" },
  { href: "#developers", label: "Developers" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-navy-200/60 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-800">
            <span className="font-display text-lg font-bold text-gold-400">
              F
            </span>
          </div>
          <span className="font-display text-xl font-semibold tracking-tight text-navy-800">
            Forsety
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-navy-600 transition-colors hover:bg-navy-100 hover:text-navy-800"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden items-center gap-3 md:flex">
          <Button variant="outline" size="sm" asChild>
            <Link href="https://github.com/eren-karakus0/forsety" target="_blank" rel="noopener noreferrer">
              GitHub
            </Link>
          </Button>
          <LaunchAppButton size="sm" />
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <X className="h-6 w-6 text-navy-700" />
          ) : (
            <Menu className="h-6 w-6 text-navy-700" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-navy-200/60 bg-white px-6 pb-6 pt-4 md:hidden">
          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-navy-600 hover:bg-navy-100"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="https://github.com/eren-karakus0/forsety" target="_blank" rel="noopener noreferrer">
                GitHub
              </Link>
            </Button>
            <LaunchAppButton size="sm">Get Started</LaunchAppButton>
          </div>
        </div>
      )}
    </header>
  );
}
