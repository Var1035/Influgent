/**
 * TrendPilot AI Content Creation & Trend Discovery Engine
 * 
 * Implements TrendPilot's core schema:
 * - Multi-platform trend clustering (YouTube + Reddit)
 * - Momentum scoring & audience question mining
 * - Multi-archetype hook generation (Curiosity, Contrarian, Story)
 * - Script outlines, LinkedIn posts, captions, hashtags
 * - Real-time voice/text refinement
 */

import { TrendingTopic, GeneratedContent, ContentFormat, ContentStatus } from '../types/workspace';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { youtubeService, inferCategory, sanitizeText, getRegionName } from './youtubeService';
import { mistralService, cleanSpokenText } from './mistralService';

export const INITIAL_TRENDING_TOPICS: TrendingTopic[] = [
  {
    id: 'trend-1',
    category: 'Tech & AI',
    title: 'Autonomous Coding Agents & Local LLMs',
    summary: 'Developers and creators are pivoting from simple autocomplete copilot tools to autonomous agent swarms running locally on Mac and RTX GPUs.',
    momentumScore: 94,
    growthRate: '+420% view velocity in 24h',
    platforms: ['youtube', 'reddit', 'cross-platform'],
    sourceStats: {
      views: '840K views across 12 videos',
      upvotes: '4.2K upvotes on r/LocalLLaMA & r/programming',
      comments: '1,240 comments analyzing benchmark leaks',
      crossPlatformProof: 'Simultaneous surge on YouTube tech channels and top Reddit discussions',
    },
    audienceQuestions: [
      'Can local models actually build full-stack apps without breaking code?',
      'How much VRAM do I need before it becomes slow?',
      'Will autonomous coding agents replace junior engineers this year?',
    ],
    regionCode: 'US',
    regionName: 'United States',
    label: 'Viral breakout',
    viralScore: 94,
  },
  {
    id: 'trend-2',
    category: 'Creator Economy',
    title: 'The Shift to Voice-First & Raw Aesthetic Content',
    summary: 'Over-edited talking head videos are seeing retention drops; raw, single-take voiceover formats with high-signal hooks are outperforming 3x.',
    momentumScore: 89,
    growthRate: '+310% engagement delta',
    platforms: ['youtube', 'reddit', 'cross-platform'],
    sourceStats: {
      views: '1.2M views on YouTube Shorts',
      upvotes: '2.8K on r/NewTubers',
      comments: '890 comments debating retention tactics',
      crossPlatformProof: 'Viral Shorts paired with creator discussions on Reddit',
    },
    audienceQuestions: [
      'Why are overproduced videos getting fewer views now?',
      'How do you write a 3-second hook that does not feel like clickbait?',
      'What microphone gives that warm podcast sound for Shorts?',
    ],
    regionCode: 'IN',
    regionName: 'India',
    label: 'Viral breakout',
    viralScore: 89,
  },
  {
    id: 'trend-3',
    category: 'Gaming',
    title: 'AI Game Glitches & Unreal Engine 5 Procedural Physics',
    summary: 'Gamers are stress-testing new physics and procedural AI bots to completely crash game engines in hilarious viral Shorts clips.',
    momentumScore: 92,
    growthRate: '+490% view velocity',
    platforms: ['youtube', 'reddit'],
    sourceStats: {
      views: '2.4M views',
      upvotes: '8.4K on r/gaming',
      comments: '1,420 comments',
      crossPlatformProof: 'Viral gameplay clips exploding across YouTube and Discord communities',
    },
    audienceQuestions: [
      'How did the AI bot react when the player broke the boundary logic?',
      'Can independent game developers prevent these physics breakdown exploits?',
    ],
    regionCode: 'US',
    regionName: 'United States',
    label: 'Viral breakout',
    viralScore: 92,
  },
  {
    id: 'trend-4',
    category: 'Gaming',
    title: 'Mobile Esports & Indian BGMI Streamer Momentum',
    summary: 'Competitive mobile gaming leagues and regional creator collabs are generating massive live concurrency spikes across India.',
    momentumScore: 88,
    growthRate: '+340% search surge',
    platforms: ['youtube'],
    sourceStats: {
      views: '1.6M views',
      upvotes: '14.2K likes',
      comments: '2,100 comments',
      crossPlatformProof: 'Live tournament replays dominating regional YouTube trending charts',
    },
    audienceQuestions: [
      'What sensitivity and gyro settings are competitive tier-1 players using?',
      'How are regional mobile streamers scaling sponsorships in 2026?',
    ],
    regionCode: 'IN',
    regionName: 'India',
    label: 'Strong performer',
    viralScore: 88,
  },
  {
    id: 'trend-5',
    category: 'Productivity & Work',
    title: 'One-Person AI Agencies ($0 Overhead Stack)',
    summary: 'Solopreneurs utilizing agentic automation tools to replace legacy 5-person agency retainers.',
    momentumScore: 86,
    growthRate: '+270% search surge',
    platforms: ['youtube', 'reddit', 'cross-platform'],
    sourceStats: {
      views: '650K views',
      upvotes: '3.1K on r/SideProject and r/entrepreneur',
      comments: '940 discussions',
      crossPlatformProof: 'Breakdown videos climbing on YouTube alongside Reddit build-logs',
    },
    audienceQuestions: [
      'Which services are businesses actually paying solo creators for?',
      'How do you handle client deliverables without spending 14 hours a day?',
    ],
    regionCode: 'GLOBAL',
    regionName: 'Worldwide',
    label: 'Strong performer',
    viralScore: 86,
  },
  {
    id: 'trend-6',
    category: 'Finance & Investing',
    title: 'High-Yield Cash Alternatives vs Market Volatility',
    summary: 'Retail investors debating treasury yields, ultra-short bonds, and money market funds amidst interest rate speculations.',
    momentumScore: 81,
    growthRate: '+190% discussions',
    platforms: ['reddit', 'youtube'],
    sourceStats: {
      views: '420K views',
      upvotes: '5.1K on r/personalfinance',
      comments: '1,800 comments',
      crossPlatformProof: 'Deep Reddit threads triggering explainer videos on YouTube',
    },
    audienceQuestions: [
      'Is 5% interest still safe if the Fed changes rates?',
      'What happens to cash parked in treasuries if banks fluctuate?',
    ],
    regionCode: 'US',
    regionName: 'United States',
    label: 'Strong performer',
    viralScore: 81,
  },
  {
    id: 'trend-7',
    category: 'Finance & Investing',
    title: 'SIP Inflows & Indian Retail Market Breakout Strategies',
    summary: 'Monthly domestic institutional flows hit record highs as retail participants pivot into defensive small-cap index funds.',
    momentumScore: 87,
    growthRate: '+310% search surge',
    platforms: ['youtube', 'reddit'],
    sourceStats: {
      views: '780K views',
      upvotes: '9.3K upvotes',
      comments: '1,120 comments',
      crossPlatformProof: 'Personal finance channels breaking down monthly allocation strategies',
    },
    audienceQuestions: [
      'Which index sectors are seeing the highest capital concentration right now?',
      'How should first-time investors navigate volatile correction dips?',
    ],
    regionCode: 'IN',
    regionName: 'India',
    label: 'Viral breakout',
    viralScore: 87,
  },
  {
    id: 'trend-8',
    category: 'Fitness & Health',
    title: 'Zone 2 Cardio & Metabolic Health Longevity',
    summary: 'Fitness creators are ditching brutal HIIT workouts for low-intensity Zone 2 training and VO2 max longevity protocols.',
    momentumScore: 78,
    growthRate: '+165% delta',
    platforms: ['youtube', 'reddit', 'cross-platform'],
    sourceStats: {
      views: '980K views',
      upvotes: '1.9K on r/fitness and r/biohackers',
      comments: '720 comments',
      crossPlatformProof: 'Doctor and trainer interviews trending on YouTube and Reddit fitness subs',
    },
    audienceQuestions: [
      'How do I calculate Zone 2 without an expensive lactate monitor?',
      'Can I just walk on an incline or do I have to jog?',
    ],
    regionCode: 'IN',
    regionName: 'India',
    label: 'Strong performer',
    viralScore: 78,
  },
  {
    id: 'trend-9',
    category: 'Tech & AI',
    title: 'Open Source AI Models Running on Everyday Hardware',
    summary: 'Quantized LLMs are now matching frontier API quality directly on entry-level laptops without cloud API fees.',
    momentumScore: 91,
    growthRate: '+380% view velocity',
    platforms: ['youtube', 'reddit'],
    sourceStats: {
      views: '1.1M views',
      upvotes: '6.2K upvotes',
      comments: '980 comments',
      crossPlatformProof: 'Developer tutorials and hardware benchmarks surging on YouTube tech',
    },
    audienceQuestions: [
      'Which quantized models give the highest tokens per second on 16GB RAM?',
      'How to setup local offline voice transcription with zero latency?',
    ],
    regionCode: 'IN',
    regionName: 'India',
    label: 'Viral breakout',
    viralScore: 91,
  },
  {
    id: 'trend-10',
    category: 'Creator Economy',
    title: 'Shorts-to-Newsletter Funnels for Solopreneurs',
    summary: 'Creators are converting vertical video viewers into owned email lists rather than depending solely on platform ad revenue.',
    momentumScore: 85,
    growthRate: '+240% engagement delta',
    platforms: ['youtube', 'cross-platform'],
    sourceStats: {
      views: '540K views',
      upvotes: '3.4K likes',
      comments: '630 discussions',
      crossPlatformProof: 'Creator case studies detailing high-converting lead magnet tactics',
    },
    audienceQuestions: [
      'What lead magnet converts vertical video viewers in under 5 seconds?',
      'How to link external resources without hurting algorithmic reach?',
    ],
    regionCode: 'US',
    regionName: 'United States',
    label: 'Strong performer',
    viralScore: 85,
  },
];

