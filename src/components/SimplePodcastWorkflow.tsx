import { useState, useEffect } from "react";
import { VoiceSelector } from "@/components/VoiceSelector";
import { AudioPlayer } from "@/components/AudioPlayer";
import { VideoPlayer } from "@/components/VideoPlayer";
import { GenerationStatus } from "@/components/GenerationStatus";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Podcast, ArrowLeft, ArrowRight, Volume2, Sparkles, Video, Loader2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface SimplePodcastWorkflowProps {
  onSwitchMode: () => void;
}

type SimpleStep = "input" | "generating" | "audio" | "video" | "complete";

export const SimplePodcastWorkflow = ({ onSwitchMode }: SimplePodcastWorkflowProps) => {
  const [currentStep, setCurrentStep] = useState<SimpleStep>("input");
  
  // Input state
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState(5);
  const [voiceId, setVoiceId] = useState("JBFqnCBsd6RMkjVDRZzb");
  
  // Generated content
  const [generatedScript, setGeneratedScript] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  
  // Loading states
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoPredictionId, setVideoPredictionId] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState("");
  
  const { toast } = useToast();

  // Poll video generation status
  useEffect(() => {
    if (!videoPredictionId || videoUrl) return;

    const pollStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("generate-podcast-video", {
          body: { predictionId: videoPredictionId }
        });

        if (error) throw error;

        setVideoStatus(data.status);

        if (data.status === "succeeded" && data.output) {
          const outputUrl = Array.isArray(data.output) ? data.output[0] : data.output;
          setVideoUrl(outputUrl);
          setIsGeneratingVideo(false);
          setCurrentStep("complete");
          toast({
            title: "Video fertig!",
            description: "Dein Podcast wurde erfolgreich erstellt."
          });
        } else if (data.status === "failed") {
          throw new Error("Video generation failed");
        }
      } catch (error) {
        console.error("Video poll error:", error);
      }
    };

    const interval = setInterval(pollStatus, 3000);
    return () => clearInterval(interval);
  }, [videoPredictionId, videoUrl, toast]);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({
        title: "Thema fehlt",
        description: "Bitte gib ein Thema für deinen Podcast ein.",
        variant: "destructive"
      });
      return;
    }

    setCurrentStep("generating");
    setIsGeneratingScript(true);

    try {
      // Generate script with minimal config
      const { data: scriptData, error: scriptError } = await supabase.functions.invoke("generate-podcast-script", {
        body: {
          config: {
            speakerBackground: "",
            podcastStructure: "",
            textStyle: "",
            topics: topic
          },
          duration: duration.toString(),
          variantCount: 1
        }
      });

      if (scriptError) throw new Error(scriptError.message);
      if (scriptData?.error) throw new Error(scriptData.error);
      if (!scriptData?.variants?.[0]) throw new Error("Script-Generierung fehlgeschlagen");

      const script = scriptData.variants[0].content;
      setGeneratedScript(script);

      toast({
        title: "Script erstellt",
        description: "Jetzt wird das Audio generiert..."
      });

      // Generate audio
      setIsGeneratingScript(false);
      setIsGeneratingAudio(true);

      const { data: audioData, error: audioError } = await supabase.functions.invoke("generate-podcast-audio", {
        body: { script, voiceId }
      });

      if (audioError) throw new Error(audioError.message);
      if (audioData?.error) throw new Error(audioData.error);
      if (!audioData?.audioContent) throw new Error("Audio-Generierung fehlgeschlagen");

      const audioBlob = base64ToBlob(audioData.audioContent, "audio/mpeg");
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      setIsGeneratingAudio(false);
      setCurrentStep("audio");

      toast({
        title: "Audio fertig!",
        description: "Dein Podcast-Audio wurde erstellt."
      });
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Etwas ist schiefgelaufen",
        variant: "destructive"
      });
      setIsGeneratingScript(false);
      setIsGeneratingAudio(false);
      setCurrentStep("input");
    }
  };

  const handleGenerateVideo = async (retryWithBaseImage?: string) => {
    setIsGeneratingVideo(true);
    setVideoStatus("starting");
    setCurrentStep("video");
    if (!retryWithBaseImage) {
      setVideoPredictionId(null);
    }

    try {
      const { data, error } = await supabase.functions.invoke("generate-podcast-video", {
        body: {
          prompt: topic.slice(0, 200),
          background: "",
          character1: "",
          character2: "",
          ...(retryWithBaseImage && { existingBaseImage: retryWithBaseImage })
        }
      });

      if (error) {
        const errorMsg = typeof error === 'string' ? error : (error.message || 'Unknown error');
        throw new Error(errorMsg);
      }
      
      if (data?.isRateLimit && data?.retryAfter) {
        const retrySeconds = data.retryAfter || 10;
        const baseImage = data.baseImageUrl;
        toast({
          title: "Rate Limit - Automatischer Retry",
          description: `Warte ${retrySeconds} Sekunden und versuche erneut...`
        });
        
        setTimeout(() => {
          handleGenerateVideo(baseImage);
        }, retrySeconds * 1000);
        return;
      }
      
      if (data?.error) throw new Error(data.error);
      if (!data?.predictionId) throw new Error("Video-Generierung konnte nicht gestartet werden");

      setVideoPredictionId(data.predictionId);
      setVideoStatus(data.status);
      
      toast({
        title: "Video wird generiert",
        description: "Dies kann einige Minuten dauern."
      });
    } catch (error) {
      console.error("Video generation error:", error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Video-Generierung fehlgeschlagen",
        variant: "destructive"
      });
      setIsGeneratingVideo(false);
      setCurrentStep("audio");
    }
  };

  const handleReset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setCurrentStep("input");
    setTopic("");
    setGeneratedScript("");
    setAudioUrl("");
    setVideoUrl("");
    setVideoPredictionId(null);
    setVideoStatus("");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 gradient-hero opacity-50" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1s" }} />

      <div className="relative z-10 container mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <header className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                <Podcast className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold">
                  <span className="text-gradient">PodcastAI</span>
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Schnell & Einfach
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onSwitchMode} className="gap-2">
              <Settings2 className="w-4 h-4" />
              Detaillierter Modus
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-2xl mx-auto">
          <div className="p-6 md:p-8 rounded-2xl bg-card/50 backdrop-blur-sm border border-border animate-slide-up">
            
            {/* Step: Input */}
            {currentStep === "input" && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-display font-bold text-foreground">
                    Podcast erstellen
                  </h2>
                  <p className="text-muted-foreground">
                    Gib dein Thema ein und wähle eine Stimme
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Thema</Label>
                    <Textarea
                      placeholder="Worüber soll dein Podcast handeln? z.B. 'Die Zukunft der künstlichen Intelligenz und ihre Auswirkungen auf die Arbeitswelt'"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="min-h-[120px] resize-none"
                    />
                  </div>

                  <VoiceSelector selectedVoiceId={voiceId} onVoiceSelect={setVoiceId} />

                  <div className="space-y-3 pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-foreground">Dauer</Label>
                      <span className="text-sm font-mono text-primary">{duration} Min</span>
                    </div>
                    <Slider
                      value={[duration]}
                      min={2}
                      max={15}
                      step={1}
                      onValueChange={(value) => setDuration(value[0])}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={!topic.trim()}
                  size="lg"
                  className="w-full h-14 text-lg gap-2 bg-primary hover:bg-primary/90 text-primary-foreground glow-primary"
                >
                  <Sparkles className="h-5 w-5" />
                  Podcast generieren
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            )}

            {/* Step: Generating */}
            {currentStep === "generating" && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-display font-bold text-foreground">
                    Wird generiert...
                  </h2>
                  <p className="text-muted-foreground">
                    {isGeneratingScript ? "Script wird erstellt..." : "Audio wird generiert..."}
                  </p>
                </div>

                <div className="py-8">
                  <GenerationStatus 
                    step={isGeneratingScript ? "script" : "audio"} 
                    script={generatedScript || topic} 
                  />
                </div>
              </div>
            )}

            {/* Step: Audio Ready */}
            {currentStep === "audio" && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Audio fertig!</span>
                  </div>
                </div>

                <AudioPlayer audioUrl={audioUrl} title="Mein Podcast" />

                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleReset} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Neu starten
                  </Button>
                  <Button
                    onClick={() => handleGenerateVideo()}
                    className="flex-1 h-14 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground glow-primary"
                  >
                    <Video className="h-5 w-5" />
                    Video erstellen
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step: Video Generating */}
            {currentStep === "video" && !videoUrl && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-display font-bold text-foreground">
                    Video wird erstellt
                  </h2>
                  <p className="text-muted-foreground">
                    Dies kann 1-3 Minuten dauern
                  </p>
                </div>

                <div className="space-y-4 p-6 rounded-xl bg-secondary/50 border border-border">
                  <div className="flex items-center justify-center gap-3">
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    <span className="font-medium text-foreground">Video wird generiert...</span>
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    Status: {videoStatus}
                  </p>
                </div>

                {/* Audio player while waiting */}
                <AudioPlayer audioUrl={audioUrl} title="Mein Podcast" />
              </div>
            )}

            {/* Step: Complete */}
            {currentStep === "complete" && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Podcast komplett!</span>
                  </div>
                </div>

                <VideoPlayer 
                  videoUrl={videoUrl} 
                  audioUrl={audioUrl}
                  title="Mein Podcast Video"
                  onRegenerate={() => handleGenerateVideo()}
                  isRegenerating={isGeneratingVideo}
                />

                <Button
                  onClick={handleReset}
                  variant="outline"
                  size="lg"
                  className="w-full gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Neuen Podcast erstellen
                </Button>
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>Powered by AI • Text, Audio & Video</p>
        </footer>
      </div>
    </div>
  );
};

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}
