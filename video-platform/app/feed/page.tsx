'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { getVideosFeed } from '@/lib/supabase/videos';

const HomeMap = dynamic(() => import('@/components/HomeMap'), {
  ssr: false,
  loading: () => (
    <div className="grid h-72 place-items-center rounded-xl border border-[#3A3A34] bg-[#1A1A18] text-sm text-[#9E9A90]">
      Loading map...
    </div>
  ),
});

type Category = {
  label: string;
  icon: ReactNode;
  href: string;
};

type BusinessCard = {
  name: string;
  meta: string;
  description: string;
  distance: string;
  href: string;
  imageClass: string;
  category: string;
  latitude: number;
  longitude: number;
};

type Collection = {
  title: string;
  count: string;
  href: string;
  imageClass: string;
};

type TrendingVideo = {
  id: string;
  user_id: string;
  video_url: string;
  caption: string | null;
  created_at: string;
  business_id?: string | null;
  view_count?: number | null;
  profiles?: {
    username?: string | null;
    full_name?: string | null;
    profile_picture_url?: string | null;
  } | null;
  businesses?: {
    business_name?: string | null;
    category?: string | null;
  } | null;
};

const categories: Category[] = [
  { label: 'Coffee', icon: <CupIcon />, href: '/search?query=cafe&category=food' },
  { label: 'Food', icon: <ForkIcon />, href: '/search?category=food' },
  { label: 'Thrift', icon: <TagIcon />, href: '/search?query=thrift&category=retail' },
  { label: 'Beauty', icon: <SparkleIcon />, href: '/search?query=beauty&category=service' },
  { label: 'Fitness', icon: <PulseIcon />, href: '/search?query=fitness&category=service' },
  { label: 'Study Spots', icon: <BookIcon />, href: '/search?query=study%20spots' },
  { label: 'Makers', icon: <CraftIcon />, href: '/search?query=makers&category=retail' },
  { label: 'Events', icon: <CalendarIcon />, href: '/search?query=events' },
];

const trendingBusinesses: BusinessCard[] = [
  {
    name: 'Daily Ritual Coffee',
    meta: 'Coffee Shop - Kensington',
    description: 'Bright cafe with great lattes and an easy neighborhood rhythm.',
    distance: '0.4 km',
    href: '/search?query=Daily%20Ritual%20Coffee',
    imageClass: 'from-[#6E4D32] via-[#B98545] to-[#F5D496]',
    category: 'Coffee',
    latitude: 43.6548,
    longitude: -79.4007,
  },
  {
    name: 'Falafel World',
    meta: 'Middle Eastern - Kensington Market',
    description: 'Fresh, fast, and full of flavour. A local favourite.',
    distance: '0.6 km',
    href: '/search?query=Falafel%20World',
    imageClass: 'from-[#A8492C] via-[#D77E32] to-[#F5D496]',
    category: 'Food',
    latitude: 43.6553,
    longitude: -79.4029,
  },
  {
    name: 'Common Sort',
    meta: 'Thrift Store - Kensington',
    description: 'Curated vintage finds with new treasures arriving daily.',
    distance: '0.8 km',
    href: '/search?query=Common%20Sort',
    imageClass: 'from-[#3A332B] via-[#7D6A4D] to-[#D9C495]',
    category: 'Thrift',
    latitude: 43.6529,
    longitude: -79.4017,
  },
  {
    name: 'Greenhouse Skin',
    meta: 'Beauty - Little Italy',
    description: 'Clean beauty, calm service, and a warm local crew.',
    distance: '1.1 km',
    href: '/search?query=Greenhouse%20Skin',
    imageClass: 'from-[#426B4F] via-[#6BAF7A] to-[#E6D8C2]',
    category: 'Beauty',
    latitude: 43.6573,
    longitude: -79.4076,
  },
];

const collections: Collection[] = [
  {
    title: 'Best study cafes',
    count: '12 spots',
    href: '/collections/best-study-cafes',
    imageClass: 'from-[#39302A] via-[#82643D] to-[#E1BE76]',
  },
  {
    title: 'Hidden gems',
    count: '18 spots',
    href: '/collections/hidden-gems',
    imageClass: 'from-[#234338] via-[#6BAF7A] to-[#D7E9D2]',
  },
  {
    title: 'Weekend markets',
    count: '9 spots',
    href: '/collections/weekend-markets',
    imageClass: 'from-[#A65F25] via-[#F5A623] to-[#F5D496]',
  },
];

