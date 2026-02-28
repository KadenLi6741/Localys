export interface BusyTimeSlot {
  id: string;
  business_id: string;
  day_of_week: number;
  hour: number;
  busyness_level: number;
  source: 'seed' | 'computed';
  updated_at: string;
}

export interface DayBusyTimes {
  dayOfWeek: number;
  dayName: string;
  slots: { hour: number; level: number }[];
}
