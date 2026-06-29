'use client';

/**
 * LocationPickerMap — interactive map for choosing a delivery address by tapping/dragging a pin.
 * Purpose: Lets users set exactly where they want delivery. It loads the full (JS) Google Maps,
 *   reverse-geocodes the pin to a human-readable address as it moves, and reports the chosen
 *   {lat,lng,address} on confirm. Used in the delivery-location flow.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { useEffect, useRef, useState } from 'react';
import { Crosshair, MapPin } from 'lucide-react';
import { loadGoogleMaps, hasGoogleMapsKey } from '@/lib/utils/googleMapsLoader';
import { reverseGeocode } from '@/lib/utils/googleGeocode';
import type { DeliveryLocation } from '@/contexts/DeliveryLocationContext';

/**
 * An interactive Google Map where the user clicks (or drags the pin) to choose a
 * delivery spot, then confirms it. Palette: black / white / orange (#f97316) only.
 *
 * - `initial`: where to centre + drop the first pin (the saved location or a
 *   sensible default). The user can move the pin anywhere.
 * - `onConfirm`: called with the chosen { lat, lng, address }.
 * - `onUseCurrent`: optional — re-detect the browser's current position.
 */
const ORANGE = '#f97316';
const DEFAULT_CENTER = { lat: 43.8828, lng: -79.4403 }; // Richmond Hill, ON fallback

export function LocationPickerMap({
  initial,
  detecting,
  onConfirm,
  onUseCurrent,
}: {
  initial: DeliveryLocation | null;
  detecting?: boolean;
  onConfirm: (loc: DeliveryLocation) => void;
  onUseCurrent?: () => Promise<DeliveryLocation | null>;
}) {
  const mapElRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);

  const [coords, setCoords] = useState<{ lat: number; lng: number }>(
    initial ? { lat: initial.lat, lng: initial.lng } : DEFAULT_CENTER,
  );
  const [address, setAddress] = useState<string>(initial?.address ?? '');
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve a fresh address whenever the pin moves.
  const updateAddress = (lat: number, lng: number) => {
    setResolving(true);
    void reverseGeocode(lat, lng).then((addr) => {
      setAddress(addr || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      setResolving(false);
    });
  };

  // Initialise the map once.
  useEffect(() => {
    let cancelled = false;
    if (!hasGoogleMapsKey) {
      setError('Map unavailable — missing Google Maps key.');
      return;
    }
    loadGoogleMaps()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((maps: any) => {
        if (cancelled || !mapElRef.current) return;
        const start = initial ? { lat: initial.lat, lng: initial.lng } : DEFAULT_CENTER;
        const map = new maps.Map(mapElRef.current, {
          center: start,
          zoom: initial ? 15 : 12,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          gestureHandling: 'greedy',
        });
        const marker = new maps.Marker({
          position: start,
          map,
          draggable: true,
          title: 'Drag to set your delivery spot',
        });
        mapRef.current = map;
        markerRef.current = marker;

        const place = (lat: number, lng: number) => {
          marker.setPosition({ lat, lng });
          setCoords({ lat, lng });
          updateAddress(lat, lng);
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.addListener('click', (e: any) => {
          if (!e.latLng) return;
          place(e.latLng.lat(), e.latLng.lng());
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        marker.addListener('dragend', (e: any) => {
          if (!e.latLng) return;
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          map.panTo({ lat, lng });
          setCoords({ lat, lng });
          updateAddress(lat, lng);
        });

        if (!initial) updateAddress(start.lat, start.lng);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the map. Check your connection and try again.');
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-detects the device's current position (via the parent callback) and recenters the map/pin on it.
  const handleUseCurrent = async () => {
    if (!onUseCurrent) return;
    const loc = await onUseCurrent();
    if (!loc) return;
    setCoords({ lat: loc.lat, lng: loc.lng });
    setAddress(loc.address);
    if (mapRef.current && markerRef.current) {
      mapRef.current.panTo({ lat: loc.lat, lng: loc.lng });
      mapRef.current.setZoom(15);
      markerRef.current.setPosition({ lat: loc.lat, lng: loc.lng });
    }
  };

  if (error) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-xl border border-gray-200 bg-white p-4 text-center text-sm text-black">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <div ref={mapElRef} className="h-[220px] w-full overflow-hidden rounded-xl bg-gray-100" />
        {onUseCurrent && (
          <button
            type="button"
            onClick={handleUseCurrent}
            disabled={detecting}
            className="absolute right-2 top-2 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black shadow-md transition hover:bg-gray-50 disabled:opacity-60"
          >
            <Crosshair className="h-3.5 w-3.5" style={{ color: ORANGE }} />
            {detecting ? 'Locating…' : 'Use my location'}
          </button>
        )}
      </div>

      <div className="flex items-start gap-2 px-1">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ORANGE }} />
        <p className="text-sm text-black">
          {resolving ? 'Finding address…' : address || 'Tap the map to drop a pin'}
        </p>
      </div>

      <button
        type="button"
        onClick={() =>
          onConfirm({
            lat: coords.lat,
            lng: coords.lng,
            address: address || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`,
          })
        }
        className="mt-1 w-full rounded-xl bg-[#f97316] py-2.5 text-sm font-semibold text-white transition hover:bg-[#ea6a0c]"
      >
        Confirm delivery location
      </button>
    </div>
  );
}