export const TRENDS_CACHE_KEY = 'trendpilot_cached_trends_v2';
const LOCAL_STORAGE_KEY = 'trendpilot_saved_content_v1';

/**
 * Extract clean subject keyword from conversational search queries
 * Example: "find some interesting topics about Tollywood movies" -> "Tollywood movies"
 */
export function extractTopicSubject(input: string): string {
  if (!input) return '';
  let cleaned = input.trim();
  const prefixRegexes = [
    /^(please\s+)?(can\s+you\s+)?(find|search|show|give\s+me|display|lookup|get|suggest|generate)\s+(some\s+)?(interesting\s+|viral\s+|trending\s+|fresh\s+|new\s+|latest\s+)?(topics?|ideas?|trends?|videos?)\s+(about|on|regarding|for|related\s+to|in)\s+/i,
    /^(find|search|show|give\s+me|lookup)\s+(me\s+)?/i,
    /^(what\s+are\s+(some\s+)?(interesting\s+|trending\s+)?(topics?|ideas?|trends?)\s+(about|on|for|in))\s+/i,
    /^(tell\s+me\s+about\s+)/i,
    /^(topics?\s+(about|on|for|regarding)\s+)/i,
    /^(ideas?\s+(about|on|for|regarding)\s+)/i,
    /^(trending\s+topics?\s+(in|on|about|for)\s+)/i,
    /^(trends?\s+(in|on|about|for)\s+)/i,
  ];

  for (const regex of prefixRegexes) {
    cleaned = cleaned.replace(regex, '');
  }

  cleaned = cleaned.replace(/\s+(as\s+well|please|for\s+me)$/i, '');
  return cleaned.trim() || input.trim();
}

export class AIContentEngine {
  /**
   * Search and filter trending topics by keyword or category locally
   */
  public searchTrends(query: string, category?: string): TrendingTopic[] {
    const q = query.toLowerCase().trim();
    return INITIAL_TRENDING_TOPICS.filter((t) => {
      const matchCategory = !category || category === 'All' || t.category.toLowerCase() === category.toLowerCase();
      const matchQuery =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.audienceQuestions.some((qStr) => qStr.toLowerCase().includes(q));
      return matchCategory && matchQuery;
    });
  }

