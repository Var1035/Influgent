const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function sanitizeText(str: string): string {
  if (!str) return "";
  return str
    .replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu,
      ""
    )
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
    if (!YOUTUBE_API_KEY) {
      throw new Error("YOUTUBE_API_KEY secret is missing in Supabase.");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Category mapping: 28 (Tech), 24 (Creator/Entertainment), 17 (Sports/Fitness), 20 (Gaming)
    const categoryConfigs = [
      { name: "Tech & AI", id: "28" },
      { name: "Creator Economy", id: "24" },
      { name: "Fitness & Health", id: "17" },
      { name: "Gaming", id: "20" },
    ];

    let totalSynced = 0;
    const syncedTopics: string[] = [];

    for (const cat of categoryConfigs) {
      try {
        // Fetch 25 videos per category (4 categories x 25 = 100 total videos per daily sync)
        const ytUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics,liveStreamingDetails&chart=mostPopular&videoCategoryId=${cat.id}&regionCode=US&maxResults=25&key=${YOUTUBE_API_KEY}`;
        const ytRes = await fetch(ytUrl);
        if (!ytRes.ok) continue;

        const ytData = await ytRes.json();
        const items = ytData.items || [];

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const snippet = item.snippet || {};

          // Exclude YouTube live videos and live streams (only Shorts and on-demand videos)
          const liveContent = (snippet.liveBroadcastContent || "").toLowerCase();
          if (
            item.liveStreamingDetails !== undefined && item.liveStreamingDetails !== null ||
            liveContent === "live" ||
            liveContent === "upcoming"
          ) {
            continue;
          }

          const stats = item.statistics || {};
          const viewsNum = parseInt(stats.viewCount || "0", 10);
          const score = Math.max(75, 96 - i * 4);
          const cleanTitle = sanitizeText(snippet.title || "Viral Video");
          const cleanDesc = sanitizeText(snippet.description || "");

          const payload = {
            category: cat.name,
            title: cleanTitle,
            summary: cleanDesc ? cleanDesc.slice(0, 160) + "..." : `Trending video in ${cat.name}`,
            momentum_score: score,
            growth_rate: "velocity pending",
            platforms: ["youtube"],
            audience_questions: [
              `What is the main takeaway from "${cleanTitle.slice(0, 45)}"?`,
              "How can creators make content inspired by this?"
            ]
          };

          // Record snapshot in post_snapshots for velocity tracking
          if (item.id && viewsNum > 0) {
            try {
              await fetch(`${SUPABASE_URL}/rest/v1/post_snapshots`, {
                method: "POST",
                headers: {
                  "apikey": SUPABASE_SERVICE_ROLE_KEY,
                  "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  video_id: item.id,
                  views: viewsNum,
                  captured_at: new Date().toISOString()
                })
              });
            } catch {
              // ignore snapshot failure
            }
          }

          // Post directly to Supabase REST API (upsert on title)
          const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/topics?on_conflict=title`, {
            method: "POST",
            headers: {
              "apikey": SUPABASE_SERVICE_ROLE_KEY,
              "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              "Content-Type": "application/json",
              "Prefer": "resolution=merge-duplicates"
            },
            body: JSON.stringify(payload)
          });

          if (dbRes.ok) {
            totalSynced++;
            syncedTopics.push(payload.title);
          }
        }
      } catch (err) {
        console.error(`Error processing ${cat.name}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Edge Function synced ${totalSynced} YouTube trends directly into Supabase topics!`,
        syncedCount: totalSynced,
        sample: syncedTopics.slice(0, 3)
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});
