import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  scoreCandidateVideo,
  DEFAULT_VIRAL_CONFIG,
  calculateExpectedViews,
  getMaturityFactor,
  normalizeLogScale,
  calculateVelocityRatio,
  getChannelSizeBucket,
  parseIsoDuration,
  calculateMedian,
  isLiveOrStreamVideo,
} from '../src/services/viralScoring.ts';

describe('YouTube Viral Scoring Module Tests', () => {
  // Test Case 1: Channel A
  // Channel A: 10M subscribers, mature median 20M views, video age 1h with 1M views.
  // Age is below MIN_AGE_HOURS (3h), so it must not be scored.
  // Repeat at age 6h with 1M views: expected_views = 20M * 0.05 = 1M, outlier_ratio about 1.0, label "Normal for this channel".
  it('Channel A: below MIN_AGE_HOURS is not scored; at age 6h with 1M views produces expected_views 1M, outlier_ratio ~1.0, and "Normal for this channel"', () => {
    // 1h age
    const result1h = scoreCandidateVideo({
      videoId: 'chan-a-1h',
      views: 1_000_000,
      ageHours: 1,
      durationSeconds: 600,
      baselineMedian: 20_000_000,
      sampleSize: 15,
      subscriberCount: 10_000_000,
    });
    assert.equal(result1h, null, 'Video with age 1h (< MIN_AGE_HOURS=3) must return null');

    // 6h age
    const result6h = scoreCandidateVideo({
      videoId: 'chan-a-6h',
      views: 1_000_000,
      ageHours: 6,
      durationSeconds: 600,
      baselineMedian: 20_000_000,
      sampleSize: 15,
      subscriberCount: 10_000_000,
    });
    assert.ok(result6h !== null, 'Video with age 6h should be scored');
    assert.equal(result6h.expectedViews, 1_000_000, 'Expected views must be 20M * 0.05 = 1M');
    assert.equal(Math.round(result6h.outlierRatio * 100) / 100, 1.0, 'Outlier ratio must be ~1.0');
    assert.equal(result6h.label, 'Normal for this channel', 'Label must be "Normal for this channel"');
    assert.equal(result6h.isOutsiderBreakout, false, 'Channel A with 10M subs cannot be outsider breakout');
    assert.equal(result6h.channelSizeBucket, 'mega', '10M subscribers belongs to mega bucket');
  });

  // Test Case 2: Channel B
  // Channel B: 50K subscribers, mature median 20K views, video age 72h with 2M views:
  // outlier_ratio about 200, reach_ratio 40, label "Viral breakout" and "Outsider breakout".
  it('Channel B: 50K subs, median 20K, age 72h with 2M views -> outlier_ratio ~200, reach_ratio 40, label "Viral breakout" and "Outsider breakout"', () => {
    const result = scoreCandidateVideo({
      videoId: 'chan-b-viral',
      views: 2_000_000,
      ageHours: 72,
      durationSeconds: 120, // Short
      baselineMedian: 20_000,
      sampleSize: 12,
      subscriberCount: 50_000,
    });

    assert.ok(result !== null);
    // At 72h, maturity factor is 0.50. expected_views = 20,000 * 0.50 = 10,000.
    // outlier_ratio = 2,000,000 / 10,000 = 200.
    assert.equal(result.expectedViews, 10_000);
    assert.equal(result.outlierRatio, 200);
    // reach_ratio = 2,000,000 / 50,000 = 40.
    assert.equal(result.reachRatio, 40);
    assert.equal(result.label, 'Viral breakout');
    assert.equal(result.isOutsiderBreakout, true, 'Must have outsider breakout tag');
    assert.equal(result.channelSizeBucket, 'micro', '50K subscribers belongs to micro bucket');
  });

  // Test Case 3: Hidden Subscriber Count
  // Hidden subscriber count: reach_ratio is null and weights renormalize correctly.
  it('Hidden subscriber count: reach_ratio is null, channelSizeBucket is null, and weights renormalize correctly', () => {
    const withHiddenSubs = scoreCandidateVideo({
      videoId: 'hidden-subs-vid',
      views: 50_000,
      ageHours: 24,
      durationSeconds: 300,
      baselineMedian: 25_000,
      sampleSize: 10,
      subscriberCount: null,
      subsHidden: true,
      likeRatePercentile: 80,
      commentRatePercentile: 60,
    });

    assert.ok(withHiddenSubs !== null);
    assert.equal(withHiddenSubs.reachRatio, null, 'reach_ratio must be null when subscribers are hidden');
    assert.equal(withHiddenSubs.reachScore, null, 'reachScore must be null');
    assert.equal(withHiddenSubs.channelSizeBucket, null, 'channelSizeBucket must be null when subs are hidden');
    
    // Check components used
    assert.ok(!withHiddenSubs.componentsUsed.includes('reach'), 'reach must not be in componentsUsed');
    assert.ok(withHiddenSubs.componentsUsed.includes('outlier'));
    assert.ok(withHiddenSubs.componentsUsed.includes('engagement'));

    // Manual check of weight renormalization:
    // outlier weight = 0.40, engagement weight = 0.15. Total = 0.55.
    // outlierRatio = 50,000 / (25,000 * 0.20 = 5,000) = 10.
    // outlierScore = log(10)/log(20) * 100 ≈ 76.862
    // engagementScore = (80 + 60) / 2 = 70
    // viralScore = (76.862 * (0.40/0.55)) + (70 * (0.15/0.55)) ≈ 55.90 + 19.09 ≈ 75.0
    const expectedViralScore = Math.round(
      (withHiddenSubs.outlierScore * (0.40 / 0.55) + 70 * (0.15 / 0.55)) * 10
    ) / 10;
    assert.equal(withHiddenSubs.viralScore, expectedViralScore);
  });

  // Test Case 4: Fewer than 2 Snapshots
  // Fewer than 2 snapshots: velocity is null and is not guessed.
  it('Fewer than 2 snapshots: velocity_ratio is null and is not guessed or fabricated', () => {
    // 0 snapshots
    const noSnapshots = scoreCandidateVideo({
      videoId: 'no-snap',
      views: 100_000,
      ageHours: 24,
      durationSeconds: 60,
      baselineMedian: 50_000,
      sampleSize: 8,
      snapshots: [],
    });
    assert.ok(noSnapshots !== null);
    assert.equal(noSnapshots.velocityRatio, null);
    assert.equal(noSnapshots.velocityScore, null);
    assert.ok(!noSnapshots.componentsUsed.includes('velocity'));

    // 1 snapshot
    const oneSnapshot = scoreCandidateVideo({
      videoId: 'one-snap',
      views: 100_000,
      ageHours: 24,
      durationSeconds: 60,
      baselineMedian: 50_000,
      sampleSize: 8,
      snapshots: [{ views: 80_000, capturedAt: new Date(Date.now() - 3600 * 1000).toISOString() }],
    });
    assert.ok(oneSnapshot !== null);
    assert.equal(oneSnapshot.velocityRatio, null);

    // 2 snapshots but < 6 hours apart
    const twoSnapshotsTooClose = scoreCandidateVideo({
      videoId: 'two-close',
      views: 100_000,
      ageHours: 24,
      durationSeconds: 60,
      baselineMedian: 50_000,
      sampleSize: 8,
      snapshots: [
        { views: 70_000, capturedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
        { views: 100_000, capturedAt: new Date().toISOString() },
      ],
    });
    assert.ok(twoSnapshotsTooClose !== null);
    assert.equal(twoSnapshotsTooClose.velocityRatio, null, 'Snapshots < 6h apart must yield null velocity');

    // 2 snapshots >= 6 hours apart
    const twoSnapshotsValid = scoreCandidateVideo({
      videoId: 'two-valid',
      views: 100_000,
      ageHours: 24,
      durationSeconds: 60,
      baselineMedian: 50_000,
      sampleSize: 8,
      snapshots: [
        { views: 40_000, capturedAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString() },
        { views: 100_000, capturedAt: new Date().toISOString() },
      ],
    });
    assert.ok(twoSnapshotsValid !== null);
    assert.ok(twoSnapshotsValid.velocityRatio !== null, 'Valid snapshots >= 6h apart must produce velocity');
    assert.ok(twoSnapshotsValid.componentsUsed.includes('velocity'));
  });

  // Test Case 5: Sample Size < 5
  // Sample size < 5: confidence is "low".
  it('Sample size < 5: confidence is "low"; sample size >= 5: confidence is "standard"', () => {
    const lowConf = scoreCandidateVideo({
      videoId: 'low-conf',
      views: 25_000,
      ageHours: 12,
      durationSeconds: 240,
      baselineMedian: 15_000,
      sampleSize: 4, // < 5
      subscriberCount: 20_000,
    });
    assert.ok(lowConf !== null);
    assert.equal(lowConf.confidence, 'low', 'Sample size 4 must yield confidence "low"');

    const standardConf = scoreCandidateVideo({
      videoId: 'std-conf',
      views: 25_000,
      ageHours: 12,
      durationSeconds: 240,
      baselineMedian: 15_000,
      sampleSize: 5, // >= 5
      subscriberCount: 20_000,
    });
    assert.ok(standardConf !== null);
    assert.equal(standardConf.confidence, 'standard', 'Sample size 5 must yield confidence "standard"');
  });

  // Additional helper unit tests
  it('Helper functions: parseIsoDuration and calculateMedian', () => {
    assert.equal(parseIsoDuration('PT1M30S'), 90);
    assert.equal(parseIsoDuration('PT3M'), 180);
    assert.equal(parseIsoDuration('PT1H'), 3600);
    assert.equal(parseIsoDuration('PT45S'), 45);

    assert.equal(calculateMedian([10, 20, 30]), 20);
    assert.equal(calculateMedian([10, 20, 30, 40]), 25);
    assert.equal(calculateMedian([]), null);
  });

  // Test Case: Livestream Exclusion
  it('Livestream exclusion: filters out live, upcoming, and broadcast videos, allowing only Shorts and regular videos', () => {
    // 1. Live broadcast
    const liveVideo = {
      snippet: { liveBroadcastContent: 'live', title: 'Live 24/7 Coding Stream' },
      contentDetails: { duration: 'PT0S' },
    };
    assert.equal(isLiveOrStreamVideo(liveVideo), true, 'Active livestream must be excluded');

    // 2. Upcoming scheduled stream
    const upcomingVideo = {
      snippet: { liveBroadcastContent: 'upcoming', title: 'Live Launch Tomorrow' },
      contentDetails: { duration: 'P0D' },
    };
    assert.equal(isLiveOrStreamVideo(upcomingVideo), true, 'Upcoming livestream must be excluded');

    // 3. Completed livestream with liveStreamingDetails
    const archivedLivestream = {
      snippet: { liveBroadcastContent: 'none', title: 'Past Live Q&A' },
      contentDetails: { duration: 'PT1H30M' },
      liveStreamingDetails: { actualStartTime: '2026-10-20T10:00:00Z' },
    };
    assert.equal(isLiveOrStreamVideo(archivedLivestream), true, 'Archived livestream with liveStreamingDetails must be excluded');

    // 4. Standard on-demand long video
    const regularVideo = {
      snippet: { liveBroadcastContent: 'none', title: 'Deep Dive: AI System Architecture' },
      contentDetails: { duration: 'PT12M45S' },
    };
    assert.equal(isLiveOrStreamVideo(regularVideo), false, 'Standard long video must be retained');

    // 5. High-retention YouTube Short (<= 180s)
    const shortVideo = {
      snippet: { liveBroadcastContent: 'none', title: '3 Tips for Video Retention' },
      contentDetails: { duration: 'PT45S' },
    };
    assert.equal(isLiveOrStreamVideo(shortVideo), false, 'Short must be retained');
  });
});