  /**
   * Generates a rich cluster of 5-6 specialized, high-velocity topics for ANY subject
   * (e.g. Tollywood movies, modernized movies, crypto, camera, etc.)
   */
  public generateTopicClusterForSubject(subject: string, category?: string): TrendingTopic[] {
    const cleanSub = sanitizeText(extractTopicSubject(subject));
    const resolvedCat = category && category !== 'All' ? category : inferCategory(cleanSub);
    const lower = cleanSub.toLowerCase();

    // Domain templates: Cinema/Movies, Hardware/Tech, Finance, or General
    let angles: Array<{ title: string; summary: string; score: number; rate: string; question: string }> = [];

    if (/movie|cinema|film|theatre|box office|tollywood|bollywood|actor|director|teaser|trailer|song/.test(lower)) {
      angles = [
        {
          title: `Box Office Clash: 6 Big Theatrical Releases & Opening Weekend Predictions for ${cleanSub}`,
          summary: `Massive theatrical release battle with multi-crore advance bookings and audience debate across short-video platforms.`,
          score: 96,
          rate: '+460% view velocity in 24h',
          question: `Which film will win the opening weekend screen share and word-of-mouth race?`,
        },
        {
          title: `The 1000 Crore Worldwide Target: How ${cleanSub} is Dominating Global Indian Cinema`,
          summary: `Record-breaking overseas distribution deals and high-voltage marketing campaigns reshaping global expectations.`,
          score: 93,
          rate: '+380% search surge',
          question: `How are producers achieving 3x ROI through international rights and pan-India dubbing?`,
        },
        {
          title: `OTT vs Theatrical Window Wars: Why Audiences Are Debating Release Timelines for ${cleanSub}`,
          summary: `The controversial tension between 4-week streaming drops vs theatrical exclusivity sparking heated creator discussions.`,
          score: 89,
          rate: '+310% discussion delta',
          question: `Will early OTT releases harm long-term theatrical stardom or expand total reach?`,
        },
        {
          title: `Modernized Storytelling: High-Concept VFX & World-Building Transforming ${cleanSub}`,
          summary: `How young filmmakers and technical directors are breaking traditional hero tropes with modernized, gritty screenplays.`,
          score: 86,
          rate: '+270% engagement surge',
          question: `What visual techniques and storytelling frameworks are winning over Gen-Z viewers?`,
        },
        {
          title: `Viral Soundtrack & Reel Hooks: The Sound Design Formula Making ${cleanSub} Trend on Social Media`,
          summary: `Music composers crafting 15-second addictive audio cues that trigger millions of user-generated Reels and Shorts.`,
          score: 84,
          rate: '+240% viral audio velocity',
          question: `How do composers engineer earworm hooks specifically for short-form video retention?`,
        },
      ];
    } else if (/laptop|phone|camera|hardware|gadget|gpu|pc|display|intel|amd|nvidia|apple|lenovo|dell/.test(lower)) {
      angles = [
        {
          title: `Is the ${cleanSub} Actually Worth Buying in 2026? The Unfiltered Truth`,
          summary: `Real-world creator stress testing reveals critical performance and thermal realities beyond the spec sheet.`,
          score: 95,
          rate: '+420% view velocity',
          question: `What are the 2 major tradeoffs reviewers are glossing over in benchmark tests?`,
        },
        {
          title: `Refurbished vs Brand New ${cleanSub}: The Smart Budget Strategy`,
          summary: `How savvy creators are saving 40% on hardware while getting 95% of peak productivity performance.`,
          score: 91,
          rate: '+340% search growth',
          question: `Where are the most reliable certified marketplaces to buy without getting scammed?`,
        },
        {
          title: `Modernized Architecture & Battery Life: How ${cleanSub} Handles 4K Video Editing`,
          summary: `In-depth export benchmarks testing timeline scrub latency, thermals, and real-time timeline rendering.`,
          score: 88,
          rate: '+290% engagement delta',
          question: `Does the new silicon chip eliminate the need for heavy desktop workstations?`,
        },
        {
          title: `Top 3 Alternatives to ${cleanSub} That Cost 30% Less for the Same Power`,
          summary: `A side-by-side comparison uncovering the best price-to-performance contenders in this product class.`,
          score: 85,
          rate: '+230% comparison searches',
          question: `Which competitor model provides better build quality and display color accuracy?`,
        },
      ];
    } else if (/stock|market|trade|trading|crypto|bitcoin|invest|nifty|bank|money|finance|yield/.test(lower)) {
      angles = [
        {
          title: `Major Volume Inflow: Why Institutional Money is Positioning in ${cleanSub}`,
          summary: `Unusual block deals and derivative positioning signaling a volatile swing for retail market participants.`,
          score: 94,
          rate: '+480% view velocity in 24h',
          question: `What are the critical resistance and support levels to watch before opening a position?`,
        },
        {
          title: `The 3 Market Indicators Every Retail Investor Must Check for ${cleanSub}`,
          summary: `High-signal macro data separating genuine sustained breakouts from deceptive liquidity traps.`,
          score: 90,
          rate: '+360% discussions',
          question: `How do professional traders mitigate downside risk during interest rate volatility?`,
        },
        {
          title: `Modernized Algorithmic Trading Trends Around ${cleanSub} Explained in 60s`,
          summary: `How automated trading bots and sentiment models are changing retail order execution speeds.`,
          score: 86,
          rate: '+280% search surge',
          question: `Can individual traders exploit bot-driven liquidity dips for short-term swing trades?`,
        },
      ];
    } else {
      // General Modernized Topic Angles
      angles = [
        {
          title: `The Rapid Viral Rise of ${cleanSub} Across Short-Form Video Platforms`,
          summary: `Creator discussions and video breakdowns around ${cleanSub} are seeing explosive month-over-month attention.`,
          score: 94,
          rate: '+390% view velocity in 24h',
          question: `What is the psychological trigger making ${cleanSub} resonate so strongly right now?`,
        },
        {
          title: `The Modernized Blueprint: How Top Creators Approach ${cleanSub} in 2026`,
          summary: `A complete breakdown of modern workflows and tactical frameworks leaving legacy methods behind.`,
          score: 90,
          rate: '+320% engagement delta',
          question: `What is the biggest leverage point for beginners starting in this niche today?`,
        },
        {
          title: `The Hidden Bottleneck in ${cleanSub} That Nobody is Talking About`,
          summary: `An unfiltered deep-dive revealing the costly mistakes and friction points most people encounter.`,
          score: 87,
          rate: '+270% search surge',
          question: `How can creators turn this common pain point into high-retention instructional content?`,
        },
        {
          title: `3 Proven Rules for Monetizing ${cleanSub} with Zero Upfront Capital`,
          summary: `Actionable monetization strategies utilized by top solo operators and short-video creators.`,
          score: 84,
          rate: '+220% discussions',
          question: `What digital products or services are consumers actively paying for in this space?`,
        },
      ];
    }

    return angles.map((a, i) => ({
      id: `topic-gen-${Date.now()}-${i}`,
      category: resolvedCat,
      title: a.title,
      summary: a.summary,
      momentumScore: a.score,
      growthRate: a.rate,
      platforms: ['youtube', 'cross-platform'],
      sourceStats: {
        views: `${(350 + i * 90)}K views`,
        upvotes: `${(12 + i * 3)}K community signals`,
        crossPlatformProof: `High-velocity cluster detected across YouTube & social communities for ${cleanSub}`,
      },
      audienceQuestions: [
        a.question,
        `How can creators turn this ${cleanSub} trend into a 45-second viral Short?`,
      ],
    }));
  }

