import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoPage, InfoSection } from '@/components/layout/InfoPage';

export const metadata: Metadata = {
  title: 'About — Localy',
  description: 'Localy helps you discover and support the small local businesses around you.',
};

export default function AboutPage() {
  return (
    <InfoPage
      title="About Localy"
      intro="Discover and support the small local businesses around you."
    >
      <InfoSection heading="Our mission">
        <p>
          Localy exists to help neighborhoods thrive. We make it effortless to find the shops, cafés, and
          services near you — and to support them in a way that keeps more money in your community.
        </p>
      </InfoSection>

      <InfoSection heading="What Localy is">
        <p>
          Localy blends three things into one app: a video feed for discovering businesses, communities for
          sharing recommendations, and ordering so you can support a business in a couple of taps. Browse by
          video, search by category, read real reviews, join the conversation, and check out securely.
        </p>
      </InfoSection>

      <InfoSection heading="Built for local">
        <p>
          Big platforms take a large cut from the businesses you love. Localy keeps just 5%, so far more of
          every order stays with the local owners doing the work. Earn coins and Localy Points as you order
          and engage, unlock deals, and level up your rank for supporting local.
        </p>
      </InfoSection>

      <InfoSection heading="For businesses">
        <p>
          Run a local business? Set up your storefront in Localy Manager — add your menu, hours, photos, and
          videos, run promotions, and start taking orders. Get started from the{' '}
          <Link href="/onboarding" className="text-[#f97316] hover:underline">For Businesses</Link> page.
        </p>
      </InfoSection>

      <InfoSection heading="Say hello">
        <p>
          We&apos;d love to hear from you. Reach out through our{' '}
          <Link href="/contact" className="text-[#f97316] hover:underline">Contact</Link> page anytime.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
