export interface AnalyticsSummary {
  totalCoinsSpent: number;
  totalViews: number;
  viewsPerCoin: number;
  currentBalance: number;
  totalPromotions: number;
  totalVideosPromoted: number;
}

export interface SpendingDataPoint {
  date: string;
  coinsSpent: number;
}

export interface ViewsDataPoint {
  date: string;
  views: number;
  promoted: boolean;
}

export interface VideoPerformance {
  videoId: string;
  title: string;
  thumbnailUrl?: string;
  totalCoinsSpent: number;
  totalViews: number;
  boostValue: number;
  viewsPerCoin: number;
  lastPromotedAt: string | null;
  createdAt: string;
}

export interface CoinDistribution {
  videoId: string;
  title: string;
  coinsSpent: number;
  percentage: number;
}

export interface PromotionEntry {
  id: string;
  videoId: string;
  videoTitle: string;
  coinsSpent: number;
  previousBoost: number;
  newBoost: number;
  createdAt: string;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  spendingOverTime: SpendingDataPoint[];
  viewsOverTime: ViewsDataPoint[];
  videoPerformance: VideoPerformance[];
  coinDistribution: CoinDistribution[];
  promotionHistory: PromotionEntry[];
}

// Financial Analytics types

export interface FinancialSummary {
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
}

export interface OrdersBreakdown {
  status: string;
  count: number;
  color: string;
}

export interface TopSellingItem {
  itemName: string;
  unitsSold: number;
}

export interface VideoConversion {
  videoId: string;
  caption: string;
  views: number;
  orders: number;
}

export interface QuickStats {
  averageOrderValue: number;
  bestSellingDay: string;
  returnRate: number;
  revenueChangePercent: number;
}

export interface FinancialData {
  summary: FinancialSummary;
  revenueOverTime: RevenueDataPoint[];
  ordersBreakdown: OrdersBreakdown[];
  topSellingItems: TopSellingItem[];
  videoConversions: VideoConversion[];
  quickStats: QuickStats;
}
