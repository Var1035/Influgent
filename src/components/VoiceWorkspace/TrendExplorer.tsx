import React, { useState } from 'react';
import { TrendingTopic } from '../../types/workspace';
import { SUPPORTED_REGIONS, getRegionName } from '../../services/youtubeService';
import { WisprFlowBadge } from '../WisprFlowBadge';

interface TrendExplorerProps {
  trends: TrendingTopic[];
  onSelectTopic: (topic: TrendingTopic) => void;
  selectedTopicId?: string;
  generatingTopicId?: string | null;
  generationSeconds?: number;
  onOpenStudio?: () => void;
  onSearchKeyword?: (keyword: string, daysAgo: number, regions?: string[]) => Promise<void>;
  onResetTrends?: () => void;
  isSearchingLive?: boolean;
  activeSearchQuery?: string;
  activeFreshnessDays?: number;
  selectedRegions?: string[];
  onRegionsChange?: (regions: string[]) => void;
}

const CATEGORIES = [
  'All',
  'Tech & AI',
  'Creator Economy',
  'Productivity & Work',
  'Finance & Investing',
  'Fitness & Health',
  'Gaming',
  'Politics',
  'Movies',
];

interface NextRunInfo {
  timeLabel: string;
  countdown: string;
  isToday: boolean;
}

function getNextSyncRunInfo(): NextRunInfo {
  const syncHours = [6, 11, 15, 18, 21];
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinute;

  for (const h of syncHours) {
    const runTotalMinutes = h * 60;
    if (runTotalMinutes > currentTotalMinutes) {
      const diffMinutes = runTotalMinutes - currentTotalMinutes;
      const hoursLeft = Math.floor(diffMinutes / 60);
      const minsLeft = diffMinutes % 60;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      return {
        timeLabel: `${displayHour}:00 ${ampm}`,
        countdown: hoursLeft > 0 ? `in ${hoursLeft}h ${minsLeft}m` : `in ${minsLeft}m`,
        isToday: true,
      };
    }
  }

  // If past 9:00 PM, next run is 6:00 AM tomorrow
  const minutesUntilMidnight = 24 * 60 - currentTotalMinutes;
  const minutesUntil6AM = minutesUntilMidnight + 6 * 60;
  const hoursLeft = Math.floor(minutesUntil6AM / 60);
  const minsLeft = minutesUntil6AM % 60;
  return {
    timeLabel: `6:00 AM Tomorrow`,
    countdown: `in ${hoursLeft}h ${minsLeft}m`,
    isToday: false,
  };
}

export type SortMode = 'newest' | 'viral' | 'oldest';

