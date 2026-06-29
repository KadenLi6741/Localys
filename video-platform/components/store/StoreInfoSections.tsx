'use client';

/**
 * StoreInfoSections.tsx — three store-info blocks rendered at the TOP of the store
 * content area (above "Picked for you / Featured" + the menu):
 *   1. Founder Story  — short origin paragraph
 *   2. Things to Look Out For — allergen warnings + useful cautions, as orange tags
 *   3. Common Questions — an expandable FAQ accordion
 *
 * Content is mock/demo data resolved by slug in storeInfo.ts. Styling mirrors the
 * store page: black on white with #f97316 accents.
 */

import { useState } from 'react';
import { ChevronDown, AlertTriangle, HelpCircle, Sparkles } from 'lucide-react';
import { getStoreInfo } from './storeInfo';

export function StoreInfoSections({ slug }: { slug?: string }) {
  const info = getStoreInfo(slug);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="space-y-8">
      {/* 1. Founder Story */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#f97316]" strokeWidth={2} />
          <h2 className="text-2xl font-bold text-black">Founder Story</h2>
        </div>
        <div className="rounded-2xl border border-gray-200 p-4">
          <p className="text-sm leading-relaxed text-black">{info.founderStory}</p>
        </div>
      </section>

      {/* 2. Things to Look Out For */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-[#f97316]" strokeWidth={2} />
          <h2 className="text-2xl font-bold text-black">Things to Look Out For</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {info.lookOut.map((point, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#f97316]/40 bg-[#f97316]/10 px-3 py-1.5 text-sm font-medium text-black"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#f97316]" />
              {point}
            </span>
          ))}
        </div>
      </section>

      {/* 3. Common Questions */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-[#f97316]" strokeWidth={2} />
          <h2 className="text-2xl font-bold text-black">Common Questions</h2>
        </div>
        <div className="divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-200">
          {info.faqs.map((faq, i) => {
            const isOpen = openFaq === i;
            return (
              <div key={i}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-gray-50"
                >
                  <span className="text-sm font-semibold text-black">{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-[#f97316] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    strokeWidth={2.5}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-3 pt-0">
                    <p className="text-sm leading-relaxed text-gray-700">{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
