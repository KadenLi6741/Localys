/**
 * communities/layout.tsx — layout for the Communities section.
 * Purpose: Wraps all /communities pages in CommunitiesProvider so the list and thread pages share the
 *   same communities/threads/votes state.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */
import { CommunitiesProvider } from '@/contexts/CommunitiesContext';

export default function CommunitiesLayout({ children }: { children: React.ReactNode }) {
  return <CommunitiesProvider>{children}</CommunitiesProvider>;
}
