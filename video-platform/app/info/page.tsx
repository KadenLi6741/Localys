'use client';

import { useEffect } from 'react';

/** A content block within an info section. */
type Block = { type: 'p'; text: string } | { type: 'ul'; items: string[] };

interface InfoSection {
  id: string;
  title: string;
  blocks: Block[];
}

const COMING_SOON: Block[] = [{ type: 'p', text: 'Coming soon.' }];

/**
 * All info-page sections. Each `id` is a scroll anchor that the sidebar
 * RESOURCES links target (e.g. /info#privacy-policy).
 */
const SECTIONS: InfoSection[] = [
  {
    id: 'about',
    title: 'About Localys',
    blocks: [
      {
        type: 'p',
        text: 'Localys was created to help local businesses gain the visibility they deserve in an increasingly competitive digital world. While large corporations often have significant marketing budgets and established brand recognition, many small businesses struggle to reach new customers despite offering high-quality products and services.',
      },
      {
        type: 'p',
        text: 'Our platform bridges this gap by connecting customers directly with businesses in their communities. Through business profiles, video content, reviews, ratings, messaging, deals, and promotions, Localys makes it easier than ever to discover hidden gems and support local entrepreneurs.',
      },
      {
        type: 'p',
        text: 'Our mission is simple: strengthen local economies by helping businesses grow while giving consumers a trusted platform to discover authentic experiences close to home.',
      },
    ],
  },
  {
    id: 'advertise',
    title: 'Advertise on Localys',
    blocks: [
      {
        type: 'p',
        text: 'Localys provides businesses with modern marketing tools designed specifically for local growth. Businesses can create engaging video content, showcase products and services, promote special offers, and connect directly with potential customers.',
      },
      {
        type: 'p',
        text: 'Advertising on Localys is designed to be accessible and affordable for businesses of all sizes. Rather than competing against massive advertising budgets, businesses can reach customers through location-based discovery, customer engagement, and community-driven recommendations.',
      },
      {
        type: 'p',
        text: 'Our advertising tools allow businesses to boost visibility, monitor engagement metrics, analyze performance trends, and build stronger relationships with their customers.',
      },
    ],
  },
  {
    id: 'business-center',
    title: 'Business Center',
    blocks: [
      { type: 'p', text: 'The Business Center serves as the central hub for business owners on Localys.' },
      {
        type: 'p',
        text: 'Business owners can manage their profiles, upload promotional content, respond to customer inquiries, track sales activity, review engagement analytics, monitor trust scores, and manage orders all in one place.',
      },
      {
        type: 'p',
        text: 'The Business Center also provides valuable insights into customer behavior, including profile visits, video performance, response times, order completion rates, and customer feedback. These tools help business owners make informed decisions and continuously improve their presence on the platform.',
      },
      {
        type: 'p',
        text: 'As Localys grows, additional business tools and advanced analytics will continue to be introduced to support long-term business success.',
      },
    ],
  },
  {
    id: 'help',
    title: 'Help Center',
    blocks: [
      {
        type: 'p',
        text: 'The Localys Help Center provides support for both customers and businesses using the platform.',
      },
      {
        type: 'p',
        text: 'Users can find answers to frequently asked questions, troubleshoot account issues, learn how platform features work, and access guides covering everything from account creation to business verification.',
      },
      {
        type: 'p',
        text: 'Businesses can access resources related to profile management, advertising, analytics, customer engagement, and promotional campaigns.',
      },
      {
        type: 'p',
        text: 'Our goal is to make the platform easy to use while ensuring users have access to the support they need whenever questions arise.',
      },
    ],
  },
  {
    id: 'rules',
    title: 'Localys Rules',
    blocks: [
      {
        type: 'p',
        text: 'Localys is built around trust, authenticity, and community support. Every user plays a role in maintaining a positive environment.',
      },
      {
        type: 'p',
        text: 'Rule 1: Be Respectful — Treat all users, businesses, and community members with respect. Harassment, threats, discrimination, bullying, or abusive behavior are not permitted on the platform. Constructive criticism and honest feedback are encouraged, but personal attacks and harmful conduct will not be tolerated.',
      },
      {
        type: 'p',
        text: 'Rule 2: Be Authentic — Reviews, ratings, comments, and business information must reflect genuine experiences and accurate information. Users may not create fake reviews, manipulate ratings, impersonate businesses, or engage in deceptive behavior intended to mislead others.',
      },
      {
        type: 'p',
        text: 'Rule 3: No Spam or Manipulation — Spam content, fake engagement, repetitive promotions, automated activity, or attempts to artificially boost visibility are prohibited. Businesses should promote themselves honestly and fairly while users should interact naturally with content that interests them.',
      },
      {
        type: 'p',
        text: 'Rule 4: Keep Localys Safe — Fraudulent activity, scams, phishing attempts, and other malicious behavior are strictly prohibited. Users should report suspicious activity and help maintain a trustworthy environment for everyone.',
      },
    ],
  },
  {
    id: 'privacy-policy',
    title: 'Privacy Policy',
    blocks: [
      {
        type: 'p',
        text: 'Your privacy is important to us. Localys is committed to collecting, storing, and using information responsibly.',
      },
      {
        type: 'p',
        text: 'We collect information such as account details, profile information, business information, reviews, ratings, messages, and platform activity to provide and improve our services.',
      },
      { type: 'p', text: 'This information helps us:' },
      {
        type: 'ul',
        items: [
          'Maintain platform security',
          'Prevent fraud and abuse',
          'Improve user experience',
          'Deliver personalized recommendations',
          'Support business discovery and engagement',
        ],
      },
      { type: 'p', text: 'Localys does not sell personal information to third parties.' },
      {
        type: 'p',
        text: 'We use industry-standard security measures to protect user information and continuously work to improve platform security as we grow.',
      },
      {
        type: 'p',
        text: 'Users maintain control over their account information and may update or modify their profile details at any time through account settings.',
      },
    ],
  },
  {
    id: 'user-agreement',
    title: 'User Agreement',
    blocks: [
      {
        type: 'p',
        text: 'By creating an account or using Localys, you agree to follow all platform policies and use the service responsibly.',
      },
      {
        type: 'p',
        text: 'Users are responsible for the content they post, including reviews, comments, messages, business information, and promotional content.',
      },
      {
        type: 'p',
        text: 'Businesses are responsible for maintaining accurate information regarding their services, pricing, products, and availability.',
      },
      {
        type: 'p',
        text: 'Localys reserves the right to investigate violations of platform policies and may remove content, restrict features, suspend accounts, or terminate access when necessary to protect the community.',
      },
      {
        type: 'p',
        text: 'Continued use of the platform indicates acceptance of the most current version of these terms.',
      },
    ],
  },
  {
    id: 'accessibility',
    title: 'Accessibility',
    blocks: [
      { type: 'p', text: 'Localys believes local business discovery should be accessible to everyone.' },
      {
        type: 'p',
        text: 'We are committed to building an inclusive platform that can be used by individuals with a wide range of abilities and accessibility needs.',
      },
      { type: 'p', text: 'Our accessibility efforts include:' },
      {
        type: 'ul',
        items: [
          'Clear and consistent navigation',
          'Readable typography and layouts',
          'Mobile-friendly design',
          'Keyboard-accessible navigation',
          'Meaningful labels and interface elements',
          'High usability standards across devices',
        ],
      },
      {
        type: 'p',
        text: 'Accessibility is an ongoing process, and we continuously evaluate opportunities to improve the experience for all users. We welcome feedback from the community and are committed to making Localys increasingly accessible as the platform evolves.',
      },
    ],
  },
  {
    id: 'safety-trust',
    title: 'Safety & Trust',
    blocks: [
      { type: 'p', text: 'Trust is one of the core pillars of Localys.' },
      {
        type: 'p',
        text: 'To create a safe environment for both customers and businesses, we utilize business verification systems, fraud detection tools, spam prevention measures, review monitoring, reporting features, and moderation processes.',
      },
      {
        type: 'p',
        text: 'Our goal is to help users make informed decisions while giving legitimate businesses an opportunity to build credibility and trust within their communities.',
      },
      {
        type: 'p',
        text: 'Users are encouraged to report suspicious behavior so we can continue improving the integrity of the platform.',
      },
    ],
  },
  {
    id: 'contact',
    title: 'Contact Us',
    blocks: [
      {
        type: 'p',
        text: 'We value feedback from our community and are always looking for ways to improve Localys.',
      },
      {
        type: 'p',
        text: 'Whether you have questions, suggestions, concerns, or support requests, our team is available to assist you.',
      },
      {
        type: 'p',
        text: 'Feedback from users and businesses helps shape future updates, improve platform functionality, and ensure Localys continues to serve the needs of local communities effectively.',
      },
      { type: 'p', text: 'Thank you for helping us build a stronger, more connected local economy.' },
    ],
  },
  // Placeholder sections (linked from RESOURCES but without full copy yet)
  { id: 'developer-platform', title: 'Developer Platform', blocks: COMING_SOON },
  { id: 'localys-pro', title: 'Localys Pro', blocks: COMING_SOON },
  { id: 'blog', title: 'Blog', blocks: COMING_SOON },
  { id: 'careers', title: 'Careers', blocks: COMING_SOON },
  { id: 'press', title: 'Press', blocks: COMING_SOON },
  { id: 'best-of', title: 'Best of Localys', blocks: COMING_SOON },
];

