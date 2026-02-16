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
    const body = await req.json();
    
    // Support both old format (topic, speakerNames) and new format (config)
    const topic = body.topic || body.config?.topics;
    const speakerNames = body.speakerNames || ["Alex", "Sam"];
    const style = body.style || "conversational";
    const duration = body.duration || "medium";
    
    if (!topic) {
      throw new Error("Topic is required");
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    // Determine which API to use
    const apiKey = OPENAI_API_KEY || LOVABLE_API_KEY;
    const apiUrl = OPENAI_API_KEY 
      ? "https://api.openai.com/v1/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions";
    const model = OPENAI_API_KEY ? "gpt-4o-mini" : "google/gemini-2.5-flash";
    
    if (!apiKey) {
      throw new Error("No AI API key configured (OPENAI_API_KEY or LOVABLE_API_KEY)");
    }

    console.log(`Generating podcast script for topic: ${topic.slice(0, 100)}...`);

    const durationMinutes = duration === "short" ? 3 : duration === "long" ? 10 : 5;
    const wordCount = durationMinutes * 150;

    const systemPrompt = `Du bist ein erfahrener Podcast-Skriptautor. Erstelle einen natürlichen, engagierten Dialog zwischen zwei Sprechern.

## SPRECHER
- a: ${speakerNames[0]} (Der Hauptmoderator)
- b: ${speakerNames[1]} (Der Co-Moderator/Gast)

## STIL
- ${style === "conversational" ? "Locker und gesprächig, wie unter Freunden" : 
     style === "professional" ? "Professionell aber zugänglich" : 
     "Informativ und sachlich"}

## FORMAT
Die erste Zeile ist der Titel des Podcasts (kurz und prägnant, ohne Präfix).
Danach folgt eine Leerzeile.
Jede Dialogzeile beginnt mit "a:" oder "b:" gefolgt vom gesprochenen Text.

Beispiel:
Die Zukunft der KI

a: Willkommen zum Podcast! Heute sprechen wir über...
b: Ja, das ist ein spannendes Thema...
a: Absolut! Lass uns direkt einsteigen...

## REGELN
- Schreibe einen Dialog für ca. ${durationMinutes} Minuten (${wordCount} Wörter)
- Wechsel regelmäßig zwischen den Sprechern
- Füge natürliche Reaktionen ein (Hmm, Ja genau, Interessant...)
- Keine Regieanweisungen, nur gesprochener Text
- Halte dich STRIKT an das Format: Titel, Leerzeile, dann a:/b: Zeilen

Erstelle den Dialog jetzt.`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Erstelle einen Podcast-Dialog über: ${topic}` }
        ],
        max_tokens: 2000,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit überschritten. Bitte versuche es gleich nochmal." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402 || response.status === 401) {
        return new Response(JSON.stringify({ error: "API-Schlüssel ungültig oder Guthaben aufgebraucht." }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const script = data.choices?.[0]?.message?.content;

    if (!script) {
      throw new Error("Kein Skript generiert");
    }

    console.log(`Script generated successfully (${script.length} chars)`);

    return new Response(JSON.stringify({ script }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error generating podcast script:", error);
    const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
