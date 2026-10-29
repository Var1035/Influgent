import React, { useState, useEffect } from 'react';
import { VoiceInputBar } from './VoiceInputBar';
import { TrendExplorer } from './TrendExplorer';
import { ContentGenerator } from './ContentGenerator';
import { SavedContentLibrary } from './SavedContentLibrary';
import { aiEngine, INITIAL_TRENDING_TOPICS, TRENDS_CACHE_KEY } from '../../services/aiContentEngine';
import { TrendingTopic, GeneratedContent, ContentStatus } from '../../types/workspace';
import { getRegionName } from '../../services/youtubeService';
import { WisprFlowBadge } from '../WisprFlowBadge';

type WorkspaceTab = 'trends' | 'studio' | 'library';

interface VoiceWorkspaceProps {
  onBackToHome: () => void;
  initialTab?: WorkspaceTab;
}

export const VoiceWorkspace: React.FC<VoiceWorkspaceProps> = ({ onBackToHome, initialTab = 'trends' }) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialTab);
  
  // Hydrate instantly from localStorage to eliminate any 5-video reload flicker
  const [trends, setTrends] = useState<TrendingTopic[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(TRENDS_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Failed to parse cached trends from localStorage:', e);
      }
    }
    return INITIAL_TRENDING_TOPICS;
  });

  const [selectedTopic, setSelectedTopic] = useState<TrendingTopic | null>(null);
  const [currentContent, setCurrentContent] = useState<GeneratedContent | null>(null);
  const [savedItems, setSavedItems] = useState<GeneratedContent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [activeFreshnessDays, setActiveFreshnessDays] = useState(7);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['IN', 'US']);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [generatingTopicId, setGeneratingTopicId] = useState<string | null>(null);
  const [generationSeconds, setGenerationSeconds] = useState(0);

  // Timer effect for tracking elapsed generation seconds
  useEffect(() => {
    let timer: any = null;
    if (generatingTopicId) {
      setGenerationSeconds(0);
      timer = setInterval(() => {
        setGenerationSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setGenerationSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [generatingTopicId]);

  // Synchronize state and persistent storage simultaneously
  const updateTrends = (newTrends: TrendingTopic[]) => {
    setTrends(newTrends);
    if (typeof window !== 'undefined' && newTrends && newTrends.length > 0) {
      try {
        localStorage.setItem(TRENDS_CACHE_KEY, JSON.stringify(newTrends));
      } catch (e) {
        console.warn('Failed saving trends to localStorage:', e);
      }
    }
  };

  // Load saved content and trends from Supabase / localStorage on mount
  useEffect(() => {
    // 1. Initial local load
    const loaded = aiEngine.getSavedContent();
    setSavedItems(loaded);

    // 2. Fetch trends from Supabase & YouTube for initial selected regions (India & US)
    aiEngine.syncTrendsFromSupabase(selectedRegions).then((remoteTrends) => {
      if (remoteTrends && remoteTrends.length > 0) {
        updateTrends(remoteTrends);
      }
    });

    // 3. Fetch saved blueprints from Supabase
    aiEngine.syncSavedContentFromSupabase().then((remoteSaved) => {
      if (remoteSaved && remoteSaved.length > 0) {
        setSavedItems(remoteSaved);
      }
    });

    // Default generate content for top trend if none active
    if (!currentContent && trends.length > 0) {
      const topTrend = trends[0];
      const initial = aiEngine.generateContent(topTrend.title, 'shorts');
      setCurrentContent(initial);
      setSelectedTopic(topTrend);
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // Live YouTube Keyword Trend Search with region awareness
  const handleSearchKeyword = async (
    keyword: string,
    daysAgo: number = 7,
    regions: string[] = selectedRegions
  ) => {
    setIsSearchingLive(true);
    const regLabel = regions.map((r) => getRegionName(r)).join(' & ') || 'Worldwide';
    showToast(`Searching YouTube (${regLabel}) for "${keyword}" (< ${daysAgo} days)...`);
    try {
      const results = await aiEngine.searchLiveTrends(keyword, daysAgo, undefined, regions);
      if (results && results.length > 0) {
        updateTrends(results);
        setActiveSearchQuery(keyword);
        setActiveFreshnessDays(daysAgo);
        setActiveTab('trends');
        showToast(`Discovered ${results.length} live YouTube trends in ${regLabel} for "${keyword}"`);
      } else {
        showToast(`No fresh YouTube videos found for "${keyword}" in ${regLabel} (< ${daysAgo} days).`);
      }
    } catch (err) {
      console.error('Error during keyword trend search:', err);
      showToast('Search encountered an error. Showing cached topics.');
    } finally {
      setIsSearchingLive(false);
    }
  };

  // Handle Location / Region filter change
  const handleRegionsChange = async (newRegions: string[]) => {
    const safeRegions = newRegions.length === 0 ? ['ALL'] : newRegions;
    setSelectedRegions(safeRegions);
    const regLabel = safeRegions.map((r) => getRegionName(r)).join(', ') || 'Worldwide';
    showToast(`Target location updated to: ${regLabel}`);

    if (activeSearchQuery) {
      await handleSearchKeyword(activeSearchQuery, activeFreshnessDays, safeRegions);
    } else {
      setIsSearchingLive(true);
      try {
        const remoteTrends = await aiEngine.syncTrendsFromSupabase(safeRegions);
        if (remoteTrends && remoteTrends.length > 0) {
          updateTrends(remoteTrends);
        }
      } catch (err) {
        console.warn('Failed to switch regions:', err);
      } finally {
        setIsSearchingLive(false);
      }
    }
  };

  // Reset to default Supabase and trending topics
  const handleResetTrends = async () => {
    setIsLoading(true);
    setActiveSearchQuery('');
    try {
      const remoteTrends = await aiEngine.syncTrendsFromSupabase(selectedRegions);
      if (remoteTrends && remoteTrends.length > 0) {
        updateTrends(remoteTrends);
      }
      const regLabel = selectedRegions.map((r) => getRegionName(r)).join(', ');
      showToast(`Reset to trending topics (${regLabel}).`);
    } catch {
      // keep current cached trends
    } finally {
      setIsLoading(false);
    }
  };

  // Execute Spoken or Typed Command
  const handleExecuteCommand = async (command: string) => {
    setIsLoading(true);
    showToast(`Voice action: "${command}"`);

    const parsed = aiEngine.parseVoiceIntent(command);

    if (parsed.intent === 'search_trends') {
      const queryTopic = parsed.extractedTopic || command;
      await handleSearchKeyword(queryTopic, 7);
      setIsLoading(false);
    } else if (parsed.intent === 'generate_content') {
      const queryTopic = parsed.extractedTopic || 'Autonomous AI Agents';
      const queryFormat = parsed.extractedFormat || 'shorts';
      try {
        const generated = await aiEngine.generateContentWithAI(queryTopic, queryFormat);
        setCurrentContent(generated);
        setActiveTab('studio');
        showToast(`Generated script for "${generated.topicTitle}"`);
      } catch {
        const fallback = aiEngine.generateContent(queryTopic, queryFormat);
        setCurrentContent(fallback);
        setActiveTab('studio');
      }
      setIsLoading(false);
    } else if (parsed.intent === 'refine_content') {
      if (currentContent) {
        const refined = aiEngine.refineContent(currentContent, parsed.refinementInstruction || command);
        setCurrentContent(refined);
        setActiveTab('studio');
        showToast('Refined content according to voice command.');
      } else {
        showToast('No active content to refine. Generate a topic first.');
      }
      setIsLoading(false);
    } else if (parsed.intent === 'save_content') {
      if (currentContent) {
        const updated = aiEngine.saveContent(currentContent);
        setSavedItems(updated);
        aiEngine.persistContentToSupabase(currentContent);
        showToast(`Saved "${currentContent.topicTitle}" to your content library.`);
      }
      setIsLoading(false);
    } else if (parsed.intent === 'switch_format') {
      if (currentContent && parsed.extractedFormat) {
        const updated = { ...currentContent, format: parsed.extractedFormat };
        setCurrentContent(updated);
        setActiveTab('studio');
        showToast(`Switched format to ${parsed.extractedFormat.toUpperCase()}.`);
      }
      setIsLoading(false);
    } else {
      // If it looks like a search term without explicit keywords, run live keyword search
      if (command.trim().split(' ').length <= 4 && !command.includes('how to')) {
        await handleSearchKeyword(command.trim(), 7);
      } else {
        // Fallback: generate content from query
        const generated = aiEngine.generateContent(command, 'shorts');
        setCurrentContent(generated);
        setActiveTab('studio');
        showToast(`Generated new creative package for "${command}"`);
      }
      setIsLoading(false);
    }
  };

  // Select trend to generate
  const handleSelectTrend = async (topic: TrendingTopic) => {
    setSelectedTopic(topic);
    setGeneratingTopicId(topic.id);
    setIsLoading(true);
    showToast(`Opening Studio & generating script for "${topic.title.slice(0, 26)}..."`);

    // Prepare draft immediately with empty voiceoverScript so the skeleton shows in Studio right away
    const initialDraft = aiEngine.generateContent(
      topic.title,
      'shorts',
      topic.category,
      topic.summary
    );
    initialDraft.isAiGenerating = true;
    initialDraft.voiceoverScript = '';
    setCurrentContent(initialDraft);
    setActiveTab('studio'); // Switch immediately so user sees the live Studio loading state

    try {
      const generated = await aiEngine.generateContentWithAI(
        topic.title,
        'shorts',
        topic.category,
        topic.summary,
        topic.audienceQuestions
      );
      generated.isAiGenerating = false;
      setCurrentContent(generated);
      if (generated.isMistralGenerated) {
        showToast(`AI Script generated via Mistral API for "${topic.title.slice(0, 28)}..."`);
      } else {
        showToast(`Loaded "${topic.title.slice(0, 28)}..." into Studio.`);
      }
    } catch {
      const fallback = aiEngine.generateContent(topic.title, 'shorts', topic.category, topic.summary);
      fallback.isAiGenerating = false;
      setCurrentContent(fallback);
      showToast('Loaded in Studio. Connect Mistral API key for live AI generation.');
    } finally {
      setIsLoading(false);
      setGeneratingTopicId(null);
    }
  };

  // Save Content (Persists to both Local Storage & Supabase)
  const handleSaveContent = (contentToSave: GeneratedContent) => {
    const updated = aiEngine.saveContent(contentToSave);
    setSavedItems(updated);
    aiEngine.persistContentToSupabase(contentToSave);
    showToast(`Saved "${contentToSave.topicTitle}" to Library & Supabase.`);
  };

  // Delete Content
  const handleDeleteContent = (id: string) => {
    const updated = aiEngine.deleteContent(id);
    setSavedItems(updated);
    aiEngine.deleteContentFromSupabase(id);
    showToast('Deleted item from library & Supabase.');
  };

  // Status Change
  const handleUpdateStatus = (id: string, status: ContentStatus) => {
    const updated = aiEngine.updateContentStatus(id, status);
    setSavedItems(updated);
    aiEngine.updateStatusInSupabase(id, status);
    if (currentContent && currentContent.id === id) {
      setCurrentContent({ ...currentContent, status });
    }
    showToast(`Updated status to ${status.toUpperCase()}`);
  };

  // Refine in Studio
  const handleStudioRefine = (instruction: string) => {
    if (!currentContent) return;
    setIsRefining(true);
    setTimeout(() => {
      const refined = aiEngine.refineContent(currentContent, instruction);
      setCurrentContent(refined);
      setIsRefining(false);
      showToast('Applied AI refinement.');
    }, 400);
  };

  return (
    <div className="workspace-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="workspace-toast" role="status">
          <i className="fa-solid fa-sparkles"></i>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Workspace Header */}
      <div className="workspace-top-bar">
        <div className="workspace-brand">
          <button type="button" className="back-home-btn" onClick={onBackToHome} title="Return to Landing Page">
            <i className="fa-solid fa-arrow-left"></i>
            <span>Landing Page</span>
          </button>
          <div className="workspace-title-wrap">
            <h1 className="workspace-heading">TrendPilot Studio</h1>
            <span className="live-status-pill">
              <span className="pulsing-dot"></span> Supabase Connected
            </span>
            <WisprFlowBadge />
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="workspace-nav-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'trends' ? 'active' : ''}`}
            onClick={() => setActiveTab('trends')}
          >
            <i className="fa-solid fa-chart-line"></i>
            <span>Trends Explorer</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'studio' ? 'active' : ''}`}
            onClick={() => setActiveTab('studio')}
          >
            <i className="fa-solid fa-wand-magic-sparkles"></i>
            <span>Content Studio</span>
            {generatingTopicId && (
              <span className="tab-generating-badge">
                <i className="fa-solid fa-circle-notch fa-spin"></i> Generating
              </span>
            )}
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'library' ? 'active' : ''}`}
            onClick={() => setActiveTab('library')}
          >
            <i className="fa-solid fa-bookmark"></i>
            <span>Saved Library ({savedItems.length})</span>
          </button>
        </div>
      </div>

      {/* Voice & Text Command Bar (Always accessible at top of workspace) */}
      <VoiceInputBar onExecuteCommand={handleExecuteCommand} isLoading={isLoading} />

      {/* Main Tab Viewport */}
      <div className="workspace-content-area">
        {activeTab === 'trends' && (
          <TrendExplorer
            trends={trends}
            onSelectTopic={handleSelectTrend}
            selectedTopicId={selectedTopic?.id}
            generatingTopicId={generatingTopicId}
            generationSeconds={generationSeconds}
            onOpenStudio={() => setActiveTab('studio')}
            onSearchKeyword={handleSearchKeyword}
            onResetTrends={handleResetTrends}
            isSearchingLive={isSearchingLive}
            activeSearchQuery={activeSearchQuery}
            activeFreshnessDays={activeFreshnessDays}
            selectedRegions={selectedRegions}
            onRegionsChange={handleRegionsChange}
          />
        )}

        {activeTab === 'studio' && currentContent && (
          <ContentGenerator
            content={currentContent}
            onUpdateContent={setCurrentContent}
            onSaveContent={handleSaveContent}
            onRefine={handleStudioRefine}
            isRefining={isRefining}
            isGeneratingScript={Boolean(generatingTopicId)}
            generationSeconds={generationSeconds}
          />
        )}

        {activeTab === 'library' && (
          <SavedContentLibrary
            savedItems={savedItems}
            onSelectContent={(item) => {
              setCurrentContent(item);
              setActiveTab('studio');
              showToast(`Loaded "${item.topicTitle}" into Studio.`);
            }}
            onDeleteItem={handleDeleteContent}
            onUpdateStatus={handleUpdateStatus}
          />
        )}
      </div>
    </div>
  );
};
