"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Button } from "@forsety/ui";
import { Menu, X, Github, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { href: "#verify", label: "Features" },
  { href: "#how-it-works", label: "How it Works" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 px-4 pt-3 md:px-6">
      <div
        className={`mx-auto max-w-7xl overflow-hidden rounded-2xl border border-navy-800/50 transition-all duration-300 ${
          scrolled
            ? "bg-navy-900/95 shadow-[0_8px_32px_rgba(13,20,36,0.25)] backdrop-blur-xl"
            : "bg-navy-900"
        }`}
      >
        {/* Main bar */}
        <div
          className={`flex items-center justify-between px-5 transition-all duration-300 ${
            scrolled ? "h-14" : "h-16"
          }`}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/logo-icon.svg"
              alt="Forsety"
              width={36}
              height={36}
              className={`transition-all duration-300 ${scrolled ? "h-7 w-7" : "h-8 w-8"}`}
            />
            <span className="font-display text-xl font-semibold tracking-tight text-white">
              Forsety
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group relative rounded-lg px-3 py-2 text-sm font-medium uppercase tracking-wider text-navy-300 transition-colors hover:text-white"
              >
                {link.label}
                <span className="absolute bottom-1 left-3 right-3 h-px origin-left scale-x-0 bg-gold-400 transition-transform duration-300 group-hover:scale-x-100" />
              </Link>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden items-center gap-3 md:flex">
            <Button
              variant="ghost"
              size="sm"
              className="text-navy-400 hover:bg-white/10 hover:text-white"
              asChild
            >
              <Link
                href="https://github.com/eren-karakus0/forsety"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="mr-2 h-4 w-4" />
                GitHub
              </Link>
            </Button>
            <Button
              size="sm"
              className="border-0 bg-white font-semibold text-navy-900 hover:bg-navy-100"
              asChild
            >
              <Link href="/dashboard">
                Launch App
                <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="h-6 w-6 text-white" />
            ) : (
              <Menu className="h-6 w-6 text-white" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-navy-800/50 md:hidden"
            >
              <div className="px-5 pb-5 pt-3">
                <nav className="flex flex-col gap-1">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="rounded-lg px-3 py-2 text-sm font-medium uppercase tracking-wider text-navy-300 hover:bg-white/10 hover:text-white"
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
                <div className="mt-3 flex flex-col gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start text-navy-400 hover:bg-white/10 hover:text-white"
                    asChild
                  >
                    <Link
                      href="https://github.com/eren-karakus0/forsety"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Github className="mr-2 h-4 w-4" />
                      GitHub
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    className="border-0 bg-white font-semibold text-navy-900 hover:bg-navy-100"
                    asChild
                  >
                    <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                      Launch App
                      <ArrowRight className="ml-2 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
