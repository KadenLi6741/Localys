import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, Store, LifeBuoy } from 'lucide-react';
import { InfoPage, InfoSection } from '@/components/layout/InfoPage';

export const metadata: Metadata = {
  title: 'Contact — Localy',
  description: 'Get in touch with the Localy team.',
};

export default function ContactPage() {
  return (
    <InfoPage
      title="Contact us"
      intro="Questions, feedback, or need a hand? Here's how to reach us."
    >
      <InfoSection heading="General and support">
        <p className="flex items-center gap-2">
          <LifeBuoy className="h-4 w-4 text-[#f97316]" aria-hidden="true" />
          <a href="mailto:support@localy.app" className="text-[#f97316] hover:underline">support@localy.app</a>
        </p>
        <p>
          For help with an order, your account, or anything in the app, email our support team and we&apos;ll
          get back to you as soon as we can. You can also ask the in-app Localy Assistant for quick answers.
        </p>
      </InfoSection>

      <InfoSection heading="Business inquiries">
        <p className="flex items-center gap-2">
          <Store className="h-4 w-4 text-[#f97316]" aria-hidden="true" />
          <a href="mailto:partners@localy.app" className="text-[#f97316] hover:underline">partners@localy.app</a>
        </p>
        <p>
          Want to list your business on Localy? Email our partnerships team or get started on the{' '}
          <Link href="/onboarding" className="text-[#f97316] hover:underline">For Businesses</Link> page.
        </p>
      </InfoSection>

      <InfoSection heading="Press and everything else">
        <p className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-[#f97316]" aria-hidden="true" />
          <a href="mailto:hello@localy.app" className="text-[#f97316] hover:underline">hello@localy.app</a>
        </p>
      </InfoSection>
    </InfoPage>
  );
}
