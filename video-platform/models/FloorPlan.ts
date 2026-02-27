export interface FloorPlan {
  id: string;
  business_id: string;
  name: string;
  layout_data: FloorPlanLayoutData;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  restaurant_tables?: RestaurantTable[];
}

export interface FloorPlanLayoutData {
  walls: WallElement[];
  decorations: DecorationElement[];
  sections: SectionElement[];
}

export interface WallElement {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
}

export interface DecorationElement {
  id: string;
  type: 'counter' | 'bar' | 'plant' | 'entrance' | 'restroom' | 'kitchen';
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

export interface SectionElement {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type TableShape = 'round' | 'square' | 'rectangular';
export type TableStatus = 'available' | 'reserved' | 'occupied' | 'unavailable';

export interface RestaurantTable {
  id: string;
  floor_plan_id: string;
  business_id: string;
  label: string;
  shape: TableShape;
  capacity: number;
  section: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  status: TableStatus;
  created_at: string;
  updated_at: string;
}

export interface RestaurantTableCreateData {
  label: string;
  shape?: TableShape;
  capacity?: number;
  section?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
}

export interface FloorPlanCreateData {
  name?: string;
  layout_data?: FloorPlanLayoutData;
}
