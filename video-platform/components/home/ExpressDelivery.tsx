import Link from 'next/link';
import { Zap } from 'lucide-react';

/** (C) Express delivery banner with a Shop CTA. */
export function ExpressDelivery() {
  return (
    <section className="flex flex-col items-start gap-4 rounded-3xl bg-[#ea6c00] p-6 text-white sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/20">
          <Zap className="h-6 w-6" />
        </span>
        <div>
          <p className="text-lg font-bold sm:text-xl">Express Delivery</p>
          <p className="text-sm text-white">Get your local faves in under 2 hours.</p>
        </div>
      </div>
      <Link
        href="/feed"
        className="rounded-full bg-white px-6 py-2.5 font-semibold text-[#ea6c00] shadow-sm transition hover:bg-orange-50"
      >
        Shop now
      </Link>
    </section>
  );
}