function renderBlock(block: Block, i: number) {
  if (block.type === 'ul') {
    return (
      <ul key={i} className="my-3 list-disc space-y-1.5 pl-6 text-body-sm text-muted-foreground">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  return (
    <p key={i} className="mt-3 text-body-sm leading-relaxed text-muted-foreground">
      {block.text}
    </p>
  );
}

export default function InfoPage() {
  // Smooth-scroll to the hash target on load and whenever the hash changes,
  // accounting for the fixed top bar via each section's scroll-margin.
  useEffect(() => {
    const scrollToHash = () => {
      const id = window.location.hash.slice(1);
      if (!id) return;
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Defer so the layout is painted before scrolling.
    const t = setTimeout(scrollToHash, 60);
    window.addEventListener('hashchange', scrollToHash);
    return () => {
      clearTimeout(t);
      window.removeEventListener('hashchange', scrollToHash);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-10 lg:px-8">
        <header className="mb-10">
          <h1 className="text-heading-sm font-bold text-foreground">Localys Info Center</h1>
          <p className="mt-1 text-body-sm text-muted-foreground">
            Everything about the platform — policies, resources, and how Localys works.
          </p>

          {/* Quick jump links */}
          <nav className="mt-5 flex flex-wrap gap-2" aria-label="Jump to section">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-[4px] border border-border px-2.5 py-1 text-caption font-semibold text-muted-foreground transition-colors hover:border-primary hover:bg-surface hover:text-foreground"
              >
                {s.title}
              </a>
            ))}
          </nav>
        </header>

        <div className="space-y-12">
          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="border-b border-border pb-2 text-subheading font-bold text-foreground">
                {section.title}
              </h2>
              {section.blocks.map(renderBlock)}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
