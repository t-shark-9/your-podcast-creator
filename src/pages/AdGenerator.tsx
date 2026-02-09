import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, 
  Sparkles, 
  Video, 
  Wand2, 
  Music, 
  Type, 
  FolderOpen, 
  Download,
  ExternalLink,
  Play,
  ArrowRight,
  CheckCircle2,
  Settings,
  RefreshCw,
  Mic
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/i18n/LanguageContext";
import type { AdProject, AdProjectStatus, CaptionStyle } from "@/types/podcast";

const EXAMPLE_PROMPTS = [
  "Ein modernes Smartphone liegt auf einem minimalistischen Schreibtisch, Sonnenlicht fällt durch das Fenster",
  "Eine junge Frau joggt durch einen herbstlichen Park bei Sonnenaufgang",
  "Ein Kaffeebecher dampft in einem gemütlichen Café mit Regentropfen am Fenster",
  "Ein Elektroauto fährt durch eine futuristische Stadt bei Nacht mit Neonlichtern"
];

const CAPTION_STYLES: { id: string; name: string; preview: string }[] = [
  { id: "modern", name: "Modern", preview: "Weiß mit Schatten" },
  { id: "bold", name: "Bold", preview: "Gelb auf Schwarz" },
  { id: "minimal", name: "Minimal", preview: "Weiß transparent" },
  { id: "dynamic", name: "Dynamisch", preview: "Animierte Wörter" }
];

const MUSIC_GENRES = [
  { id: "upbeat", name: "Upbeat", description: "Energisch & motivierend" },
  { id: "chill", name: "Chill", description: "Entspannt & modern" },
  { id: "cinematic", name: "Cinematic", description: "Episch & dramatisch" },
  { id: "corporate", name: "Corporate", description: "Professionell & sauber" },
  { id: "none", name: "Keine Musik", description: "Nur Originalton" }
];

