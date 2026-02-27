'use client';

import 'leaflet/dist/leaflet.css';
import { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { haversineDistance } from '@/lib/utils/geo';
import type { BusinessLocation } from '@/lib/supabase/profiles';

const makeBusinessIcon = (label: string, index: number) =>
  L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px">
      <div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:22px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.6))">📍</div>
      ${index > 0 ? `<div style="background:rgba(0,0,0,0.75);color:white;font-size:10px;padding:1px 5px;border-radius:4px;white-space:nowrap;max-width:90px;overflow:hidden;text-overflow:ellipsis">${label}</div>` : ''}
    </div>`,
    iconSize: [32, 48],
    iconAnchor: [16, 48],
    popupAnchor: [0, -48],
  });

const userIcon = L.divIcon({
  className: '',
  html: `<div style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
    <div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,0.3)"></div>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

function FitAll({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) { map.setView(positions[0], 14); return; }
    map.fitBounds(positions, { padding: [50, 50] });
  }, [map, JSON.stringify(positions)]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

interface RouteInfo {
  drivingMinutes: number;
  drivingKm: number;
}

async function fetchRoute(
  userLat: number, userLng: number,
  bizLat: number, bizLng: number
): Promise<RouteInfo | null> {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${userLng},${userLat};${bizLng},${bizLat}?overview=false`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.code !== 'Ok' || !json.routes?.length) return null;
    return {
      drivingMinutes: Math.round(json.routes[0].duration / 60),
      drivingKm: Math.round((json.routes[0].distance / 1000) * 10) / 10,
    };
  } catch {
    return null;
  }
}

function formatDriveTime(minutes: number): string {
  if (minutes < 1) return '< 1 min drive';
  if (minutes < 60) return `${minutes} min drive`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m drive` : `${h}h drive`;
}

export interface BusinessLocationMapProps {
  locations: BusinessLocation[];
  businessName: string;
}

type GpsState = 'idle' | 'loading' | 'granted' | 'denied';

export default function BusinessLocationMap({ locations, businessName }: BusinessLocationMapProps) {
  const [gpsState, setGpsState] = useState<GpsState>('idle');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [routeInfo, setRouteInfo] = useState<Record<string, RouteInfo>>({});

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) { setGpsState('denied'); return; }
    setGpsState('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsState('granted');
      },
      () => setGpsState('denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Fetch driving routes for every location once GPS is known
  useEffect(() => {
    if (!userLocation || locations.length === 0) return;
    locations.forEach(async (loc) => {
      const info = await fetchRoute(userLocation.lat, userLocation.lng, loc.latitude, loc.longitude);
      if (info) setRouteInfo((prev) => ({ ...prev, [loc.id]: info }));
    });
  }, [userLocation, locations]);

  // Straight-line distance (fallback before routes load)
  const haversineForLoc = (loc: BusinessLocation) =>
    userLocation
      ? haversineDistance(loc.latitude, loc.longitude, userLocation.lat, userLocation.lng)
      : null;

  // Nearest location for the top badge
  const nearestRoute = userLocation
    ? Object.values(routeInfo).sort((a, b) => a.drivingMinutes - b.drivingMinutes)[0] ?? null
    : null;

  const nearestStraightLine = userLocation && locations.length > 0
    ? Math.min(...locations.map((l) => haversineDistance(l.latitude, l.longitude, userLocation.lat, userLocation.lng)))
    : null;

  const badgeLabel = nearestRoute
    ? `${formatDriveTime(nearestRoute.drivingMinutes)} · ${nearestRoute.drivingKm} km`
    : nearestStraightLine !== null
    ? nearestStraightLine < 1
      ? `${Math.round(nearestStraightLine * 1000)} m away`
      : `${nearestStraightLine.toFixed(1)} km away`
    : null;

  const allPositions: [number, number][] = [
    ...locations.map((loc): [number, number] => [loc.latitude, loc.longitude]),
    ...(userLocation ? [[userLocation.lat, userLocation.lng] as [number, number]] : []),
  ];

  const center: [number, number] =
    locations.length > 0 ? [locations[0].latitude, locations[0].longitude] : [0, 0];

  return (
    <div className="relative">
      <MapContainer
        center={center}
        zoom={14}
        style={{ height: '350px', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {locations.map((loc, i) => {
          const straight = haversineForLoc(loc);
          const route = routeInfo[loc.id];
          return (
            <Marker
              key={loc.id}
              position={[loc.latitude, loc.longitude]}
              icon={makeBusinessIcon(loc.label, i)}
            >
              <Popup>
                <div style={{ minWidth: '140px' }}>
                  <strong>{businessName}</strong>
                  {locations.length > 1 && <div style={{ color: '#555', fontSize: '12px' }}>{loc.label}</div>}
                  {straight !== null && (
                    <div style={{ marginTop: '6px', fontSize: '12px', color: '#333' }}>
                      📏 {straight < 1
                        ? `${Math.round(straight * 1000)} m away`
                        : `${straight.toFixed(1)} km away`}
                    </div>
                  )}
                  {route ? (
                    <div style={{ fontSize: '12px', color: '#1a73e8', marginTop: '2px' }}>
                      🚗 {formatDriveTime(route.drivingMinutes)} ({route.drivingKm} km)
                    </div>
                  ) : straight !== null ? (
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                      Loading drive time...
                    </div>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>Your location</Popup>
          </Marker>
        )}

        <FitAll positions={allPositions} />
      </MapContainer>

      {/* Badge: nearest drive time (or straight-line while loading) */}
      {badgeLabel && (
        <div className="absolute top-3 right-3 z-[1000] bg-black/80 text-white text-sm font-medium px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/20 pointer-events-none">
          {badgeLabel}
        </div>
      )}

      {/* Controls bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-t border-white/10">
        <div>
          {gpsState === 'idle' && (
            <button
              onClick={requestLocation}
              className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Show my location
            </button>
          )}
          {gpsState === 'loading' && (
            <div className="flex items-center gap-2 text-sm text-white/60">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white/60"></div>
              Getting your location...
            </div>
          )}
          {gpsState === 'granted' && badgeLabel && (
            <p className="text-sm text-green-400">
              {locations.length > 1 ? 'Nearest: ' : ''}{badgeLabel}
            </p>
          )}
          {gpsState === 'denied' && (
            <p className="text-sm text-white/40">Location access denied — showing business location only</p>
          )}
        </div>
        <a
          href={`https://www.openstreetmap.org/?mlat=${center[0]}&mlon=${center[1]}#map=15/${center[0]}/${center[1]}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          Open in maps ↗
        </a>
      </div>
    </div>
  );
}
