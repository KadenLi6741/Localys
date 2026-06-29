'use client';

import Link from 'next/link';
import { Twitter, Youtube, Facebook, Instagram, Globe } from 'lucide-react';
import { Logo } from '@/components/Logo';

export function Footer({ className = '' }: { className?: string }) {
  return (
    <footer className={`border-t border-border bg-background text-foreground ${className}`}>
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          {/* Left: logo + tagline + locale selector */}
          <div className="max-w-xs">
            <Logo
              href="/"
              className="text-foreground"
              iconClassName="h-6 w-6"
              textClassName="text-xl"
            />
            <p className="mt-3 text-sm text-muted-foreground">
              Discover and support the small local businesses around you.
            </p>
            <button
              type="button"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition hover:border-[#f97316] hover:text-[#f97316]"
            >
              <Globe className="h-4 w-4" aria-hidden="true" /> Canada | English
            </button>
          </div>

          {/* Right: Explore + Legal columns */}
          <div className="grid grid-cols-2 gap-10">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Explore</h3>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li>
                  <Link href="/about" className="transition hover:text-[#f97316]">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/onboarding" className="transition hover:text-[#f97316]">
                    For Businesses
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="transition hover:text-[#f97316]">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Legal</h3>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li>
                  <Link href="/terms" className="transition hover:text-[#f97316]">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="transition hover:text-[#f97316]">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/sitemap" className="transition hover:text-[#f97316]">
                    Sitemap
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom row: copyright + social icons */}
        <div className="mt-10 flex flex-col items-center justify-between gap-6 border-t border-border pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Localy. All rights reserved.
          </p>
          <div className="flex gap-6 text-muted-foreground">
            <a
              href="#"
              aria-label="Twitter"
              className="transition hover:text-[#f97316]"
            >
              <Twitter size={18} />
            </a>
            <a
              href="#"
              aria-label="YouTube"
              className="transition hover:text-[#f97316]"
            >
              <Youtube size={18} />
            </a>
            <a
              href="#"
              aria-label="Facebook"
              className="transition hover:text-[#f97316]"
            >
              <Facebook size={18} />
            </a>
            <a
              href="#"
              aria-label="Instagram"
              className="transition hover:text-[#f97316]"
            >
              <Instagram size={18} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
