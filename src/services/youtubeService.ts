/**
 * YouTube Data API v3 Ingestion & Keyword Trend Discovery Service for TrendPilot
 * 
 * Implements channel-relative VIRAL SCORING:
 * - Compares candidate video against channel's 7-day matured uploads baseline (Shorts vs Longs)
 * - Pure mathematical metrics: Outlier ratio, Reach ratio, Velocity ratio (from real snapshots), Engagement percentile
 * - Batching API calls, caching baselines for 7 days, strict quota budget safety
 * - Deduplication: best-scoring video per channel per run
 * - No placeholders, no fabricated numbers, no emojis
 */

import { TrendingTopic } from '../types/workspace';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  scoreCandidateVideo,
  DEFAULT_VIRAL_CONFIG,
  parseIsoDuration,
  calculateMedian,
  calculatePercentileRank,
  isLiveOrStreamVideo,
  CandidateVideoInput,
  PostSnapshot,
} from './viralScoring';

export const YOUTUBE_API_KEY =
  ((import.meta as any).env && (import.meta as any).env.VITE_YOUTUBE_API_KEY) || '';

export const YOUTUBE_CATEGORY_MAP: Record<string, string> = {
  'Tech & AI': '28', // Science & Technology
  'Creator Economy': '24', // Entertainment / General
  'Productivity & Work': '27', // Education
  'Finance & Investing': '25', // News/Finance
  'Fitness & Health': '17', // Sports
  'Gaming': '20', // Gaming
  'Politics': '25', // News & Politics
  'Movies': '1', // Film & Animation
};

export interface RegionOption {
  code: string;
  name: string;
  shortLabel: string;
}

export const SUPPORTED_REGIONS: RegionOption[] = [
  { code: 'IN', name: 'India', shortLabel: 'India' },
  { code: 'US', name: 'United States', shortLabel: 'USA' },
  { code: 'GB', name: 'United Kingdom', shortLabel: 'UK' },
  { code: 'CA', name: 'Canada', shortLabel: 'Canada' },
  { code: 'AU', name: 'Australia', shortLabel: 'Australia' },
  { code: 'ALL', name: 'Worldwide / All', shortLabel: 'Global' },
];

export function getRegionName(code?: string): string {
  if (!code || code === 'ALL') return 'Worldwide';
  const match = SUPPORTED_REGIONS.find((r) => r.code.toUpperCase() === code.toUpperCase());
  return match ? match.name : code;
}

export interface ChannelBaselineRecord {
  channel_id: string;
  subscriber_count: number | null;
  subs_hidden: boolean;
  median_views_long: number;
  median_views_short: number;
  sample_size_long: number;
  sample_size_short: number;
  refreshed_at: string;
}

// In-memory Quota Tracker for safety
let dailyQuotaUsed = 0;
let lastQuotaResetDate = new Date().toDateString();

function trackQuota(units: number): boolean {
  const today = new Date().toDateString();
  if (today !== lastQuotaResetDate) {
    dailyQuotaUsed = 0;
    lastQuotaResetDate = today;
  }
  if (dailyQuotaUsed + units > DEFAULT_VIRAL_CONFIG.DAILY_QUOTA_BUDGET) {
    console.warn(
      `[YouTube Quota] Daily quota budget reached (${dailyQuotaUsed}/${DEFAULT_VIRAL_CONFIG.DAILY_QUOTA_BUDGET} units). Skipping new external calls.`
    );
    return false;
  }
  dailyQuotaUsed += units;
  return true;
}

export function getEstimatedQuotaUsed(): number {
  return dailyQuotaUsed;
}

/**
 * Remove emojis and unescape HTML entities to preserve clean typography
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  return text
    .replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu,
      ''
    )
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Infer content category based on search query and video title
 */
