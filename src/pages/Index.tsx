import { useState } from "react";
import { PodcastConfig, PodcastConfigData } from "@/components/PodcastConfig";
import { ScriptVariantSelector } from "@/components/ScriptVariantSelector";
import { ScriptOptimizer } from "@/components/ScriptOptimizer";
import { WorkflowStepper, WorkflowStep } from "@/components/WorkflowStepper";
import { AudioPlayer } from "@/components/AudioPlayer";
import { VoiceSelector } from "@/components/VoiceSelector";
import { GenerationStatus } from "@/components/GenerationStatus";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Podcast, ArrowLeft, ArrowRight, Volume2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface ScriptVariant {
  id: number;
  content: string;
}

const Index = () => {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("config");
  const [completedSteps, setCompletedSteps] = useState<WorkflowStep[]>([]);
  
  // Config state
  const [config, setConfig] = useState<PodcastConfigData>({
    speakerBackground: "",
    podcastStructure: "",
    textStyle: "",
    topics: ""
  });
  const [duration, setDuration] = useState(5);
  
  // Script state
  const [variants, setVariants] = useState<ScriptVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [optimizedScript, setOptimizedScript] = useState<string | null>(null);
  const [finalScript, setFinalScript] = useState<string>("");
  
  // Audio state
  const [voiceId, setVoiceId] = useState("JBFqnCBsd6RMkjVDRZzb");
  const [audioUrl, setAudioUrl] = useState<string>("");
  
  // Loading states
  const [isGeneratingVariants, setIsGeneratingVariants] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  
  const { toast } = useToast();

  const handleGenerateVariants = async () => {
    if (!config.topics.trim()) {
      toast({
        title: "Themen fehlen",
        description: "Bitte gib mindestens die Themen-Abfolge ein.",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingVariants(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-podcast-script", {
        body: { config, duration: duration.toString(), variantCount: 3 }
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.variants) throw new Error("Keine Varianten generiert");

      setVariants(data.variants);
      setSelectedVariantId(null);
      setOptimizedScript(null);
      setCompletedSteps(prev => [...prev.filter(s => s !== "config"), "config"]);
      setCurrentStep("variants");
      
      toast({
        title: "Varianten erstellt",
        description: `${data.variants.length} Script-Varianten wurden generiert.`
      });
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Etwas ist schiefgelaufen",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingVariants(false);
    }
  };

  const handleSelectVariant = (variantId: number) => {
    setSelectedVariantId(variantId);
    setOptimizedScript(null);
  };

  const handleContinueToOptimize = () => {
    if (selectedVariantId !== null) {
      setCompletedSteps(prev => [...prev.filter(s => s !== "variants"), "variants"]);
      setCurrentStep("optimize");
    }
  };

  const handleOptimize = async () => {
    const selectedVariant = variants.find(v => v.id === selectedVariantId);
    if (!selectedVariant) return;

    setIsOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("optimize-podcast-script", {
        body: { script: selectedVariant.content, config }
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.optimizedScript) throw new Error("Optimierung fehlgeschlagen");

      setOptimizedScript(data.optimizedScript);
      
      toast({
        title: "Script optimiert",
        description: "Das Script wurde erfolgreich optimiert."
      });
    } catch (error) {
      console.error("Optimization error:", error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Optimierung fehlgeschlagen",
        variant: "destructive"
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleAcceptScript = (script: string) => {
    setFinalScript(script);
    setCompletedSteps(prev => [...prev.filter(s => s !== "optimize"), "optimize"]);
    setCurrentStep("audio");
  };

  const handleGenerateAudio = async () => {
    setIsGeneratingAudio(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-podcast-audio", {
        body: { script: finalScript, voiceId }
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.audioContent) throw new Error("Audio-Generierung fehlgeschlagen");

      const audioBlob = base64ToBlob(data.audioContent, "audio/mpeg");
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      setCompletedSteps(prev => [...prev.filter(s => s !== "audio"), "audio"]);
      
      toast({
        title: "Podcast fertig!",
        description: "Dein Podcast wurde erfolgreich erstellt."
      });
    } catch (error) {
      console.error("Audio generation error:", error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Audio-Generierung fehlgeschlagen",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleReset = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setCurrentStep("config");
    setCompletedSteps([]);
    setVariants([]);
    setSelectedVariantId(null);
    setOptimizedScript(null);
    setFinalScript("");
    setAudioUrl("");
  };

  const handleBack = () => {
    const steps: WorkflowStep[] = ["config", "variants", "optimize", "audio"];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const selectedVariant = variants.find(v => v.id === selectedVariantId);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 gradient-hero opacity-50" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1s" }} />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <header className="text-center mb-8 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Podcast className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl md:text-5xl font-display font-bold mb-2">
            <span className="text-gradient">PodcastAI</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto">
            Professionelle Podcasts mit deiner Stimme erstellen
          </p>
        </header>

        {/* Workflow Stepper */}
        <div className="max-w-3xl mx-auto mb-8">
          <WorkflowStepper currentStep={currentStep} completedSteps={completedSteps} />
        </div>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto">
          <div className="p-6 md:p-8 rounded-2xl bg-card/50 backdrop-blur-sm border border-border animate-slide-up">
            
            {/* Step: Config */}
            {currentStep === "config" && (
              <div className="space-y-8">
                <PodcastConfig 
                  config={config} 
                  onChange={setConfig}
                  disabled={isGeneratingVariants}
                />
                
                {/* Duration Slider */}
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
                    disabled={isGeneratingVariants}
                  />
                </div>
                
                <Button
                  onClick={handleGenerateVariants}
                  disabled={!config.topics.trim() || isGeneratingVariants}
                  size="lg"
                  className="w-full h-14 text-lg gap-2 bg-primary hover:bg-primary/90 text-primary-foreground glow-primary"
                >
                  {isGeneratingVariants ? (
                    <>
                      <span className="animate-spin">⟳</span>
                      Generiere Varianten...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      3 Script-Varianten generieren
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Step: Variants */}
            {currentStep === "variants" && (
              <div className="space-y-6">
                <ScriptVariantSelector
                  variants={variants}
                  selectedVariant={selectedVariantId}
                  onSelect={handleSelectVariant}
                  onRegenerate={handleGenerateVariants}
                  isRegenerating={isGeneratingVariants}
                />
                
                <div className="flex gap-3 pt-4 border-t border-border">
                  <Button variant="outline" onClick={handleBack} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Zurück
                  </Button>
                  <Button
                    onClick={handleContinueToOptimize}
                    disabled={selectedVariantId === null}
                    className="flex-1 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Weiter zur Optimierung
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step: Optimize */}
            {currentStep === "optimize" && selectedVariant && (
              <div className="space-y-6">
                <ScriptOptimizer
                  originalScript={selectedVariant.content}
                  optimizedScript={optimizedScript}
                  onOptimize={handleOptimize}
                  onAccept={handleAcceptScript}
                  isOptimizing={isOptimizing}
                />
                
                <div className="flex gap-3 pt-4 border-t border-border">
                  <Button variant="outline" onClick={handleBack} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Zurück
                  </Button>
                </div>
              </div>
            )}

            {/* Step: Audio */}
            {currentStep === "audio" && (
              <div className="space-y-6">
                {!audioUrl ? (
                  <>
                    <div className="text-center space-y-2">
                      <h2 className="text-2xl font-display font-bold text-foreground">
                        Vertonung
                      </h2>
                      <p className="text-muted-foreground">
                        Wähle eine Stimme und erstelle deinen Podcast
                      </p>
                    </div>

                    <VoiceSelector selectedVoiceId={voiceId} onVoiceSelect={setVoiceId} />
                    
                    {/* Script Preview */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">Finales Script</Label>
                      <div className="p-4 rounded-xl bg-muted/30 border border-border max-h-48 overflow-y-auto">
                        <p className="text-xs text-foreground/70 leading-relaxed whitespace-pre-wrap font-mono">
                          {finalScript.slice(0, 500)}...
                        </p>
                      </div>
                    </div>

                    {isGeneratingAudio ? (
                      <GenerationStatus step="audio" script={finalScript} />
                    ) : (
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={handleBack} className="gap-2">
                          <ArrowLeft className="h-4 w-4" />
                          Zurück
                        </Button>
                        <Button
                          onClick={handleGenerateAudio}
                          className="flex-1 h-14 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground glow-primary"
                        >
                          <Volume2 className="h-5 w-5" />
                          Podcast erstellen
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-8">
                    <div className="text-center space-y-2">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-primary">Podcast fertig!</span>
                      </div>
                    </div>

                    <AudioPlayer audioUrl={audioUrl} title="Mein Podcast" />
                    
                    {/* Script Display */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">Vollständiges Script</Label>
                      <div className="p-4 rounded-xl bg-muted/30 border border-border max-h-64 overflow-y-auto">
                        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap font-mono">
                          {finalScript}
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={handleReset}
                      variant="outline"
                      size="lg"
                      className="w-full gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Neue Episode erstellen
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>Powered by AI • Deine Stimme, dein Inhalt</p>
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

export default Index;
