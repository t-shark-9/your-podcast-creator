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
    const { script, config } = await req.json();
    
    if (!script) {
      throw new Error("Script is required for optimization");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Optimizing script of length: ${script.length} characters`);

    const systemPrompt = `Du bist ein Experte für gesprochene Sprache und Podcast-Produktion. Deine Aufgabe ist es, ein Podcast-Skript zu optimieren und zu verfeinern.

${config?.speakerBackground ? `## SPRECHER-HINTERGRUND (beachten!)
${config.speakerBackground}

` : ""}${config?.textStyle ? `## TEXTSTIL-VORGABEN (beachten!)
${config.textStyle}

` : ""}## OPTIMIERUNGS-AUFGABEN

1. **SPRACHE VERBESSERN**
   - Mache den Text natürlicher und gesprächiger
   - Verwende die richtige Tonalität des Sprechers
   - Füge passende Füllwörter ein (ähm, also, naja, weißt du)

2. **GRAMMATIK UND STIL**
   - Korrigiere Grammatikfehler
   - Verbessere Satzstrukturen für besseren Sprachfluss
   - Stelle sicher, dass Sätze nicht zu lang sind

3. **NATÜRLICHE VERSPRECHER EINFÜGEN**
   - Füge gelegentlich kleine Selbstkorrekturen ein (z.B. "das heißt, ich meine...")
   - Baue natürliche Unterbrechungen ein
   - Markiere diese mit [KORREKTUR]

4. **AKZENTE UND BETONUNGEN**
   - Markiere wichtige Wörter mit *Betonung*
   - Füge Pausen ein mit [PAUSE] oder [KURZE PAUSE]
   - Markiere emotionale Stellen mit [LACHEN], [NACHDENKLICH], [BEGEISTERT]

5. **STIMMUNG EINBAUEN**
   - Füge emotionale Variationen ein
   - Baue persönliche Momente ein
   - Mache den Text lebendig und authentisch

Gib NUR das optimierte Skript zurück, keine Erklärungen oder Kommentare.`;

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
          { role: "user", content: `Optimiere folgendes Podcast-Skript:\n\n${script}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      // Try to parse error details from the response
      let errorDetails = "";
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = errorJson.error?.message || errorJson.message || errorText;
      } catch {
        errorDetails = errorText;
      }
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: `Payment required: ${errorDetails || "Please check your Lovable credits."}` }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status} - ${errorDetails}`);
    }

    const data = await response.json();
    const optimizedScript = data.choices?.[0]?.message?.content;

    if (!optimizedScript) {
      throw new Error("No optimized script generated");
    }

    console.log(`Script optimized successfully, new length: ${optimizedScript.length} characters`);

    return new Response(JSON.stringify({ optimizedScript }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error optimizing podcast script:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
