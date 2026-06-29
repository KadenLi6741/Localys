/**
 * (auth)/layout.tsx — layout for the auth route group (login, signup, reset-password).
 * Purpose: Wraps auth screens in a full-height dark backdrop, keeping them visually separate from the
 *   main app shell.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black">
      {children}
    </div>
  );
}
