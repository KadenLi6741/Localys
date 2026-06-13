import type {
  TrustScoreBreakdownItem,
  TrustScoreData,
  TrustScoreResult,
} from '@/models/Trust';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function buildBreakdownItem(
  key: TrustScoreBreakdownItem['key'],
  label: string,
  points: number,
  maxPoints: number,
  detail: string
): TrustScoreBreakdownItem {
  return {
    key,
    label,
    points,
    maxPoints,
    detail,
  };
}

function getFraudPoints(activeFraudFlags: number) {
  if (activeFraudFlags <= 0) return 15;
  if (activeFraudFlags === 1) return 5;
  if (activeFraudFlags === 2) return -5;
  return -15;
}

function getResponsePoints(avgResponseTimeMinutes: number | null) {
  if (avgResponseTimeMinutes === null) return 0;
  if (avgResponseTimeMinutes <= 15) return 10;
  if (avgResponseTimeMinutes <= 60) return 7;
  if (avgResponseTimeMinutes <= 240) return 4;
  if (avgResponseTimeMinutes <= 1440) return 1;
  return 0;
}

function getScoreLabel(score: number): TrustScoreResult['label'] {
  if (score >= 90) return 'Highly Trusted';
  if (score >= 70) return 'Trusted';
  if (score >= 50) return 'Moderate Trust';
  return 'Low Trust';
}

function getScoreColor(score: number): TrustScoreResult['color'] {
  if (score >= 70) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
}

export function calculateTrustScore(data: TrustScoreData): TrustScoreResult {
  const verifiedPoints = data.isVerified ? 30 : 0;
  const ratingPoints = data.avgRating === null
    ? 0
    : clamp((data.avgRating / 5) * 25, 0, 25);
  const completionPoints = data.orderCompletionRate === null
    ? 0
    : clamp((data.orderCompletionRate / 100) * 20, 0, 20);
  const responsePoints = getResponsePoints(data.avgResponseTimeMinutes);
  const fraudPoints = getFraudPoints(data.activeFraudFlags);

  const rawScore = verifiedPoints + ratingPoints + completionPoints + responsePoints + fraudPoints;
  const score = Math.round(clamp(rawScore, 0, 100));

  const breakdown: TrustScoreBreakdownItem[] = [
    buildBreakdownItem(
      'verified',
      'Verified business',
      verifiedPoints,
      30,
      data.isVerified ? 'Business verification is complete.' : `Verification status: ${data.verificationStatus}.`
    ),
    buildBreakdownItem(
      'rating',
      'Average rating',
      ratingPoints,
      25,
      data.avgRating === null
        ? 'No ratings yet.'
        : `${data.avgRating.toFixed(1)}/5 from ${data.reviewCount} review${data.reviewCount === 1 ? '' : 's'}.`
    ),
    buildBreakdownItem(
      'completion',
      'Order completion rate',
      completionPoints,
      20,
      data.orderCompletionRate === null
        ? 'No order history yet.'
        : `${data.orderCompletionRate}% completed (${data.completedOrders}/${data.totalOrders}).`
    ),
    buildBreakdownItem(
      'response',
      'Response time',
      responsePoints,
      10,
      data.avgResponseTimeMinutes === null
        ? 'No response data yet.'
        : data.responseTimeLabel
    ),
    buildBreakdownItem(
      'fraud',
      'Fraud and spam signals',
      fraudPoints,
      15,
      data.activeFraudFlags === 0
        ? 'No suspicious activity flags detected.'
        : `${data.activeFraudFlags} active suspicious flag${data.activeFraudFlags === 1 ? '' : 's'} detected.`
    ),
  ];

  return {
    score,
    label: getScoreLabel(score),
    color: getScoreColor(score),
    breakdown,
  };
}
