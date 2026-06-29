import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoPage } from '@/components/layout/InfoPage';

export const metadata: Metadata = {
  title: 'Sitemap — Localy',
  description: 'A map of the main pages on Localy.',
};

const SECTIONS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Discover',
    links: [
      { label: 'Home', href: '/home' },
      { label: 'Discover feed', href: '/feed' },
      { label: 'Communities', href: '/communities' },
      { label: 'Messages', href: '/chats' },
    ],
  },
  {
    title: 'Shopping',
    links: [
      { label: 'Cart', href: '/cart' },
      { label: 'Checkout', href: '/checkout' },
      { label: 'Order history', href: '/orders' },
    ],
  },
  {
    title: 'Your account',
    links: [
      { label: 'Profile', href: '/profile' },
      { label: 'Settings', href: '/settings' },
      { label: 'My Points', href: '/points' },
      { label: 'Buy Coins', href: '/buy-coins' },
      { label: 'Localy Premium', href: '/premium' },
    ],
  },
  {
    title: 'For businesses',
    links: [
      { label: 'Business Dashboard', href: '/dashboard' },
      { label: 'Upload a video', href: '/upload' },
      { label: 'Get started', href: '/onboarding' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
    ],
  },
];

export default function SitemapPage() {
  return (
    <InfoPage title="Sitemap" intro="A map of the main pages on Localy.">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <section key={section.title} className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
            <ul className="space-y-2 text-sm">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground transition hover:text-[#f97316]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </InfoPage>
  );
}
