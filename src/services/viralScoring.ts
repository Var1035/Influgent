/**
 * Pure Viral Scoring Module for YouTube Video Trend Ingestion
 * 
 * Deterministic, mathematical scoring model comparing video performance
 * against its own channel's historical baseline.
 * No LLM, no network calls, no placeholders or fabricated numbers.
 */

export interface ViralScoringConfig {
  MIN_AGE_HOURS: number;
  MIN_VIEWS: number;
  SHORTS_MAX_SECONDS: number;
  DAILY_QUOTA_BUDGET: number;
  MATURITY_FACTORS: Array<{ maxAgeHours: number; factor: number }>;
  EXPECTED_VIEWS_FLOOR: number;
  OUTLIER_SCORE_MIN_RATIO: number;
  OUTLIER_SCORE_MAX_RATIO: number;
  VELOCITY_SCORE_MIN_RATIO: number;
  VELOCITY_SCORE_MAX_RATIO: number;
  REACH_SCORE_MIN_RATIO: number;
  REACH_SCORE_MAX_RATIO: number;
  WEIGHTS: {
    outlier: number;
    reach: number;
    velocity: number;
    engagement: number;
  };
  LABEL_THRESHOLDS: {
    viralBreakoutOutlierMin: number;
    viralBreakoutScoreMin: number;
    strongPerformerOutlierMin: number;
    outsiderBreakoutReachMin: number;
    outsiderBreakoutSubsMax: number;
  };
  CHANNEL_SIZE_BUCKETS: {
    nanoMax: number;
    microMax: number;
    midMax: number;
    macroMax: number;
  };
  MIN_SAMPLE_SIZE_STANDARD: number;
  MIN_HOURS_BETWEEN_SNAPSHOTS: number;
}

export const DEFAULT_VIRAL_CONFIG: ViralScoringConfig = {
  MIN_AGE_HOURS: 3,
  MIN_VIEWS: 10000,
  SHORTS_MAX_SECONDS: 180,
  DAILY_QUOTA_BUDGET: 10000,
  MATURITY_FACTORS: [
    { maxAgeHours: 6, factor: 0.05 },
    { maxAgeHours: 24, factor: 0.20 },
    { maxAgeHours: 48, factor: 0.35 },
    { maxAgeHours: 72, factor: 0.50 },
    { maxAgeHours: 168, factor: 0.70 },
  ],
  EXPECTED_VIEWS_FLOOR: 1000,
  OUTLIER_SCORE_MIN_RATIO: 1.0,
  OUTLIER_SCORE_MAX_RATIO: 20.0,
  VELOCITY_SCORE_MIN_RATIO: 1.0,
  VELOCITY_SCORE_MAX_RATIO: 20.0,
  REACH_SCORE_MIN_RATIO: 0.05,
  REACH_SCORE_MAX_RATIO: 2.0,
  WEIGHTS: {
    outlier: 0.40,
    reach: 0.25,
    velocity: 0.20,
    engagement: 0.15,
  },
  LABEL_THRESHOLDS: {
    viralBreakoutOutlierMin: 5.0,
    viralBreakoutScoreMin: 70.0,
    strongPerformerOutlierMin: 2.5,
    outsiderBreakoutReachMin: 1.0,
    outsiderBreakoutSubsMax: 1000000,
  },
  CHANNEL_SIZE_BUCKETS: {
    nanoMax: 10000,
    microMax: 100000,
    midMax: 1000000,
    macroMax: 10000000,
  },
  MIN_SAMPLE_SIZE_STANDARD: 5,
  MIN_HOURS_BETWEEN_SNAPSHOTS: 6,
};

export type ViralLabel = 'Viral breakout' | 'Strong performer' | 'Normal for this channel';
export type ChannelSizeBucket = 'nano' | 'micro' | 'mid' | 'macro' | 'mega';
export type ConfidenceLevel = 'low' | 'standard';

export interface PostSnapshot {
  views: number;
  capturedAt: string | Date;
}

