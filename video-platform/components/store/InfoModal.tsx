'use client';

/**
 * InfoModal.tsx — the store "Info" pop-up. Shows a Google Map of the store
 * (switching to a driving route once the user grants location), the straight-line
 * distance, and the store's rating, address, phone, and weekly hours.
 *
 * Extracted from StorePage so the page component stays focused on the menu layout
 * and this self-contained modal (with its own geolocation/geocoding effects) can
 * be reasoned about and reused independently.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */
import { useEffect, useRef, useState } from 'react';
import { Clock, MapPin, Phone, X } from 'lucide-react';
import { GoogleMap } from '@/components/GoogleMap';
import { geocodeAddress } from '@/lib/utils/googleGeocode';
import { haversineDistance } from '@/lib/utils/geo';
import { formatDistanceKm } from '@/lib/utils/distance';
import { Stars } from './StorePrimitives';
import type { StoreMenu } from './types';

/** Days of the week in display order for the hours table. */
const HOUR_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

/** State of the browser geolocation request that powers the route + distance. */
type GeoPermissionState = 'idle' | 'loading' | 'granted' | 'denied';

/** Convert a 24h "HH:MM" string into a 12-hour "h:MM AM/PM" label. */
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  return `${hours % 12 || 12}:${minutes.toString().padStart(2, '0')} ${meridiem}`;
}

export function InfoModal({ menu, storeName, onClose }: { menu: StoreMenu; storeName: string; onClose: () => void }) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoState, setGeoState] = useState<GeoPermissionState>('idle');
  const [storeCoords, setStoreCoords] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Ask for the user's location once when the pop-up opens (graceful if denied).
  // The synchronous status sets below intentionally mirror geolocation
  // availability; the actual position resolves asynchronously in the callbacks.
  useEffect(() => {
    if (!menu.address) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!navigator.geolocation) { setGeoState('denied'); return; }
    setGeoState('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoState('granted'); },
      () => setGeoState('denied'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [menu.address]);

  // Best-effort geocode of the store address → straight-line distance text.
  useEffect(() => {
    if (!menu.address) return;
    let active = true;
    geocodeAddress(menu.address).then((coords) => { if (active && coords) setStoreCoords(coords); }).catch(() => {});
    return () => { active = false; };
  }, [menu.address]);

  const focusMap = () => mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const straightLineKm =
    geoState === 'granted' && userLocation && storeCoords
      ? haversineDistance(storeCoords.lat, storeCoords.lng, userLocation.lat, userLocation.lng)
      : null;
  const distanceLabel = straightLineKm == null ? null : `${formatDistanceKm(straightLineKm)} away`;

  const reviewCount = menu.reviews?.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-bold text-black">{storeName}</h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 transition-colors hover:text-black">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto">
          {/* TOP: Google Map (store marker; route + driving time once location granted) */}
          <div ref={mapRef}>
            <GoogleMap
              title={`${storeName} location`}
              query={menu.address}
              origin={geoState === 'granted' ? userLocation : null}
              className="h-[260px] w-full sm:h-[300px]"
            />
          </div>

          {/* Distance / route status */}
          <div className="border-b border-gray-100 px-5 py-3">
            {geoState === 'loading' && (
              <span className="inline-flex items-center gap-2 text-sm text-gray-500">
                <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-[#f97316]" />
                Finding how far you are...
              </span>
            )}
            {geoState === 'granted' && (
              <span className="text-sm text-black">
                {distanceLabel ? `${distanceLabel} · driving route and time on the map above` : 'Driving route and time shown on the map above'}
              </span>
            )}
            {geoState === 'denied' && (
              <span className="text-sm text-gray-500">Location off — showing the store location only.</span>
            )}
            {geoState === 'idle' && (
              <span className="text-sm text-gray-500">Store location shown above.</span>
            )}
          </div>

          {/* BELOW: store details */}
          <div className="space-y-4 px-5 py-4">
            {/* Rating + reviews */}
            <div className="flex items-center gap-2">
              <Stars value={menu.rating} />
              <span className="text-sm font-semibold text-black">{menu.rating.toFixed(1)}</span>
              <span className="text-sm text-gray-500">
                ({reviewCount > 0 ? `${reviewCount} ` : ''}{menu.ratingCount} reviews)
              </span>
            </div>

            {/* Address — click to focus the map */}
            {menu.address && (
              <button
                type="button"
                onClick={focusMap}
                className="flex w-full gap-3 text-left"
                aria-label="Focus map on store location"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#f97316]" />
                <span className="text-sm text-black underline-offset-2 hover:underline">{menu.address}</span>
              </button>
            )}

            {/* Phone */}
            {menu.phone && (
              <a href={`tel:${menu.phone.replace(/[^0-9+]/g, '')}`} className="flex gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[#f97316]" />
                <span className="text-sm text-black underline-offset-2 hover:underline">{menu.phone}</span>
              </a>
            )}

            {/* Hours */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-[#f97316]" />
                <p className="text-sm font-semibold text-black">Hours</p>
              </div>
              {menu.businessHours ? (
                <div className="ml-6 space-y-1">
                  {HOUR_DAYS.map((day) => {
                    const hours = menu.businessHours![day];
                    return (
                      <div key={day} className="flex justify-between text-sm">
                        <span className="capitalize text-gray-500">{day}</span>
                        {hours?.closed ? (
                          <span className="text-gray-400">Closed</span>
                        ) : hours?.open && hours?.close ? (
                          <span className="font-medium text-black">{formatTime(hours.open)} – {formatTime(hours.close)}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="ml-6 text-sm text-black">{menu.hoursLabel}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