  /**
   * On-demand Live Trend Search via YouTube Data API v3 and dynamic topic clustering
   * Supports regional filtering for single or multiple locations (e.g. ['IN', 'US'] or ['IN'])
   */
  public async searchLiveTrends(
    query: string,
    daysAgo: number = 7,
    category?: string,
    regions: string[] = ['IN', 'US']
  ): Promise<TrendingTopic[]> {
    const rawClean = extractTopicSubject(query);
    if (!rawClean) {
      return this.syncTrendsFromSupabase(regions);
    }

    const combinedList: TrendingTopic[] = [];
    const seenTitles = new Set<string>();

    // 1. Query YouTube Data API v3 for live videos across the selected regions
    if (youtubeService.isConfigured()) {
      try {
        const ytResults = await youtubeService.searchKeywordTrends(rawClean, daysAgo, 15, regions);
        if (ytResults && ytResults.length > 0) {
          for (const t of ytResults) {
            const key = t.title.toLowerCase().trim();
            if (!seenTitles.has(key)) {
              seenTitles.add(key);
              combinedList.push(t);
            }
          }
        }
      } catch (err) {
        console.warn('YouTube keyword search API notice:', err);
      }
    }

    // 2. Always generate rich domain-specific topic angles for this exact subject
    const domainTopics = this.generateTopicClusterForSubject(rawClean, category);
    const primaryRegion = regions[0] || 'IN';
    for (const dt of domainTopics) {
      const key = dt.title.toLowerCase().trim();
      if (!seenTitles.has(key) && combinedList.length < 8) {
        seenTitles.add(key);
        dt.regionCode = primaryRegion;
        dt.regionName = getRegionName(primaryRegion);
        combinedList.push(dt);
      }
    }

    // 3. Fallback to local filtering if still empty
    if (combinedList.length === 0) {
      return this.searchTrends(rawClean, category);
    }

    // 4. Cache discovered topics into LocalStorage and Supabase PostgreSQL
    if (typeof window !== 'undefined' && combinedList.length > 0) {
      try {
        localStorage.setItem(TRENDS_CACHE_KEY, JSON.stringify(combinedList));
      } catch (err) {
        console.warn('Could not cache discovered trends locally:', err);
      }
    }

    if (supabase && isSupabaseConfigured && combinedList.length > 0) {
      youtubeService.cacheTopicsToSupabase(combinedList).catch(() => {});
    }

    return combinedList;
  }

  /**
   * Persist fresh topics into Supabase PostgreSQL in fast batches
   */
  public async cacheTopicsToSupabase(topics: TrendingTopic[]): Promise<void> {
    await youtubeService.cacheTopicsToSupabase(topics);
  }

  /**
   * Asynchronously generates an accurate, AI-powered voiceover script via Mistral API.
   * If Mistral API key is available (in Supabase Edge Function or client), uses Mistral AI.
   * Otherwise falls back gracefully to topic-grounded generation.
   */
  public async generateContentWithAI(
    topicOrPrompt: string,
    format: ContentFormat = 'shorts',
    category?: string,
    summary?: string,
    audienceQuestions?: string[],
    userApiKey?: string
  ): Promise<GeneratedContent> {
    const isTopic = INITIAL_TRENDING_TOPICS.find(
      (t) =>
        t.title.toLowerCase().includes(topicOrPrompt.toLowerCase()) ||
        topicOrPrompt.toLowerCase().includes(t.title.toLowerCase())
    );
    const title = isTopic ? isTopic.title : sanitizeText(topicOrPrompt);
    const resolvedCategory = isTopic ? isTopic.category : inferCategory(title, category);

    // Try generating with Mistral AI (calls Supabase Edge Function or direct Mistral API)
    try {
      const mistralResult = await mistralService.generateVoiceoverScript({
        topicTitle: title,
        category: resolvedCategory,
        format,
        summary,
        audienceQuestions,
        userApiKey,
      });
      if (mistralResult && mistralResult.voiceoverScript) {
        return mistralResult;
      }
    } catch (err: any) {
      console.warn('Mistral AI generation notice:', err.message);
      if (err.message && err.message.includes('MISTRAL_KEY_REQUIRED')) {
        throw err;
      }
    }

    // Fallback to grounded local generation
    return this.generateContent(topicOrPrompt, format, category, summary);
  }

