import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
    if (!REPLICATE_API_KEY) {
      throw new Error("REPLICATE_API_KEY is not configured");
    }

    const replicate = new Replicate({ auth: REPLICATE_API_KEY });

    const body = await req.json();
    const { 
      prompt, 
      background, 
      character1, 
      character2, 
      audioUrl,
      duration = 5,
      existingBaseImage
    } = body;

    // Check status of existing prediction
    if (body.predictionId) {
      console.log("Checking status for prediction:", body.predictionId);
      const prediction = await replicate.predictions.get(body.predictionId);
      console.log("Prediction status:", prediction.status);
      return new Response(JSON.stringify(prediction), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Missing required field: prompt" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Build a comprehensive video prompt
    const videoPrompt = buildVideoPrompt(prompt, background, character1, character2);
    console.log("Generated video prompt:", videoPrompt);

    // Use existing base image if provided (for retries), otherwise generate new one
    let baseImageUrl: string;
    if (existingBaseImage) {
      console.log("Using existing base image from previous attempt:", existingBaseImage);
      baseImageUrl = existingBaseImage;
    } else {
      try {
        baseImageUrl = await generateBaseImage(replicate, videoPrompt);
      } catch (imgError: any) {
        console.error("Base image generation failed:", imgError);
        console.error("Error details:", JSON.stringify(imgError, null, 2));
        
        const status = imgError.response?.status || imgError.status;
        const errorMessage = imgError.message?.toLowerCase() || "";
      
        // Check for rate limit errors
        if (status === 429 || errorMessage.includes("rate limit") || errorMessage.includes("too many requests")) {
          const retryAfter = imgError.response?.headers?.get("retry-after") || 10;
          return new Response(
            JSON.stringify({ 
              error: `Rate limit erreicht. Bitte warte ${retryAfter} Sekunden und versuche es erneut.`,
              retryAfter: parseInt(retryAfter),
              isRateLimit: true
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
          );
        }
        
        // Check for payment/billing errors
        if (status === 402 || errorMessage.includes("payment") || errorMessage.includes("billing") || 
            errorMessage.includes("credit") || errorMessage.includes("subscription")) {
          return new Response(
            JSON.stringify({ 
              error: `Replicate-Guthaben aufgebraucht. Bitte lade Guthaben auf replicate.com auf.`,
              isPaymentRequired: true
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 402 }
          );
        }
        throw imgError;
      }
    }

    // Create video prediction with retry logic
    let prediction;
    try {
      prediction = await replicate.predictions.create({
        model: "stability-ai/stable-video-diffusion",
        input: {
          input_image: baseImageUrl,
          motion_bucket_id: 127,
          fps: 6,
          cond_aug: 0.02,
          decoding_t: 7,
          video_length: "14_frames_with_svd",
          sizing_strategy: "maintain_aspect_ratio",
          frames_per_second: 6
        }
      });
    } catch (vidError: any) {
      console.error("Video prediction creation failed:", vidError);
      console.error("Error details:", JSON.stringify(vidError, null, 2));
      
      const status = vidError.response?.status || vidError.status;
      const errorMessage = vidError.message?.toLowerCase() || "";
      
      // Check for payment/billing errors first (they're more specific)
      const isPaymentRequired = status === 402 || errorMessage.includes("payment") || 
          errorMessage.includes("billing") || errorMessage.includes("credit") || 
          errorMessage.includes("subscription") || errorMessage.includes("402");
      
      if (isPaymentRequired) {
        return new Response(
          JSON.stringify({ 
            error: `Replicate-Guthaben aufgebraucht. Bitte lade Guthaben auf replicate.com auf.`,
            isPaymentRequired: true,
            baseImageUrl
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 402 }
        );
      }
      
      // Check for rate limit errors
      const isRateLimit = status === 429 || errorMessage.includes("rate limit") || 
          errorMessage.includes("too many requests") || errorMessage.includes("429");
      
      if (isRateLimit) {
        const retryAfter = vidError.response?.headers?.get("retry-after") || 10;
        return new Response(
          JSON.stringify({ 
            error: `Rate limit erreicht. Bitte warte ${retryAfter} Sekunden und versuche es erneut.`,
            retryAfter: parseInt(retryAfter),
            isRateLimit: true,
            baseImageUrl // Return the base image so we can retry without regenerating
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
        );
      }
      throw vidError;
    }

    console.log("Started video generation:", prediction.id);

    return new Response(
      JSON.stringify({ 
        predictionId: prediction.id,
        status: prediction.status,
        message: "Video generation started",
        baseImageUrl
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-podcast-video:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

function buildVideoPrompt(
  basePrompt: string, 
  background?: string, 
  character1?: string, 
  character2?: string
): string {
  const parts: string[] = [];
  
  // Scene setting
  if (background) {
    parts.push(`Setting: ${background}`);
  } else {
    parts.push("Setting: Professional podcast studio with soft lighting");
  }
  
  // Characters
  if (character1 || character2) {
    parts.push("Two people having a conversation:");
    if (character1) parts.push(`Person 1: ${character1}`);
    if (character2) parts.push(`Person 2: ${character2}`);
  } else {
    parts.push("Two podcast hosts sitting at microphones, engaged in discussion");
  }
  
  // Topic context
  if (basePrompt) {
    parts.push(`Topic: ${basePrompt}`);
  }
  
  // Style directives for consistency
  parts.push("Style: Cinematic, high quality, 4K, professional lighting, shallow depth of field");
  parts.push("Camera: Medium shot, eye level, steady");
  
  return parts.join(". ");
}

async function generateBaseImage(replicate: Replicate, prompt: string): Promise<string> {
  console.log("Generating base image for video...");
  
  // Use FLUX for high-quality base image
  const output = await replicate.run(
    "black-forest-labs/flux-schnell",
    {
      input: {
        prompt: prompt,
        go_fast: true,
        megapixels: "1",
        num_outputs: 1,
        aspect_ratio: "16:9",
        output_format: "webp",
        output_quality: 90,
        num_inference_steps: 4
      }
    }
  );

  console.log("Base image generated:", output);
  
  // Return the first image URL
  if (Array.isArray(output) && output.length > 0) {
    return output[0];
  }
  
  throw new Error("Failed to generate base image");
}
