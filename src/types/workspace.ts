/**
 * Type definitions for the TrendPilot Voice-First Content Creation Workspace
 */

export type PlatformSource = 'youtube' | 'reddit' | 'cross-platform';

export type ContentFormat = 'shorts' | 'linkedin' | 'reels' | 'long-video';

export type ContentStatus = 'draft' | 'scripted' | 'ready-to-film' | 'posted';

export interface TrendingTopic {
  id: string;
  category: string;
  title: string;
  summary: string;
  momentumScore: number; // 0 to 100
  growthRate: string; // e.g. "+340% in 12h"
  platforms: PlatformSource[];
  sourceStats: {
    views?: string;
    upvotes?: string;
    comments?: string;
    crossPlatformProof: string;
  };
  audienceQuestions: string[];
  videoUrl?: string;
  thumbnailUrl?: string;
  publishedAt?: string;
  createdAt?: string;
  channelTitle?: string;
  channelId?: string;
  viralScore?: number;
  outlierRatio?: number;
  reachRatio?: number | null;
  velocityRatio?: number | null;
  engagementScore?: number | null;
  label?: 'Viral breakout' | 'Strong performer' | 'Normal for this channel';
  isOutsiderBreakout?: boolean;
  channelSizeBucket?: 'nano' | 'micro' | 'mid' | 'macro' | 'mega' | null;
  confidence?: 'low' | 'standard';
  componentsUsed?: string[];
  regionCode?: string; // e.g. 'US', 'IN', 'GB', 'ALL'
  regionName?: string; // e.g. 'United States', 'India', 'Worldwide'
}

export interface GeneratedContent {
  id: string;
  topicId?: string;
  topicTitle: string;
  category: string;
  format: ContentFormat;
  whyTrending: string;
  hooks: {
    curiosity: string;
    contrarian: string;
    story: string;
  };
  selectedHookIndex: number;
  voiceoverScript: string; // The word-for-word spoken teleprompter script for the creator/influencer
  voiceoverWordCount?: number;
  voiceoverDurationSeconds?: number;
  productionPrompt?: string; // The technical AI prompt with visual timestamps & cues sent to ChatGPT
  scriptOutline: {
    beginning: string;
    middle: string;
    end: string;
  };
  linkedInPost?: string;
  caption: string;
  hashtags: string[];
  recommendedLength: string;
  bestPostingWindow: string;
  createdAt: string;
  status: ContentStatus;
  notes?: string;
  isMistralGenerated?: boolean;
  modelUsed?: string;
  isAiGenerating?: boolean;
}

export type VoiceState = 'idle' | 'listening' | 'processing' | 'error';

