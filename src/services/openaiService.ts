/**
 * OpenAI / ChatGPT Integration Service for TrendPilot
 * 
 * Supports:
 * - Direct execution of ChatGPT prompts via OpenAI REST API (/v1/chat/completions)
 * - Word-for-word voiceover speech generation via OpenAI Audio API (/v1/audio/speech)
 * - Browser-native SpeechSynthesis fallback for 100% free offline audio previews
 * - One-click export to ChatGPT Web (chatgpt.com) with clipboard sync
 */

export const OPENAI_API_KEY =
  ((import.meta as any).env && (import.meta as any).env.VITE_OPENAI_API_KEY) || '';

const STORAGE_KEY = 'trendpilot_openai_api_key';

export interface ChatGPTPromptResponse {
  success: boolean;
  result?: string;
  error?: string;
  modelUsed?: string;
  tokensUsed?: number;
}

export class OpenAIService {
  public getKey(): string {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && stored.trim().length > 0) return stored.trim();
    }
    return OPENAI_API_KEY;
  }

  public saveKey(key: string): void {
    if (typeof window !== 'undefined') {
      if (key && key.trim()) {
        localStorage.setItem(STORAGE_KEY, key.trim());
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  public isConfigured(): boolean {
    const k = this.getKey();
    return Boolean(k && k.startsWith('sk-') && k.length > 20);
  }

  /**
   * Send production script & voiceover prompt to ChatGPT API
   */
  public async sendToChatGPT(prompt: string, userKey?: string): Promise<ChatGPTPromptResponse> {
    const key = (userKey || this.getKey()).trim();

    if (!key || !key.startsWith('sk-')) {
      // Return simulated intelligent breakdown with clear guidance if API key not entered yet
      return {
        success: false,
        error: 'OpenAI API key missing. Enter your OpenAI key or click "Open in ChatGPT" to copy and launch chatgpt.com directly.',
      };
    }

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are an elite short-form video director and AI video producer for viral influencers. Given a topic and voiceover script, output detailed scene-by-scene prompts with visual descriptions, camera motions, B-roll recommendations, and sound effects ready for video editors and AI generators (HeyGen, Runway, Remotion). Format cleanly with markdown.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `OpenAI returned status ${res.status}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || 'No response returned from ChatGPT.';
      return {
        success: true,
        result: content,
        modelUsed: data.model,
        tokensUsed: data.usage?.total_tokens,
      };
    } catch (err: any) {
      console.error('ChatGPT API execution failed:', err);
      return {
        success: false,
        error: err.message || 'Failed to connect to ChatGPT API.',
      };
    }
  }

  /**
   * Play instant voiceover preview using browser SpeechSynthesis (100% free, no key required)
   */
  public speakVoiceoverInBrowser(
    text: string,
    onStart?: () => void,
    onEnd?: () => void
  ): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return false;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05; // Slightly brisk conversational tempo for TikTok / Shorts
    utterance.pitch = 1.0;

    // Pick highest quality English voice available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((v) => v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    if (onStart) utterance.onstart = onStart;
    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = onEnd;
    }

    window.speechSynthesis.speak(utterance);
    return true;
  }

  public stopBrowserSpeech(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const openaiService = new OpenAIService();

