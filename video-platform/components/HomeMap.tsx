'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { haversineDistance } from '@/lib/utils/geo';

export type HomeMapBusiness = {
  name: string;
  meta: string;
  href: string;
  category: string;
  latitude: number;
  longitude: number;
};

type HomeMapProps = {
  businesses: HomeMapBusiness[];
};

type UserLocation = {
  lat: number;
  lng: number;
};

const categoryColors: Record<string, string> = {
  Coffee: '#F5A623',
  Food: '#E05C3A',
  Thrift: '#6BAF7A',
  Beauty: '#D9A8FF',
};

const userIcon = L.divIcon({
  className: 'localys-home-map-icon',
  html: '<span class="localys-home-map-user-marker"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function makeBusinessIcon(category: string) {
  const color = categoryColors[category] || '#F5A623';

  return L.divIcon({
    className: 'localys-home-map-icon',
    html: `<span class="localys-home-map-marker" style="--marker-color:${color}"></span>`,
    iconSize: [30, 38],
    iconAnchor: [15, 38],
    popupAnchor: [0, -34],
  });
}

function FlyToBusiness({ business }: { business: HomeMapBusiness }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([business.latitude, business.longitude], Math.max(map.getZoom(), 15), {
      duration: 0.65,
    });
  }, [business, map]);

  return null;
}

function formatDistance(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export default function HomeMap({ businesses }: HomeMapProps) {
  const [selectedName, setSelectedName] = useState(businesses[0]?.name ?? '');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const selectedBusiness = businesses.find((business) => business.name === selectedName) || businesses[0];

  const center = useMemo<[number, number]>(() => {
    if (!selectedBusiness) return [43.6545, -79.4007];
    return [selectedBusiness.latitude, selectedBusiness.longitude];
  }, [selectedBusiness]);

  const closestBusiness = useMemo(() => {
    if (!userLocation || businesses.length === 0) return null;

    return businesses
      .map((business) => ({
        business,
        distance: haversineDistance(
          userLocation.lat,
          userLocation.lng,
          business.latitude,
          business.longitude
        ),
      }))
      .sort((a, b) => a.distance - b.distance)[0];
  }, [businesses, userLocation]);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      return;
    }

    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationStatus('idle');
      },
      () => setLocationStatus('error'),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  if (businesses.length === 0) {
    return (
      <div className="grid h-72 place-items-center rounded-xl border border-[#3A3A34] bg-[#1A1A18] text-sm text-[#9E9A90]">
        No mapped businesses yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#3A3A34] bg-[#1A1A18]">
      <div className="relative h-72">
        <MapContainer
          center={center}
          zoom={15}
          minZoom={12}
          maxZoom={18}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {businesses.map((business) => (
            <Marker
              key={business.name}
              position={[business.latitude, business.longitude]}
              icon={makeBusinessIcon(business.category)}
              eventHandlers={{
                click: () => setSelectedName(business.name),
              }}
            >
              <Popup>
                <div className="min-w-36">
                  <strong>{business.name}</strong>
                  <p className="m-0 mt-1 text-xs text-neutral-600">{business.meta}</p>
                  <a className="mt-2 inline-block text-xs font-bold text-[#A06600]" href={business.href}>
                    View business
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}

          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
              <Popup>Your location</Popup>
            </Marker>
          )}

          {selectedBusiness && <FlyToBusiness business={selectedBusiness} />}
        </MapContainer>

        <div className="pointer-events-none absolute inset-x-3 top-3 z-[1000] flex items-start justify-between gap-3">
          <div className="max-w-[72%] rounded-lg border border-[#3A3A34] bg-[#1A1A18]/90 px-3 py-2 text-xs shadow-lg backdrop-blur">
            <p className="m-0 font-bold text-[#F5F0E8]">{selectedBusiness.name}</p>
            <p className="m-0 mt-0.5 text-[#C5BFB3]">{selectedBusiness.meta}</p>
          </div>

          <button
            type="button"
            onClick={requestLocation}
            className="pointer-events-auto inline-flex min-h-9 items-center rounded-lg border border-[#3A3A34] bg-[#1A1A18]/90 px-3 text-xs font-bold text-[#F5A623] shadow-lg backdrop-blur hover:border-[#F5A623]"
          >
            {locationStatus === 'loading' ? 'Locating...' : 'Use GPS'}
          </button>
        </div>
      </div>

      <div className="border-t border-[#3A3A34] bg-[#242420] p-3">
        {closestBusiness ? (
          <p className="m-0 text-xs font-semibold text-[#6BAF7A]">
            Nearest to you: {closestBusiness.business.name} - {formatDistance(closestBusiness.distance)}
          </p>
        ) : locationStatus === 'error' ? (
          <p className="m-0 text-xs text-[#E05C3A]">Location access unavailable. Showing Kensington businesses.</p>
        ) : (
          <p className="m-0 text-xs text-[#C5BFB3]">OpenStreetMap pins around Kensington Market.</p>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          {businesses.map((business) => {
            const isSelected = business.name === selectedBusiness.name;

            return (
              <button
                key={business.name}
                type="button"
                onClick={() => setSelectedName(business.name)}
                className={`min-h-10 truncate rounded-lg border px-3 text-left text-xs font-bold ${
                  isSelected
                    ? 'border-[#F5A623] bg-[#F5A623] text-[#1A1A18]'
                    : 'border-[#3A3A34] bg-[#1A1A18] text-[#F5F0E8] hover:border-[#F5A623]'
                }`}
              >
                {business.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