export function inferCategory(query: string, title = ''): string {
  const combined = `${query} ${title}`.toLowerCase();
  if (
    /laptop|phone|camera|gpu|pc|hardware|macbook|iphone|android|samsung|lenovo|dell|asus|hp|intel|amd|nvidia|ai|tech|code|software|app|gadget/.test(
      combined
    )
  ) {
    return 'Tech & AI';
  }
  if (
    /stock|invest|crypto|market|trading|bitcoin|finance|fund|yield|money|economy|nifty|sensex|bank|inflation|dividend/.test(
      combined
    )
  ) {
    return 'Finance & Investing';
  }
  if (/fitness|workout|gym|health|diet|longevity|cardio|muscle|weight|protein|sleep|supplement/.test(combined)) {
    return 'Fitness & Health';
  }
  if (/productivity|notion|routine|habit|agency|business|remote|work|workflow|freelance|client/.test(combined)) {
    return 'Productivity & Work';
  }
  return 'Creator Economy';
}

export class YouTubeService {
  public isConfigured(): boolean {
    return Boolean(YOUTUBE_API_KEY && !YOUTUBE_API_KEY.startsWith('your_'));
  }

  /**
   * 1) Batch fetch or retrieve cached channel baselines from Supabase.
   * If a baseline is older than 7 days, refresh it.
   */
  public async getOrFetchBaselines(channelIds: string[]): Promise<Map<string, ChannelBaselineRecord>> {
    const resultMap = new Map<string, ChannelBaselineRecord>();
    const uniqueIds = Array.from(new Set(channelIds.filter(Boolean)));
    if (uniqueIds.length === 0) return resultMap;

    const sevenDaysAgoMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const needsRefresh: string[] = [];

    // Step A: Check Supabase cache
    if (supabase && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('channel_baselines')
          .select('*')
          .in('channel_id', uniqueIds);

        if (!error && data) {
          for (const row of data as ChannelBaselineRecord[]) {
            const age = now - new Date(row.refreshed_at).getTime();
            if (age < sevenDaysAgoMs) {
              resultMap.set(row.channel_id, row);
            } else {
              // Expired
              needsRefresh.push(row.channel_id);
            }
          }
        }
      } catch (err) {
        console.warn('Error reading channel_baselines cache:', err);
      }
    }

    // Identify which channel IDs are missing from cache
    for (const cid of uniqueIds) {
      if (!resultMap.has(cid) && !needsRefresh.includes(cid)) {
        needsRefresh.push(cid);
      }
    }

    if (needsRefresh.length === 0 || !this.isConfigured()) {
      return resultMap;
    }

    // Step B: Batch fetch channels for missing or expired
    // channels.list accepts up to 50 IDs per call (costs 1 unit)
    const channelChunks: string[][] = [];
    for (let i = 0; i < needsRefresh.length; i += 50) {
      channelChunks.push(needsRefresh.slice(i, i + 50));
    }

