import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoPage, InfoSection } from '@/components/layout/InfoPage';

export const metadata: Metadata = {
  title: 'Terms of Service — Localy',
  description: 'The terms that govern your use of Localy.',
};

export default function TermsPage() {
  return (
    <InfoPage
      title="Terms of Service"
      intro="These terms govern your use of Localy. By creating an account or using the app, you agree to them."
      updated="June 29, 2026"
    >
      <InfoSection heading="Using Localy">
        <p>
          Localy helps you discover and support small local businesses through a video feed, communities, and
          ordering. You must be at least 13 years old to use Localy, and you are responsible for keeping your
          account credentials secure and for activity that happens under your account.
        </p>
      </InfoSection>

      <InfoSection heading="Orders and payments">
        <p>
          When you place an order, you agree to pay the listed price plus any applicable taxes and fees.
          Payments are processed securely through Stripe. Orders are fulfilled by the independent local
          businesses on Localy — they are responsible for their products, hours, and service. Refunds and
          cancellations are handled according to the business&apos;s policy and applicable law.
        </p>
      </InfoSection>

      <InfoSection heading="Coins, points, and deals">
        <p>
          Coins, Localy Points, deals, and coupons have no cash value except as expressly offered in the app,
          cannot be exchanged outside Localy, and may change or expire. We may adjust balances to correct
          errors or address misuse.
        </p>
      </InfoSection>

      <InfoSection heading="Localy Premium">
        <p>
          Localy Premium is a paid subscription that renews automatically until cancelled. You can manage or
          cancel your subscription at any time; cancellation takes effect at the end of the current billing
          period. Subscription benefits may change with notice.
        </p>
      </InfoSection>

      <InfoSection heading="Business accounts">
        <p>
          If you operate a business on Localy, you are responsible for the accuracy of your menu, pricing,
          hours, and promotions, and for fulfilling orders and honoring deals you publish. You must comply
          with all laws that apply to your business.
        </p>
      </InfoSection>

      <InfoSection heading="Content and conduct">
        <p>
          You retain ownership of the content you post, and you grant Localy a license to host and display it
          so the app can function. Do not post content that is unlawful, harmful, deceptive, or that infringes
          others&apos; rights. We may remove content or suspend accounts that violate these terms.
        </p>
      </InfoSection>

      <InfoSection heading="Disclaimers and limitation of liability">
        <p>
          Localy is provided &quot;as is&quot; without warranties of any kind. To the fullest extent permitted
          by law, Localy is not liable for indirect or incidental damages, or for the products, services, or
          conduct of the businesses and users on the platform.
        </p>
      </InfoSection>

      <InfoSection heading="Termination">
        <p>
          You may stop using Localy at any time. We may suspend or terminate access if you violate these terms
          or if needed to protect Localy and its users.
        </p>
      </InfoSection>

      <InfoSection heading="Governing law">
        <p>
          These terms are governed by the laws of Canada and the applicable province, without regard to
          conflict-of-law rules.
        </p>
      </InfoSection>

      <InfoSection heading="Changes and contact">
        <p>
          We may update these terms from time to time; continued use after changes means you accept them.
          Questions? Email{' '}
          <a href="mailto:support@localy.app" className="text-[#f97316] hover:underline">support@localy.app</a>{' '}
          or see our <Link href="/privacy" className="text-[#f97316] hover:underline">Privacy Policy</Link>.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
