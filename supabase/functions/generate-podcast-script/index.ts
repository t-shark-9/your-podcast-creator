import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PodcastConfig {
  speakerBackground: string;
  podcastStructure: string;
  textStyle: string;
  topics: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { config, duration = "5", variantCount = 3 } = await req.json();
    
    if (!config || !config.topics) {
      throw new Error("Podcast configuration with topics is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating ${variantCount} podcast script variants`);
    console.log(`Topics: ${config.topics.slice(0, 100)}...`);

    const systemPrompt = `Du bist ein erfahrener Podcast-Skriptautor. Erstelle ansprechende, gesprächige Podcast-Skripte, die natürlich klingen, wenn sie laut vorgelesen werden.

${config.speakerBackground ? `## SPRECHER-HINTERGRUND
${config.speakerBackground}

` : ""}${config.podcastStructure ? `## PODCAST-STRUKTUR UND AUFBAU
${config.podcastStructure}

` : ""}${config.textStyle ? `## TEXTSTIL-VORGABEN
${config.textStyle}

` : ""}## WICHTIGE REGELN
- Das Skript sollte für etwa ${duration} Minuten reichen (ca. 150 Wörter pro Minute)
- Schreibe NUR den gesprochenen Text - keine Regieanweisungen oder Sprecherkennzeichnungen
- Markiere natürliche Pausen mit [PAUSE]
- Der Text muss authentisch und leidenschaftlich klingen
- Halte dich an den vorgegebenen Aufbau und Stil

Generiere GENAU ${variantCount} verschiedene Varianten des Skripts. Jede Variante sollte einen leicht anderen Ansatz, Ton oder Fokus haben, aber alle müssen den Vorgaben entsprechen.

Formatiere deine Antwort als JSON-Array mit ${variantCount} Objekten:
[
  {"id": 1, "content": "Erste Variante..."},
  {"id": 2, "content": "Zweite Variante..."},
  {"id": 3, "content": "Dritte Variante..."}
]

Antworte NUR mit dem JSON-Array, kein anderer Text.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Erstelle ${variantCount} Podcast-Skript-Varianten für folgende Themen:\n\n${config.topics}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No script generated");
    }

    // Clean up the response - remove markdown code blocks if present
    content = content.trim();
    if (content.startsWith("```json")) {
      content = content.slice(7);
    } else if (content.startsWith("```")) {
      content = content.slice(3);
    }
    if (content.endsWith("```")) {
      content = content.slice(0, -3);
    }
    content = content.trim();

    // Parse the JSON array
    let variants;
    try {
      variants = JSON.parse(content);
      if (!Array.isArray(variants)) {
        throw new Error("Response is not an array");
      }
    } catch (parseError) {
      console.error("Failed to parse variants JSON:", parseError);
      console.error("Content was:", content.slice(0, 500));
      // Fallback: return the content as a single variant
      variants = [{ id: 1, content: content }];
    }

    console.log(`Generated ${variants.length} script variants successfully`);

    return new Response(JSON.stringify({ variants }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error generating podcast script:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
