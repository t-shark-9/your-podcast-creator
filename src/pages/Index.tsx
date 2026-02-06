import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PodcastConfig, PodcastConfigData } from "@/components/PodcastConfig";
import { VideoConfig, VideoConfigData } from "@/components/VideoConfig";
import { ScriptVariantSelector } from "@/components/ScriptVariantSelector";
import { ScriptOptimizer } from "@/components/ScriptOptimizer";
import { WorkflowStepper, WorkflowStep } from "@/components/WorkflowStepper";
import { AudioPlayer } from "@/components/AudioPlayer";
import { VideoPlayer } from "@/components/VideoPlayer";
import { VoiceSelector } from "@/components/VoiceSelector";
import { GenerationStatus } from "@/components/GenerationStatus";
import { SavedConfigurations } from "@/components/SavedConfigurations";
import { UserMenu } from "@/components/UserMenu";
import { ModeSelection } from "@/components/ModeSelection";
import { SimplePodcastWorkflow } from "@/components/SimplePodcastWorkflow";
import { VisualOutputSelector, type VisualOutputType } from "@/components/VisualOutputSelector";
import { useN8nConfig, triggerN8nWebhook } from "@/components/N8nSettings";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Podcast, ArrowLeft, ArrowRight, Volume2, Sparkles, Video, Loader2, Save, FolderOpen, Zap, ImageIcon, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { User } from "@supabase/supabase-js";

interface ScriptVariant {
  id: number;
  content: string;
}

type AppMode = "selection" | "simple" | "rigorous";

