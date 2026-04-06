'use client';

import { useState, useEffect, useCallback } from 'react';

const MESSAGES = [
  'Up to 20% off for new customers',
  'Support local businesses in your neighborhood',
  'Discover hidden gems near you',
  'Order direct — no middleman',
];

export function AnnouncementBar() {
  const [current, setCurrent] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  const advance = useCallback(() => {
    setCurrent((c) => (c + 1) % MESSAGES.length);
    setAnimKey((k) => k + 1);
  }, []);

  useEffect(() => {
    // Each cycle is 6s (animation duration). After it finishes, go to next.
    const id = setInterval(advance, 6000);
    return () => clearInterval(id);
  }, [advance]);

  return (
    <div className="announcement-bar">
      <span
        key={animKey}
        className="announcement-bar-text"
        style={{ animation: 'slideMessage 6s ease-in-out forwards' }}
      >
        {MESSAGES[current]}
      </span>
    </div>
  );
}
