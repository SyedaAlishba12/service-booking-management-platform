"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Button from "../ui/Button";
import MobileNav from "./MobileNav";

const landingNavLinks = [
  { label: "Services", href: "/landing#services" },
  { label: "Providers", href: "/landing#providers" },
  { label: "Categories", href: "/landing#categories" },
  {
    label: "Become a Provider",
    href: "/landing#become-provider",
  },
];

const appNavLinks = [
  { label: "Services", href: "/services" },
  { label: "Providers", href: "/providers" },
  { label: "Categories", href: "/categories" },
  {
    label: "Become a Provider",
    href: "/become-provider",
  },
];

function MenuIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
    >
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4"
    >
      <path
        d="M4 10h11M11 6l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks =
    pathname === "/" || pathname === "/landing"
      ? landingNavLinks
      : appNavLinks;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line bg-surface/95 shadow-[0_2px_14px_rgba(8,45,110,0.04)] backdrop-blur">
        <div className="container">
          <div className="flex h-[var(--header-height)] items-center justify-between gap-6">
            <Link
              href="/landing"
              className="group flex shrink-0 items-center gap-2"
              aria-label="ServiceHub home"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar text-sm font-bold text-white shadow-sm">
                S
              </span>

              <span className="text-xl font-bold tracking-tight text-foreground transition-colors group-hover:text-brand">
                ServiceHub
              </span>
            </Link>

            <nav
              aria-label="Main navigation"
              className="hidden items-center gap-1 lg:flex"
            >
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group relative px-3 py-2 text-sm font-semibold text-muted transition-colors hover:text-foreground"
                >
                  {link.label}

                  <span className="absolute bottom-0 left-3 right-3 h-0.5 origin-left scale-x-0 rounded-full bg-brand transition-transform duration-200 group-hover:scale-x-100" />
                </Link>
              ))}
            </nav>

            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href="/login"
                className="inline-flex items-center justify-center"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-3.5 text-muted hover:bg-transparent hover:text-foreground"
                >
                  Sign In
                </Button>
              </Link>

              <Link
                href="/signup"
                className="inline-flex items-center justify-center"
              >
                <Button
                  variant="primary"
                  size="sm"
                  className="px-4 shadow-sm"
                >
                  Get Started
                  <ArrowIcon />
                </Button>
              </Link>
            </div>

            <button
              type="button"
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface text-foreground transition-all hover:border-brand hover:bg-brand-soft hover:text-brand lg:hidden"
            >
              <MenuIcon />
            </button>
          </div>
        </div>
      </header>

      <MobileNav
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      >
        <nav aria-label="Mobile navigation" className="space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-brand-soft hover:text-brand"
            >
              <span>{link.label}</span>
              <ArrowIcon />
            </Link>
          ))}

          <div className="mt-5 grid gap-2 border-t border-line pt-5">
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
            >
              <Button variant="outline" size="md" fullWidth>
                Sign In
              </Button>
            </Link>

            <Link
              href="/signup"
              onClick={() => setMobileOpen(false)}
            >
              <Button variant="primary" size="md" fullWidth>
                Get Started
                <ArrowIcon />
              </Button>
            </Link>
          </div>
        </nav>
      </MobileNav>
    </>
  );
}