export interface CandidateVideoInput {
  videoId: string;
  views: number;
  ageHours: number;
  durationSeconds: number;
  baselineMedian: number;
  sampleSize: number;
  subscriberCount?: number | null;
  subsHidden?: boolean;
  snapshots?: PostSnapshot[];
  likeRatePercentile?: number | null;
  commentRatePercentile?: number | null;
}

export interface ViralScoreResult {
  videoId: string;
  expectedViews: number;
  outlierRatio: number;
  reachRatio: number | null;
  velocityRatio: number | null;
  engagementScore: number | null;
  outlierScore: number;
  reachScore: number | null;
  velocityScore: number | null;
  viralScore: number;
  label: ViralLabel;
  isOutsiderBreakout: boolean;
  channelSizeBucket: ChannelSizeBucket | null;
  confidence: ConfidenceLevel;
  componentsUsed: string[];
}

/**
 * Detect and exclude YouTube live streams and live broadcast events.
 * Only on-demand Shorts and standard video uploads are retained.
 */
export function isLiveOrStreamVideo(v: any): boolean {
  if (!v) return true;
  const snippet = v.snippet || {};
  const contentDetails = v.contentDetails || {};

  // 1. YouTube explicit liveBroadcastContent flag ('live', 'upcoming')
  const liveContent = (snippet.liveBroadcastContent || '').toLowerCase();
  if (liveContent === 'live' || liveContent === 'upcoming') {
    return true;
  }

  // 2. liveStreamingDetails object (present only on upcoming, live, or completed live broadcasts)
  if (v.liveStreamingDetails !== undefined && v.liveStreamingDetails !== null) {
    return true;
  }

  // 3. Ongoing live streams report duration of 0 seconds (PT0S, P0D, or empty)
  const durationSec = parseIsoDuration(contentDetails.duration || '');
  if (durationSec <= 0) {
    return true;
  }

  // 4. Common title markers for live broadcasts
  const title = (snippet.title || '').toLowerCase();
  if (
    /\b(live stream|livestream|streaming now|broadcast live|\u{1F534} live)\b/iu.test(title) &&
    liveContent !== 'none'
  ) {
    return true;
  }

  return false;
}

/**
 * 2a) Fraction of mature views expected at a given age in hours
 */
export function getMaturityFactor(
  ageHours: number,
  config: ViralScoringConfig = DEFAULT_VIRAL_CONFIG
): number {
  if (ageHours < 0) return 0.05;
  for (const item of config.MATURITY_FACTORS) {
    if (ageHours <= item.maxAgeHours) {
      return item.factor;
    }
  }
  return 1.0;
}

/**
 * 2b) Expected views given baseline median and age maturity factor, floor 1000
 */
export function calculateExpectedViews(
  baselineMedian: number,
  maturityFactor: number,
  config: ViralScoringConfig = DEFAULT_VIRAL_CONFIG
): number {
  const calculated = baselineMedian * maturityFactor;
  return Math.max(config.EXPECTED_VIEWS_FLOOR, calculated);
}

/**
 * 3) Log scale normalization to 0-100 clamped
 */
export function normalizeLogScale(
  value: number,
  minVal: number,
  maxVal: number
): number {
  if (value <= minVal) return 0;
  if (value >= maxVal) return 100;
  const logMin = Math.log(minVal);
  const logMax = Math.log(maxVal);
  const logVal = Math.log(value);
  const score = ((logVal - logMin) / (logMax - logMin)) * 100;
  return Math.min(100, Math.max(0, score));
}

/**
 * 2e) Calculate velocity ratio from snapshots.
 * Requires at least 2 snapshots at least 6 hours apart.
 * NEVER estimate or invent velocity.
 */
