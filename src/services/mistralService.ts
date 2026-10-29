import { GeneratedContent, ContentFormat } from '../types/workspace';

export const MISTRAL_API_KEY =
  ((import.meta as any).env && (import.meta as any).env.VITE_MISTRAL_API_KEY) || '';

const MISTRAL_STORAGE_KEY = 'trendpilot_mistral_api_key';
const EDGE_FUNCTION_URL =
  'https://unowbqmjwzofklnhbkbc.supabase.co/functions/v1/generate-voiceover-script';

/**
 * Cleans spoken text by removing markdown bold/italics, headers, and avoiding hyphens/dashes.
 * Replaces em-dashes and spaced hyphens with natural pauses (commas) for smooth teleprompter reading.
 */
export function cleanSpokenText(str: string): string {
  if (!str) return '';
  return str
    // Strip bold and italics markdown syntax
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/___(.*?)___/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/[*_#]/g, '')
    // Replace em-dashes and en-dashes with natural spoken pauses
    .replace(/[—–]/g, ', ')
    // Replace spaced hyphens with comma pauses
    .replace(/\s+-\s+/g, ', ')
    // Strip bullet dashes at line starts
    .replace(/^[-•*]\s+/gm, '')
    // Replace hyphen in compound words with space (e.g. real-time -> real time, game-changer -> game changer)
    .replace(/([a-zA-Z0-9])-([a-zA-Z0-9])/g, '$1 $2')
    // Strip any remaining hyphens/dashes
    .replace(/[-—–]/g, ' ')
    // Clean redundant commas or awkward spacing
    .replace(/,\s*,+/g, ',')
    .replace(/\s+,/g, ',')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export interface GenerateScriptParams {
  topicTitle: string;
  category?: string;
  format?: ContentFormat;
  summary?: string;
  audienceQuestions?: string[];
  targetAudience?: string;
  userApiKey?: string;
  model?: string;
}

export class MistralService {
  public getKey(): string {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(MISTRAL_STORAGE_KEY);
      if (stored && stored.trim().length > 0) return stored.trim();
    }
    return MISTRAL_API_KEY;
  }

  public saveKey(key: string): void {
    if (typeof window !== 'undefined') {
      if (key && key.trim()) {
        localStorage.setItem(MISTRAL_STORAGE_KEY, key.trim());
      } else {
        localStorage.removeItem(MISTRAL_STORAGE_KEY);
      }
    }
  }

  public isConfigured(): boolean {
    const k = this.getKey();
    return Boolean(k && k.trim().length > 10);
  }

  /**
   * Generates a topic-grounded, high-retention voiceover script via Mistral AI.
   * Calls Supabase Edge Function first, and falls back to direct Mistral API if needed.
   */
  public async generateVoiceoverScript(params: GenerateScriptParams): Promise<GeneratedContent> {
    const {
      topicTitle,
      category = 'General',
      format = 'shorts',
      summary = '',
      audienceQuestions = [],
      targetAudience = 'General Audience',
      userApiKey,
      model = 'ministral-8b-latest',
    } = params;

    const apiKey = (userApiKey || this.getKey()).trim();

    // 1. First Attempt: Supabase Edge Function
    try {
      const edgeRes = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          topicTitle,
          category,
          format,
          summary,
          audienceQuestions,
          targetAudience,
          mistralApiKey: apiKey,
          model,
        }),
      });

      if (edgeRes.ok) {
        const data = await edgeRes.json();
        return this.formatGeneratedContent(data, topicTitle, category, format, data.modelUsed || model);
      }

      const errData = await edgeRes.json().catch(() => ({}));
      if (errData?.code === 'MISSING_MISTRAL_KEY' && !apiKey) {
        throw new Error(
          'MISTRAL_KEY_REQUIRED: Please enter your Mistral API key to generate an AI voiceover script.'
        );
      }

      // If Edge function failed with other error and we have an apiKey, fall through to direct call
      if (!apiKey) {
        throw new Error(errData?.error || 'Mistral API key required.');
      }
    } catch (err: any) {
      if (err?.message?.startsWith('MISTRAL_KEY_REQUIRED')) {
        throw err;
      }
      if (!apiKey) {
        throw new Error('Please enter your Mistral API key to generate accurate AI scripts.');
      }
      console.warn('Edge function notice, falling back to direct Mistral API call:', err);
    }

    // 2. Second Attempt: Direct Mistral API call
    return await this.callMistralDirectly(params, apiKey);
  }

  private async callMistralDirectly(
    params: GenerateScriptParams,
    apiKey: string
  ): Promise<GeneratedContent> {
    const {
      topicTitle,
      category = 'General',
      format = 'shorts',
      summary = '',
      audienceQuestions = [],
      targetAudience = 'General Audience',
      model = 'ministral-8b-latest',
    } = params;

    const systemPrompt = `You are TrendPilot's elite viral content strategist and voiceover scriptwriter for short-form video creators.
Your task is to generate an authentic, topic-grounded, high-retention voiceover script specifically tailored to the given topic.

CRITICAL RULES:
1. TOPIC ACCURACY: The script MUST be 100% about the actual title and subject provided.
   - If the title is about a storm or natural event (e.g., "Cyclone Arnab Intensifies: Andhra Coast on Alert!"), the voiceover MUST discuss the cyclone, wind intensity, coastal impact, evacuation advisories, and disaster relief.
   - If the title is about Gaming, write about the game, mechanics, or glitch.
   - If the title is about Technology or AI, write about the technical breakthrough or tool.
   - If the title is about Business or Finance, write about the market movement or money strategies.
   NEVER output generic corporate advice, video editing theory, or retention tactics unless the title is specifically about video editing!
2. SPOKEN-WORD VOICE-FIRST FORMAT: Write natural, punchy sentences formatted for an influencer or speaker talking directly into the camera. No corporate buzzwords. No visual stage directions embedded inside the voiceover text.
3. ZERO MARKDOWN FORMATTING & NO DASHES:
   - DO NOT use markdown bold (**text**), italics (*text* or _text_), or heading markers (#).
   - DO NOT use hyphens, em-dashes, or en-dashes ('-', '—', '–'). Replace pauses with natural commas or periods.
   - DO NOT use bullet dashes. Write in pure spoken plain text only.
4. TIMING & PACING: Keep the voiceover script between 90 and 130 words (approx 35 to 45 seconds of natural, confident speech).
5. THREE DISTINCT HOOKS:
   - curiosity: A scroll-stopping opening line sparking intense curiosity about this specific event.
   - contrarian: A challenging or eye-opening angle debunking a common misconception or sharing an urgent alert.
   - story: A dramatic or urgent narrative hook drawing the listener in immediately.
6. JSON STRUCTURE: You MUST return a single valid JSON object with these exact keys:
{
  "whyTrending": "1-2 sentences explaining why this specific topic is surging in attention",
  "hooks": {
    "curiosity": "...",
    "contrarian": "...",
    "story": "..."
  },
  "voiceoverScript": "Paragraph 1\\n\\nParagraph 2\\n\\nParagraph 3",
  "scriptOutline": {
    "beginning": "[0:00 - 0:05] Hook Frame: ...\\nVisual: ...",
    "middle": "[0:05 - 0:35] Core Breakdown: ...\\nVisual: ...",
    "end": "[0:35 - 0:45] Actionable Takeaway & Call to Action: ...\\nVisual: ..."
  },
  "linkedInPost": "Professional short-form breakdown formatted with bullet points",
  "caption": "Short viral Instagram/YouTube caption (2-3 sentences)",
  "hashtags": ["#Tag1", "#Tag2", "#Tag3", "#Tag4", "#Tag5"],
  "recommendedLength": "38 - 45 seconds",
  "bestPostingWindow": "Peak Evening / Breaking"
}`;

    const userPrompt = `Topic Title: "${topicTitle}"
Category: ${category}
Target Format: ${format.toUpperCase()} (Vertical Short-Form 9:16)
Audience: ${targetAudience}
${summary ? `Context/Summary: ${summary}` : ''}
${audienceQuestions && audienceQuestions.length > 0 ? `Key Audience Questions:\n- ${audienceQuestions.join('\n- ')}` : ''}

Generate a complete, high-retention, fully grounded viral content package in pure JSON format following all rules.`;

    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'mistral-small-latest',
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      let errJson: any = {};
      try {
        errJson = JSON.parse(errText);
      } catch {
        errJson = { message: errText };
      }
      throw new Error(errJson?.message || errJson?.error?.message || `Mistral returned status ${res.status}`);
    }

    const data = await res.json();
    const rawText = data.choices?.[0]?.message?.content || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const cleaned = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
      parsed = JSON.parse(cleaned);
    }

    return this.formatGeneratedContent(parsed, topicTitle, category, format, data.model || model);
  }

  private formatGeneratedContent(
    data: any,
    topicTitle: string,
    category: string,
    format: ContentFormat,
    modelUsed: string = 'mistral-small-latest'
  ): GeneratedContent {
    const script = cleanSpokenText(data.voiceoverScript || '');
    const words = script.trim().split(/\s+/).filter(Boolean).length;
    const durationSeconds = Math.max(30, Math.round((words / 140) * 60));

    const cleanedHooks = {
      curiosity: cleanSpokenText(data.hooks?.curiosity || `Wait, before you scroll, ${topicTitle} just changed everything.`),
      contrarian: cleanSpokenText(data.hooks?.contrarian || `Here is the truth about ${topicTitle} that nobody is talking about.`),
      story: cleanSpokenText(data.hooks?.story || `What happened with ${topicTitle} caught everyone completely off guard.`),
    };

    const linkedInCleaned = cleanSpokenText(data.linkedInPost || '');
    const captionCleaned = cleanSpokenText(data.caption || '');
    const whyTrendingCleaned = cleanSpokenText(data.whyTrending || `${topicTitle} is experiencing breakout search volume.`);

    const scriptOutline = data.scriptOutline || {
      beginning: `[0:00 - 0:05] Hook Frame: "${cleanedHooks.curiosity}"\nVisual: High-impact headline graphic and dramatic camera zoom.`,
      middle: `[0:05 - 0:35] Core Breakdown\nVisual: Relevant B-roll footage and animated kinetic captions matching spoken words.`,
      end: `[0:35 - 0:45] Actionable Conclusion & CTA\nVisual: High-energy presenter sign-off and follow button animation.`,
    };

    const productionPrompt = `Generate a high-retention short-form video based on the following voiceover script and visual production framework:

Topic: ${topicTitle}
Category: ${category}
Target Format: ${format.toUpperCase()} (Vertical 9:16)
Estimated Duration: ${durationSeconds} seconds (${words} words)
AI Model: Mistral AI (${data.modelUsed || modelUsed})

[INFLUENCER VOICEOVER SCRIPT]:
${script}

[SCENE-BY-SCENE VISUAL PRODUCTION TIMESTAMPS & CUES]:
${scriptOutline.beginning}

${scriptOutline.middle}

${scriptOutline.end}

Output detailed visual prompts, B-roll recommendations from Pexels, and exact prompt parameters for AI video generators (HeyGen, Runway Gen-3, Remotion).`;

    return {
      id: `content-mistral-${Date.now()}`,
      topicTitle,
      category,
      format,
      whyTrending: whyTrendingCleaned,
      hooks: cleanedHooks,
      selectedHookIndex: 0,
      voiceoverScript: script,
      voiceoverWordCount: words,
      voiceoverDurationSeconds: durationSeconds,
      productionPrompt,
      scriptOutline,
      linkedInPost: linkedInCleaned,
      caption: captionCleaned,
      hashtags: data.hashtags || ['#Trending', '#Viral', '#Breakout'],
      recommendedLength: data.recommendedLength || `${durationSeconds} seconds`,
      bestPostingWindow: data.bestPostingWindow || 'Peak Evening',
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'draft',
      isMistralGenerated: true,
      modelUsed: data.modelUsed || modelUsed,
    };
  }
}

export const mistralService = new MistralService();

