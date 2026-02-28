import { supabase } from './client';
import type { BusyTimeSlot, DayBusyTimes } from '../../models/BusyTimes';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export async function getBusyTimes(businessId: string) {
  try {
    const { data, error } = await supabase
      .from('busy_times')
      .select('*')
      .eq('business_id', businessId)
      .order('day_of_week', { ascending: true })
      .order('hour', { ascending: true });

    if (error) {
      console.error('Error fetching busy times:', error);
      return { data: null, error };
    }

    return { data: data as BusyTimeSlot[], error: null };
  } catch (error: any) {
    console.error('Exception fetching busy times:', error);
    return { data: null, error };
  }
}

export async function getBusyTimesForDay(businessId: string, dayOfWeek: number) {
  try {
    const { data, error } = await supabase
      .from('busy_times')
      .select('*')
      .eq('business_id', businessId)
      .eq('day_of_week', dayOfWeek)
      .order('hour', { ascending: true });

    if (error) {
      console.error('Error fetching busy times for day:', error);
      return { data: null, error };
    }

    return { data: data as BusyTimeSlot[], error: null };
  } catch (error: any) {
    console.error('Exception fetching busy times for day:', error);
    return { data: null, error };
  }
}

export async function seedBusyTimes(businessId: string) {
  try {
    const { error } = await supabase.rpc('seed_busy_times', {
      p_business_id: businessId,
    });

    if (error) {
      console.error('Error seeding busy times:', error);
      return { error };
    }

    return { error: null };
  } catch (error: any) {
    console.error('Exception seeding busy times:', error);
    return { error };
  }
}

export function groupBusyTimesByDay(slots: BusyTimeSlot[]): DayBusyTimes[] {
  const grouped: DayBusyTimes[] = [];

  for (let d = 0; d < 7; d++) {
    const daySlots = slots
      .filter((s) => s.day_of_week === d)
      .map((s) => ({ hour: s.hour, level: s.busyness_level }));

    grouped.push({
      dayOfWeek: d,
      dayName: DAY_NAMES[d],
      slots: daySlots,
    });
  }

  return grouped;
}

export async function updateBusyTimesFromOrders(businessId: string) {
  try {
    const { data: orders, error: ordersError } = await supabase
      .from('preorders')
      .select('scheduled_time')
      .eq('business_id', businessId)
      .in('status', ['confirmed', 'preparing', 'ready', 'arrived', 'completed']);

    if (ordersError || !orders || orders.length === 0) {
      return { error: ordersError || null };
    }

    const counts: Record<string, number> = {};
    let maxCount = 0;

    for (const order of orders) {
      const date = new Date(order.scheduled_time);
      const day = date.getDay();
      const hour = date.getHours();
      const key = `${day}-${hour}`;
      counts[key] = (counts[key] || 0) + 1;
      if (counts[key] > maxCount) maxCount = counts[key];
    }

    if (maxCount === 0) return { error: null };

    const upserts = Object.entries(counts).map(([key, count]) => {
      const [day, hour] = key.split('-').map(Number);
      return {
        business_id: businessId,
        day_of_week: day,
        hour: hour,
        busyness_level: Math.min(100, Math.round((count / maxCount) * 100)),
        source: 'computed' as const,
        updated_at: new Date().toISOString(),
      };
    });

    const { error } = await supabase
      .from('busy_times')
      .upsert(upserts, { onConflict: 'business_id,day_of_week,hour' });

    if (error) {
      console.error('Error updating busy times from orders:', error);
      return { error };
    }

    return { error: null };
  } catch (error: any) {
    console.error('Exception updating busy times:', error);
    return { error };
  }
}