export function calculateVelocityRatio(
  snapshots: PostSnapshot[] | undefined,
  baselineMedian: number,
  config: ViralScoringConfig = DEFAULT_VIRAL_CONFIG
): number | null {
  if (!snapshots || snapshots.length < 2) {
    return null;
  }

  // Parse and sort chronologically ASC
  const parsed = snapshots
    .map((s) => ({
      views: s.views,
      time: new Date(s.capturedAt).getTime(),
    }))
    .filter((s) => !isNaN(s.time) && s.views >= 0)
    .sort((a, b) => a.time - b.time);

  if (parsed.length < 2) return null;

  const t2 = parsed[parsed.length - 1];
  // Find the earliest snapshot at least MIN_HOURS_BETWEEN_SNAPSHOTS before t2
  const minIntervalMs = config.MIN_HOURS_BETWEEN_SNAPSHOTS * 3600 * 1000;
  const validT1 = parsed.find((s) => t2.time - s.time >= minIntervalMs);

  if (!validT1) {
    return null;
  }

  const hoursBetween = (t2.time - validT1.time) / (3600 * 1000);
  if (hoursBetween <= 0) return null;

  const viewsPerHourNow = (t2.views - validT1.views) / hoursBetween;
  const baselineHourlyViews = baselineMedian / 168; // 168 hours = 7 days
  if (baselineHourlyViews <= 0) return null;

  return viewsPerHourNow / baselineHourlyViews;
}

/**
 * 2f) Percentile rank computation for engagement metrics in the same category run
 */
export function calculatePercentileRank(values: number[], target: number): number {
  if (!values || values.length === 0) return 50;
  const countLe = values.filter((v) => v <= target).length;
  return Math.min(100, Math.max(0, (countLe / values.length) * 100));
}

/**
 * 5) Channel size bucket label from subscriber count
 */
export function getChannelSizeBucket(
  subscribers: number | null | undefined,
  subsHidden?: boolean,
  config: ViralScoringConfig = DEFAULT_VIRAL_CONFIG
): ChannelSizeBucket | null {
  if (subsHidden || subscribers === null || subscribers === undefined || subscribers <= 0) {
    return null;
  }
  if (subscribers < config.CHANNEL_SIZE_BUCKETS.nanoMax) return 'nano';
  if (subscribers < config.CHANNEL_SIZE_BUCKETS.microMax) return 'micro';
  if (subscribers < config.CHANNEL_SIZE_BUCKETS.midMax) return 'mid';
  if (subscribers < config.CHANNEL_SIZE_BUCKETS.macroMax) return 'macro';
  return 'mega';
}

/**
 * Parse YouTube ISO 8601 duration (e.g. PT1M30S, PT15S, PT3M, PT1H2M3S) into seconds
 */
export function parseIsoDuration(duration: string): number {
  if (!duration) return 0;
  const match = duration.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const days = parseInt(match[1] || '0', 10);
  const hours = parseInt(match[2] || '0', 10);
  const minutes = parseInt(match[3] || '0', 10);
  const seconds = parseInt(match[4] || '0', 10);
  return days * 86400 + hours * 3600 + minutes * 60 + seconds;
}

/**
 * Calculate numerical median from an array of numbers
 */
export function calculateMedian(numbers: number[]): number | null {
  if (!numbers || numbers.length === 0) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * 2, 3, 4, 5) Pure Scoring Function: Scores a single candidate video against its channel baseline
 * Returns null if age < MIN_AGE_HOURS or views < MIN_VIEWS.
 */
