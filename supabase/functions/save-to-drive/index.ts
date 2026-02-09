import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const GOOGLE_REFRESH_TOKEN = Deno.env.get("GOOGLE_REFRESH_TOKEN");
    
    const { videoUrl, folderId, fileName } = await req.json();

    if (!videoUrl) {
      throw new Error("Video URL is required");
    }

    console.log("Saving video to Google Drive:", videoUrl);
    console.log("Target folder:", folderId || "root");
    console.log("File name:", fileName);

    // Check if Google Drive credentials are configured
    if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REFRESH_TOKEN) {
      try {
        // Get fresh access token using refresh token
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            refresh_token: GOOGLE_REFRESH_TOKEN,
            grant_type: "refresh_token"
          })
        });

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        if (!accessToken) {
          throw new Error("Failed to get Google access token");
        }

        // Download the video
        console.log("Downloading video...");
        const videoResponse = await fetch(videoUrl);
        const videoBlob = await videoResponse.blob();

        // Create file metadata
        const metadata = {
          name: fileName || `video-${Date.now()}.mp4`,
          mimeType: "video/mp4",
          parents: folderId ? [folderId] : undefined
        };

        // Upload to Google Drive using resumable upload
        const initResponse = await fetch(
          "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(metadata)
          }
        );

        const uploadUrl = initResponse.headers.get("Location");
        
        if (!uploadUrl) {
          throw new Error("Failed to initiate upload");
        }

        // Upload the file content
        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "video/mp4",
          },
          body: videoBlob
        });

        const uploadData = await uploadResponse.json();
        
        console.log("Upload complete:", uploadData);

        const driveUrl = `https://drive.google.com/file/d/${uploadData.id}/view`;

        return new Response(
          JSON.stringify({
            success: true,
            fileId: uploadData.id,
            fileName: uploadData.name,
            driveUrl: driveUrl,
            message: "Video saved to Google Drive successfully"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      } catch (driveError: any) {
        console.error("Google Drive upload error:", driveError);
        throw new Error(`Google Drive upload failed: ${driveError.message}`);
      }
    }

    // No Google Drive credentials - provide manual download instructions
    console.log("Google Drive not configured, returning download info");
    
    return new Response(
      JSON.stringify({
        success: false,
        error: "Google Drive not configured",
        videoUrl: videoUrl,
        message: "Google Drive ist nicht konfiguriert. Bitte lade das Video manuell herunter.",
        setupInstructions: [
          "1. Erstelle ein Google Cloud Projekt",
          "2. Aktiviere die Google Drive API",
          "3. Erstelle OAuth 2.0 Credentials",
          "4. Füge die Credentials als Supabase Secrets hinzu:",
          "   - GOOGLE_CLIENT_ID",
          "   - GOOGLE_CLIENT_SECRET", 
          "   - GOOGLE_REFRESH_TOKEN"
        ]
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error saving to drive:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