  /**
   * Generate turn-key content package based on a topic or custom user prompt
   */
  public generateContent(topicOrPrompt: string, format: ContentFormat = 'shorts', category = 'Tech & AI', summaryText?: string): GeneratedContent {
    const isTopic = INITIAL_TRENDING_TOPICS.find(
      (t) => t.title.toLowerCase().includes(topicOrPrompt.toLowerCase()) || topicOrPrompt.toLowerCase().includes(t.title.toLowerCase())
    );

    const title = isTopic ? isTopic.title : sanitizeText(topicOrPrompt);
    const resolvedCategory = isTopic ? isTopic.category : inferCategory(title, category);
    const lower = title.toLowerCase();

    // Craft tailored hooks dynamically based on domain archetypes
    let hooks = {
      curiosity: `The hidden reason why everyone is talking about ${title}... and the 1 angle nobody noticed yet.`,
      contrarian: `Why the mainstream narrative on ${title} is completely backwards—and what the actual data proves.`,
      story: `I spent 40 hours analyzing the data behind ${title}. Here are the 3 things that actually matter.`,
    };

    if (/cyclone|weather|storm|rain|flood|alert|earthquake|accident|disaster|warning|evacuat|coast|andhra|ndrf|breaking|police|crime|court|election|pm |minister|government/.test(lower)) {
      hooks = {
        curiosity: `An urgent emergency situation is developing right now with ${title}—and anyone in the impacted region needs to hear this update immediately.`,
        contrarian: `While initial reports downplayed the severity, the latest official alerts for ${title} show conditions deteriorating fast.`,
        story: `Here is the critical, verified breakdown of what is happening on the ground right now with ${title}.`,
      };
    } else if (/game|gaming|gamer|playstation|xbox|nintendo|steam|fps|esports|speedrun|rpg|glitch|crash|confused|boss|npc|multiplayer|gta|minecraft|roblox|fortnite|elden ring|zelda/.test(lower)) {
      hooks = {
        curiosity: `I tested the limits of enemy AI in ${title}, and what happened next completely broke the physics engine...`,
        contrarian: `Everyone thinks game developers make enemy AI smart, but this one mechanic proves how easily the system collapses in ${title}.`,
        story: `I spent 6 hours trying to trigger this exact game-breaking exploit in ${title}. Here is the footage of what happened.`,
      };
    } else if (/agent|coding|developer|software|programming|python|github|copilot|local llm|local model|vram|prompt|deepseek|claude|openai|chatgpt|model|benchmark|terminal|fullstack/.test(lower)) {
      hooks = {
        curiosity: `Developers are quietly abandoning cloud copilot autocompletes for autonomous agent swarms running locally on Mac and RTX GPUs... and the benchmark leaks explain why.`,
        contrarian: `Stop using generic chat prompts to write code. Real autonomous agents do not just generate snippets—they test, compile, and fix their own errors.`,
        story: `I let an autonomous coding agent build a complete full-stack web application from a single prompt. Here is the unfiltered truth of what worked and what broke.`,
      };
    } else if (/creator|influencer|youtube|shorts|reels|tiktok|retention|algorithm|view|subscriber|monetiz|hook|script|channel/.test(lower)) {
      hooks = {
        curiosity: `The subtle retention tactic that top creators are using to 5x audience watch-time... and why traditional editing is failing.`,
        contrarian: `Stop spending 20 hours over-editing your videos. Audience retention data shows that high-signal voiceovers and raw delivery are outperforming polished corporate edits.`,
        story: `We analyzed 500 breakout videos across YouTube Shorts and Reels. Here are the 3 retention patterns separating viral hits from dead uploads.`,
      };
    } else if (/movie|cinema|film|theatre|box office|tollywood|bollywood|actor|release|clash/.test(lower)) {
      hooks = {
        curiosity: `The real reason behind the massive box office numbers for ${title}... and the 1 hidden factor industry insiders are talking about.`,
        contrarian: `Everyone thinks ${title} is an instant blockbuster, but looking at the actual audience drop-off data, a major shift is happening.`,
        story: `We tracked the first 72 hours of advance ticket bookings and social sentiment for ${title}. Here is what the numbers really prove.`,
      };
    } else if (/laptop|phone|camera|display|macbook|gadget|gpu|pc|hardware|iphone|android|samsung|lenovo|dell|asus/.test(lower)) {
      hooks = {
        curiosity: `The 1 hidden design flaw nobody is mentioning in all the ${title} reviews... and why it matters before you buy.`,
        contrarian: `Why buying the ${title} might be a complete waste of money right now—unless you do this one setup step.`,
        story: `I daily-drove the ${title} for 7 days straight as a creator. Here is the unfiltered truth about whether it is worth the hype.`,
      };
    } else if (/stock|market|trade|trading|crypto|bitcoin|invest|nifty|sensex|bank|money|finance|yield/.test(lower)) {
      hooks = {
        curiosity: `Why smart money is quietly positioning for ${title} this week while retail traders are looking the wrong way...`,
        contrarian: `Everyone is celebrating ${title}, but looking at the actual market data, a major trap is forming right now.`,
        story: `We analyzed 72 hours of trading volume and sentiment behind ${title}. Here are the 3 numbers you must know before opening a position.`,
      };
    } else if (/fitness|workout|gym|diet|health|longevity|fasting|cardio|zone 2/.test(lower)) {
      hooks = {
        curiosity: `The counter-intuitive protocol behind ${title} that increases results by 3x with half the gym time...`,
        contrarian: `Stop following the mainstream advice on ${title}. Most fitness influencers are recommending the exact opposite of what clinical data shows.`,
        story: `I tested the ${title} protocol for 30 days straight without changing anything else. Here is what happened to my biomarkers.`,
      };
    }

    // Word-for-word spoken teleprompter voiceover script for the creator/influencer
    const hookLine = hooks.curiosity;
    let voiceoverScript = '';

    if (/cyclone|weather|storm|rain|flood|alert|earthquake|accident|disaster|warning|evacuat|coast|andhra|ndrf|breaking|police|crime|court|election|pm |minister|government/.test(lower)) {
      voiceoverScript = `${hookLine}

Severe weather advisories and official red alerts have been issued as conditions intensify rapidly across the coast. Emergency disaster response battalions and local district administrations are urging residents in vulnerable low-lying zones to follow immediate evacuation protocols and stay indoors.

Here are the three critical updates you need to know right now: First, wind speeds and rainfall intensity are projected to peak over the next twenty-four hours, threatening power lines, transportation routes, and low-lying coastal infrastructure. Second, emergency cyclone shelters, round-the-clock control room helplines, and rescue boats have been positioned on highest standby. Third, please avoid all coastal areas, secure loose outdoor objects, and keep emergency power and potable drinking water ready.

Please share this alert with family and friends in the affected regions.

Stay safe, follow verified local meteorological bulletins, and drop your area situation reports in the comments below!`;
    } else if (/game|gaming|gamer|playstation|xbox|nintendo|steam|fps|esports|speedrun|rpg|glitch|crash|confused|boss|npc|multiplayer|gta|minecraft|roblox|fortnite|elden ring|zelda/.test(lower)) {
      voiceoverScript = `${hookLine}

Most game developers program enemy AI with strict boundary checks so NPCs react predictably to player movements. But when you chain together three specific glitch mechanics—trapping the pathfinding algorithm in an infinite decision loop—the game's memory buffer completely overloads.

Watch what happened when the AI tried recalculating sixty thousand path vectors in a single frame: the frame rate dropped from one hundred twenty to zero, the textures unloaded into pure void, and the entire game client hard-crashed to desktop.

Have you ever broken a game's AI so badly it crashed? Drop your craziest game glitches below, and follow for more insane gaming experiments!`;
    } else if (/agent|coding|developer|software|programming|python|github|copilot|local llm|local model|vram|prompt|deepseek|claude|openai|chatgpt|model|benchmark|terminal|fullstack/.test(lower)) {
      voiceoverScript = `${hookLine}

For the last two years, coding assistants were just glorified tab-autocomplete. You still had to write the tests, run the terminal commands, and debug every compile error yourself.

Autonomous agents change the entire dynamic. Instead of suggesting one line of code, you give the agent a specification, and it creates the project structure, runs the test suite in a loop, reads the compiler errors, and fixes its own bugs until all tests pass—completely offline without sending proprietary company code to third-party cloud servers.

Are you running local models or still relying on cloud APIs? Drop your current developer stack below, and follow for the full benchmark breakdown!`;
    } else if (/creator|influencer|youtube|shorts|reels|tiktok|retention|algorithm|view|subscriber|monetiz|hook|script|channel/.test(lower)) {
      voiceoverScript = `${hookLine}

Over-produced talking-head videos with flashy transitions every two seconds are seeing massive retention drops. Audiences have developed ad-blindness to hyper-edited corporate content.

The top-performing videos right now follow three clear rules: First, deliver the primary payoff within the first seven seconds without a drawn-out intro. Second, format your voiceover around real audience debates rather than generic theory. Third, speak directly to a single viewer's problem rather than broadcasting to an empty room.

What is the biggest bottleneck in your content creation workflow right now? Drop your questions below, and save this breakdown for your next recording session!`;
    } else if (/movie|cinema|film|theatre|box office|tollywood|bollywood|actor|release|clash/.test(lower)) {
      voiceoverScript = `${hookLine}

Everyone online is debating the advance booking numbers, but early box office reports show a completely different story. The opening weekend screen allocation is shifting fast, and theatre owners are noticing a massive divide between single screens and multiplexes.

Here is what this means for audiences and creators: First, the hype around theatrical exclusivity is clashing with rapid four-week OTT deals. Second, regional blockbusters are taking over national screens with double the occupancy of legacy releases.

If you are planning to watch it opening weekend, check audience word-of-mouth before booking that premium ticket. 

Drop a comment with which movie you think will win this box office clash, and follow for tomorrow's live collection report!`;
    } else if (/laptop|phone|camera|display|macbook|gadget|gpu|pc|hardware|iphone|android|samsung|lenovo|dell|asus/.test(lower)) {
      voiceoverScript = `${hookLine}

Everyone is flexing the spec sheet and benchmark charts, but after real stress-testing, there are two major things reviewers are quietly glossing over.

First, under heavy video rendering and gaming loads, thermal throttling kicks in within twenty minutes, dropping clock speeds by nearly thirty percent. Second, while the build feels premium, the repairability score is dangerously low—meaning if the hinge or display ribbon fails, you are looking at an out-of-warranty replacement bill that costs almost as much as buying a new machine.

Here is the bottom line: If you are upgrading from a machine that is less than two years old, hold onto your cash. Don't be an unpaid beta tester for the first generation.

Drop your thoughts in the comments, and follow for the full forty-eight hour battery stress test!`;
    } else if (/stock|market|trade|trading|crypto|bitcoin|invest|nifty|sensex|bank|money|finance|yield/.test(lower)) {
      voiceoverScript = `${hookLine}

Retail traders are celebrating the recent green candles, but looking closely at institutional block deals, the real volume is moving somewhere completely unexpected.

Here are the three signals you need to know: First, major funds are aggressively hedging downside risk with deep out-of-the-money puts. Second, implied volatility is spiking right before the next policy announcement, which usually precedes a sharp liquidity flush. Third, smart money is rotating out of overbought momentum stocks and into high-yield debt alternatives.

The big takeaway? Do not chase this rally blindly without tight stop-losses. 

What is your strategy for this week's market open? Let me know in the comments, and follow for daily high-signal market breakdowns!`;
    } else if (/fitness|workout|gym|diet|health|longevity|fasting|cardio|zone 2/.test(lower)) {
      voiceoverScript = `${hookLine}

Most people think getting results requires grueling two-hour gym sessions that leave you completely drained. But new sports science and metabolic research proves the exact opposite.

When you train in pure Zone 2 cardio—meaning a pace where you can comfortably speak in full sentences—your mitochondria clear lactate twice as fast, burning visceral fat while protecting your joints and nervous system. You don't need expensive lactate monitors or grueling HIIT routines. Just forty-five minutes of steady brisk walking on an incline three times a week.

Try this protocol for the next twenty-one days and watch your energy levels skyrocket.

Share this with someone who hates running, and follow for more evidence-based longevity protocols!`;
    } else {
      voiceoverScript = `${hookLine}

Everyone has an opinion on ${title}, but when you look behind the scenes at what is actually driving this trend, the reality is completely unexpected.

There are two major angles to pay attention to: First, the sheer volume of organic conversation is surging because creators are tapping into an unanswered audience question. Second, the traditional advice on this topic is missing the practical, real-world application that everyday viewers are looking for.

If you are following this topic, focus on the fundamentals rather than the surface-level hype.

What is your take on ${title}? Let me know your thoughts in the comments below, and save this video for your next breakdown!`;
    }

    const finalVoiceover = cleanSpokenText(voiceoverScript);
    const words = finalVoiceover.trim().split(/\s+/).filter(Boolean).length;
    const estimatedSeconds = Math.max(30, Math.round((words / 140) * 60));

    const cleanedHooks = {
      curiosity: cleanSpokenText(hooks.curiosity),
      contrarian: cleanSpokenText(hooks.contrarian),
      story: cleanSpokenText(hooks.story),
    };

    // Hidden Production Script Outline (Beginning • Middle • End) with visual timestamps
    const scriptOutline = {
      beginning: `[0:00 - 0:05] Hook Frame: "${cleanedHooks.curiosity}"\nVisual: Fast camera zoom-in, bold dynamic text pop, dramatic impact riser sound effect.`,
      middle: `[0:05 - 0:35] Core Breakdown:\n• Point 1: The primary reason everyone is paying attention right now.\n• Point 2: The exact shift happening behind the scenes (backed by live data).\n• Point 3: The key takeaway or actionable implementation step for creators.\nVisual: Split-screen B-roll every 2.5s matching spoken words. Kinetic word-by-word captions.`,
      end: `[0:35 - 0:45] Actionable Conclusion & CTA:\n"Drop your thoughts below, and save this video so you can reference the breakdown when you plan your next project."\nVisual: High-energy creator wrap-up, animated follow button and comment prompt graphic.`,
    };

    // Formatted production prompt ready to be dispatched to ChatGPT
    const productionPrompt = `Generate a high-retention short-form video based on the following voiceover script and visual production framework:

Topic: ${title}
Category: ${resolvedCategory}
Target Format: ${format.toUpperCase()} (Vertical 9:16)
Estimated Duration: ${estimatedSeconds} seconds (${words} words)

[INFLUENCER VOICEOVER SCRIPT]:
${finalVoiceover}

[SCENE-BY-SCENE VISUAL PRODUCTION TIMESTAMPS & CUES]:
${scriptOutline.beginning}

${scriptOutline.middle}

${scriptOutline.end}

Output detailed visual prompts, B-roll recommendations from Pexels, and exact prompt parameters for AI video generators (HeyGen, Runway Gen-3, Remotion).`;

    // LinkedIn post formatted with clean spacing, problem statement, key lessons, and discussion trigger
    const linkedInPost = cleanSpokenText(`Most professionals are still approaching ${title} with outdated assumptions.\n\nOver the last 72 hours, we analyzed live discussions and engagement velocity across digital platforms. The data reveals 3 key insights:\n\n1. What worked 6 months ago is seeing 40% lower retention.\n2. High-signal, authentic breakdowns are outperforming polished corporate jargon.\n3. The winners right now focus on practical, zero-overhead execution.\n\nHere is the 3-step playbook you can implement today:\nStep 1: Audit your current workflow and remove the friction.\nStep 2: Test real audience questions before writing your final draft.\nStep 3: Prioritize velocity over perfection.\n\nAre you seeing this shift as well? Let's discuss in the comments.`);

    const hashtags = [
      `#${resolvedCategory.replace(/\s+/g, '')}`,
      `#${title.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '') || 'Trends'}`,
      '#ContentCreator',
      '#ViralGrowth',
      '#TrendPilot',
    ];

    const caption = cleanSpokenText(`Everyone is talking about ${title}, but here is the angle nobody noticed yet. Drop your questions below!`);

    const newContent: GeneratedContent = {
      id: `content-${Date.now()}`,
      topicId: isTopic?.id,
      topicTitle: title,
      category: resolvedCategory,
      format,
      whyTrending: cleanSpokenText(summaryText || (isTopic
        ? isTopic.summary
        : `Trending velocity detected across digital platforms with rising engagement metrics and community demand.`)),
      hooks: cleanedHooks,
      selectedHookIndex: 0,
      voiceoverScript: finalVoiceover,
      voiceoverWordCount: words,
      voiceoverDurationSeconds: estimatedSeconds,
      productionPrompt,
      scriptOutline,
      linkedInPost,
      caption,
      hashtags,
      recommendedLength: format === 'shorts' || format === 'reels' ? '38 - 45 seconds' : '3 - 5 minutes',
      bestPostingWindow: '6:30 PM - 8:30 PM (Peak Creator Audience)',
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'draft',
    };

    return newContent;
  }

