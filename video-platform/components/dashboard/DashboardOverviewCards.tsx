'use client';

interface DashboardOverviewCardsProps {
  activeOrders: number;
  todayRevenue: number;
  occupancyRate: number;
}

export function DashboardOverviewCards({ activeOrders, todayRevenue, occupancyRate }: DashboardOverviewCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <p className="text-white/50 text-xs mb-1">Active Orders</p>
        <p className="text-white text-3xl font-bold">{activeOrders}</p>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <p className="text-white/50 text-xs mb-1">Today&apos;s Revenue</p>
        <p className="text-green-400 text-3xl font-bold">${todayRevenue.toFixed(2)}</p>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <p className="text-white/50 text-xs mb-1">Table Occupancy</p>
        <p className="text-blue-400 text-3xl font-bold">{occupancyRate}%</p>
      </div>
    </div>
  );
}
