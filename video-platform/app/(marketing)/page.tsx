/**
 * Marketing home page (/) — the public landing route.
 * Purpose: Sets SEO/social metadata and renders the LandingScreen. This is the first page visitors see
 *   before signing in.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */
import type { Metadata } from "next";
import LandingScreen from "./LandingScreen";

export const metadata: Metadata = {
  title: "Localy — The shops near you, on video",
  description:
    "Discover your community's largest collection of local businesses: popular spots, hidden gems, family-owned shops, exclusive deals, and services you won't find on major platforms.",
  openGraph: {
    title: "Localy",
    description: "Discover local. Support local.",
    type: "website",
  },
};

export default function Page() {
  return <LandingScreen />;
}