const Index = () => {
  const [appMode, setAppMode] = useState<AppMode>("selection");
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("config");
  const [completedSteps, setCompletedSteps] = useState<WorkflowStep[]>([]);
  
  // n8n integration
  const { config: n8nConfig } = useN8nConfig();
  
  // User state
  const [user, setUser] = useState<User | null>(null);
  const [showSavedDialog, setShowSavedDialog] = useState(false);
  const [saveConfigName, setSaveConfigName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  // Config state
  const [config, setConfig] = useState<PodcastConfigData>({
    speakerBackground: "",
    podcastStructure: "",
    textStyle: "",
    topics: ""
  });
  const [videoConfig, setVideoConfig] = useState<VideoConfigData>({
    background: "",
    character1: "",
    character2: ""
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
  
  // Video state
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [videoPredictionId, setVideoPredictionId] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState<string>("");
  const [visualOutputType, setVisualOutputType] = useState<VisualOutputType>("video");
  
  // Loading states
  const [isGeneratingVariants, setIsGeneratingVariants] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  const { toast } = useToast();

  // Auth state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Poll video generation status - must be before any conditional returns
  useEffect(() => {
    if (!videoPredictionId || videoUrl || appMode !== "rigorous") return;

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
          setCompletedSteps(prev => [...prev.filter(s => s !== "video"), "video"]);
          
          // Trigger n8n webhook
          triggerN8nWebhook(n8nConfig, "video_generated", {
            videoUrl: outputUrl,
            visualType: visualOutputType
          });
          
          // Also trigger workflow complete if we have everything
          triggerN8nWebhook(n8nConfig, "workflow_complete", {
            script: finalScript,
            audioUrl: audioUrl,
            videoUrl: outputUrl,
            topics: config.topics
          });
          
          toast({
            title: "Video fertig!",
            description: "Dein Podcast-Video wurde erfolgreich erstellt."
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
  }, [videoPredictionId, videoUrl, toast, appMode, n8nConfig, visualOutputType, finalScript, audioUrl, config.topics]);

  // Mode selection handlers
  const handleSelectMode = (mode: "simple" | "rigorous") => {
    setAppMode(mode);
  };

  const handleSwitchToRigorous = () => {
    setAppMode("rigorous");
  };

  const handleSwitchToSimple = () => {
    setAppMode("simple");
  };

  const handleBackToSelection = () => {
    setAppMode("selection");
  };

  // Show mode selection screen
  if (appMode === "selection") {
    return <ModeSelection onSelectMode={handleSelectMode} />;
  }

  // Show simple workflow
  if (appMode === "simple") {
    return <SimplePodcastWorkflow onSwitchMode={handleSwitchToRigorous} />;
  }

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
      
      // Trigger n8n webhook
      triggerN8nWebhook(n8nConfig, "script_generated", {
        variants: data.variants,
        topics: config.topics,
        duration: duration
      });
      
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
      
      // Trigger n8n webhook
      triggerN8nWebhook(n8nConfig, "audio_generated", {
        script: finalScript,
        voiceId: voiceId,
        audioUrl: url
      });
      
      toast({
        title: "Audio fertig!",
        description: "Dein Podcast-Audio wurde erfolgreich erstellt."
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

  const handleContinueToVideo = () => {
    setCurrentStep("video");
  };

  const handleGenerateVideo = async (retryWithBaseImage?: string) => {
    setIsGeneratingVideo(true);
    setVideoStatus("starting");
    setVideoUrl("");
    if (!retryWithBaseImage) {
      setVideoPredictionId(null);
    }

    try {
      const { data, error } = await supabase.functions.invoke("generate-podcast-video", {
        body: {
          prompt: config.topics.slice(0, 200),
          background: videoConfig.background,
          character1: videoConfig.character1,
          character2: videoConfig.character2,
          ...(retryWithBaseImage && { existingBaseImage: retryWithBaseImage })
        }
      });

      if (error) {
        const errorMsg = typeof error === 'string' ? error : (error.message || 'Unknown error');
        throw new Error(errorMsg);
      }
      
      // Handle rate limit with automatic retry
      if (data?.isRateLimit && data?.retryAfter) {
        const retrySeconds = data.retryAfter || 10;
        const baseImage = data.baseImageUrl;
        toast({
          title: "Rate Limit - Automatischer Retry",
          description: `Warte ${retrySeconds} Sekunden und versuche erneut...`
        });
        
        // Retry after the specified delay, using the base image if available
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
        description: "Die Generierung wurde gestartet. Dies kann einige Minuten dauern."
      });
    } catch (error) {
      console.error("Video generation error:", error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Video-Generierung fehlgeschlagen",
        variant: "destructive"
      });
      setIsGeneratingVideo(false);
    }
  };

  const handleGenerateImage = async () => {
    setIsGeneratingImage(true);

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_LOVABLE_API_KEY || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            {
              role: "user",
              content: `Generate a beautiful, professional podcast studio background image. ${videoConfig.background ? `Background: ${videoConfig.background}.` : ""} ${videoConfig.character1 ? `Include a person: ${videoConfig.character1}.` : ""} The image should be cinematic and modern with soft lighting. Topic context: ${config.topics.slice(0, 200)}. Ultra high resolution.`
            }
          ],
          modalities: ["image", "text"]
        })
      });

      const data = await response.json();
      const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!generatedImageUrl) {
        throw new Error("Bild-Generierung fehlgeschlagen");
      }

      setImageUrl(generatedImageUrl);
      setIsGeneratingImage(false);
      setCompletedSteps(prev => [...prev.filter(s => s !== "video"), "video"]);

      toast({
        title: "Bild fertig!",
        description: "Dein Podcast-Hintergrundbild wurde erstellt."
      });
    } catch (error) {
      console.error("Image generation error:", error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Bild-Generierung fehlgeschlagen",
        variant: "destructive"
      });
      setIsGeneratingImage(false);
    }
  };

  const handleStartVisualGeneration = () => {
    if (visualOutputType === "image") {
      handleGenerateImage();
    } else {
      handleGenerateVideo();
    }
  };

  const handleReset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setCurrentStep("config");
    setCompletedSteps([]);
    setVariants([]);
    setSelectedVariantId(null);
    setOptimizedScript(null);
    setFinalScript("");
    setAudioUrl("");
    setVideoUrl("");
    setImageUrl("");
    setVideoPredictionId(null);
    setVideoStatus("");
    setVisualOutputType("video");
  };

  const handleSaveConfiguration = async () => {
    if (!user || !saveConfigName.trim()) {
      toast({
        title: "Name erforderlich",
        description: "Bitte gib einen Namen für die Konfiguration ein.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("podcast_configurations").insert({
        user_id: user.id,
        name: saveConfigName.trim(),
        topics: config.topics,
        speaker_background: config.speakerBackground,
        podcast_structure: config.podcastStructure,
        text_style: config.textStyle,
        voice_id: voiceId,
        video_background: videoConfig.background,
        character1: videoConfig.character1,
        character2: videoConfig.character2,
        script: finalScript || null,
        audio_url: null,
        video_url: videoUrl || null
      });

      if (error) throw error;

      toast({
        title: "Gespeichert!",
        description: "Deine Konfiguration wurde gespeichert."
      });
      setSaveConfigName("");
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Fehler",
        description: "Speichern fehlgeschlagen",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadConfiguration = (savedConfig: any) => {
    setConfig({
      speakerBackground: savedConfig.speaker_background || "",
      podcastStructure: savedConfig.podcast_structure || "",
      textStyle: savedConfig.text_style || "",
      topics: savedConfig.topics || ""
    });
    setVideoConfig({
      background: savedConfig.video_background || "",
      character1: savedConfig.character1 || "",
      character2: savedConfig.character2 || ""
    });
    if (savedConfig.voice_id) setVoiceId(savedConfig.voice_id);
    if (savedConfig.script) setFinalScript(savedConfig.script);
    setShowSavedDialog(false);
    
    toast({
      title: "Geladen!",
      description: "Konfiguration wurde geladen."
    });
  };

  const handleBack = () => {
    const steps: WorkflowStep[] = ["config", "variants", "optimize", "audio", "video"];
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
                  Professionelle Podcasts mit Video
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleSwitchToSimple} className="gap-2">
                <Zap className="w-4 h-4" />
                Einfacher Modus
              </Button>
              <Link to="/settings">
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <Settings className="w-4 h-4" />
                </Button>
              </Link>
              {user && (
                <>
                  <Dialog open={showSavedDialog} onOpenChange={setShowSavedDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Gespeichert
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Gespeicherte Konfigurationen</DialogTitle>
                      </DialogHeader>
                      <SavedConfigurations onLoad={handleLoadConfiguration} />
                    </DialogContent>
                  </Dialog>
                </>
              )}
              <UserMenu />
            </div>
          </div>
        </header>

        {/* Workflow Stepper */}
        <div className="max-w-4xl mx-auto mb-8">
          <WorkflowStepper currentStep={currentStep} completedSteps={completedSteps} />
        </div>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto">
          <div className="p-6 md:p-8 rounded-2xl bg-card/50 backdrop-blur-sm border border-border animate-slide-up">
            
            {/* Step: Config */}
            {currentStep === "config" && (
              <div className="space-y-8">
                <Tabs defaultValue="podcast" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="podcast">Podcast-Konfiguration</TabsTrigger>
                    <TabsTrigger value="video">Video-Konfiguration</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="podcast">
                    <PodcastConfig 
                      config={config} 
                      onChange={setConfig}
                      disabled={isGeneratingVariants}
                    />
                  </TabsContent>
                  
                  <TabsContent value="video">
                    <VideoConfig
                      config={videoConfig}
                      onChange={setVideoConfig}
                      disabled={isGeneratingVariants}
                    />
                  </TabsContent>
                </Tabs>
                
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
                        Audio erstellen
                      </h2>
                      <p className="text-muted-foreground">
                        Wähle eine Stimme und erstelle das Audio
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
                          Audio erstellen
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-8">
                    <div className="text-center space-y-2">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-primary">Audio fertig!</span>
                      </div>
                    </div>

                    <AudioPlayer audioUrl={audioUrl} title="Mein Podcast" />

                    <div className="flex gap-3">
                      <Button variant="outline" onClick={handleBack} className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Zurück
                      </Button>
                      <Button
                        onClick={handleContinueToVideo}
                        className="flex-1 h-14 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground glow-primary"
                      >
                        <Video className="h-5 w-5" />
                        Weiter zu Video
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step: Video */}
            {currentStep === "video" && (
              <div className="space-y-6">
                {!videoUrl && !imageUrl ? (
                  <>
                    <div className="text-center space-y-2">
                      <h2 className="text-2xl font-display font-bold text-foreground">
                        Visuellen Output erstellen
                      </h2>
                      <p className="text-muted-foreground">
                        Wähle zwischen Bild oder Video
                      </p>
                    </div>

                    {/* Visual Output Choice */}
                    <VisualOutputSelector
                      value={visualOutputType}
                      onChange={setVisualOutputType}
                      disabled={isGeneratingVideo || isGeneratingImage}
                    />

                    {/* Video Config Summary */}
                    <div className="space-y-4 p-4 rounded-xl bg-muted/30 border border-border">
                      <h3 className="font-medium text-foreground">Einstellungen</h3>
                      <div className="grid gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Hintergrund:</span>
                          <p className="text-foreground">{videoConfig.background || "Standard-Studio"}</p>
                        </div>
                        {visualOutputType === "video" && (
                          <>
                            <div>
                              <span className="text-muted-foreground">Sprecher 1:</span>
                              <p className="text-foreground">{videoConfig.character1 || "Automatisch generiert"}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Sprecher 2:</span>
                              <p className="text-foreground">{videoConfig.character2 || "Automatisch generiert"}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {(isGeneratingVideo || isGeneratingImage) ? (
                      <div className="space-y-4 p-6 rounded-xl bg-secondary/50 border border-border">
                        <div className="flex items-center justify-center gap-3">
                          <Loader2 className="h-6 w-6 text-primary animate-spin" />
                          <span className="font-medium text-foreground">
                            {isGeneratingImage ? "Bild wird generiert..." : "Video wird generiert..."}
                          </span>
                        </div>
                        {isGeneratingVideo && (
                          <>
                            <p className="text-center text-sm text-muted-foreground">
                              Status: {videoStatus}
                            </p>
                            <p className="text-center text-xs text-muted-foreground">
                              Dies kann 1-3 Minuten dauern
                            </p>
                          </>
                        )}
                        {isGeneratingImage && (
                          <p className="text-center text-xs text-muted-foreground">
                            Dies dauert nur wenige Sekunden
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={handleBack} className="gap-2">
                          <ArrowLeft className="h-4 w-4" />
                          Zurück
                        </Button>
                        <Button
                          onClick={handleStartVisualGeneration}
                          className="flex-1 h-14 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground glow-primary"
                        >
                          {visualOutputType === "image" ? (
                            <>
                              <ImageIcon className="h-5 w-5" />
                              Bild generieren
                            </>
                          ) : (
                            <>
                              <Video className="h-5 w-5" />
                              Video generieren
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-8">
                    <div className="text-center space-y-2">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-primary">Podcast komplett!</span>
                      </div>
                    </div>

                    {imageUrl && !videoUrl ? (
                      // Image mode - show image with audio
                      <div className="space-y-4">
                        <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
                          <img 
                            src={imageUrl} 
                            alt="Podcast Hintergrund" 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/90 text-white text-xs font-medium">
                            <ImageIcon className="h-3 w-3" />
                            Bild-Modus
                          </div>
                        </div>
                        <AudioPlayer audioUrl={audioUrl} title="Mein Podcast" />
                      </div>
                    ) : (
                      <VideoPlayer 
                        videoUrl={videoUrl} 
                        audioUrl={audioUrl}
                        title="Mein Podcast Video"
                        onRegenerate={() => handleGenerateVideo()}
                        isRegenerating={isGeneratingVideo}
                      />
                    )}
                    
                    {/* Script Display */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">Vollständiges Script</Label>
                      <div className="p-4 rounded-xl bg-muted/30 border border-border max-h-48 overflow-y-auto">
                        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap font-mono">
                          {finalScript}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      {user && (
                        <div className="flex gap-2 flex-1">
                          <Input
                            placeholder="Name der Konfiguration..."
                            value={saveConfigName}
                            onChange={(e) => setSaveConfigName(e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            onClick={handleSaveConfiguration}
                            disabled={isSaving || !saveConfigName.trim()}
                            className="gap-2"
                          >
                            {isSaving ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            Speichern
                          </Button>
                        </div>
                      )}
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

export default Index;