  /**
   * Refine existing content using natural language feedback
   */
  public refineContent(content: GeneratedContent, instruction: string): GeneratedContent {
    const instr = instruction.toLowerCase();
    const updated = { ...content };

    if (instr.includes('punchier') || instr.includes('catchier') || instr.includes('hook') || instr.includes('shorter')) {
      updated.hooks = {
        curiosity: `Wait, before you scroll—${content.topicTitle} just changed forever.`,
        contrarian: `Forget everything you were told about ${content.topicTitle}. It is obsolete.`,
        story: `This one insight about ${content.topicTitle} saved me 10 hours this week.`,
      };
      updated.voiceoverScript = `Wait, before you scroll—${content.topicTitle} just changed forever.\n\nHere is what nobody is telling you: What used to take hours of manual work now happens in 60 seconds with modern AI agents.\n\nStop overcomplicating your production. Audit your bottlenecks, focus on raw authentic delivery, and execute fast.\n\nDrop your thoughts below, and follow for the full daily blueprint!`;
      updated.voiceoverWordCount = updated.voiceoverScript.trim().split(/\s+/).filter(Boolean).length;
      updated.voiceoverDurationSeconds = Math.round((updated.voiceoverWordCount / 140) * 60);
      updated.scriptOutline.beginning = `[0:00 - 0:03] Ultra-fast Hook: "${updated.hooks.curiosity}"\nVisual: High-contrast text pop, immediate sound trigger.`;
    }

    if (instr.includes('linkedin') || instr.includes('professional')) {
      updated.format = 'linkedin';
      updated.linkedInPost = `Here is why ${content.topicTitle} is critical for creators & founders right now:\n\n• Point 1: First-mover advantage is everything.\n• Point 2: Audience attention has shifted from general topics to specific tactical execution.\n• Point 3: The easiest way to scale is turning customer questions into actionable content.\n\nAgree or disagree? Share your take below.`;
    }

    if (instr.includes('cta') || instr.includes('call to action')) {
      updated.scriptOutline.end = `[0:35 - 0:45] High-Conversion CTA:\n"Comment '${content.topicTitle.split(' ')[0].toUpperCase()}' and I'll send you the exact step-by-step checklist. Make sure to follow for tomorrow's breakdown!"`;
    }

    if (instr.includes('hashtag') || instr.includes('tag')) {
      updated.hashtags = [
        ...updated.hashtags,
        '#ViralStrategy',
        '#CreatorsOfTomorrow',
        '#Innovation',
      ];
    }

    return updated;
  }