export default function AdGenerator() {
  const [prompt, setPrompt] = useState("");
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [videoModel, setVideoModel] = useState<"veo3" | "sora">("veo3");
  const [status, setStatus] = useState<AdProjectStatus>("draft");
  const [progress, setProgress] = useState(0);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [rawVideoUrl, setRawVideoUrl] = useState("");
  const [captionedVideoUrl, setCaptionedVideoUrl] = useState("");
  const [selectedCaptionStyle, setSelectedCaptionStyle] = useState("modern");
  const [selectedMusicGenre, setSelectedMusicGenre] = useState("upbeat");
  const [captionText, setCaptionText] = useState("");
  const [googleDriveFolderId, setGoogleDriveFolderId] = useState("");
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);
  const [driveUrl, setDriveUrl] = useState("");
  
  const { toast } = useToast();
  const { t } = useLanguage();

  // Simulate progress during generation
  useEffect(() => {
    if (status === "generating_video") {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 5;
        });
      }, 2000);
      return () => clearInterval(interval);
    } else if (status === "completed") {
      setProgress(100);
    }
  }, [status]);

  const enhancePrompt = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt fehlt",
        description: "Bitte beschreibe zuerst dein Video.",
        variant: "destructive"
      });
      return;
    }

    setIsEnhancing(true);
    setStatus("enhancing_prompt");

    try {
      const { data, error } = await supabase.functions.invoke('enhance-video-prompt', {
        body: {
          prompt: prompt.trim(),
          targetModel: videoModel
        }
      });

      if (error) throw error;

      setEnhancedPrompt(data.enhancedPrompt || data.prompt);
      setStatus("draft");

      toast({
        title: "Prompt verbessert!",
        description: "Der Prompt wurde für bessere Videoqualität optimiert."
      });

    } catch (error: any) {
      console.error('Error enhancing prompt:', error);
      // Fallback: create a basic enhancement locally
      const enhanced = `Cinematic shot: ${prompt}. High quality, 4K resolution, professional lighting, smooth camera movement, vibrant colors, detailed textures.`;
      setEnhancedPrompt(enhanced);
      setStatus("draft");
      
      toast({
        title: "Prompt verbessert (lokal)",
        description: "Der Prompt wurde lokal optimiert."
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  const generateVideo = async () => {
    const finalPrompt = enhancedPrompt || prompt;
    if (!finalPrompt.trim()) {
      toast({
        title: "Prompt fehlt",
        description: "Bitte beschreibe zuerst dein Video.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setStatus("generating_video");
    setProgress(0);

    try {
      const { data, error } = await supabase.functions.invoke('generate-ad-video', {
        body: {
          prompt: finalPrompt,
          model: videoModel,
          aspectRatio: "16:9",
          duration: 10
        }
      });

      if (error) throw error;

      // Start polling for video status
      if (data.videoId) {
        pollVideoStatus(data.videoId);
      } else if (data.videoUrl) {
        setRawVideoUrl(data.videoUrl);
        setStatus("adding_captions");
        toast({
          title: "Video generiert!",
          description: "Jetzt kannst du Untertitel und Musik hinzufügen."
        });
      }

    } catch (error: any) {
      console.error('Error generating video:', error);
      toast({
        title: "Fehler bei der Video-Generierung",
        description: error.message || "Das Video konnte nicht erstellt werden.",
        variant: "destructive"
      });
      setStatus("failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const pollVideoStatus = async (videoId: string) => {
    const apiKey = localStorage.getItem("joggai_api_key") || import.meta.env.VITE_JOGGAI_API_KEY;
    
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`https://api.jogg.ai/v2/avatar_video/${videoId}`, {
          headers: { "x-api-key": apiKey }
        });
        const data = await response.json();

        if (data.data?.status === "completed" && data.data?.video_url) {
          clearInterval(interval);
          setRawVideoUrl(data.data.video_url);
          setStatus("adding_captions");
          toast({
            title: "Video generiert!",
            description: "Jetzt kannst du Untertitel und Musik hinzufügen."
          });
        } else if (data.data?.status === "failed") {
          clearInterval(interval);
          setStatus("failed");
          toast({
            title: "Video-Generierung fehlgeschlagen",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 10000);
  };

  const addCaptionsAndMusic = async () => {
    if (!rawVideoUrl) {
      toast({
        title: "Kein Video",
        description: "Bitte generiere zuerst ein Video.",
        variant: "destructive"
      });
      return;
    }

    setStatus("adding_captions");
    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('add-captions-music', {
        body: {
          videoUrl: rawVideoUrl,
          captionText: captionText,
          captionStyle: selectedCaptionStyle,
          musicGenre: selectedMusicGenre
        }
      });

      if (error) throw error;

      setCaptionedVideoUrl(data.videoUrl || rawVideoUrl);
      setStatus("completed");

      toast({
        title: "Video fertig!",
        description: "Untertitel und Musik wurden hinzugefügt."
      });

    } catch (error: any) {
      console.error('Error adding captions:', error);
      // Fallback: use raw video
      setCaptionedVideoUrl(rawVideoUrl);
      setStatus("completed");
      toast({
        title: "Video fertig",
        description: "Das Video ist bereit (ohne zusätzliche Bearbeitung)."
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveToGoogleDrive = async () => {
    const videoUrl = captionedVideoUrl || rawVideoUrl;
    if (!videoUrl) {
      toast({
        title: "Kein Video",
        description: "Bitte erstelle zuerst ein Video.",
        variant: "destructive"
      });
      return;
    }

    setIsSavingToDrive(true);
    setStatus("uploading_drive");

    try {
      const { data, error } = await supabase.functions.invoke('save-to-drive', {
        body: {
          videoUrl: videoUrl,
          folderId: googleDriveFolderId,
          fileName: `ad-video-${new Date().toISOString().split('T')[0]}.mp4`
        }
      });

      if (error) throw error;

      setDriveUrl(data.driveUrl || data.fileUrl);
      setStatus("completed");

      toast({
        title: "In Google Drive gespeichert!",
        description: "Das Video wurde in deinem Google Drive gespeichert."
      });

    } catch (error: any) {
      console.error('Error saving to drive:', error);
      toast({
        title: "Fehler beim Speichern",
        description: "Das Video konnte nicht in Google Drive gespeichert werden. Du kannst es manuell herunterladen.",
        variant: "destructive"
      });
      setStatus("completed");
    } finally {
      setIsSavingToDrive(false);
    }
  };

  const downloadVideo = () => {
    const videoUrl = captionedVideoUrl || rawVideoUrl;
    if (videoUrl) {
      const a = document.createElement("a");
      a.href = videoUrl;
      a.download = `ad-video-${new Date().toISOString().split('T')[0]}.mp4`;
      a.click();
    }
  };

  const resetProject = () => {
    setPrompt("");
    setEnhancedPrompt("");
    setStatus("draft");
    setProgress(0);
    setRawVideoUrl("");
    setCaptionedVideoUrl("");
    setCaptionText("");
    setDriveUrl("");
  };

  const getStatusLabel = () => {
    switch (status) {
      case "draft": return t("ads.status.draft");
      case "enhancing_prompt": return t("ads.status.enhancing");
      case "generating_video": return t("ads.status.generating");
      case "adding_captions": return t("ads.status.captions");
      case "uploading_drive": return t("ads.status.uploading");
      case "completed": return t("ads.status.completed");
      case "failed": return t("ads.status.failed");
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Video className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold">{t("ads.title")}</h1>
              <Badge variant="secondary">{getStatusLabel()}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  {t("nav.home")}
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={resetProject}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {t("ads.restart")}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Input & Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Video Prompt */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">1</span>
                  Video beschreiben
                </CardTitle>
                <CardDescription>
                  Beschreibe das Video, das du erstellen möchtest. Die KI verbessert deinen Prompt automatisch.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="z.B. Eine Person öffnet ein Paket mit einem neuen Produkt und zeigt ihre begeisterte Reaktion..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[100px]"
                  disabled={status !== "draft"}
                />

                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_PROMPTS.map((example, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      onClick={() => setPrompt(example)}
                      disabled={status !== "draft"}
                      className="text-xs"
                    >
                      {example.substring(0, 40)}...
                    </Button>
                  ))}
                </div>

                <div className="flex items-center gap-4">
                  <div className="space-y-2 flex-1">
                    <Label>Video-Modell</Label>
                    <Select value={videoModel} onValueChange={(v: "veo3" | "sora") => setVideoModel(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="veo3">Google VEO 3</SelectItem>
                        <SelectItem value="sora">OpenAI Sora</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="pt-6">
                    <Button 
                      onClick={enhancePrompt} 
                      disabled={isEnhancing || !prompt.trim() || status !== "draft"}
                      className="gap-2"
                    >
                      {isEnhancing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Wand2 className="w-4 h-4" />
                      )}
                      Prompt verbessern
                    </Button>
                  </div>
                </div>

                {enhancedPrompt && (
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">Verbesserter Prompt:</span>
                    </div>
                    <Textarea
                      value={enhancedPrompt}
                      onChange={(e) => setEnhancedPrompt(e.target.value)}
                      className="min-h-[80px] bg-background"
                    />
                  </div>
                )}

                <Button
                  onClick={generateVideo}
                  disabled={isGenerating || (!prompt.trim() && !enhancedPrompt.trim()) || status === "generating_video"}
                  className="w-full gap-2"
                  size="lg"
                >
                  {isGenerating || status === "generating_video" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Video wird generiert...
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4" />
                      Video generieren
                    </>
                  )}
                </Button>

                {status === "generating_video" && (
                  <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center">
                      Video wird mit {videoModel === "veo3" ? "Google VEO 3" : "OpenAI Sora"} generiert... (~2-5 Minuten)
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Captions & Music */}
            {(rawVideoUrl || status === "adding_captions" || status === "completed") && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">2</span>
                    Untertitel & Musik
                  </CardTitle>
                  <CardDescription>
                    Füge automatische Untertitel und Hintergrundmusik hinzu.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Type className="w-4 h-4" />
                      Untertitel-Text (optional)
                    </Label>
                    <Textarea
                      placeholder="Leer lassen für automatische Transkription oder Text eingeben..."
                      value={captionText}
                      onChange={(e) => setCaptionText(e.target.value)}
                      className="min-h-[60px]"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Untertitel-Stil</Label>
                      <Select value={selectedCaptionStyle} onValueChange={setSelectedCaptionStyle}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CAPTION_STYLES.map(style => (
                            <SelectItem key={style.id} value={style.id}>
                              {style.name} - {style.preview}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Music className="w-4 h-4" />
                        Hintergrundmusik
                      </Label>
                      <Select value={selectedMusicGenre} onValueChange={setSelectedMusicGenre}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MUSIC_GENRES.map(genre => (
                            <SelectItem key={genre.id} value={genre.id}>
                              {genre.name} - {genre.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={addCaptionsAndMusic}
                    disabled={isGenerating || !rawVideoUrl}
                    className="w-full gap-2"
                  >
                    {isGenerating && status === "adding_captions" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Wird bearbeitet...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Untertitel & Musik hinzufügen
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Save to Drive */}
            {(captionedVideoUrl || (rawVideoUrl && status === "completed")) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">3</span>
                    Speichern & Exportieren
                  </CardTitle>
                  <CardDescription>
                    Speichere das Video in Google Drive oder lade es herunter.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4" />
                      Google Drive Ordner-ID (optional)
                    </Label>
                    <Input
                      placeholder="z.B. 1ABC...xyz (aus der URL deines Drive-Ordners)"
                      value={googleDriveFolderId}
                      onChange={(e) => setGoogleDriveFolderId(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Die Ordner-ID findest du in der URL deines Google Drive Ordners
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={saveToGoogleDrive}
                      disabled={isSavingToDrive}
                      className="flex-1 gap-2"
                    >
                      {isSavingToDrive ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Wird hochgeladen...
                        </>
                      ) : (
                        <>
                          <FolderOpen className="w-4 h-4" />
                          In Google Drive speichern
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={downloadVideo}
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Herunterladen
                    </Button>
                  </div>

                  {driveUrl && (
                    <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Gespeichert!</span>
                      <a 
                        href={driveUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1 ml-auto"
                      >
                        In Drive öffnen
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-6">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-base">Video-Vorschau</CardTitle>
              </CardHeader>
              <CardContent>
                {(captionedVideoUrl || rawVideoUrl) ? (
                  <div className="space-y-4">
                    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                      <video
                        src={captionedVideoUrl || rawVideoUrl}
                        controls
                        className="w-full h-full"
                        poster={`${captionedVideoUrl || rawVideoUrl}?thumb=true`}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={() => window.open(captionedVideoUrl || rawVideoUrl, "_blank")}
                      >
                        <ExternalLink className="w-3 h-3" />
                        Vollbild
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={downloadVideo}
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Noch kein Video</p>
                      <p className="text-xs">Erstelle ein Video um die Vorschau zu sehen</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Workflow Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Workflow</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { key: "draft", label: "Video beschreiben", icon: Type },
                    { key: "enhancing_prompt", label: "Prompt verbessern", icon: Wand2 },
                    { key: "generating_video", label: "Video generieren", icon: Video },
                    { key: "adding_captions", label: "Untertitel & Musik", icon: Music },
                    { key: "uploading_drive", label: "In Drive speichern", icon: FolderOpen },
                    { key: "completed", label: "Fertig!", icon: CheckCircle2 }
                  ].map((step, index) => {
                    const Icon = step.icon;
                    const statusOrder = ["draft", "enhancing_prompt", "generating_video", "adding_captions", "uploading_drive", "completed"];
                    const currentIndex = statusOrder.indexOf(status);
                    const stepIndex = statusOrder.indexOf(step.key);
                    const isActive = step.key === status;
                    const isCompleted = stepIndex < currentIndex;
                    
                    return (
                      <div
                        key={step.key}
                        className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                          isActive ? "bg-primary/10" : isCompleted ? "bg-green-500/10" : ""
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          isCompleted ? "bg-green-500 text-white" :
                          isActive ? "bg-primary text-primary-foreground" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : isActive && status !== "completed" ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Icon className="w-3 h-3" />
                          )}
                        </div>
                        <span className={`text-sm ${isActive ? "font-medium" : isCompleted ? "text-muted-foreground" : ""}`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
