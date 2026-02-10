import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const JOGGAI_API_URL = "https://api.jogg.ai/v2";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const JOGGAI_API_KEY = Deno.env.get("JOGGAI_API_KEY");
    const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
    
    const { prompt, model, aspectRatio = "16:9", duration = 10 } = await req.json();

    if (!prompt) {
      throw new Error("Prompt is required");
    }

    console.log(`Generating ${model} video with prompt:`, prompt.substring(0, 100));

    // Try JoggAI first for avatar-based videos
    if (JOGGAI_API_KEY) {
      try {
        const response = await fetch(`${JOGGAI_API_URL}/create_video_from_avatar`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": JOGGAI_API_KEY,
          },
          body: JSON.stringify({
            avatar: {
              avatar_id: 412,
              avatar_type: 0,
            },
            voice: {
              type: "script",
              voice_id: "MFZUKuGQUsGJPQjTS4wC",
              script: prompt,
            },
            aspect_ratio: aspectRatio === "16:9" ? "landscape" : aspectRatio === "9:16" ? "portrait" : "square",
            screen_style: 1,
            caption: true,
            video_name: `Ad Video - ${new Date().toISOString()}`,
          }),
        });

        const data = await response.json();
        
        if (data.code === 0 && data.data?.video_id) {
          console.log("JoggAI video creation started:", data.data.video_id);
          return new Response(
            JSON.stringify({
              success: true,
              videoId: data.data.video_id,
              provider: "joggai",
              message: "Video generation started. Processing takes 2-5 minutes."
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (joggError) {
        console.error("JoggAI error, trying fallback:", joggError);
      }
    }

    // Try Replicate for video generation
    if (REPLICATE_API_KEY) {
      const Replicate = (await import("https://esm.sh/replicate@0.25.2")).default;
      const replicate = new Replicate({ auth: REPLICATE_API_KEY });

      // Use minimax/video-01 for text-to-video generation (no version = latest)
      const prediction = await replicate.predictions.create({
        model: "minimax/video-01",
        input: {
          prompt: prompt,
          prompt_optimizer: true,
        },
      });

      console.log("Replicate prediction started:", prediction.id);

      return new Response(
        JSON.stringify({
          success: true,
          predictionId: prediction.id,
          provider: "replicate",
          message: "Video generation started via Replicate."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No API keys available - return demo video
    console.log("No video API available, returning demo");
    return new Response(
      JSON.stringify({
        success: true,
        videoUrl: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4",
        provider: "demo",
        message: "Demo video returned (no API keys configured)"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error generating video:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
