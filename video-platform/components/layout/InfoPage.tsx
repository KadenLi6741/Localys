import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

/**
 * Shared shell for static content pages (About, Contact, Terms, Privacy,
 * Sitemap). Uses the app's design tokens so it themes in light + dark, and
 * renders inside the global app chrome (header + footer).
 */
export function InfoPage({
  title,
  intro,
  updated,
  children,
}: {
  title: string;
  intro?: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link
          href="/home"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-[#f97316]"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Localy
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-foreground sm:text-4xl">{title}</h1>
        {intro && <p className="mt-3 text-base text-muted-foreground">{intro}</p>}
        {updated && (
          <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>
        )}

        <div className="mt-10 space-y-8">{children}</div>
      </div>
    </div>
  );
}

/** A titled section of body copy used within an InfoPage. */
export function InfoSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{heading}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