    for (const chunk of channelChunks) {
      if (!trackQuota(1)) {
        console.warn('Quota exceeded. Skipping fresh baseline fetch.');
        break;
      }

      try {
        const chanUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails,statistics&id=${chunk.join(
          ','
        )}&key=${YOUTUBE_API_KEY}`;
        const chanRes = await fetch(chanUrl);
        if (!chanRes.ok) continue;

        const chanData = await chanRes.json();
        const items = chanData.items || [];

        for (const item of items) {
          const cid = item.id;
          const stats = item.statistics || {};
          const content = item.contentDetails || {};

          const subsHidden = Boolean(stats.hiddenSubscriberCount);
          const subscriberCount = subsHidden ? null : parseInt(stats.subscriberCount || '0', 10);
          const uploadsPlaylistId = content.relatedPlaylists?.uploads;

          let medianShort = 0;
          let medianLong = 0;
          let sampleShort = 0;
          let sampleLong = 0;

          if (uploadsPlaylistId && trackQuota(1)) {
            // Get last 20 uploads (costs 1 unit)
            try {
              const plUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploadsPlaylistId}&maxResults=20&key=${YOUTUBE_API_KEY}`;
              const plRes = await fetch(plUrl);
              if (plRes.ok) {
                const plData = await plRes.json();
                const uploadIds = (plData.items || [])
                  .map((p: any) => p.contentDetails?.videoId)
                  .filter(Boolean);

                if (uploadIds.length > 0 && trackQuota(1)) {
                  // Batch fetch upload videos details (costs 1 unit)
                  const vUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet,liveStreamingDetails&id=${uploadIds.join(
                    ','
                  )}&key=${YOUTUBE_API_KEY}`;
                  const vRes = await fetch(vUrl);
                  if (vRes.ok) {
                    const vData = await vRes.json();
                    const vItems = vData.items || [];

                    const matureCutoff = now - sevenDaysAgoMs;
                    const shortsViews: number[] = [];
                    const longsViews: number[] = [];

                    for (const v of vItems) {
                      // Exclude livestreams from channel baseline medians
                      if (isLiveOrStreamVideo(v)) {
                        continue;
                      }

                      const pubTime = new Date(v.snippet?.publishedAt || 0).getTime();
                      if (pubTime > matureCutoff) {
                        // Skip unmatured uploads (< 7 days old)
                        continue;
                      }

                      const durationSec = parseIsoDuration(v.contentDetails?.duration || '');
                      const views = parseInt(v.statistics?.viewCount || '0', 10);

                      if (durationSec <= DEFAULT_VIRAL_CONFIG.SHORTS_MAX_SECONDS) {
                        shortsViews.push(views);
                      } else {
                        longsViews.push(views);
                      }
                    }

                    sampleShort = shortsViews.length;
                    sampleLong = longsViews.length;
                    medianShort = calculateMedian(shortsViews) || 0;
                    medianLong = calculateMedian(longsViews) || 0;
                  }
                }
              }
            } catch (pErr) {
              console.warn(`Failed to fetch uploads playlist for channel ${cid}:`, pErr);
            }
          }

          const record: ChannelBaselineRecord = {
            channel_id: cid,
            subscriber_count: subscriberCount,
            subs_hidden: subsHidden,
            median_views_long: medianLong,
            median_views_short: medianShort,
            sample_size_long: sampleLong,
            sample_size_short: sampleShort,
            refreshed_at: new Date().toISOString(),
          };

          resultMap.set(cid, record);

          // Upsert to Supabase
          if (supabase && isSupabaseConfigured) {
            try {
              await supabase
                .from('channel_baselines')
                .upsert(record, { onConflict: 'channel_id' });
            } catch (err) {
              console.warn('Baseline upsert failed:', err);
            }
          }
        }
      } catch (err) {
        console.warn('Error fetching channel data chunk:', err);
      }
    }

    return resultMap;
  }

  /**
   * Record snapshot and fetch past snapshots from post_snapshots table
   */
  public async recordAndFetchSnapshots(videoId: string, currentViews: number): Promise<PostSnapshot[]> {
    const defaultList: PostSnapshot[] = [{ views: currentViews, capturedAt: new Date().toISOString() }];
    if (!supabase || !isSupabaseConfigured) {
      return defaultList;
    }

    try {
      // 1. Record snapshot
      await supabase.from('post_snapshots').insert({
        video_id: videoId,
        views: currentViews,
        captured_at: new Date().toISOString(),
      });

      // 2. Fetch past snapshots
      const { data, error } = await supabase
        .from('post_snapshots')
        .select('views, captured_at')
        .eq('video_id', videoId)
        .order('captured_at', { ascending: true });

      if (error || !data || data.length === 0) {
        return defaultList;
      }

      return data.map((d: any) => ({
        views: Number(d.views),
        capturedAt: d.captured_at,
      }));
    } catch {
      return defaultList;
    }
  }

  /**
   * Save scored video results to video_scores table
   */
  public async recordVideoScore(scoreResult: any): Promise<void> {
    if (!supabase || !isSupabaseConfigured || !scoreResult) return;
    try {
      await supabase.from('video_scores').insert({
        video_id: scoreResult.videoId,
        scored_at: new Date().toISOString(),
        outlier_ratio: scoreResult.outlierRatio,
        reach_ratio: scoreResult.reachRatio,
        velocity_ratio: scoreResult.velocityRatio,
        engagement_score: scoreResult.engagementScore,
        viral_score: scoreResult.viralScore,
        label: scoreResult.label,
        confidence: scoreResult.confidence,
        components_used: scoreResult.componentsUsed,
      });
    } catch (err) {
      console.warn('Failed to insert video_scores row:', err);
    }
  }

  /**
   * Fetch most popular trending videos from YouTube for a category and rank by VIRAL SCORE.
   * Supports single region (e.g. 'IN' or 'US') or multiple regions (e.g. ['IN', 'US']).
   */
  public async fetchTrendingVideos(
    categoryName = 'Tech & AI',
    regionInput: string | string[] = ['IN', 'US']
  ): Promise<TrendingTopic[]> {
    if (!this.isConfigured()) {
      console.warn('YouTube API key is missing. Set VITE_YOUTUBE_API_KEY in .env');
      return [];
    }

    const regions = Array.isArray(regionInput) ? regionInput : [regionInput];
    const catId = YOUTUBE_CATEGORY_MAP[categoryName] || '28';
    const allItems: any[] = [];
    const seenIds = new Set<string>();

    for (const reg of regions) {
      if (!trackQuota(1)) break;
      const effectiveRegion = reg === 'ALL' ? 'US' : reg;
      const endpoint = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics,liveStreamingDetails&chart=mostPopular&videoCategoryId=${catId}&regionCode=${effectiveRegion}&maxResults=35&key=${YOUTUBE_API_KEY}`;

      try {
        const response = await fetch(endpoint);
        if (!response.ok) {
          console.warn(`YouTube API returned status ${response.status} for region ${reg}`);
          continue;
        }

        const data = await response.json();
        // Exclude live streams and upcoming broadcasts
        const items = (data.items || []).filter((item: any) => !isLiveOrStreamVideo(item));
        for (const it of items) {
          if (!seenIds.has(it.id)) {
            seenIds.add(it.id);
            it._regionCode = reg;
            allItems.push(it);
          }
        }
      } catch (err) {
        console.error(`Failed to fetch from YouTube Data API for region ${reg}:`, err);
      }
    }

    if (allItems.length === 0) return [];
    return await this.processAndScoreVideos(allItems, categoryName);
  }

  /**
   * Fetch most popular trending videos across multiple categories and regions
   */
  public async fetchMultiCategoryTrends(
    categories: string[] = [
      'Tech & AI',
      'Creator Economy',
      'Productivity & Work',
      'Finance & Investing',
      'Fitness & Health',
      'Gaming',
      'Politics',
      'Movies',
    ],
    regionInput: string | string[] = ['IN', 'US'],
    perCategoryLimit = 15
  ): Promise<TrendingTopic[]> {
    if (!this.isConfigured()) return [];

    const regions = Array.isArray(regionInput) ? regionInput : [regionInput];
    const allTopics: TrendingTopic[] = [];
    const seenTitles = new Set<string>();

    for (const cat of categories) {
      const catId = YOUTUBE_CATEGORY_MAP[cat] || '28';
      const catItems: any[] = [];
      const seenIds = new Set<string>();

      for (const reg of regions) {
        if (!trackQuota(1)) break;
        const effectiveRegion = reg === 'ALL' ? 'US' : reg;
        const endpoint = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics,liveStreamingDetails&chart=mostPopular&videoCategoryId=${catId}&regionCode=${effectiveRegion}&maxResults=${perCategoryLimit}&key=${YOUTUBE_API_KEY}`;

        try {
          const response = await fetch(endpoint);
          if (!response.ok) continue;
          const data = await response.json();
          const items = (data.items || []).filter((item: any) => !isLiveOrStreamVideo(item));
          for (const it of items) {
            if (!seenIds.has(it.id)) {
              seenIds.add(it.id);
              it._regionCode = reg;
              catItems.push(it);
            }
          }
        } catch (err) {
          console.warn(`Category ${cat} fetch failed for region ${reg}:`, err);
        }
      }

      if (catItems.length > 0) {
        try {
          const scored = await this.processAndScoreVideos(catItems, cat);
          for (const t of scored) {
            const key = t.title.toLowerCase().trim();
            if (!seenTitles.has(key)) {
              seenTitles.add(key);
              allTopics.push(t);
            }
          }
        } catch (err) {
          console.warn(`Failed scoring category ${cat}:`, err);
        }
      }
    }

    if (allTopics.length > 0) {
      this.cacheTopicsToSupabase(allTopics).catch(() => {});
    }

    return allTopics;
  }

  /**
   * On-demand keyword trend search across YouTube Data API v3 within a specified freshness window (< 3 days, 7 days, etc.)
   * Supports location-based search across single or multiple selected regions (e.g. ['IN', 'US'] or ['IN']).
   */
  public async searchKeywordTrends(
    query: string,
    daysAgo: number = 7,
    maxResults: number = 30,
    regionInput: string | string[] = ['IN', 'US']
  ): Promise<TrendingTopic[]> {
    const trimmed = query.trim();
    if (!trimmed || !this.isConfigured()) {
      return [];
    }

    const regions = Array.isArray(regionInput) && regionInput.length > 0 ? regionInput : ['ALL'];
    const cutoff = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    const seenVideoIds = new Set<string>();
    const videoRegionMap = new Map<string, string>();

    // For each selected region, execute targeted search
    for (const reg of regions) {
      if (!trackQuota(100)) {
        console.warn('Daily quota budget reached during regional search.');
        break;
      }

      try {
        const regionParam = reg && reg !== 'ALL' ? `&regionCode=${reg}` : '';
        const limitPerRegion = regions.length > 1 ? Math.max(15, Math.floor(maxResults / regions.length)) : maxResults;

        let searchEndpoint = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
          trimmed
        )}&type=video&order=viewCount&publishedAfter=${cutoff}${regionParam}&maxResults=${limitPerRegion}&key=${YOUTUBE_API_KEY}`;

        let searchRes = await fetch(searchEndpoint);
        if (!searchRes.ok) {
          console.warn(`YouTube search returned status ${searchRes.status} for region ${reg}`);
          continue;
        }

        let searchData = await searchRes.json();
        let searchItems = (searchData.items || []).filter(
          (it: any) =>
            it.snippet?.liveBroadcastContent !== 'live' &&
            it.snippet?.liveBroadcastContent !== 'upcoming'
        );

        // Fallback: If 0 items found in a strict 3-day window, expand to 14 days
        if (searchItems.length === 0 && daysAgo < 14) {
          if (trackQuota(100)) {
            const relaxedCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
            searchEndpoint = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
              trimmed
            )}&type=video&order=relevance&publishedAfter=${relaxedCutoff}${regionParam}&maxResults=${limitPerRegion}&key=${YOUTUBE_API_KEY}`;
            searchRes = await fetch(searchEndpoint);
            if (searchRes.ok) {
              searchData = await searchRes.json();
              searchItems = (searchData.items || []).filter(
                (it: any) =>
                  it.snippet?.liveBroadcastContent !== 'live' &&
                  it.snippet?.liveBroadcastContent !== 'upcoming'
              );
            }
          }
        }

        for (const it of searchItems) {
          const vid = it.id?.videoId;
          if (vid && !seenVideoIds.has(vid)) {
            seenVideoIds.add(vid);
            videoRegionMap.set(vid, reg);
          }
        }
      } catch (err) {
        console.warn(`Regional search error for ${reg}:`, err);
      }
    }

    const videoIds = Array.from(seenVideoIds);
    if (videoIds.length === 0) {
      return [];
    }

    // Batch video details (up to 50 IDs per call)
    const allVideoItems: any[] = [];
    for (let i = 0; i < videoIds.length; i += 50) {
      const batchIds = videoIds.slice(i, i + 50);
      if (!trackQuota(1)) break;

      try {
        const videosEndpoint = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics,liveStreamingDetails&id=${batchIds.join(
          ','
        )}&key=${YOUTUBE_API_KEY}`;

        const videosRes = await fetch(videosEndpoint);
        if (!videosRes.ok) {
          throw new Error(`YouTube videos endpoint returned status ${videosRes.status}`);
        }

        const videosData = await videosRes.json();
        // Exclude any live or stream videos (Shorts and regular videos only)
        const items = (videosData.items || []).filter((item: any) => !isLiveOrStreamVideo(item));
        for (const it of items) {
          it._regionCode = videoRegionMap.get(it.id) || 'US';
          allVideoItems.push(it);
        }
      } catch (err) {
        console.error('Failed to batch fetch video details:', err);
      }
    }

    if (allVideoItems.length === 0) {
      return [];
    }

    const category = inferCategory(trimmed, allVideoItems[0]?.snippet?.title || '');
    return await this.processAndScoreVideos(allVideoItems, category, trimmed);
  }

  /**
   * Process raw YouTube video items: compute baselines, snapshots, pure viral scores, deduplicate per channel
   */
  private async processAndScoreVideos(
    rawVideoItems: any[],
    categoryName: string,
    searchQuery?: string
  ): Promise<TrendingTopic[]> {
    // Strictly filter out any live or stream broadcasts
    const videoItems = rawVideoItems.filter((v) => !isLiveOrStreamVideo(v));
    if (videoItems.length === 0) return [];
    const channelIds = videoItems.map((v) => v.snippet?.channelId).filter(Boolean);
    const baselinesMap = await this.getOrFetchBaselines(channelIds);

    // Compute category engagement rates for percentiles
    const candidateStats = videoItems.map((v) => {
      const stats = v.statistics || {};
      const views = parseInt(stats.viewCount || '0', 10);
      const likes = parseInt(stats.likeCount || '0', 10);
      const comments = parseInt(stats.commentCount || '0', 10);

      return {
        id: v.id,
        views,
        likes,
        comments,
        likeRate: views > 0 && likes > 0 ? likes / views : 0,
        commentRate: views > 0 && comments > 0 ? comments / views : 0,
      };
    });

    const allLikeRates = candidateStats.map((s) => s.likeRate);
    const allCommentRates = candidateStats.map((s) => s.commentRate);

    const scoredTopics: TrendingTopic[] = [];

    for (let i = 0; i < videoItems.length; i++) {
      const v = videoItems[i];
      const snippet = v.snippet || {};
      const stats = v.statistics || {};
      const content = v.contentDetails || {};

      const channelId = snippet.channelId;
      const channelName = sanitizeText(snippet.channelTitle) || 'Creator';
      const cleanTitle = sanitizeText(snippet.title) || (searchQuery ? `${searchQuery} Trend` : 'Trending Video');
      const cleanDesc = sanitizeText(snippet.description);

      const viewsNum = parseInt(stats.viewCount || '0', 10);
      const likesNum = parseInt(stats.likeCount || '0', 10);
      const commentsNum = parseInt(stats.commentCount || '0', 10);

      const durationSec = parseIsoDuration(content.duration || '');
      const isShort = durationSec <= DEFAULT_VIRAL_CONFIG.SHORTS_MAX_SECONDS;

      const pubDate = new Date(snippet.publishedAt || Date.now());
      const ageHours = Math.max(0.1, (Date.now() - pubDate.getTime()) / (3600 * 1000));

      // Snapshots for real velocity
      const snapshots = await this.recordAndFetchSnapshots(v.id, viewsNum);

      // Channel baseline
      const baseline = baselinesMap.get(channelId);
      const baselineMedian = baseline
        ? isShort
          ? baseline.median_views_short
          : baseline.median_views_long
        : 1000;
      const sampleSize = baseline
        ? isShort
          ? baseline.sample_size_short
          : baseline.sample_size_long
        : 0;

      const cStat = candidateStats[i];
      const likePercentile = calculatePercentileRank(allLikeRates, cStat.likeRate);
      const commentPercentile = calculatePercentileRank(allCommentRates, cStat.commentRate);

      const candidateInput: CandidateVideoInput = {
        videoId: v.id,
        views: viewsNum,
        ageHours,
        durationSeconds: durationSec,
        baselineMedian: baselineMedian > 0 ? baselineMedian : 1000,
        sampleSize,
        subscriberCount: baseline ? baseline.subscriber_count : null,
        subsHidden: baseline ? baseline.subs_hidden : false,
        snapshots,
        likeRatePercentile: likePercentile,
        commentRatePercentile: commentPercentile,
      };

      const scoreResult = scoreCandidateVideo(candidateInput, DEFAULT_VIRAL_CONFIG);

      if (scoreResult) {
        this.recordVideoScore(scoreResult).catch(() => {});
      }

      // Format views
      let formattedViews = `${viewsNum.toLocaleString()} views`;
      if (viewsNum >= 1000000) {
        formattedViews = `${(viewsNum / 1000000).toFixed(1)}M views`;
      } else if (viewsNum >= 1000) {
        formattedViews = `${(viewsNum / 1000).toFixed(0)}K views`;
      }

      // Velocity text: real velocity or "velocity pending"
      let growthText = 'velocity pending';
      if (scoreResult && scoreResult.velocityRatio !== null) {
        growthText = `${scoreResult.velocityRatio.toFixed(1)}x velocity`;
      }

      const outlierDisplay = scoreResult ? `${scoreResult.outlierRatio.toFixed(1)}x channel avg` : 'n/a';
      const reachDisplay =
        scoreResult && scoreResult.reachRatio !== null
          ? `reached ${scoreResult.reachRatio.toFixed(1)}x subs`
          : null;

      const topic: TrendingTopic = {
        id: `yt-${v.id}`,
        category: categoryName,
        title: cleanTitle,
        summary: cleanDesc
          ? cleanDesc.slice(0, 160) + '...'
          : `Breakout video by ${channelName}. ${outlierDisplay}.`,
        momentumScore: scoreResult ? Math.round(scoreResult.viralScore) : Math.max(70, 95 - i * 3),
        growthRate: growthText,
        platforms: ['youtube'],
        sourceStats: {
          views: formattedViews,
          upvotes: likesNum > 0 ? `${(likesNum / 1000).toFixed(0)}K likes` : undefined,
          comments: commentsNum > 0 ? `${commentsNum.toLocaleString()} comments` : undefined,
          crossPlatformProof: reachDisplay
            ? `${outlierDisplay} | ${reachDisplay}`
            : outlierDisplay,
        },
        audienceQuestions: [
          `What makes ${cleanTitle.slice(0, 42)} outperform its channel benchmark?`,
          `How can small creators adapt this specific angle into a high-retention Short?`,
        ],
        videoUrl: `https://www.youtube.com/watch?v=${v.id}`,
        thumbnailUrl: snippet.thumbnails?.medium?.url || snippet.thumbnails?.high?.url,
        publishedAt: snippet.publishedAt,
        channelTitle: channelName,
        channelId,
        viralScore: scoreResult ? scoreResult.viralScore : 0,
        outlierRatio: scoreResult ? scoreResult.outlierRatio : undefined,
        reachRatio: scoreResult ? scoreResult.reachRatio : null,
        velocityRatio: scoreResult ? scoreResult.velocityRatio : null,
        engagementScore: scoreResult ? scoreResult.engagementScore : null,
        label: scoreResult ? scoreResult.label : 'Normal for this channel',
        isOutsiderBreakout: scoreResult ? scoreResult.isOutsiderBreakout : false,
        channelSizeBucket: scoreResult ? scoreResult.channelSizeBucket : null,
        confidence: scoreResult ? scoreResult.confidence : 'low',
        componentsUsed: scoreResult ? scoreResult.componentsUsed : [],
        regionCode: (v as any)._regionCode || 'US',
        regionName: getRegionName((v as any)._regionCode || 'US'),
      };

      scoredTopics.push(topic);
    }

    // Deduplication: Keep only the best-scoring video per channel per run
    const channelBestMap = new Map<string, TrendingTopic>();
    for (const t of scoredTopics) {
      const cid = t.channelId || t.id;
      const existing = channelBestMap.get(cid);
      if (!existing || (t.viralScore || 0) > (existing.viralScore || 0)) {
        channelBestMap.set(cid, t);
      }
    }

    const deduplicatedTopics = Array.from(channelBestMap.values());

    // Sort the Rising Trends list by viral_score DESC
    deduplicatedTopics.sort((a, b) => (b.viralScore || 0) - (a.viralScore || 0));

    console.log(
      `[YouTube Quota] Run complete. Total estimated quota units used today: ${dailyQuotaUsed} / ${DEFAULT_VIRAL_CONFIG.DAILY_QUOTA_BUDGET}`
    );

    // Cache top topics to Supabase topics table
    if (supabase && isSupabaseConfigured && deduplicatedTopics.length > 0) {
      this.cacheTopicsToSupabase(deduplicatedTopics).catch(() => {});
    }

    return deduplicatedTopics;
  }

  /**
   * Persist fresh YouTube trends into the Supabase 'topics' table in fast, robust batches
   */
  public async cacheTopicsToSupabase(topics: TrendingTopic[]): Promise<void> {
    if (!supabase || !isSupabaseConfigured || !topics || topics.length === 0) return;

    const payload = topics.map((t) => ({
      category: t.category,
      title: t.title,
      summary: t.summary,
      momentum_score: t.momentumScore,
      growth_rate: t.growthRate,
      platforms: t.platforms || ['youtube'],
      audience_questions: t.audienceQuestions || [],
      region_code: t.regionCode || 'US',
      thumbnail_url: t.thumbnailUrl || null,
      video_url: t.videoUrl || null,
      channel_title: t.channelTitle || null,
      channel_id: t.channelId || null,
      viral_score: t.viralScore || t.momentumScore || null,
      outlier_ratio: t.outlierRatio || null,
      reach_ratio: t.reachRatio || null,
      velocity_ratio: t.velocityRatio || null,
      label: t.label || (t.viralScore && t.viralScore >= 70 ? 'Viral breakout' : 'Strong performer'),
      is_outsider_breakout: Boolean(t.isOutsiderBreakout),
      confidence: t.confidence || 'standard',
      source_stats: t.sourceStats || null,
      views_count: t.sourceStats?.views || null,
      published_at: t.publishedAt || null,
    }));

    // Deduplicate by title within the payload to avoid duplicate key issues in the same batch
    const uniqueByTitle = new Map<string, any>();
    for (const item of payload) {
      if (!uniqueByTitle.has(item.title)) {
        uniqueByTitle.set(item.title, item);
      }
    }
    const cleanPayload = Array.from(uniqueByTitle.values());

    for (let i = 0; i < cleanPayload.length; i += 50) {
      const chunk = cleanPayload.slice(i, i + 50);
      try {
        await supabase.from('topics').upsert(chunk, { onConflict: 'title' });
      } catch (e) {
        console.warn('Batch topic upsert notice:', e);
      }
    }
  }
}

export const youtubeService = new YouTubeService();
