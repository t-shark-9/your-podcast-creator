import { useState } from "react";
import { TopicInput } from "@/components/TopicInput";
import { GenerationStatus } from "@/components/GenerationStatus";
import { AudioPlayer } from "@/components/AudioPlayer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Podcast, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type GenerationStep = "idle" | "script" | "audio" | "complete";

const Index = () => {
  const [step, setStep] = useState<GenerationStep>("idle");
  const [script, setScript] = useState<string>("");
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [currentTopic, setCurrentTopic] = useState<string>("");
  const { toast } = useToast();

  const handleGenerate = async (topic: string, duration: number, voiceId: string) => {
    setCurrentTopic(topic);
    setStep("script");
    setScript("");
    setAudioUrl("");

    try {
      // Step 1: Generate script
      const { data: scriptData, error: scriptError } = await supabase.functions.invoke(
        "generate-podcast-script",
        { body: { topic, duration: duration.toString() } }
      );

      if (scriptError) throw new Error(scriptError.message);
      if (scriptData?.error) throw new Error(scriptData.error);
      if (!scriptData?.script) throw new Error("No script generated");

      setScript(scriptData.script);
      setStep("audio");

      // Step 2: Generate audio
      const { data: audioData, error: audioError } = await supabase.functions.invoke(
        "generate-podcast-audio",
        { body: { script: scriptData.script, voiceId } }
      );

      if (audioError) throw new Error(audioError.message);
      if (audioData?.error) throw new Error(audioData.error);
      if (!audioData?.audioContent) throw new Error("No audio generated");

      // Create audio URL from base64
      const audioBlob = base64ToBlob(audioData.audioContent, "audio/mpeg");
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      setStep("complete");

      toast({
        title: "Podcast ready!",
        description: "Your podcast has been generated successfully.",
      });

    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
      setStep("idle");
    }
  };

  const handleReset = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setStep("idle");
    setScript("");
    setAudioUrl("");
    setCurrentTopic("");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 gradient-hero opacity-50" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1s" }} />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-12 md:py-20">
        {/* Header */}
        <header className="text-center mb-12 md:mb-16 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Podcast className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold mb-4">
            <span className="text-gradient">PodcastAI</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto">
            Transform any topic into a professional podcast episode with AI-powered script writing and voice synthesis
          </p>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto">
          {step === "idle" && (
            <TopicInput onGenerate={handleGenerate} isGenerating={false} />
          )}

          {(step === "script" || step === "audio") && (
            <GenerationStatus step={step} script={script} />
          )}

          {step === "complete" && audioUrl && (
            <div className="space-y-8 animate-fade-in">
              {/* Episode Info */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Episode Ready</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                  {currentTopic}
                </h2>
              </div>

              {/* Audio Player */}
              <div className="p-8 rounded-2xl bg-card/50 backdrop-blur-sm border border-border">
                <AudioPlayer audioUrl={audioUrl} title={currentTopic} />
              </div>

              {/* Script Display */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Full Script</h3>
                <div className="p-6 rounded-xl bg-muted/30 border border-border max-h-80 overflow-y-auto">
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap font-mono">
                    {script}
                  </p>
                </div>
              </div>

              {/* New Episode Button */}
              <div className="flex justify-center">
                <Button
                  onClick={handleReset}
                  variant="outline"
                  size="lg"
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Create New Episode
                </Button>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="mt-20 text-center text-sm text-muted-foreground">
          <p>Powered by AI voice synthesis • Your voice, your content</p>
        </footer>
      </div>
    </div>
  );
};

// Utility function to convert base64 to blob
function base64ToBlob(base64: string, mimeType: string): Blob {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export default Index;
