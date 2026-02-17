import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TAVUS_API_URL = "https://tavusapi.com/v2";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { endpoint, method = "GET", payload, apiKey } = body;

    const tavusApiKey = apiKey || Deno.env.get("TAVUS_API_KEY");
    if (!tavusApiKey) {
      throw new Error("Tavus API Key not configured");
    }

    if (!endpoint) {
      throw new Error("endpoint is required");
    }

    console.log(`Tavus proxy: ${method} ${endpoint}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        "x-api-key": tavusApiKey,
        "Content-Type": "application/json",
      },
    };

    if (method !== "GET" && payload) {
      fetchOptions.body = JSON.stringify(payload);
    }

    const response = await fetch(`${TAVUS_API_URL}${endpoint}`, fetchOptions);
    const responseText = await response.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error(`Tavus returned non-JSON (status ${response.status}):`, responseText.substring(0, 500));
      return new Response(
        JSON.stringify({ error: `Tavus API returned non-JSON response (HTTP ${response.status})` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 }
      );
    }

    console.log(`Tavus proxy response status: ${response.status}`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: response.status >= 400 ? response.status : 200,
    });
  } catch (error) {
    console.error("Tavus proxy error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