export function formatScrapedTime(isoString?: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const TrendExplorer: React.FC<TrendExplorerProps> = ({
  trends,
  onSelectTopic,
  selectedTopicId,
  generatingTopicId = null,
  generationSeconds = 0,
  onOpenStudio,
  onSearchKeyword,
  onResetTrends,
  isSearchingLive = false,
  activeSearchQuery = '',
  activeFreshnessDays = 7,
  selectedRegions = ['IN', 'US'],
  onRegionsChange,
}) => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeRegionFilter, setActiveRegionFilter] = useState('All');
  const [searchInput, setSearchInput] = useState('');
  const [selectedDays, setSelectedDays] = useState<number>(activeFreshnessDays);
  // Requirement 5 & 8: Toggle to include normal uploads from big channels (off by default)
  const [includeNormalUploads, setIncludeNormalUploads] = useState<boolean>(false);
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [nextRunInfo, setNextRunInfo] = useState<NextRunInfo>(getNextSyncRunInfo());

  const localRegions = selectedRegions && selectedRegions.length > 0 ? selectedRegions : ['IN', 'US'];

  // Keep next run countdown live every 30 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      setNextRunInfo(getNextSyncRunInfo());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Compute category counts dynamically
  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = { All: trends.length };
    for (const cat of CATEGORIES) {
      if (cat === 'All') continue;
      counts[cat] = trends.filter(
        (t) => t.category.toLowerCase() === cat.toLowerCase()
      ).length;
    }
    return counts;
  }, [trends]);

  const totalVideos = trends.length;
  const viralBreakoutsCount = trends.filter((t) => t.label === 'Viral breakout').length;
  const strongPerformersCount = trends.filter((t) => t.label === 'Strong performer').length;
  const outsiderBreakoutsCount = trends.filter((t) => t.isOutsiderBreakout).length;

  // Region breakdown and summary
  const regionBreakdown = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of trends) {
      const reg = t.regionCode || 'GLOBAL';
      counts[reg] = (counts[reg] || 0) + 1;
    }
    return counts;
  }, [trends]);

  const regionCountsSummary = React.useMemo(() => {
    const parts: string[] = [];
    if (regionBreakdown['IN']) parts.push(`${regionBreakdown['IN']} in India`);
    if (regionBreakdown['US']) parts.push(`${regionBreakdown['US']} in USA`);
    if (regionBreakdown['GB']) parts.push(`${regionBreakdown['GB']} in UK`);
    if (regionBreakdown['CA']) parts.push(`${regionBreakdown['CA']} in Canada`);
    if (regionBreakdown['GLOBAL']) parts.push(`${regionBreakdown['GLOBAL']} Global`);
    return parts.length > 0 ? parts.join(' • ') : 'Global & multi-region';
  }, [regionBreakdown]);

  // Handle region toggle
  const handleToggleRegion = (code: string) => {
    if (!onRegionsChange) return;
    if (code === 'ALL') {
      onRegionsChange(['ALL']);
      return;
    }
    let next: string[];
    if (localRegions.includes('ALL')) {
      next = [code];
    } else if (localRegions.includes(code)) {
      next = localRegions.filter((r) => r !== code);
      if (next.length === 0) next = ['ALL'];
    } else {
      next = [...localRegions.filter((r) => r !== 'ALL'), code];
    }
    onRegionsChange(next);
  };

  const handleSelectPreset = (preset: 'IN' | 'US' | 'BOTH' | 'ALL') => {
    if (!onRegionsChange) return;
    if (preset === 'IN') onRegionsChange(['IN']);
    else if (preset === 'US') onRegionsChange(['US']);
    else if (preset === 'BOTH') onRegionsChange(['IN', 'US']);
    else if (preset === 'ALL') onRegionsChange(['ALL']);
  };

  // Sync selectedDays with prop
  React.useEffect(() => {
    if (activeFreshnessDays) {
      setSelectedDays(activeFreshnessDays);
    }
  }, [activeFreshnessDays]);

  // When activeSearchQuery is set, reset category to All so results are visible
  React.useEffect(() => {
    if (activeSearchQuery) {
      setSearchInput(activeSearchQuery);
      setActiveCategory('All');
    }
  }, [activeSearchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchInput.trim();
    if (!query) return;
    if (onSearchKeyword) {
      onSearchKeyword(query, selectedDays, localRegions);
    }
  };

  const handleReset = () => {
    setSearchInput('');
    setActiveCategory('All');
    setActiveRegionFilter('All');
    if (onResetTrends) {
      onResetTrends();
    }
  };

  // Requirement 5 & 8: Filter out "Normal for this channel" unless toggle is checked, and sort by viral_score DESC
  const filteredTrends = trends
    .filter((t) => {
      const matchCat =
        activeCategory === 'All' ||
        t.category.toLowerCase() === activeCategory.toLowerCase();
      if (!matchCat) return false;

      // In-view region filter
      if (activeRegionFilter !== 'All') {
        const tReg = (t.regionCode || '').toUpperCase();
        if (tReg !== activeRegionFilter && tReg !== 'GLOBAL') {
          return false;
        }
      }

      // Hide normal uploads from big channels by default
      if (!includeNormalUploads && t.label === 'Normal for this channel') {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortMode === 'newest') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
        return (b.viralScore ?? b.momentumScore ?? 0) - (a.viralScore ?? a.momentumScore ?? 0);
      }
      if (sortMode === 'oldest') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (timeA !== timeB) return timeA - timeB;
        return (b.viralScore ?? b.momentumScore ?? 0) - (a.viralScore ?? a.momentumScore ?? 0);
      }
      return (b.viralScore ?? b.momentumScore ?? 0) - (a.viralScore ?? a.momentumScore ?? 0);
    });

  return (
    <div className="trend-explorer-panel">
      {/* Trend Intelligence Header & Data Source Status */}
      <div className="panel-header">
        <div>
          <div className="panel-title-row">
            <h2 className="panel-title">
              <i className="fa-solid fa-chart-line"></i> Rising Trends & Momentum
            </h2>
            <WisprFlowBadge />
          </div>
          <p className="panel-subtitle">
            Ranked by channel-relative Viral Score. Comparing videos against 7-day upload baselines to isolate true breakouts.
          </p>
        </div>

        {/* Dynamic YouTube Keyword Search Form */}
        <form onSubmit={handleSearchSubmit} className="trend-search-wrapper">
          <div className="trend-search-box">
            {isSearchingLive ? (
              <i className="fa-solid fa-spinner fa-spin search-loading-spinner" title="Analyzing live trends..."></i>
            ) : (
              <i className="fa-solid fa-magnifying-glass"></i>
            )}
            <input
              type="text"
              placeholder="Search topics & hit Enter (e.g. Lenovo laptop, camera, stock market)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchInput('')}
                title="Clear input"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          {/* Freshness Window Selector */}
          <div className="freshness-select-wrap">
            <label htmlFor="freshness-select" className="freshness-label">
              <i className="fa-regular fa-calendar-days"></i> Freshness:
            </label>
            <select
              id="freshness-select"
              value={selectedDays}
              onChange={(e) => setSelectedDays(Number(e.target.value))}
              className="freshness-select"
            >
              <option value={3}>&lt; 3 Days (Ultra Fresh)</option>
              <option value={7}>&lt; 7 Days (Viral Week)</option>
              <option value={14}>&lt; 14 Days (Bi-weekly)</option>
            </select>
          </div>
        </form>
      </div>

      {/* Location / Region Discovery Bar: Support for India, United States, and multi-region searching */}
      <div className="trend-location-bar">
        <div className="location-bar-header">
          <div className="location-bar-title">
            <i className="fa-solid fa-earth-americas"></i>
            <span>Target Location(s):</span>
          </div>

          {/* Quick Presets */}
          <div className="location-preset-group">
            <button
              type="button"
              className={`location-preset-btn ${localRegions.length === 1 && localRegions[0] === 'IN' ? 'active' : ''}`}
              onClick={() => handleSelectPreset('IN')}
              title="Search and show videos specifically from India"
            >
              <i className="fa-solid fa-location-dot"></i> India Only
            </button>
            <button
              type="button"
              className={`location-preset-btn ${localRegions.length === 1 && localRegions[0] === 'US' ? 'active' : ''}`}
              onClick={() => handleSelectPreset('US')}
              title="Search and show videos specifically from the United States"
            >
              <i className="fa-solid fa-location-dot"></i> US Only
            </button>
            <button
              type="button"
              className={`location-preset-btn ${localRegions.includes('IN') && localRegions.includes('US') && localRegions.length === 2 ? 'active' : ''}`}
              onClick={() => handleSelectPreset('BOTH')}
              title="Compare and search videos across both India and the United States"
            >
              <i className="fa-solid fa-layer-group"></i> India &amp; US
            </button>
            <button
              type="button"
              className={`location-preset-btn ${localRegions.includes('ALL') ? 'active' : ''}`}
              onClick={() => handleSelectPreset('ALL')}
              title="Search and browse global worldwide trends"
            >
              <i className="fa-solid fa-globe"></i> Worldwide
            </button>
          </div>
        </div>

        {/* Multi-select Country Pills */}
        <div className="location-pills-row">
          {SUPPORTED_REGIONS.map((region) => {
            const isSelected = localRegions.includes(region.code);
            return (
              <button
                key={region.code}
                type="button"
                className={`location-pill ${isSelected ? 'selected' : ''}`}
                onClick={() => handleToggleRegion(region.code)}
                title={`Toggle ${region.name} (${region.code})`}
              >
                <i className={`fa-solid ${isSelected ? 'fa-circle-check' : 'fa-circle'}`}></i>
                <span>{region.name}</span>
                <span className="location-code-chip">{region.code}</span>
              </button>
            );
          })}
        </div>

        {/* Active Locations Indicator */}
        <div className="location-active-status">
          <i className="fa-solid fa-circle-info"></i>
          <span>
            Active Search &amp; Discovery Scope: <strong>{localRegions.map((r) => getRegionName(r)).join(' + ')}</strong>
            {localRegions.length > 1 && ' (multi-location mode active)'}
          </span>
        </div>
      </div>

      {/* Active Search Banner */}
      {activeSearchQuery && (
        <div className="active-search-banner">
          <div className="active-search-info">
            <i className="fa-solid fa-circle-check"></i>
            <div>
              <p className="search-banner-headline">
                Discovered <strong>{trends.length} topics</strong> for <strong>"{activeSearchQuery}"</strong> in <strong>{localRegions.map((r) => getRegionName(r)).join(' + ')}</strong> (past {activeFreshnessDays} days).
              </p>
              <span className="search-banner-subtext">
                <i className="fa-solid fa-arrow-down"></i> Click any topic card below to load it into Content Studio and generate voiceover scripts.
              </span>
            </div>
          </div>
          <button type="button" className="reset-filter-btn" onClick={handleReset}>
            <i className="fa-solid fa-arrow-rotate-left"></i>
            <span>Reset to All Trends</span>
          </button>
        </div>
      )}

      {/* Dynamic Sync Dashboard Stat Bar: Next run timing, counts, and volume */}
      <div className="trend-sync-dashboard-bar">
        {/* Stat 1: Total Available Videos */}
        <div className="dashboard-stat-card">
          <div className="stat-icon-wrap total">
            <i className="fa-solid fa-layer-group"></i>
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Videos</span>
            <div className="stat-value-row">
              <span className="stat-value">{totalVideos}</span>
              <span className="stat-badge">Available</span>
            </div>
            <span className="stat-sub">{regionCountsSummary}</span>
          </div>
        </div>

        {/* Stat 2: Next Sync Timing */}
        <div className="dashboard-stat-card">
          <div className="stat-icon-wrap next-sync">
            <i className="fa-solid fa-clock"></i>
          </div>
          <div className="stat-info">
            <span className="stat-label">Next Automated Sync</span>
            <div className="stat-value-row">
              <span className="stat-value highlight-time">{nextRunInfo.timeLabel}</span>
            </div>
            <span className="stat-sub countdown-pulse">
              <i className="fa-solid fa-hourglass-half"></i> Runs {nextRunInfo.countdown}
            </span>
          </div>
        </div>

        {/* Stat 3: Daily Target Volume */}
        <div className="dashboard-stat-card">
          <div className="stat-icon-wrap target">
            <i className="fa-solid fa-arrows-rotate"></i>
          </div>
          <div className="stat-info">
            <span className="stat-label">Daily Sync Target</span>
            <div className="stat-value-row">
              <span className="stat-value">500</span>
              <span className="stat-badge daily">videos / day</span>
            </div>
            <span className="stat-sub">100 videos x 5 runs (6 AM, 11 AM, 3 PM, 6 PM, 9 PM)</span>
          </div>
        </div>

        {/* Stat 4: Breakout Counts */}
        <div className="dashboard-stat-card">
          <div className="stat-icon-wrap breakout">
            <i className="fa-solid fa-bolt"></i>
          </div>
          <div className="stat-info">
            <span className="stat-label">Viral Breakouts</span>
            <div className="stat-value-row">
              <span className="stat-value">{viralBreakoutsCount}</span>
              <span className="stat-badge viral">Score ≥ 70</span>
            </div>
            <span className="stat-sub">{strongPerformersCount} strong • {outsiderBreakoutsCount} outsider tags</span>
          </div>
        </div>
      </div>

      {/* Category Tabs with Dynamic Video Counts & Normal Uploads Toggle */}
      <div className="filter-controls-row">
        <div className="category-pills-row">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`category-pill ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              <span>{cat}</span>
              <span className="pill-count-badge">
                {categoryCounts[cat] !== undefined ? categoryCounts[cat] : 0}
              </span>
            </button>
          ))}
        </div>

        <div className="filter-controls-right">
          {/* Scraped Data Sort Selector */}
          <div className="trend-sort-control" title="Sort order of displayed trends">
            <i className="fa-solid fa-arrow-down-short-wide"></i>
            <span className="sort-label">Sort:</span>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="trend-sort-select"
            >
              <option value="newest">Latest Scraped First</option>
              <option value="viral">Highest Viral Score</option>
              <option value="oldest">First Scraped (Oldest)</option>
            </select>
          </div>

          {/* Big Channels Normal Uploads Toggle */}
          <label
            className="normal-uploads-toggle"
            title="Toggle visibility of videos that match normal performance for big channels"
          >
            <input
              type="checkbox"
              checked={includeNormalUploads}
              onChange={(e) => setIncludeNormalUploads(e.target.checked)}
            />
            <span className="toggle-switch"></span>
            <span className="toggle-label">Include normal uploads</span>
          </label>
        </div>
      </div>

      {/* In-view Location Filter (when multiple locations are active) */}
      {localRegions.length > 1 && (
        <div className="in-view-region-filters">
          <span className="in-view-label">
            <i className="fa-solid fa-filter"></i> Filter Loaded Videos:
          </span>
          <button
            type="button"
            className={`in-view-region-btn ${activeRegionFilter === 'All' ? 'active' : ''}`}
            onClick={() => setActiveRegionFilter('All')}
          >
            All Active ({totalVideos})
          </button>
          {localRegions.map((code) => {
            const count = trends.filter((t) => (t.regionCode || '').toUpperCase() === code.toUpperCase()).length;
            return (
              <button
                key={code}
                type="button"
                className={`in-view-region-btn ${activeRegionFilter === code ? 'active' : ''}`}
                onClick={() => setActiveRegionFilter(code)}
              >
                <i className="fa-solid fa-location-dot"></i> {getRegionName(code)} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Connected Source Banner */}
      <div className="demo-data-badge">
        <i className="fa-solid fa-circle-nodes"></i>
        <span>
          Real-time viral intelligence powered by YouTube Data API v3 and Supabase PostgreSQL. Syncs automatically 5x daily (6 AM, 11 AM, 3 PM, 6 PM, 9 PM) with 100 breakout videos per run.
        </span>
      </div>

      {/* Active AI Script Generation Banner */}
      {generatingTopicId && (
        <div className="trend-generating-banner">
          <div className="generating-banner-left">
            <div className="generating-spinner-wrap">
              <i className="fa-solid fa-circle-notch fa-spin"></i>
            </div>
            <div className="generating-banner-text">
              <div className="generating-banner-header">
                <span className="generating-pill">
                  <i className="fa-solid fa-wand-magic-sparkles"></i> Mistral AI Generating
                </span>
                <span className="generating-timer">Elapsed: {generationSeconds}s</span>
              </div>
              <h4 className="generating-banner-title">
                Crafting Voiceover Script for "{trends.find((t) => t.id === generatingTopicId)?.title || 'Selected Topic'}"
              </h4>
              <p className="generating-banner-sub">
                Mining audience questions, curiosity angles, and spoken teleprompter cadence. Studio will open automatically when ready.
              </p>
              <div className="generating-steps-row">
                <span className={`step-chip ${generationSeconds >= 1 ? 'active' : ''}`}>
                  <i className="fa-solid fa-check"></i> 1. Outlier Metrics
                </span>
                <span className={`step-chip ${generationSeconds >= 3 ? 'active' : ''}`}>
                  <i className="fa-solid fa-brain"></i> 2. Mistral AI Voiceover
                </span>
                <span className={`step-chip ${generationSeconds >= 7 ? 'active' : ''}`}>
                  <i className="fa-solid fa-tv"></i> 3. Teleprompter Timings
                </span>
              </div>
            </div>
          </div>
          {onOpenStudio && (
            <div className="generating-banner-right">
              <button
                type="button"
                className="generating-open-studio-btn"
                onClick={onOpenStudio}
                title="View in Content Studio"
              >
                <span>View in Studio</span>
                <i className="fa-solid fa-arrow-right"></i>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Trend Cards Grid */}
      <div className="trends-grid">
        {filteredTrends.length === 0 ? (
          <div className="no-trends-box">
            <i className="fa-solid fa-magnifying-glass-chart"></i>
            <h3>No breakout trends matching your filter</h3>
            <p>
              {searchInput
                ? `No current local trends match "${searchInput}". Press Enter in the search box to query fresh YouTube videos from the past ${selectedDays} days!`
                : !includeNormalUploads && trends.length > 0
                ? 'Videos from this category match normal channel performance. Check "Include normal uploads from big channels" to inspect them.'
                : 'No trends found in this category.'}
            </p>
          </div>
        ) : (
          filteredTrends.map((topic) => {
            const isSelected = selectedTopicId === topic.id;
            const isGenerating = generatingTopicId === topic.id;
            const displayScore =
              topic.viralScore !== undefined && topic.viralScore > 0
                ? topic.viralScore
                : topic.momentumScore;

            return (
              <div
                key={topic.id}
                className={`trend-card ${isSelected ? 'selected' : ''} ${isGenerating ? 'generating' : ''}`}
                onClick={() => {
                  if (!generatingTopicId) {
                    onSelectTopic(topic);
                  }
                }}
              >
                {/* Visual AI Generation Badge */}
                {isGenerating && (
                  <div className="card-generating-overlay">
                    <span className="generating-chip">
                      <i className="fa-solid fa-circle-notch fa-spin"></i>
                      <span>AI Crafting Script... {generationSeconds ? `${generationSeconds}s` : ''}</span>
                    </span>
                  </div>
                )}
                {/* Top: Category, Channel Bucket, Confidence & Viral Score Badge */}
                <div className="trend-card-top">
                  <div className="trend-meta-left">
                    <span className="trend-category-tag">{topic.category}</span>
                    {topic.createdAt && (
                      <span
                        className="trend-scraped-time"
                        title={`Scraped & Ingested: ${new Date(topic.createdAt).toLocaleString()}`}
                      >
                        <i className="fa-regular fa-clock"></i> {formatScrapedTime(topic.createdAt)}
                      </span>
                    )}
                    {topic.regionCode && (
                      <span
                        className="trend-region-tag"
                        title={`Target Region: ${topic.regionName || topic.regionCode}`}
                      >
                        <i className="fa-solid fa-location-dot"></i> {topic.regionName ? `${topic.regionName} (${topic.regionCode})` : topic.regionCode}
                      </span>
                    )}
                    {topic.channelSizeBucket && (
                      <span className="channel-bucket-tag" title={`Channel size tier: ${topic.channelSizeBucket}`}>
                        {topic.channelSizeBucket}
                      </span>
                    )}
                    {topic.confidence === 'low' && (
                      <span
                        className="confidence-low-badge"
                        title="Fewer than 5 baseline uploads available (low confidence)"
                      >
                        <i className="fa-solid fa-circle-exclamation"></i> Low conf
                      </span>
                    )}
                  </div>

                  <div
                    className="viral-score-badge"
                    title="Viral Score (0-100) based on channel outlier ratio, reach, velocity, and engagement"
                  >
                    <i className="fa-solid fa-fire"></i>
                    <span>{displayScore}</span>
                    <small>/100</small>
                  </div>
                </div>

                {/* Viral Labels & Outsider Breakout Tag */}
                <div className="trend-labels-row">
                  {topic.label === 'Viral breakout' && (
                    <span className="viral-label-badge breakout">
                      <i className="fa-solid fa-bolt"></i> Viral breakout
                    </span>
                  )}
                  {topic.label === 'Strong performer' && (
                    <span className="viral-label-badge strong">
                      <i className="fa-solid fa-chart-line-up"></i> Strong performer
                    </span>
                  )}
                  {topic.label === 'Normal for this channel' && (
                    <span className="viral-label-badge normal">
                      <i className="fa-solid fa-minus"></i> Normal for this channel
                    </span>
                  )}
                  {topic.isOutsiderBreakout && (
                    <span
                      className="outsider-breakout-badge"
                      title="Under 1M subscribers with reach ratio >= 1.0 (Outsider breakout)"
                    >
                      <i className="fa-solid fa-trophy"></i> Outsider breakout
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="trend-title">{topic.title}</h3>

                {/* Real Metrics Row: Nx channel avg, reached Nx subs, real velocity */}
                <div className="growth-delta-row">
                  {/* Outlier Ratio */}
                  {topic.outlierRatio !== undefined ? (
                    <span className="metric-tag outlier" title="Performance relative to channel average uploads">
                      <i className="fa-solid fa-arrow-trend-up"></i> {topic.outlierRatio.toFixed(1)}x channel avg
                    </span>
                  ) : (
                    <span className="metric-tag outlier">n/a</span>
                  )}

                  {/* Reach Ratio */}
                  {topic.reachRatio !== null && topic.reachRatio !== undefined ? (
                    <span className="metric-tag reach" title="Views relative to total channel subscribers">
                      <i className="fa-solid fa-users"></i> reached {topic.reachRatio.toFixed(1)}x subs
                    </span>
                  ) : null}

                  {/* Velocity Ratio */}
                  <span
                    className={`metric-tag velocity ${
                      topic.velocityRatio === null || topic.velocityRatio === undefined ? 'pending' : ''
                    }`}
                    title={
                      topic.velocityRatio !== null && topic.velocityRatio !== undefined
                        ? `Hourly view velocity relative to 7-day baseline`
                        : `Awaiting at least 2 snapshot intervals (>= 6 hours apart)`
                    }
                  >
                    <i className="fa-solid fa-gauge-high"></i>{' '}
                    {topic.velocityRatio !== null && topic.velocityRatio !== undefined
                      ? `${topic.velocityRatio.toFixed(1)}x velocity`
                      : 'velocity pending'}
                  </span>
                </div>

                {/* Summary */}
                <p className="trend-summary">{topic.summary}</p>

                {/* Platform Source Badges */}
                <div className="platform-badges-row">
                  <span className="platform-pill yt">
                    <i className="fa-brands fa-youtube"></i> {topic.sourceStats?.views || 'YouTube'}
                  </span>
                  {topic.sourceStats?.upvotes && (
                    <span className="platform-pill likes">
                      <i className="fa-regular fa-thumbs-up"></i> {topic.sourceStats.upvotes}
                    </span>
                  )}
                  {topic.videoUrl && (
                    <a
                      href={topic.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="platform-pill yt-link"
                      onClick={(e) => e.stopPropagation()}
                      title="Watch original video on YouTube"
                    >
                      <i className="fa-solid fa-arrow-up-right-from-square"></i> YouTube Video
                    </a>
                  )}
                </div>

                {/* Mined Audience Questions */}
                {topic.audienceQuestions && topic.audienceQuestions.length > 0 && (
                  <div className="audience-gap-box">
                    <span className="gap-title">
                      <i className="fa-regular fa-comment-dots"></i> Top Creator Angle:
                    </span>
                    <p className="gap-question">"{topic.audienceQuestions[0]}"</p>
                  </div>
                )}

                {/* Action button */}
                <div className="trend-card-footer">
                  <button
                    type="button"
                    className={`generate-from-trend-btn ${isGenerating ? 'generating' : ''}`}
                    disabled={Boolean(generatingTopicId)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!generatingTopicId) {
                        onSelectTopic(topic);
                      }
                    }}
                  >
                    {isGenerating ? (
                      <>
                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                        <span>Generating Script...</span>
                      </>
                    ) : (
                      <>
                        <span>Generate Voiceover Script</span>
                        <i className="fa-solid fa-microphone-lines"></i>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
