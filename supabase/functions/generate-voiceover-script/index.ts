import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestPayload {
  topicTitle: string;
  category?: string;
  format?: string;
  summary?: string;
  audienceQuestions?: string[];
  targetAudience?: string;
  mistralApiKey?: string;
  model?: string;
}

/**
 * Cleans spoken text by removing markdown bold/italics, headers, and avoiding hyphens/dashes.
 * Replaces em-dashes and spaced hyphens with natural pauses (commas) for smooth teleprompter reading.
 */
function cleanSpokenText(str: string): string {
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

Deno.serve(async (req: Request) => {
  // Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: RequestPayload = await req.json();
    const {
      topicTitle,
      category = "General",
      format = "shorts",
      summary = "",
      audienceQuestions = [],
      targetAudience = "General Audience",
      model = "ministral-8b-latest",
    } = payload;

    if (!topicTitle || !topicTitle.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing required field: topicTitle" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve Mistral API Key: request body, Authorization header, or Supabase secret
    const authHeader = req.headers.get("Authorization") || "";
    let bearerKey = "";
    if (authHeader.startsWith("Bearer ") && !authHeader.includes("eyJ")) {
      bearerKey = authHeader.replace("Bearer ", "").trim();
    }

    const apiKey =
      payload.mistralApiKey?.trim() ||
      bearerKey ||
      Deno.env.get("MISTRAL_API_KEY")?.trim();

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "Mistral API key is missing. Please provide your Mistral API key.",
          code: "MISSING_MISTRAL_KEY",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are TrendPilot's elite viral content strategist and voiceover scriptwriter for short-form video creators.
Your task is to generate an authentic, topic-grounded, high-retention voiceover script specifically tailored to the given topic.

CRITICAL RULES:
1. TOPIC ACCURACY & CONTEXT GROUNDING: The script MUST be 100% about the actual title and subject provided.
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
${summary ? `Context/Summary: ${summary}` : ""}
${audienceQuestions && audienceQuestions.length > 0 ? `Key Audience Questions:\n- ${audienceQuestions.join("\n- ")}` : ""}

Generate a complete, high-retention, fully grounded viral content package in pure JSON format following all rules.`;

    // Call Mistral API with automatic rate-limit fallback
    let targetModel = model || "ministral-8b-latest";
    let mistralResponse = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: targetModel,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    // Auto-fallback if the first model encounters 429
    if (mistralResponse.status === 429 && targetModel !== "ministral-8b-latest") {
      targetModel = "ministral-8b-latest";
      mistralResponse = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: targetModel,
          temperature: 0.7,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });
    }

    if (!mistralResponse.ok) {
      const errorText = await mistralResponse.text();
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      return new Response(
        JSON.stringify({
          error: errorData.message || errorData.error?.message || "Mistral API request failed",
          status: mistralResponse.status,
          details: errorData,
        }),
        {
          status: mistralResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const mistralData = await mistralResponse.json();
    const rawContent = mistralData.choices?.[0]?.message?.content || "{}";

    let parsedContent: any;
    try {
      parsedContent = JSON.parse(rawContent);
    } catch {
      // Clean possible markdown code fences if present
      const cleaned = rawContent.replace(/```json/gi, "").replace(/```/gi, "").trim();
      parsedContent = JSON.parse(cleaned);
    }

    const script = cleanSpokenText(parsedContent.voiceoverScript || "");
    const words = script.trim().split(/\s+/).filter(Boolean).length;
    const durationSeconds = Math.max(30, Math.round((words / 140) * 60));

    const cleanedHooks = {
      curiosity: cleanSpokenText(parsedContent.hooks?.curiosity || `Wait, before you scroll, ${topicTitle} just changed everything.`),
      contrarian: cleanSpokenText(parsedContent.hooks?.contrarian || `Here is the truth about ${topicTitle} that nobody is telling you.`),
      story: cleanSpokenText(parsedContent.hooks?.story || `This update on ${topicTitle} caught everyone completely off guard.`),
    };

    const linkedInCleaned = cleanSpokenText(parsedContent.linkedInPost || "");
    const captionCleaned = cleanSpokenText(parsedContent.caption || "");
    const whyTrendingCleaned = cleanSpokenText(parsedContent.whyTrending || `${topicTitle} is experiencing breakout search volume.`);

    return new Response(
      JSON.stringify({
        success: true,
        topicTitle,
        category,
        format,
        whyTrending: whyTrendingCleaned,
        hooks: cleanedHooks,
        voiceoverScript: script,
        voiceoverWordCount: words,
        voiceoverDurationSeconds: durationSeconds,
        scriptOutline: parsedContent.scriptOutline || {
          beginning: "[0:00 - 0:05] Hook Frame\nVisual: Fast dynamic zoom-in and dramatic headline graphic.",
          middle: "[0:05 - 0:35] Core Breakdown\nVisual: B-roll footage and kinetic on-screen captions.",
          end: "[0:35 - 0:45] Actionable Conclusion\nVisual: Creator sign-off and follow button animation.",
        },
        linkedInPost: linkedInCleaned,
        caption: captionCleaned,
        hashtags: parsedContent.hashtags || ["#Trending", "#Viral", "#Breakout"],
        recommendedLength: parsedContent.recommendedLength || `${durationSeconds} seconds`,
        bestPostingWindow: parsedContent.bestPostingWindow || "Peak Evening",
        modelUsed: mistralData.model || targetModel,
        createdAt: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

