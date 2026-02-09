import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JOGGAI_API_URL = "https://api.jogg.ai/v2";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const JOGGAI_API_KEY = Deno.env.get("JOGGAI_API_KEY");
    if (!JOGGAI_API_KEY) {
      throw new Error("JOGGAI_API_KEY is not configured");
    }

    const body = await req.json();
    const { action } = body;

    // Handle different actions
    switch (action) {
      case "create_video":
        return await createVideo(body, JOGGAI_API_KEY);
      case "check_status":
        return await checkVideoStatus(body.videoId, JOGGAI_API_KEY);
      case "get_avatars":
        return await getAvatars(JOGGAI_API_KEY);
      case "get_voices":
        return await getVoices(JOGGAI_API_KEY);
      case "whoami":
        return await whoami(JOGGAI_API_KEY);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: any) {
    console.error("JoggAI Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});

async function createVideo(body: any, apiKey: string) {
  const {
    script,
    avatarId = 412,       // Default avatar ID
    avatarType = 0,       // 0 = public avatar
    voiceId = "en-US-ChristopherNeural",  // Default voice
    aspectRatio = "landscape",  // landscape for podcast format
    screenStyle = 1,      // 1 = full screen
    caption = true,       // Enable subtitles
    videoName,
    webhookUrl,
  } = body;

  if (!script) {
    throw new Error("Script is required");
  }

  console.log("Creating JoggAI video with script:", script.substring(0, 100) + "...");

  const requestBody: any = {
    avatar: {
      avatar_id: avatarId,
      avatar_type: avatarType,
    },
    voice: {
      type: "script",
      voice_id: voiceId,
      script: script,
    },
    aspect_ratio: aspectRatio,
    screen_style: screenStyle,
    caption: caption,
  };

  if (videoName) {
    requestBody.video_name = videoName;
  }

  if (webhookUrl) {
    requestBody.webhook_url = webhookUrl;
  }

  const response = await fetch(`${JOGGAI_API_URL}/create_video_from_avatar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();
  console.log("JoggAI create video response:", data);

  if (data.code !== 0) {
    throw new Error(data.msg || "Failed to create video");
  }

  return new Response(
    JSON.stringify({
      success: true,
      videoId: data.data.video_id,
      message: "Video creation started. Processing takes 2-5 minutes.",
    }),
    { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }
  );
}

async function checkVideoStatus(videoId: string, apiKey: string) {
  if (!videoId) {
    throw new Error("Video ID is required");
  }

  console.log("Checking video status for:", videoId);

  const response = await fetch(`${JOGGAI_API_URL}/avatar_video/${videoId}`, {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
    },
  });

  const data = await response.json();
  console.log("JoggAI status response:", data);

  if (data.code !== 0) {
    throw new Error(data.msg || "Failed to check video status");
  }

  return new Response(
    JSON.stringify({
      success: true,
      videoId: data.data.video_id,
      status: data.data.status,
      videoUrl: data.data.video_url,
      coverUrl: data.data.cover_url,
      createdAt: data.data.created_at,
    }),
    { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }
  );
}

async function getAvatars(apiKey: string) {
  console.log("Fetching public avatars...");

  const response = await fetch(`${JOGGAI_API_URL}/avatars/public`, {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
    },
  });

  const data = await response.json();
  
  if (data.code !== 0) {
    throw new Error(data.msg || "Failed to fetch avatars");
  }

  return new Response(
    JSON.stringify({
      success: true,
      avatars: data.data,
    }),
    { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }
  );
}

async function getVoices(apiKey: string) {
  console.log("Fetching available voices...");

  const response = await fetch(`${JOGGAI_API_URL}/voices`, {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
    },
  });

  const data = await response.json();
  
  if (data.code !== 0) {
    throw new Error(data.msg || "Failed to fetch voices");
  }

  return new Response(
    JSON.stringify({
      success: true,
      voices: data.data,
    }),
    { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }
  );
}

async function whoami(apiKey: string) {
  console.log("Checking API key...");

  const response = await fetch(`${JOGGAI_API_URL}/user/whoami`, {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
    },
  });

  const data = await response.json();
  
  if (data.code !== 0) {
    throw new Error(data.msg || "Invalid API key");
  }

  return new Response(
    JSON.stringify({
      success: true,
      user: data.data,
    }),
    { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }
  );
}
