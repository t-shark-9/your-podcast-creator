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
    
    const { 
      prompt, 
      model, 
      aspectRatio = "16:9", 
      duration = 10,
      avatarId = 412,
      avatarType = 0,
      voiceId = "MFZUKuGQUsGJPQjTS4wC"
    } = await req.json();

    if (!prompt) {
      throw new Error("Prompt is required");
    }

    console.log(`Generating ${model} video with prompt:`, prompt.substring(0, 100));

    // Try JoggAI first for avatar-based videos
    if (JOGGAI_API_KEY) {
      try {
        const requestBody = {
          avatar: {
            avatar_id: avatarId,
            avatar_type: avatarType,
          },
          voice: {
            type: "script",
            voice_id: voiceId,
            input: prompt,
          },
          aspect_ratio: aspectRatio,
          caption: true,
        };
        
        console.log("JoggAI request:", JSON.stringify(requestBody, null, 2));
        
        const response = await fetch(`${JOGGAI_API_URL}/avatar`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": JOGGAI_API_KEY,
          },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();
        console.log("JoggAI response:", JSON.stringify(data, null, 2));
        
        if (data.code === 0 && data.data?.project_id) {
          console.log("JoggAI video creation started:", data.data.project_id);
          return new Response(
            JSON.stringify({
              success: true,
              videoId: data.data.project_id,
              provider: "joggai",
              message: "Video generation started. Processing takes 2-5 minutes."
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          console.error("JoggAI returned error:", data.msg || "Unknown error");
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
