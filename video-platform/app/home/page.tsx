'use client';

import { HomeDataProvider, useHomeFeed } from '@/components/home/HomeData';
import { DealsHero } from '@/components/home/DealsHero';
import { Challenges } from '@/components/home/Challenges';
import { ProductsRow } from '@/components/home/ProductsRow';
import { BusinessesRow } from '@/components/home/BusinessesRow';
import { ExpressDelivery } from '@/components/home/ExpressDelivery';
import { ShopByDepartment } from '@/components/home/ShopByDepartment';
import { FeaturedInVideos } from '@/components/home/FeaturedInVideos';
import { CuratedCollections } from '@/components/home/CuratedCollections';
import { Feedback } from '@/components/home/Feedback';

/**
 * Walmart-style Home feed. Every row is a single coherent THEME, built once by
 * `useHomeFeed()` (themed, image-deduped, high-res-only — no blurry photos, no
 * repeated images, food featured most). "Trending in your area" is preserved.
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <HomeDataProvider>
        <HomeBody />
      </HomeDataProvider>
    </div>
  );
}

function HomeBody() {
  const feed = useHomeFeed();
  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 px-4 py-6 sm:px-6">
      {/* Featured businesses + challenges */}
      <DealsHero />
      <Challenges />

      {/* Businesses with linked videos — hover to preview, click to watch in Discover */}
      <FeaturedInVideos />

      {/* Community-curated restaurant lists + order combos */}
      <CuratedCollections />

      {/* Food-forward, themed rows */}
      <BusinessesRow title="Top restaurants near you" seeAllHref="/feed" list={feed.topRestaurants} />
      <BusinessesRow title="Local businesses near you" seeAllHref="/feed" list={feed.localBusinesses} />
      <ProductsRow title="Trending in your area" seeAllHref="/feed" items={feed.trending} />

      <ExpressDelivery />
      <ShopByDepartment />

      <ProductsRow title="Fresh flowers & gifts" seeAllHref="/feed" items={feed.flowers} />
      <ProductsRow title="For your pets" seeAllHref="/feed" items={feed.pets} />
      <ProductsRow title="Grocery & convenience" seeAllHref="/feed" items={feed.groceryConvenience} />
      <ProductsRow title="Pharmacy & wellness" seeAllHref="/feed" items={feed.pharmacy} />

      <BusinessesRow title="Home services" seeAllHref="/feed" list={feed.services} />

      <Feedback />
    </div>
  );
}