export default function Home() {
  return (
    <ProtectedRoute>
      <HomePage />
    </ProtectedRoute>
  );
}

function HomePage() {
  const router = useRouter();
  const trendingScrollerRef = useRef<HTMLDivElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('Kensington, Toronto');
  const [trendingVideos, setTrendingVideos] = useState<TrendingVideo[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState('');

  useEffect(() => {
    let mounted = true;

    getVideosFeed(12).then(({ data }) => {
      if (!mounted) return;
      setTrendingVideos((data || []) as TrendingVideo[]);
      setVideosLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) {
      params.set('query', searchQuery.trim());
    }
    if (locationQuery.trim()) {
      params.set('location', locationQuery.trim());
    }
    router.push(`/search${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const submitNewsletter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNewsletterStatus(
      newsletterEmail.trim()
        ? 'You are on the list.'
        : 'Enter an email to subscribe.'
    );
  };

  const scrollTrendingVideos = (direction: 'left' | 'right') => {
    const scroller = trendingScrollerRef.current;
    if (!scroller) return;

    scroller.scrollBy({
      left: direction === 'left' ? -scroller.clientWidth * 0.82 : scroller.clientWidth * 0.82,
      behavior: 'smooth',
    });
  };

  return (
    <div id="top" className="min-h-screen bg-[#1A1A18] text-[#F5F0E8] pb-24 lg:pb-12">
      <header className="sticky top-0 z-20 border-b border-[#3A3A34] bg-[#1A1A18]/92 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 w-full max-w-7xl items-center gap-5 px-4 sm:px-6 lg:px-10">
          <Link href="/feed" className="flex items-center gap-3 text-xl font-bold text-[#F5F0E8]">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#F5A623] text-[#1A1A18]">
              <MapPinIcon />
            </span>
            <span>Localys</span>
          </Link>

          <nav className="hidden flex-1 items-center justify-center gap-1 text-sm font-semibold text-[#9E9A90] md:flex">
            <Link className="rounded-lg px-3 py-2 text-[#F5A623] hover:bg-[#242420] hover:text-[#F5F0E8]" href="/search">
              Explore
            </Link>
            <a className="rounded-lg px-3 py-2 hover:bg-[#242420] hover:text-[#F5F0E8]" href="#map">
              Map
            </a>
            <a className="rounded-lg px-3 py-2 hover:bg-[#242420] hover:text-[#F5F0E8]" href="#collections">
              Collections
            </a>
            <Link className="rounded-lg px-3 py-2 hover:bg-[#242420] hover:text-[#F5F0E8]" href="/profile#saved">
              Saved
            </Link>
          </nav>

          <Link
            href="/profile"
            className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#3A3A34] bg-[#242420] px-3 text-sm font-semibold text-[#F5F0E8] hover:border-[#F5A623]"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[#3A3A34] text-[#F5A623]">
              <UserIcon />
            </span>
            <span className="hidden sm:inline">Profile</span>
          </Link>
        </div>
      </header>

      <main>
        <section className="border-b border-[#3A3A34] bg-[#242420]/45">
          <form
            onSubmit={submitSearch}
            className="mx-auto grid w-full max-w-7xl gap-3 px-4 py-4 sm:px-6 md:grid-cols-[1fr_minmax(13rem,0.55fr)_auto] lg:px-10"
          >
            <label className="m-0 flex min-h-12 items-center gap-3 rounded-lg border border-[#3A3A34] bg-[#1A1A18] px-4 text-[#9E9A90]">
              <SearchIcon />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search cafes, shops, makers, and services..."
                className="min-w-0 flex-1 bg-transparent text-[#F5F0E8] outline-none placeholder:text-[#9E9A90]"
              />
            </label>

            <label className="m-0 flex min-h-12 items-center gap-3 rounded-lg border border-[#3A3A34] bg-[#1A1A18] px-4 text-[#9E9A90]">
              <MapPinIcon />
              <input
                type="text"
                value={locationQuery}
                onChange={(event) => setLocationQuery(event.target.value)}
                placeholder="Set location"
                className="min-w-0 flex-1 bg-transparent text-[#F5F0E8] outline-none placeholder:text-[#9E9A90]"
                aria-label="Search location"
              />
            </label>

            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#F5A623] px-5 font-bold text-[#1A1A18] shadow-lg shadow-[#F5A623]/20 hover:bg-[#ffc15a]"
            >
              Search
            </button>
          </form>
        </section>

        <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-10 lg:py-16">
          <div className="self-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#F5A623]">
              Local is better
            </p>
            <h1 className="max-w-2xl text-5xl font-bold leading-[0.98] text-[#F5F0E8] sm:text-6xl lg:text-7xl">
              Discover local businesses near you
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#C5BFB3]">
              From cozy cafes to independent shops, local makers to helpful services,
              explore the best spots in your community and uncover the places locals love.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/search?nearMe=1"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-[#F5A623] px-6 font-bold text-[#1A1A18] shadow-xl shadow-[#F5A623]/20 hover:bg-[#ffc15a]"
              >
                <CompassIcon />
                Explore nearby
              </Link>
            </div>
          </div>

          <div className="relative min-h-[340px] overflow-hidden rounded-2xl border border-[#3A3A34] bg-[#242420] shadow-2xl shadow-black/30">
            <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(245,166,35,0.16),rgba(107,175,122,0.12),rgba(26,26,24,0.2))]" />
            <div className="absolute inset-x-[8%] bottom-0 h-[68%] rounded-t-full bg-[repeating-linear-gradient(90deg,rgba(245,166,35,0.18)_0_18px,transparent_18px_38px)]" />
            <div className="absolute left-8 top-8 rounded-lg border border-[#F5A623]/30 bg-[#1A1A18]/80 px-4 py-3 backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#F5A623]">Nearby now</p>
              <p className="mt-1 text-sm text-[#C5BFB3]">47 places within 2 km</p>
            </div>
            <div className="absolute bottom-7 right-7 w-[min(20rem,calc(100%-3.5rem))] rounded-2xl border border-[#3A3A34] bg-[#1A1A18]/92 p-5 shadow-xl backdrop-blur">
              <strong className="block text-lg text-[#F5F0E8]">You are in Kensington</strong>
              <span className="mt-2 block leading-6 text-[#C5BFB3]">
                Explore coffee, food, markets, services, and community picks around you.
              </span>
            </div>
          </div>
        </section>

        <section id="categories" className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-10">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
            {categories.map((category) => (
              <Link
                key={category.label}
                href={category.href}
                className="group grid min-h-28 place-items-center gap-2 rounded-lg border border-[#3A3A34] bg-[#242420] p-4 text-center font-bold text-[#F5F0E8] shadow-lg shadow-black/10 hover:border-[#F5A623]"
              >
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#F5A623]/10 text-[#F5A623] group-hover:bg-[#F5A623] group-hover:text-[#1A1A18]">
                  {category.icon}
                </span>
                {category.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#F5F0E8]">Trending near you</h2>
              <p className="mt-1 text-sm text-[#9E9A90]">Swipe sideways through local videos.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollTrendingVideos('left')}
                className="grid h-10 w-10 place-items-center rounded-lg border border-[#3A3A34] bg-[#242420] text-[#F5F0E8] hover:border-[#F5A623] hover:text-[#F5A623]"
                aria-label="Scroll trending videos left"
              >
                <ChevronLeftIcon />
              </button>
              <button
                type="button"
                onClick={() => scrollTrendingVideos('right')}
                className="grid h-10 w-10 place-items-center rounded-lg border border-[#3A3A34] bg-[#242420] text-[#F5F0E8] hover:border-[#F5A623] hover:text-[#F5A623]"
                aria-label="Scroll trending videos right"
              >
                <ChevronRightIcon />
              </button>
              <Link href="/search?mode=videos" className="hidden items-center gap-1 text-sm font-bold text-[#F5A623] hover:text-[#ffc15a] sm:inline-flex">
                View all
                <ArrowRightIcon />
              </Link>
            </div>
          </div>

          {videosLoading ? (
            <div className="flex gap-4 overflow-hidden rounded-2xl">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-[27rem] w-[17rem] shrink-0 animate-pulse rounded-2xl border border-[#3A3A34] bg-[#242420] sm:w-[19rem]"
                />
              ))}
            </div>
          ) : trendingVideos.length > 0 ? (
            <div className="relative">
              <div
                ref={trendingScrollerRef}
                className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10"
                aria-label="Trending local video carousel"
              >
                {trendingVideos.map((video) => {
                  const creatorName = video.businesses?.business_name
                    || video.profiles?.full_name
                    || video.profiles?.username
                    || 'Local creator';

                  return (
                    <article
                      key={video.id}
                      className="group isolate w-[17rem] shrink-0 snap-start overflow-hidden rounded-2xl bg-[#242420] shadow-lg shadow-black/10 ring-1 ring-inset ring-[#3A3A34] hover:ring-[#F5A623] sm:w-[19rem]"
                    >
                      <Link href={`/video/${video.id}`} className="block">
                        <div className="relative aspect-[9/16] overflow-hidden bg-[#1A1A18]">
                          <video
                            src={video.video_url}
                            className="h-full w-full object-cover"
                            muted
                            loop
                            playsInline
                            preload="metadata"
                            onMouseEnter={(event) => {
                              event.currentTarget.play().catch(() => {});
                            }}
                            onMouseLeave={(event) => {
                              event.currentTarget.pause();
                              event.currentTarget.currentTime = 0;
                            }}
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#1A1A18] via-[#1A1A18]/75 to-transparent p-4 pt-12">
                            <p className="line-clamp-2 text-sm font-bold leading-5 text-[#F5F0E8]">
                              {video.caption || creatorName}
                            </p>
                          </div>
                          <span className="absolute left-3 top-3 rounded-full bg-[#1A1A18]/85 px-3 py-1 text-xs font-bold text-[#F5F0E8]">
                            {video.view_count || 0} views
                          </span>
                        </div>
                      </Link>
                      <div className="p-4">
                        <p className="truncate text-sm font-bold text-[#F5F0E8]">{creatorName}</p>
                        <p className="mt-1 truncate text-xs capitalize text-[#F5A623]">
                          {video.businesses?.category || 'Trending video'}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#3A3A34] bg-[#242420] p-8 text-center text-[#C5BFB3]">
              No trending videos yet.
            </div>
          )}
        </section>

        <section id="collections" className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1.18fr_0.82fr] lg:px-10">
          <div>
            <SectionHeading title="Collections" href="/collections" label="View all collections" />

            <div className="grid gap-4 sm:grid-cols-3">
              {collections.map((collection) => (
                <Link
                  key={collection.title}
                  href={collection.href}
                  className="overflow-hidden rounded-2xl border border-[#3A3A34] bg-[#242420] shadow-lg shadow-black/10 hover:border-[#F5A623]"
                >
                  <div className={`h-32 bg-gradient-to-br ${collection.imageClass}`} />
                  <div className="p-4">
                    <h3 className="font-bold text-[#F5F0E8]">{collection.title}</h3>
                    <p className="mt-1 text-sm text-[#9E9A90]">{collection.count}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <aside id="map" className="rounded-2xl border border-[#3A3A34] bg-[#242420] p-5 shadow-lg shadow-black/10">
            <SectionHeading title="Explore the map" href="/search?nearMe=1" label="View full map" compact />

            <div className="mt-4">
              <HomeMap businesses={trendingBusinesses} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-[#C5BFB3]">
              <span className="rounded-full bg-[#1A1A18] px-3 py-2">Food</span>
              <span className="rounded-full bg-[#1A1A18] px-3 py-2">Coffee</span>
              <span className="rounded-full bg-[#1A1A18] px-3 py-2">Shops</span>
              <span className="rounded-full bg-[#1A1A18] px-3 py-2">Services</span>
            </div>
          </aside>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
          <h2 className="text-center text-3xl font-bold text-[#F5F0E8]">Why people love Localys</h2>

          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <FeatureCard icon={<MapPinIcon />} title="Discover nearby" copy="Find local spots around you every day." />
            <FeatureCard icon={<HeartIcon />} title="Saved in one place" copy="Build your go-to list of favourites." />
            <FeatureCard icon={<UsersIcon />} title="Community picks" copy="Real recommendations from real locals." />
            <FeatureCard icon={<SparkleIcon />} title="Hidden gems" copy="Find places you did not know you needed." />
            <FeatureCard icon={<PlusIcon />} title="Support local" copy="Every discovery helps small businesses thrive." />
          </div>
        </section>
      </main>

      <footer className="border-t border-[#3A3A34] bg-[#242420]/70">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 xl:grid-cols-[1.25fr_0.7fr_0.8fr_0.7fr_1.2fr] lg:px-10">
          <div>
            <Link href="/feed" className="flex items-center gap-3 text-xl font-bold">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#F5A623] text-[#1A1A18]">
                <MapPinIcon />
              </span>
              Localys
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-[#C5BFB3]">
              Discover more. Support local. Be part of your community.
            </p>
          </div>

          <FooterLinks title="Explore" links={[
            ['All categories', '#categories'],
            ['Nearby', '/search?nearMe=1'],
            ['Map', '#map'],
            ['Collections', '#collections'],
          ]} />
          <FooterLinks title="For Businesses" links={[
            ['Business profile', '/profile'],
            ['Orders', '/dashboard'],
          ]} />
          <FooterLinks title="Company" links={[
            ['About us', '#top'],
            ['Our mission', '#top'],
            ['Contact', '/profile'],
          ]} />

          <form onSubmit={submitNewsletter} className="rounded-2xl border border-[#3A3A34] bg-[#1A1A18] p-5">
            <h3 className="text-base font-bold">Stay in the loop</h3>
            <p className="mt-2 text-sm leading-6 text-[#C5BFB3]">Get local tips and new spot highlights.</p>
            <input
              type="email"
              value={newsletterEmail}
              onChange={(event) => setNewsletterEmail(event.target.value)}
              placeholder="Enter your email"
              className="mt-4 min-h-11 w-full rounded-lg border border-[#3A3A34] bg-[#242420] px-3 text-[#F5F0E8] outline-none placeholder:text-[#9E9A90] focus:border-[#F5A623]"
            />
            <button
              type="submit"
              className="mt-3 min-h-11 w-full rounded-lg bg-[#F5A623] font-bold text-[#1A1A18] hover:bg-[#ffc15a]"
            >
              Subscribe
            </button>
            {newsletterStatus && (
              <p className="mt-3 text-sm text-[#6BAF7A]">{newsletterStatus}</p>
            )}
          </form>
        </div>

        <p className="border-t border-[#3A3A34] px-4 py-5 text-center text-sm text-[#9E9A90]">
          &copy; 2026 Localys. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

function SectionHeading({
  title,
  href,
  label,
  compact = false,
}: {
  title: string;
  href: string;
  label: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 ${compact ? 'mb-0' : 'mb-5'}`}>
      <h2 className="text-2xl font-bold text-[#F5F0E8]">{title}</h2>
      <Link href={href} className="inline-flex items-center gap-1 text-sm font-bold text-[#F5A623] hover:text-[#ffc15a]">
        {label}
        <ArrowRightIcon />
      </Link>
    </div>
  );
}

function FeatureCard({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) {
  return (
    <div className="rounded-2xl border border-[#3A3A34] bg-[#242420] p-5">
      <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#F5A623]/10 text-[#F5A623]">{icon}</span>
      <h3 className="mt-4 text-base font-bold text-[#F5F0E8]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#C5BFB3]">{copy}</p>
    </div>
  );
}

function FooterLinks({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h3 className="text-base font-bold text-[#F5F0E8]">{title}</h3>
      <div className="mt-3 space-y-2">
        {links.map(([label, href]) => (
          href.startsWith('#') ? (
            <a key={label} href={href} className="block text-sm text-[#C5BFB3] hover:text-[#F5A623]">
              {label}
            </a>
          ) : (
            <Link key={label} href={href} className="block text-sm text-[#C5BFB3] hover:text-[#F5A623]">
              {label}
            </Link>
          )
        ))}
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10.25a1.75 1.75 0 1 0 0-.01" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21a8 8 0 1 1 16 0" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 18 6-6-6-6" />
    </svg>
  );
}

function HeartIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg className="h-5 w-5" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  );
}

function CupIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h11v6a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8Zm11 2h1a3 3 0 0 1 0 6h-1M7 3v2m4-2v2m4-2v2" />
    </svg>
  );
}

function ForkIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3v8m-3-8v8a3 3 0 0 0 6 0V3m-3 11v7m10-18v18M14 7h6" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13 11 4H4v7l9 9a2 2 0 0 0 2.8 0L20 15.8a2 2 0 0 0 0-2.8Z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.5 7.5h.01" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Zm6 12 .8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15Z" />
    </svg>
  );
}

function PulseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h4l2-6 4 12 2-6h6" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Zm0 13a3 3 0 0 1 3-3h11" />
    </svg>
  );
}

function CraftIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 20h16M6 16l3-9 3 9m-5-4h4m4-5h3a2 2 0 0 1 0 4h-3V7Zm0 4h4a2 2 0 0 1 0 4h-4v-4Z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM3 21a7 7 0 0 1 14 0m1-10a3 3 0 0 1 0 6m1 4a5.5 5.5 0 0 0-3-4.9" />
    </svg>
  );
}