export function scoreCandidateVideo(
  input: CandidateVideoInput,
  config: ViralScoringConfig = DEFAULT_VIRAL_CONFIG
): ViralScoreResult | null {
  // Do not score videos younger than MIN_AGE_HOURS
  if (input.ageHours < config.MIN_AGE_HOURS) {
    return null;
  }
  // Ignore videos with fewer than MIN_VIEWS
  if (input.views < config.MIN_VIEWS) {
    return null;
  }

  // a) Maturity factor
  const maturityFactor = getMaturityFactor(input.ageHours, config);

  // b) Expected views
  const expectedViews = calculateExpectedViews(input.baselineMedian, maturityFactor, config);

  // c) Outlier ratio
  const outlierRatio = input.views / expectedViews;

  // d) Reach ratio
  const hasSubscribers =
    !input.subsHidden &&
    input.subscriberCount !== null &&
    input.subscriberCount !== undefined &&
    input.subscriberCount > 0;

  const reachRatio = hasSubscribers ? input.views / (input.subscriberCount as number) : null;

  // e) Velocity ratio
  const velocityRatio = calculateVelocityRatio(input.snapshots, input.baselineMedian, config);

  // f) Engagement score
  let engagementScore: number | null = null;
  const hasLike = input.likeRatePercentile !== null && input.likeRatePercentile !== undefined;
  const hasComment = input.commentRatePercentile !== null && input.commentRatePercentile !== undefined;

  if (hasLike && hasComment) {
    engagementScore = ((input.likeRatePercentile as number) + (input.commentRatePercentile as number)) / 2;
  } else if (hasLike) {
    engagementScore = input.likeRatePercentile as number;
  } else if (hasComment) {
    engagementScore = input.commentRatePercentile as number;
  }

  // 3) Normalize components to 0-100 (log scale, clamped)
  const outlierScore = normalizeLogScale(
    outlierRatio,
    config.OUTLIER_SCORE_MIN_RATIO,
    config.OUTLIER_SCORE_MAX_RATIO
  );

  const reachScore =
    reachRatio !== null
      ? normalizeLogScale(reachRatio, config.REACH_SCORE_MIN_RATIO, config.REACH_SCORE_MAX_RATIO)
      : null;

  const velocityScore =
    velocityRatio !== null
      ? normalizeLogScale(velocityRatio, config.VELOCITY_SCORE_MIN_RATIO, config.VELOCITY_SCORE_MAX_RATIO)
      : null;

  // 4) Viral Score & Weight Renormalization
  const components: Array<{ name: string; score: number; weight: number }> = [
    { name: 'outlier', score: outlierScore, weight: config.WEIGHTS.outlier },
  ];

  if (reachScore !== null) {
    components.push({ name: 'reach', score: reachScore, weight: config.WEIGHTS.reach });
  }
  if (velocityScore !== null) {
    components.push({ name: 'velocity', score: velocityScore, weight: config.WEIGHTS.velocity });
  }
  if (engagementScore !== null) {
    components.push({ name: 'engagement', score: engagementScore, weight: config.WEIGHTS.engagement });
  }

  const totalActiveWeight = components.reduce((sum, c) => sum + c.weight, 0);
  const viralScore =
    totalActiveWeight > 0
      ? components.reduce((sum, c) => sum + c.score * (c.weight / totalActiveWeight), 0)
      : 0;

  const componentsUsed = components.map((c) => c.name);

  // 5) Labels and Tags
  let label: ViralLabel = 'Normal for this channel';
  if (
    outlierRatio >= config.LABEL_THRESHOLDS.viralBreakoutOutlierMin &&
    viralScore >= config.LABEL_THRESHOLDS.viralBreakoutScoreMin
  ) {
    label = 'Viral breakout';
  } else if (outlierRatio >= config.LABEL_THRESHOLDS.strongPerformerOutlierMin) {
    label = 'Strong performer';
  }

  const isOutsiderBreakout =
    reachRatio !== null &&
    reachRatio >= config.LABEL_THRESHOLDS.outsiderBreakoutReachMin &&
    hasSubscribers &&
    (input.subscriberCount as number) < config.LABEL_THRESHOLDS.outsiderBreakoutSubsMax;

  const channelSizeBucket = getChannelSizeBucket(input.subscriberCount, input.subsHidden, config);
  const confidence: ConfidenceLevel =
    input.sampleSize < config.MIN_SAMPLE_SIZE_STANDARD ? 'low' : 'standard';

  return {
    videoId: input.videoId,
    expectedViews,
    outlierRatio,
    reachRatio,
    velocityRatio,
    engagementScore,
    outlierScore,
    reachScore,
    velocityScore,
    viralScore: Math.round(viralScore * 10) / 10,
    label,
    isOutsiderBreakout,
    channelSizeBucket,
    confidence,
    componentsUsed,
  };
}

