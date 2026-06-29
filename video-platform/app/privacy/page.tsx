import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoPage, InfoSection } from '@/components/layout/InfoPage';

export const metadata: Metadata = {
  title: 'Privacy Policy — Localy',
  description: 'How Localy collects, uses, and protects your personal information.',
};

export default function PrivacyPage() {
  return (
    <InfoPage
      title="Privacy Policy"
      intro="Your privacy matters to us. This policy explains what information Localy collects, why we collect it, and the choices you have."
      updated="June 29, 2026"
    >
      <InfoSection heading="Information we collect">
        <p>We collect information you provide and information generated as you use Localy:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Account details</strong> — your name, username, email address, and profile photo.</li>
          <li><strong>Orders and activity</strong> — items you order, reviews and ratings you leave, videos you post, communities you join, and businesses you save or like.</li>
          <li><strong>Location</strong> — approximate location used to show businesses near you (only when you allow it).</li>
          <li><strong>Payment information</strong> — processed securely by our payment provider, Stripe. Localy never stores your full card number.</li>
          <li><strong>Preferences</strong> — settings such as your theme and food-allergy choices.</li>
          <li><strong>Device and usage data</strong> — basic technical information needed to run and improve the app.</li>
        </ul>
      </InfoSection>

      <InfoSection heading="How we use your information">
        <ul className="list-disc space-y-1 pl-5">
          <li>To provide core features — discovery, ordering, checkout, messaging, and communities.</li>
          <li>To personalize what you see, including nearby businesses and allergy-aware recommendations.</li>
          <li>To process payments, deals, coins, points, and Premium subscriptions.</li>
          <li>To keep Localy safe, prevent fraud, and meet legal obligations.</li>
          <li>To respond to your support requests and send important service notices.</li>
        </ul>
      </InfoSection>

      <InfoSection heading="How we share information">
        <p>We do not sell your personal information. We share it only as needed to run Localy:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Businesses you interact with</strong> — when you place an order or message a business, they receive the details needed to fulfill it.</li>
          <li><strong>Service providers</strong> — such as Stripe (payments) and our hosting and infrastructure partners, who process data on our behalf.</li>
          <li><strong>Legal reasons</strong> — when required by law or to protect the rights and safety of our users.</li>
        </ul>
      </InfoSection>

      <InfoSection heading="Your choices and rights">
        <p>
          You can view and edit your profile, manage allergy and appearance preferences in{' '}
          <Link href="/settings" className="text-[#f97316] hover:underline">Settings</Link>, and control
          location access through your device. Depending on where you live, you may also have the right to
          access, correct, or delete your personal information — contact us to make a request.
        </p>
      </InfoSection>

      <InfoSection heading="Data retention and security">
        <p>
          We keep your information for as long as your account is active or as needed to provide Localy and
          meet legal requirements. We use industry-standard safeguards to protect your data, though no method
          of transmission or storage is ever completely secure.
        </p>
      </InfoSection>

      <InfoSection heading="Children">
        <p>Localy is not directed to children under 13, and we do not knowingly collect their information.</p>
      </InfoSection>

      <InfoSection heading="Changes to this policy">
        <p>
          We may update this policy from time to time. When we make material changes, we will update the date
          above and, where appropriate, notify you in the app.
        </p>
      </InfoSection>

      <InfoSection heading="Contact us">
        <p>
          Questions about your privacy? Email us at{' '}
          <a href="mailto:support@localy.app" className="text-[#f97316] hover:underline">support@localy.app</a>{' '}
          or visit our <Link href="/contact" className="text-[#f97316] hover:underline">Contact</Link> page.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
