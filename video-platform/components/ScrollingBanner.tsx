'use client';

export function ScrollingBanner() {
  const text = 'SUPPORT LOCAL \u00B7 DISCOVER HIDDEN GEMS \u00B7 SHOP NEIGHBORHOOD BUSINESSES \u00B7 ORDER DIRECT \u00B7 NO MIDDLEMAN \u00B7 ';

  return (
    <div className="bottom-marquee">
      <div className="bottom-marquee-track">
        <span className="bottom-marquee-text">{text}</span>
        <span className="bottom-marquee-text">{text}</span>
        <span className="bottom-marquee-text">{text}</span>
        <span className="bottom-marquee-text">{text}</span>
      </div>
    </div>
  );
}