  /**
   * Parse user voice or text input into intent and parameters
   */
  public parseVoiceIntent(command: string): {
    intent: 'search_trends' | 'generate_content' | 'refine_content' | 'save_content' | 'switch_format' | 'general';
    extractedTopic?: string;
    extractedFormat?: ContentFormat;
    refinementInstruction?: string;
  } {
    const cmd = command.toLowerCase().trim();

    // Check for save intent
    if (cmd.startsWith('save') || cmd.includes('save this') || cmd.includes('save to library')) {
      return { intent: 'save_content' };
    }

    // Check for refinement
    if (
      cmd.includes('make it') ||
      cmd.includes('refine') ||
      cmd.includes('punchier') ||
      cmd.includes('shorter') ||
      cmd.includes('change hook') ||
      cmd.includes('add cta') ||
      cmd.includes('more contrarian')
    ) {
      return { intent: 'refine_content', refinementInstruction: command };
    }

    // Check for format switch
    if (cmd.includes('linkedin') || cmd.includes('reels') || cmd.includes('shorts') || cmd.includes('youtube')) {
      let format: ContentFormat = 'shorts';
      if (cmd.includes('linkedin')) format = 'linkedin';
      else if (cmd.includes('reels')) format = 'reels';
      else if (cmd.includes('long')) format = 'long-video';

      if (cmd.startsWith('switch to') || cmd.startsWith('convert to') || cmd.startsWith('change format')) {
        return { intent: 'switch_format', extractedFormat: format };
      }
    }

    // Check for explicit script generation requests
    const isExplicitScriptRequest =
      cmd.startsWith('generate script') ||
      cmd.startsWith('create script') ||
      cmd.startsWith('write script') ||
      cmd.startsWith('make a video script') ||
      cmd.includes('generate a script for') ||
      cmd.includes('create a script for') ||
      cmd.includes('write a script about') ||
      cmd.includes('write a video script');

    if (isExplicitScriptRequest) {
      let format: ContentFormat = 'shorts';
      if (cmd.includes('linkedin')) format = 'linkedin';
      else if (cmd.includes('reels')) format = 'reels';
      else if (cmd.includes('long')) format = 'long-video';

      const topicPart = cmd
        .replace(/generate a script for/gi, '')
        .replace(/generate script for/gi, '')
        .replace(/generate script/gi, '')
        .replace(/create a script for/gi, '')
        .replace(/create script for/gi, '')
        .replace(/create script/gi, '')
        .replace(/write a script for/gi, '')
        .replace(/write a script about/gi, '')
        .replace(/write script for/gi, '')
        .replace(/write script/gi, '')
        .replace(/make a video script on/gi, '')
        .replace(/make a video script/gi, '')
        .replace(/script for/gi, '')
        .replace(/script on/gi, '')
        .trim();

      return {
        intent: 'generate_content',
        extractedTopic: topicPart || 'Autonomous AI Agents',
        extractedFormat: format,
      };
    }

    // In ALL other cases (e.g. "find some interesting topics about Tollywood movies",
    // "Tollywood topics", "movies and modernized topics", "Lenovo laptop", "camera", "stock market", etc.)
    // Route to search_trends so the user sees topic cards in Trends Explorer to select from!
    const subject = extractTopicSubject(command);
    return {
      intent: 'search_trends',
      extractedTopic: subject || command,
    };
  }

