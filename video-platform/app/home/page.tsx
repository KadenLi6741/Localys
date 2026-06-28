'use client';

import { HomeDataProvider, spreadProducts, cheapestPerBusiness } from '@/components/home/HomeData';
import { DealsHero } from '@/components/home/DealsHero';
import { Challenges } from '@/components/home/Challenges';
import { ProductsRow } from '@/components/home/ProductsRow';
import { BusinessesRow } from '@/components/home/BusinessesRow';
import { ExpressDelivery } from '@/components/home/ExpressDelivery';
import { ShopByDepartment } from '@/components/home/ShopByDepartment';
import { FeaturedVideos } from '@/components/home/FeaturedVideos';
import { RankedLists } from '@/components/home/RankedLists';
import { Feedback } from '@/components/home/Feedback';

/**
 * Walmart-style Home feed. EVERY section renders from the real seeded Supabase
 * businesses/menu items (shared via HomeDataProvider) — no mock/placeholder data.
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 text-black dark:bg-[#1A1A18] dark:text-white">
      <HomeDataProvider>
        <div className="mx-auto w-full max-w-7xl space-y-10 px-4 py-6 sm:px-6">
          {/* (A) Featured businesses + challenges */}
          <DealsHero />
          <Challenges />

          {/* (B) Deals & more — real menu items spread across businesses */}
          <ProductsRow
            title="Deals & more for all"
            seeAllHref="/feed"
            select={(businesses) => spreadProducts(businesses, 2, 16)}
          />

          {/* (B2) Real local businesses */}
          <BusinessesRow title="Local businesses near you" seeAllHref="/feed" />

          {/* (C) Express delivery */}
          <ExpressDelivery />

          {/* (D) Shop by department — filters real businesses */}
          <ShopByDepartment />

          {/* (E) Trending — value picks across businesses */}
          <ProductsRow
            title="Trending in your area"
            seeAllHref="/feed"
            select={(businesses) => cheapestPerBusiness(businesses, 16)}
          />

          {/* (F) Featured in videos (real videos; hidden if none) */}
          <FeaturedVideos />

          {/* (G) Other businesses in your area */}
          <BusinessesRow
            title="Other businesses in your area"
            seeAllHref="/feed"
            select={(b) => b.slice().reverse()}
          />

          {/* (H) Ranked lists */}
          <RankedLists />

          {/* (I) Feedback */}
          <Feedback />
        </div>
      </HomeDataProvider>
    </div>
  );
}
