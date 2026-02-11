import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const JOGGAI_API_URL = "https://api.jogg.ai/v2";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { endpoint, method = "GET", payload, apiKey } = body;

    // Use user-provided key or fall back to server env
    const joggApiKey =
      apiKey || Deno.env.get("JOGGAI_API_KEY");
    if (!joggApiKey) {
      throw new Error("JoggAI API Key not configured");
    }

    if (!endpoint) {
      throw new Error("endpoint is required");
    }

    console.log(`JoggAI proxy: ${method} ${endpoint}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        "x-api-key": joggApiKey,
        "Content-Type": "application/json",
      },
    };

    if (method !== "GET" && payload) {
      fetchOptions.body = JSON.stringify(payload);
    }

    const response = await fetch(`${JOGGAI_API_URL}${endpoint}`, fetchOptions);
    const data = await response.json();

    console.log(`JoggAI proxy response: code=${data.code}, msg=${data.msg}`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: response.status >= 400 ? response.status : 200,
    });
  } catch (error) {
    console.error("JoggAI proxy error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ code: -1, msg, data: null }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
