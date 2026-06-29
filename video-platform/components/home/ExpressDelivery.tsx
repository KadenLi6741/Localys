import Link from 'next/link';
import { Zap } from 'lucide-react';

/** Walmart-style Express Delivery banner: chip | headline + CTA | teddy bear image. */
export function ExpressDelivery() {
  return (
    <section className="relative flex min-h-[160px] overflow-hidden rounded-2xl bg-[#ea6c00] text-white">
      {/* Left — white chip: lightning bolt + stacked "Express / Delivery" */}
      <div className="flex shrink-0 items-center px-4 py-4 sm:px-7">
        <div className="rounded-xl bg-white px-2.5 py-1.5 shadow-sm text-center">
          <div className="flex items-center gap-1">
            <Zap className="h-4 w-4 shrink-0 fill-[#f97316] text-[#f97316]" />
            <div className="flex flex-col" style={{ lineHeight: 1 }}>
              <span className="text-[11px] font-extrabold text-[#f97316]">Express</span>
              <span className="text-[11px] font-extrabold text-[#f97316]">Delivery</span>
            </div>
          </div>
        </div>
      </div>

      {/* Center — headline, subtitle, CTA */}
      <div className="flex flex-1 flex-col items-center justify-center px-2 py-6 text-center">
        <h2 className="text-xl font-extrabold text-white sm:text-2xl">Get local faves fast</h2>
        <p className="mt-1 text-sm text-white/85">Get faves in under 2 hrs</p>
        <Link
          href="/feed"
          className="mt-3 inline-block font-bold text-white underline underline-offset-2"
        >
          Shop
        </Link>
        <p className="mt-1 text-[11px] text-white/55">*Fees and terms apply</p>
      </div>

      {/* Right — teddy bear image (hidden on xs) */}
      <div className="relative hidden shrink-0 sm:block" style={{ width: '176px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/ui-references/teddybear.jpg"
          alt=""
          className="h-full w-full object-cover object-top"
        />
      </div>
    </section>
  );
}
