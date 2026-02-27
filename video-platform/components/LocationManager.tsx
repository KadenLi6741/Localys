'use client';

import 'leaflet/dist/leaflet.css';
import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import {
  getBusinessLocations,
  addBusinessLocation,
  deleteBusinessLocation,
  BusinessLocation,
} from '@/lib/supabase/profiles';

const pendingIcon = L.divIcon({
  className: '',
  html: `<div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:22px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.6))">📍</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const savedIcon = (label: string) =>
  L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px">
      <div style="font-size:20px;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5))">📍</div>
      <div style="background:rgba(59,130,246,0.85);color:white;font-size:9px;padding:1px 5px;border-radius:4px;white-space:nowrap;max-width:80px;overflow:hidden;text-overflow:ellipsis">${label}</div>
    </div>`,
    iconSize: [32, 44],
    iconAnchor: [16, 44],
  });

interface ClickHandlerProps {
  onMapClick: (lat: number, lng: number) => void;
}

function ClickHandler({ onMapClick }: ClickHandlerProps) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface LocationManagerProps {
  profileId: string;
}

export default function LocationManager({ profileId }: LocationManagerProps) {
  const [locations, setLocations] = useState<BusinessLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState<{ lat: number; lng: number } | null>(null);
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadLocations = useCallback(async () => {
    setLoading(true);
    const { data } = await getBusinessLocations(profileId);
    setLocations(data ?? []);
    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  const handleSave = async () => {
    if (!pending) return;
    if (!label.trim()) {
      setError('Please enter a label for this location.');
      return;
    }
    setSaving(true);
    setError(null);
    const { data, error: saveError } = await addBusinessLocation(profileId, label.trim(), pending.lat, pending.lng);
    setSaving(false);
    if (saveError || !data) {
      setError('Failed to save location. Please try again.');
      return;
    }
    setLocations((prev) => [...prev, data]);
    setPending(null);
    setLabel('');
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteBusinessLocation(id);
    setLocations((prev) => prev.filter((l) => l.id !== id));
    setDeletingId(null);
  };

  const cancelAdding = () => {
    setAdding(false);
    setPending(null);
    setLabel('');
    setError(null);
  };

  return (
    <div className="space-y-4">
      {/* Saved locations list */}
      {loading ? (
        <p className="text-white/40 text-sm">Loading locations...</p>
      ) : locations.length === 0 ? (
        <p className="text-white/40 text-sm">No locations added yet.</p>
      ) : (
        <ul className="space-y-2">
          {locations.map((loc) => (
            <li
              key={loc.id}
              className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-4 py-3"
            >
              <div>
                <p className="text-white text-sm font-medium">{loc.label}</p>
                <p className="text-white/40 text-xs">
                  {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                </p>
              </div>
              <button
                onClick={() => handleDelete(loc.id)}
                disabled={deletingId === loc.id}
                className="text-red-400 hover:text-red-300 transition-colors text-sm disabled:opacity-40"
              >
                {deletingId === loc.id ? '...' : 'Remove'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add location map picker */}
      {adding ? (
        <div className="rounded-lg overflow-hidden border border-white/20">
          <p className="text-white/60 text-xs px-3 py-2 bg-white/5 border-b border-white/10">
            Tap anywhere on the map to place a pin
          </p>
          <MapContainer
            center={
              locations.length > 0
                ? [locations[locations.length - 1].latitude, locations[locations.length - 1].longitude]
                : [40.7128, -74.006]
            }
            zoom={13}
            style={{ height: '240px', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickHandler onMapClick={(lat, lng) => { setPending({ lat, lng }); setError(null); }} />
            {locations.map((loc) => (
              <Marker key={loc.id} position={[loc.latitude, loc.longitude]} icon={savedIcon(loc.label)} />
            ))}
            {pending && (
              <Marker position={[pending.lat, pending.lng]} icon={pendingIcon} />
            )}
          </MapContainer>

          <div className="p-3 bg-white/5 space-y-2 border-t border-white/10">
            {pending && (
              <p className="text-white/50 text-xs">
                Pin at {pending.lat.toFixed(5)}, {pending.lng.toFixed(5)}
              </p>
            )}
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder='Location label, e.g. "Downtown Branch"'
              maxLength={60}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={cancelAdding}
                className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg py-2 text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!pending || saving}
                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg py-2 text-sm font-medium transition-colors"
              >
                {saving ? 'Saving...' : 'Save Location'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors border border-blue-500/50 text-sm"
        >
          + Add Location
        </button>
      )}
    </div>
  );
}
