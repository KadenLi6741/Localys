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
