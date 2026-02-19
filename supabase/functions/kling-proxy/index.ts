import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const KLING_API_URL = "https://api.klingai.com";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { endpoint, method = "GET", payload, apiKey } = body;

    if (!apiKey) {
      throw new Error("Kling API Key is required");
    }

    if (!endpoint) {
      throw new Error("endpoint is required");
    }

    console.log(`Kling proxy: ${method} ${endpoint}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    };

    if (method !== "GET" && payload) {
      fetchOptions.body = JSON.stringify(payload);
    }

    const response = await fetch(`${KLING_API_URL}${endpoint}`, fetchOptions);
    const responseText = await response.text();
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error(`Kling returned non-JSON (status ${response.status}):`, responseText.substring(0, 500));
      return new Response(
        JSON.stringify({ code: -1, message: `Kling API returned non-JSON response (HTTP ${response.status})`, data: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 }
      );
    }

    console.log(`Kling proxy response: code=${data.code}, message=${data.message}`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: response.status >= 400 ? response.status : 200,
    });
  } catch (error) {
    console.error("Kling proxy error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ code: -1, message: msg, data: null }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
