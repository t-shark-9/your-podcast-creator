import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const signUrl = formData.get("sign_url") as string;
    const contentType = formData.get("content_type") as string;

    if (!file || !signUrl) {
      throw new Error("file and sign_url are required");
    }

    console.log(`Uploading to signed URL: ${signUrl.substring(0, 80)}...`);

    const arrayBuffer = await file.arrayBuffer();

    const response = await fetch(signUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType || file.type,
      },
      body: arrayBuffer,
    });

    const responseText = await response.text();
    console.log(`Upload response status: ${response.status}`);

    if (!response.ok) {
      console.error("Upload failed:", responseText.substring(0, 500));
      throw new Error(`Upload failed with status ${response.status}`);
    }

    return new Response(
      JSON.stringify({ success: true, status: response.status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Upload proxy error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
