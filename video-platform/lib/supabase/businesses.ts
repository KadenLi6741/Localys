import { supabase } from './client';
import { haversineDistance } from '../utils/geo';
import { isOpenNow, type OpenStatus } from '../utils/hours';
import type { BusinessHours } from '../../models/Profile';

export interface NearbyBusiness {
  id: string;
  name: string;
  category?: string | null;
  imageUrl?: string | null;
  latitude: number;
  longitude: number;
  distanceKm: number;
  hours?: BusinessHours;
  status: OpenStatus;
}

interface NearbyOptions {
  limit?: number;
  maxDistanceKm?: number;
  now?: Date;
}

/**
 * Find business directory entries that are open right now, ordered by distance
 * from the given coordinates.
 *
 * Directory entries live in `profiles` (which carries the coordinates) while
 * opening hours live in `businesses`, keyed by `owner_id = profiles.id`. We
 * fetch nearby profiles first, then join their hours and keep only the ones we
 * can confirm are currently open.
 */
export async function getNearbyOpenBusinesses(
  lat: number,
  lng: number,
  { limit = 12, maxDistanceKm = 25, now = new Date() }: NearbyOptions = {}
): Promise<{ data: NearbyBusiness[]; error: any }> {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, profile_picture_url, type, latitude, longitude')
    .in('type', ['food', 'retail', 'service'])
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (error) {
    console.error('Nearby business query error:', error);
    return { data: [], error };
  }

  const nearby = (profiles || [])
    .map((p: any) => ({
      ...p,
      distanceKm: haversineDistance(lat, lng, p.latitude, p.longitude),
    }))
    .filter((p: any) => p.distanceKm <= maxDistanceKm)
    .sort((a: any, b: any) => a.distanceKm - b.distanceKm);

  if (!nearby.length) return { data: [], error: null };

  const ids = nearby.map((p: any) => p.id);
  const { data: bizRows } = await supabase
    .from('businesses')
    .select('owner_id, business_name, business_hours, profile_picture_url, category')
    .in('owner_id', ids);

  const bizMap: Record<string, any> = {};
  for (const row of bizRows || []) {
    let hours = row.business_hours;
    if (hours && typeof hours === 'string') {
      try {
        hours = JSON.parse(hours);
      } catch {
        hours = undefined;
      }
    }
    bizMap[row.owner_id] = { ...row, business_hours: hours };
  }

  const results: NearbyBusiness[] = [];
  for (const p of nearby) {
    const biz = bizMap[p.id];
    const hours = biz?.business_hours as BusinessHours | undefined;
    const status = isOpenNow(hours, now);
    if (!status?.open) continue; // only what's open right now

    results.push({
      id: p.id,
      name: biz?.business_name || p.full_name || p.username,
      category: biz?.category || p.type,
      imageUrl: biz?.profile_picture_url || p.profile_picture_url,
      latitude: p.latitude,
      longitude: p.longitude,
      distanceKm: p.distanceKm,
      hours,
      status,
    });
    if (results.length >= limit) break;
  }

  return { data: results, error: null };
}
