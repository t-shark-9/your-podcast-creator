import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Mic,
  LogIn
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/i18n/LanguageContext";
import type { AdProject, AdProjectStatus, CaptionStyle } from "@/types/podcast";

const EXAMPLE_PROMPTS_DE = [
  "Ein modernes Smartphone liegt auf einem minimalistischen Schreibtisch, Sonnenlicht fällt durch das Fenster",
  "Eine junge Frau joggt durch einen herbstlichen Park bei Sonnenaufgang",
  "Ein Kaffeebecher dampft in einem gemütlichen Café mit Regentropfen am Fenster",
  "Ein Elektroauto fährt durch eine futuristische Stadt bei Nacht mit Neonlichtern"
];

const EXAMPLE_PROMPTS_EN = [
  "A modern smartphone sits on a minimalist desk, sunlight streaming through the window",
  "A young woman jogs through an autumn park at sunrise",
  "A coffee cup steams in a cozy café with raindrops on the window",
  "An electric car drives through a futuristic city at night with neon lights"
];

const CAPTION_STYLES: { id: string; name: string; preview_de: string; preview_en: string }[] = [
  { id: "modern", name: "Modern", preview_de: "Weiß mit Schatten", preview_en: "White with shadow" },
  { id: "bold", name: "Bold", preview_de: "Gelb auf Schwarz", preview_en: "Yellow on black" },
  { id: "minimal", name: "Minimal", preview_de: "Weiß transparent", preview_en: "White transparent" },
  { id: "dynamic", name: "Dynamic", preview_de: "Animierte Wörter", preview_en: "Animated words" }
];

const MUSIC_GENRES_DATA = [
  { id: "upbeat", name: "Upbeat", desc_de: "Energisch & motivierend", desc_en: "Energetic & motivating" },
  { id: "chill", name: "Chill", desc_de: "Entspannt & modern", desc_en: "Relaxed & modern" },
  { id: "cinematic", name: "Cinematic", desc_de: "Episch & dramatisch", desc_en: "Epic & dramatic" },
  { id: "corporate", name: "Corporate", desc_de: "Professionell & sauber", desc_en: "Professional & clean" },
  { id: "none", name_de: "Keine Musik", name_en: "No Music", desc_de: "Nur Originalton", desc_en: "Original audio only" }
];

