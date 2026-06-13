/** Trust metrics displayed on a business profile */
export interface TrustMetrics {
  /** Average message response time in minutes, null if no data */
  avgResponseTimeMinutes: number | null;
  /** Human-readable response time label */
  responseTimeLabel: string;
  /** ISO timestamp of last activity */
  lastActiveAt: string | null;
  /** Human-readable last active label */
  lastActiveLabel: string;
  /** Order completion rate 0-100, null if no orders */
  orderCompletionRate: number | null;
  /** Total completed orders */
  completedOrders: number;
  /** Total orders */
  totalOrders: number;
}

export type BusinessVerificationStatus =
  | 'unverified'
  | 'pending'
  | 'verified'
  | 'rejected';

export type TrustBreakdownKey =
  | 'verified'
  | 'rating'
  | 'completion'
  | 'response'
  | 'fraud';

export interface TrustScoreData {
  verificationStatus: BusinessVerificationStatus;
  isVerified: boolean;
  avgRating: number | null;
  reviewCount: number;
  orderCompletionRate: number | null;
  completedOrders: number;
  totalOrders: number;
  avgResponseTimeMinutes: number | null;
  responseTimeLabel: string;
  activeFraudFlags: number;
}

export interface TrustScoreBreakdownItem {
  key: TrustBreakdownKey;
  label: string;
  points: number;
  maxPoints: number;
  detail: string;
}

export interface TrustScoreResult {
  score: number;
  label: 'Highly Trusted' | 'Trusted' | 'Moderate Trust' | 'Low Trust';
  color: 'green' | 'yellow' | 'red';
  breakdown: TrustScoreBreakdownItem[];
}

export interface BusinessTrustScoreSnapshot {
  metrics: TrustScoreData;
  result: TrustScoreResult;
  suspiciousActivityDetected: boolean;
  warningMessage: string | null;
  flags: ContentFlag[];
}

/** Content flag for fraud / spam detection */
export interface ContentFlag {
  id: string;
  flag_type: 'duplicate_listing' | 'spam_review' | 'fake_account' | 'rate_limit';
  target_type: 'menu_item' | 'review' | 'profile' | 'video';
  target_id: string;
  flagged_user_id: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  status: 'pending' | 'reviewed' | 'dismissed' | 'actioned';
  created_at: string;
}
