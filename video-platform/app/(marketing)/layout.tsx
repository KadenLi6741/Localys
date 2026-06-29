/**
 * (marketing)/layout.tsx — layout for the public marketing/landing route group.
 * Purpose: Applies the `landing-root` theme scope (its own dark design tokens, see globals.css) to the
 *   landing page, isolating its styling from the rest of the app.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="landing-root">{children}</div>;
}
