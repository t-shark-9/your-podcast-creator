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
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    const { prompt, targetModel } = await req.json();

    if (!prompt) {
      throw new Error("Prompt is required");
    }

    console.log("Enhancing prompt for:", targetModel);
    console.log("Original prompt:", prompt);

    // Create a system prompt tailored for video generation
    const systemPrompt = `You are an expert at creating detailed video prompts for AI video generation models like ${targetModel === "veo3" ? "Google VEO 3" : "OpenAI Sora"}.

Your task is to enhance the user's video description to create a highly detailed, cinematic prompt that will produce better quality videos.

Guidelines:
1. Add specific visual details (lighting, colors, textures, atmosphere)
2. Describe camera movements and angles (close-up, wide shot, tracking shot, etc.)
3. Include temporal details (time of day, weather, movement speed)
4. Add emotional or mood descriptors
5. Specify quality indicators (4K, cinematic, professional, high-quality)
6. Keep the enhanced prompt concise but detailed (2-4 sentences max)
7. Maintain the original intent and subject matter
8. Use descriptive adjectives and action verbs

Respond with ONLY the enhanced prompt, no explanations or formatting.`;

    // Try to use OpenAI if available
    if (OPENAI_API_KEY) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Enhance this video prompt: "${prompt}"` }
          ],
          max_tokens: 300,
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      const enhancedPrompt = data.choices?.[0]?.message?.content?.trim();

      if (enhancedPrompt) {
        console.log("Enhanced prompt:", enhancedPrompt);
        return new Response(
          JSON.stringify({ enhancedPrompt }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fallback: Create a basic enhancement locally
    const modelSpecific = targetModel === "veo3" 
      ? "smooth camera motion, natural lighting, photorealistic"
      : "cinematic quality, professional cinematography, seamless transitions";

    const enhancedPrompt = `Cinematic 4K video: ${prompt}. ${modelSpecific}. High detail textures, vibrant colors, professional lighting setup, atmospheric depth. Shot on professional camera with stabilized movement.`;

    console.log("Enhanced prompt (fallback):", enhancedPrompt);

    return new Response(
      JSON.stringify({ enhancedPrompt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error enhancing prompt:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