export default function AdGenerator() {
  const [prompt, setPrompt] = useState("");
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
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
  const { t, language } = useLanguage();
  const EXAMPLE_PROMPTS = language === "de" ? EXAMPLE_PROMPTS_DE : EXAMPLE_PROMPTS_EN;
  const MUSIC_GENRES = MUSIC_GENRES_DATA.map(g => ({
    id: g.id,
    name: g.id === "none" ? (language === "de" ? g.name_de : g.name_en) : g.name,
    description: language === "de" ? g.desc_de : g.desc_en
  }));

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
        title: t("ads.prompt.missing"),
        description: t("ads.prompt.missing.desc"),
        variant: "destructive"
      });
      return;
    }

    setIsEnhancing(true);
    setStatus("enhancing_prompt");

    try {
      const { data, error } = await supabase.functions.invoke('enhance-video-prompt', {
        body: {
          prompt: prompt.trim()
        }
      });

      if (error) throw error;

      setEnhancedPrompt(data.enhancedPrompt || data.prompt);
      setStatus("draft");

      toast({
        title: t("ads.prompt.enhanced"),
        description: t("ads.prompt.enhanced.desc")
      });

    } catch (error) {
      console.error('Error enhancing prompt:', error);
      // Fallback: create a basic enhancement locally
      const enhanced = `Cinematic shot: ${prompt}. High quality, 4K resolution, professional lighting, smooth camera movement, vibrant colors, detailed textures.`;
      setEnhancedPrompt(enhanced);
      setStatus("draft");
      
      toast({
        title: t("ads.prompt.enhanced.local"),
        description: t("ads.prompt.enhanced.local.desc")
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  const generateVideo = async () => {
    const finalPrompt = enhancedPrompt || prompt;
    if (!finalPrompt.trim()) {
      toast({
        title: t("ads.prompt.missing"),
        description: t("ads.prompt.missing.desc"),
        variant: "destructive"
      });
      return;
    }

    const apiKey = localStorage.getItem("joggai_api_key") || import.meta.env.VITE_JOGGAI_API_KEY;
    
    if (!apiKey) {
      toast({
        title: t("ads.apikey.missing"),
        description: t("ads.apikey.missing.desc"),
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setStatus("generating_video");
    setProgress(0);

    try {
      // Get avatar settings from localStorage
      const avatarId = localStorage.getItem("joggai_speaker1_avatar") || localStorage.getItem("joggai_selected_avatar") || "412";
      const voiceId = localStorage.getItem("joggai_speaker1_voice") || localStorage.getItem("joggai_selected_voice") || "MFZUKuGQUsGJPQjTS4wC";
      const avatarType = parseInt(localStorage.getItem("joggai_speaker1_avatar_type") || localStorage.getItem("joggai_avatar_type") || "0");

      const requestBody = {
        avatar: {
          avatar_id: parseInt(avatarId),
          avatar_type: avatarType,
        },
        voice: {
          type: "script",
          voice_id: voiceId,
          script: finalPrompt,
        },
        aspect_ratio: "landscape",
        screen_style: 1,
        caption: true,
      };

      console.log("JoggAI request body:", JSON.stringify(requestBody, null, 2));

      const { data, error: invokeErr } = await supabase.functions.invoke("joggai-proxy", {
        body: {
          endpoint: "/create_video_from_avatar",
          method: "POST",
          payload: requestBody,
          apiKey,
        },
      });
      if (invokeErr) throw invokeErr;
      console.log("JoggAI response:", data);

      if (data.code !== 0) {
        throw new Error(data.msg || "Video creation failed");
      }

      const videoId = data.data.video_id;
      
      toast({
        title: t("ads.status.generating"),
        description: t("ads.progress"),
      });

      // Start polling for video status
      pollVideoStatus(videoId, apiKey);

    } catch (error) {
      console.error('Error generating video:', error);
      toast({
        title: t("ads.video.error"),
        description: error instanceof Error ? error.message : t("ads.video.error.desc"),
        variant: "destructive"
      });
      setStatus("failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const pollVideoStatus = async (videoId: string, apiKey: string) => {
    const interval = setInterval(async () => {
      try {
        const { data, error: invokeErr } = await supabase.functions.invoke("joggai-proxy", {
          body: { endpoint: `/avatar_video/${videoId}`, method: "GET", apiKey }
        });
        if (invokeErr) { console.error("Polling proxy error:", invokeErr); return; }
        console.log("JoggAI status check:", data);

        if (data.data?.status === "completed" && data.data?.video_url) {
          clearInterval(interval);
          setRawVideoUrl(data.data.video_url);
          setStatus("adding_captions");
          setIsGenerating(false);
          toast({
            title: t("ads.video.generated"),
            description: t("ads.video.generated.desc")
          });
        } else if (data.data?.status === "failed") {
          clearInterval(interval);
          setStatus("failed");
          setIsGenerating(false);
          toast({
            title: t("ads.video.failed"),
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
        title: t("ads.no.video"),
        description: t("ads.no.video.desc"),
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
        title: t("ads.video.ready"),
        description: t("ads.video.ready.desc")
      });

    } catch (error) {
      console.error('Error adding captions:', error);
      // Fallback: use raw video
      setCaptionedVideoUrl(rawVideoUrl);
      setStatus("completed");
      toast({
        title: t("ads.video.ready.fallback"),
        description: t("ads.video.ready.fallback.desc")
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveToGoogleDrive = async () => {
    const videoUrl = captionedVideoUrl || rawVideoUrl;
    if (!videoUrl) {
      toast({
        title: t("ads.no.video"),
        description: t("ads.no.video.desc"),
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
        title: t("ads.drive.saved"),
        description: t("ads.drive.saved.desc")
      });

    } catch (error) {
      console.error('Error saving to drive:', error);
      toast({
        title: t("ads.drive.error"),
        description: t("ads.drive.error.desc"),
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
              <Link to="/auth">
                <Button variant="ghost" size="sm" className="gap-2">
                  <LogIn className="w-4 h-4" />
                  {t("nav.login")}
                </Button>
              </Link>
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
                  {t("ads.step1.title")}
                </CardTitle>
                <CardDescription>
                  {t("ads.step1.desc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder={t("ads.placeholder")}
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
                  {t("ads.enhance")}
                </Button>

                {enhancedPrompt && (
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">{t("ads.enhanced")}</span>
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
                      {t("ads.generating")}
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4" />
                      {t("ads.generate")}
                    </>
                  )}
                </Button>

                {status === "generating_video" && (
                  <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center">
                      {t("ads.progress")}
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
                    {t("ads.step2.title")}
                  </CardTitle>
                  <CardDescription>
                    {t("ads.step2.desc")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Type className="w-4 h-4" />
                      {t("ads.captions.text")}
                    </Label>
                    <Textarea
                      placeholder={t("ads.captions.placeholder")}
                      value={captionText}
                      onChange={(e) => setCaptionText(e.target.value)}
                      className="min-h-[60px]"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("ads.captions.style")}</Label>
                      <Select value={selectedCaptionStyle} onValueChange={setSelectedCaptionStyle}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CAPTION_STYLES.map(style => (
                            <SelectItem key={style.id} value={style.id}>
                              {style.name} - {language === "de" ? style.preview_de : style.preview_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Music className="w-4 h-4" />
                        {t("ads.music")}
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
                        {t("ads.captions.processing")}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        {t("ads.captions.apply")}
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
                    {t("ads.step3.title")}
                  </CardTitle>
                  <CardDescription>
                    {t("ads.step3.desc")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4" />
                      {t("ads.drive.folder")}
                    </Label>
                    <Input
                      placeholder={t("ads.drive.folder.placeholder")}
                      value={googleDriveFolderId}
                      onChange={(e) => setGoogleDriveFolderId(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("ads.drive.folder.hint")}
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
                          {t("ads.drive.saving")}
                        </>
                      ) : (
                        <>
                          <FolderOpen className="w-4 h-4" />
                          {t("ads.drive.save")}
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={downloadVideo}
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      {t("ads.download")}
                    </Button>
                  </div>

                  {driveUrl && (
                    <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-sm">{t("ads.drive.saved.badge")}</span>
                      <a 
                        href={driveUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1 ml-auto"
                      >
                        {t("ads.drive.open")}
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
                <CardTitle className="text-base">{t("ads.preview")}</CardTitle>
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
                        {t("ads.fullscreen")}
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
                      <p className="text-sm">{t("ads.preview.empty")}</p>
                      <p className="text-xs">{t("ads.preview.empty.desc")}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Workflow Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("ads.workflow")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { key: "draft", label: t("ads.workflow.describe"), icon: Type },
                    { key: "enhancing_prompt", label: t("ads.workflow.enhance"), icon: Wand2 },
                    { key: "generating_video", label: t("ads.workflow.generate"), icon: Video },
                    { key: "adding_captions", label: t("ads.workflow.captions"), icon: Music },
                    { key: "uploading_drive", label: t("ads.workflow.drive"), icon: FolderOpen },
                    { key: "completed", label: t("ads.workflow.done"), icon: CheckCircle2 }
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
