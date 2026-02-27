import { supabase } from './client';
import type {
  FloorPlan,
  FloorPlanCreateData,
  FloorPlanLayoutData,
  RestaurantTable,
  RestaurantTableCreateData,
  TableStatus,
} from '../../models/FloorPlan';

export async function getFloorPlan(businessId: string) {
  try {
    if (!businessId) {
      return { data: null, error: new Error('Business ID is required') };
    }

    const { data, error } = await supabase
      .from('floor_plans')
      .select('*, restaurant_tables(*)')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .single();

    if (error && error.code === 'PGRST116') {
      return { data: null, error: null };
    }

    if (error) {
      console.error('Error fetching floor plan:', error);
      return { data: null, error };
    }

    return { data: data as FloorPlan, error: null };
  } catch (error: any) {
    console.error('Exception fetching floor plan:', error);
    return { data: null, error };
  }
}

export async function createFloorPlan(businessId: string, planData?: FloorPlanCreateData) {
  try {
    const { data, error } = await supabase
      .from('floor_plans')
      .insert({
        business_id: businessId,
        name: planData?.name || 'Main Floor',
        layout_data: planData?.layout_data || { walls: [], decorations: [], sections: [] },
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating floor plan:', error);
      return { data: null, error };
    }

    return { data: data as FloorPlan, error: null };
  } catch (error: any) {
    console.error('Exception creating floor plan:', error);
    return { data: null, error };
  }
}

export async function updateFloorPlan(floorPlanId: string, layoutData: FloorPlanLayoutData) {
  try {
    const { data, error } = await supabase
      .from('floor_plans')
      .update({
        layout_data: layoutData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', floorPlanId)
      .select()
      .single();

    if (error) {
      console.error('Error updating floor plan:', error);
      return { data: null, error };
    }

    return { data: data as FloorPlan, error: null };
  } catch (error: any) {
    console.error('Exception updating floor plan:', error);
    return { data: null, error };
  }
}

export async function deleteFloorPlan(floorPlanId: string) {
  try {
    const { error } = await supabase
      .from('floor_plans')
      .delete()
      .eq('id', floorPlanId);

    if (error) {
      console.error('Error deleting floor plan:', error);
      return { error };
    }

    return { error: null };
  } catch (error: any) {
    console.error('Exception deleting floor plan:', error);
    return { error };
  }
}

export async function getRestaurantTables(floorPlanId: string) {
  try {
    const { data, error } = await supabase
      .from('restaurant_tables')
      .select('*')
      .eq('floor_plan_id', floorPlanId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching tables:', error);
      return { data: null, error };
    }

    return { data: data as RestaurantTable[], error: null };
  } catch (error: any) {
    console.error('Exception fetching tables:', error);
    return { data: null, error };
  }
}

export async function createRestaurantTable(
  floorPlanId: string,
  businessId: string,
  tableData: RestaurantTableCreateData
) {
  try {
    const { data, error } = await supabase
      .from('restaurant_tables')
      .insert({
        floor_plan_id: floorPlanId,
        business_id: businessId,
        label: tableData.label,
        shape: tableData.shape || 'square',
        capacity: tableData.capacity || 4,
        section: tableData.section || 'indoor',
        x: tableData.x,
        y: tableData.y,
        width: tableData.width || 80,
        height: tableData.height || 80,
        rotation: tableData.rotation || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating table:', error);
      return { data: null, error };
    }

    return { data: data as RestaurantTable, error: null };
  } catch (error: any) {
    console.error('Exception creating table:', error);
    return { data: null, error };
  }
}

export async function updateRestaurantTable(tableId: string, updates: Partial<RestaurantTable>) {
  try {
    const { data, error } = await supabase
      .from('restaurant_tables')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tableId)
      .select()
      .single();

    if (error) {
      console.error('Error updating table:', error);
      return { data: null, error };
    }

    return { data: data as RestaurantTable, error: null };
  } catch (error: any) {
    console.error('Exception updating table:', error);
    return { data: null, error };
  }
}

export async function updateTableStatus(tableId: string, status: TableStatus) {
  try {
    const { data, error } = await supabase
      .from('restaurant_tables')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', tableId)
      .select()
      .single();

    if (error) {
      console.error('Error updating table status:', error);
      return { data: null, error };
    }

    return { data: data as RestaurantTable, error: null };
  } catch (error: any) {
    console.error('Exception updating table status:', error);
    return { data: null, error };
  }
}

export async function deleteRestaurantTable(tableId: string) {
  try {
    const { error } = await supabase
      .from('restaurant_tables')
      .delete()
      .eq('id', tableId);

    if (error) {
      console.error('Error deleting table:', error);
      return { error };
    }

    return { error: null };
  } catch (error: any) {
    console.error('Exception deleting table:', error);
    return { error };
  }
}

export async function batchUpdateTablePositions(
  updates: { id: string; x: number; y: number; width?: number; height?: number; rotation?: number }[]
) {
  try {
    const promises = updates.map((update) =>
      supabase
        .from('restaurant_tables')
        .update({
          x: update.x,
          y: update.y,
          ...(update.width !== undefined && { width: update.width }),
          ...(update.height !== undefined && { height: update.height }),
          ...(update.rotation !== undefined && { rotation: update.rotation }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', update.id)
    );

    const results = await Promise.all(promises);
    const errors = results.filter((r) => r.error);

    if (errors.length > 0) {
      console.error('Errors updating table positions:', errors);
      return { error: errors[0].error };
    }

    return { error: null };
  } catch (error: any) {
    console.error('Exception batch updating positions:', error);
    return { error };
  }
}