  // --- CONTENT LIBRARY STORAGE MANAGEMENT ---
  public getSavedContent(): GeneratedContent[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!data) return [];
      const list: GeneratedContent[] = JSON.parse(data);
      return list.map((item) => ({
        ...item,
        voiceoverScript:
          item.voiceoverScript ||
          (item.scriptOutline?.beginning
            ? `${item.scriptOutline.beginning}\n\n${item.scriptOutline.middle}\n\n${item.scriptOutline.end}`
            : ''),
        voiceoverWordCount:
          item.voiceoverWordCount ||
          (item.voiceoverScript ? item.voiceoverScript.trim().split(/\s+/).length : 120),
        voiceoverDurationSeconds: item.voiceoverDurationSeconds || 45,
      }));
    } catch {
      return [];
    }
  }

  public saveContent(item: GeneratedContent): GeneratedContent[] {
    if (typeof window === 'undefined') return [];
    try {
      const existing = this.getSavedContent();
      const filtered = existing.filter((c) => c.id !== item.id);
      const updated = [item, ...filtered];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    } catch {
      return [];
    }
  }

  public deleteContent(id: string): GeneratedContent[] {
    if (typeof window === 'undefined') return [];
    try {
      const existing = this.getSavedContent();
      const updated = existing.filter((c) => c.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    } catch {
      return [];
    }
  }

  public updateContentStatus(id: string, status: ContentStatus): GeneratedContent[] {
    if (typeof window === 'undefined') return [];
    try {
      const existing = this.getSavedContent();
      const updated = existing.map((c) => (c.id === id ? { ...c, status } : c));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    } catch {
      return [];
    }
  }

  // --- SUPABASE & YOUTUBE CLOUD RETRIEVAL ---
  public getCachedTrends(): TrendingTopic[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(TRENDS_CACHE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public setCachedTrends(trends: TrendingTopic[]): void {
    if (typeof window === 'undefined' || !trends || trends.length === 0) return;
    try {
      localStorage.setItem(TRENDS_CACHE_KEY, JSON.stringify(trends));
    } catch (e) {
      console.warn('Failed saving trends to localStorage:', e);
    }
  }

  public async syncTrendsFromSupabase(regions: string[] = ['IN', 'US']): Promise<TrendingTopic[]> {
    let combinedTrends: TrendingTopic[] = [];
    const effectiveRegions = regions && regions.length > 0 ? regions : ['IN', 'US'];
    const isAll = effectiveRegions.includes('ALL');

    // 1. Instantly Query Supabase topics table (contains 90+ verified multi-category trends)
    if (supabase && isSupabaseConfigured) {
      try {
        let query = supabase.from('topics').select('*');
        if (!isAll) {
          query = query.in('region_code', [...effectiveRegions, 'GLOBAL']);
        }

        const { data, error } = await query
          .order('viral_score', { ascending: false, nullsFirst: false })
          .order('momentum_score', { ascending: false });

        if (!error && data && data.length > 0) {
          combinedTrends = data.map((row: any) => ({
            id: row.id,
            category: row.category,
            title: row.title,
            summary: row.summary,
            momentumScore: row.momentum_score || 85,
            growthRate: row.growth_rate || '2.4x velocity',
            platforms: row.platforms || ['youtube'],
            sourceStats: row.source_stats || {
              views: row.views_count || 'Verified Trend',
              upvotes: 'Fresh Discussion',
              crossPlatformProof: row.viral_score ? `${row.viral_score}/100 viral score` : 'Validated on Supabase PostgreSQL',
            },
            audienceQuestions:
              row.audience_questions && row.audience_questions.length > 0
                ? row.audience_questions
                : [
                    `What makes ${row.title.slice(0, 38)} outperform its channel benchmark?`,
                    `How can creators adapt this hook into a high-retention Short?`,
                  ],
            regionCode: row.region_code || 'US',
            regionName: getRegionName(row.region_code || 'US'),
            thumbnailUrl: row.thumbnail_url || undefined,
            videoUrl: row.video_url || undefined,
            channelTitle: row.channel_title || undefined,
            channelId: row.channel_id || undefined,
            viralScore: row.viral_score ? Number(row.viral_score) : (row.momentum_score || 80),
            outlierRatio: row.outlier_ratio ? Number(row.outlier_ratio) : undefined,
            reachRatio: row.reach_ratio ? Number(row.reach_ratio) : null,
            velocityRatio: row.velocity_ratio ? Number(row.velocity_ratio) : null,
            label: row.label || (row.viral_score >= 70 ? 'Viral breakout' : 'Strong performer'),
            isOutsiderBreakout: Boolean(row.is_outsider_breakout),
            confidence: row.confidence || 'standard',
            publishedAt: row.published_at || undefined,
          }));

          // Update local cache with complete database trends
          this.setCachedTrends(combinedTrends);
        }
      } catch (err) {
        console.warn('Supabase topics query failed:', err);
      }
    }

    // 2. If database query returned valid topics, return them immediately (zero latency)
    if (combinedTrends.length > 0) {
      // Optional background sync if volume is low
      if (combinedTrends.length < 25 && youtubeService.isConfigured()) {
        youtubeService
          .fetchMultiCategoryTrends(
            ['Tech & AI', 'Creator Economy', 'Gaming', 'Fitness & Health', 'Productivity & Work'],
            effectiveRegions
          )
          .catch(() => {});
      }
      return combinedTrends;
    }

    // 3. Fallback to localStorage cache if network/Supabase was temporarily unreachable
    const cached = this.getCachedTrends();
    if (cached.length > 0) {
      return cached;
    }

    // 4. Default to initial seed constants
    return INITIAL_TRENDING_TOPICS;
  }

  public async syncSavedContentFromSupabase(): Promise<GeneratedContent[]> {
    if (supabase && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('suggestions')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((row: any) => ({
            id: row.id,
            topicTitle: row.topic_title,
            category: row.category,
            format: row.format,
            whyTrending: row.why_trending,
            hooks: row.hooks || {},
            selectedHookIndex: 0,
            voiceoverScript: row.voiceover_script || (row.script_outline?.beginning ? `${row.script_outline.beginning}\n\n${row.script_outline.middle}\n\n${row.script_outline.end}` : ''),
            voiceoverWordCount: row.voiceover_word_count,
            voiceoverDurationSeconds: row.voiceover_duration_seconds,
            productionPrompt: row.production_prompt,
            scriptOutline: row.script_outline || {},
            linkedInPost: row.linkedin_post,
            caption: row.caption,
            hashtags: row.hashtags || [],
            recommendedLength: row.recommended_length || '40 seconds',
            bestPostingWindow: row.best_posting_window || 'Peak Evening',
            createdAt: new Date(row.created_at).toLocaleDateString(),
            status: row.status || 'draft',
            notes: row.notes,
          }));
        }
      } catch (err) {
        console.warn('Supabase suggestions query failed, falling back to local storage:', err);
      }
    }
    return this.getSavedContent();
  }

  public async persistContentToSupabase(item: GeneratedContent): Promise<void> {
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('suggestions').upsert({
          id: item.id.startsWith('content-') ? undefined : item.id,
          topic_title: item.topicTitle,
          category: item.category,
          format: item.format,
          why_trending: item.whyTrending,
          hooks: item.hooks,
          script_outline: item.scriptOutline,
          linkedin_post: item.linkedInPost,
          caption: item.caption,
          hashtags: item.hashtags,
          recommended_length: item.recommendedLength,
          best_posting_window: item.bestPostingWindow,
          status: item.status,
          notes: item.notes,
        });
      } catch (err) {
        console.warn('Could not persist to Supabase:', err);
      }
    }
  }

  public async updateStatusInSupabase(id: string, status: string): Promise<void> {
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('suggestions').update({ status }).eq('id', id);
      } catch (err) {
        console.warn('Could not update status in Supabase:', err);
      }
    }
  }

  public async deleteContentFromSupabase(id: string): Promise<void> {
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('suggestions').delete().eq('id', id);
      } catch (err) {
        console.warn('Could not delete from Supabase:', err);
      }
    }
  }
}

export const aiEngine = new AIContentEngine();
