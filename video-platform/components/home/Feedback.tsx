'use client';

import { useState } from 'react';
import { MessageSquareHeart } from 'lucide-react';

/** (I) Bottom feedback prompt. */
export function Feedback() {
  const [sent, setSent] = useState(false);
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-orange-50 text-[#f97316] dark:bg-[#f97316]/15">
        <MessageSquareHeart className="h-6 w-6" />
      </span>
      <h2 className="text-xl font-bold text-black dark:text-white">We&apos;d love to hear what you think!</h2>
      <p className="mt-1 text-sm text-black dark:text-white">Your feedback helps us support more local businesses.</p>
      <button
        type="button"
        onClick={() => setSent(true)}
        className="mt-4 rounded-full bg-[#f97316] px-6 py-2.5 font-semibold text-white transition hover:opacity-90"
      >
        {sent ? 'Thanks for sharing!' : 'Give feedback'}
      </button>
    </section>
  );
}
