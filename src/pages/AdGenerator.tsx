import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, 
  Video, 
  Download,
  ExternalLink,
  Play,
  CheckCircle2,
  RefreshCw,
  LogIn,
  Pencil,
  Type
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/i18n/LanguageContext";

const EXAMPLE_PROMPTS_DE = [
  "Ein modernes Smartphone liegt auf einem minimalistischen Schreibtisch, Sonnenlicht f\u00e4llt durch das Fenster",
  "Eine junge Frau joggt durch einen herbstlichen Park bei Sonnenaufgang",
  "Ein Kaffeebecher dampft in einem gem\u00fctlichen Caf\u00e9 mit Regentropfen am Fenster",
  "Ein Elektroauto f\u00e4hrt durch eine futuristische Stadt bei Nacht mit Neonlichtern"
];

const EXAMPLE_PROMPTS_EN = [
  "A modern smartphone sits on a minimalist desk, sunlight streaming through the window",
  "A young woman jogs through an autumn park at sunrise",
  "A coffee cup steams in a cozy caf\u00e9 with raindrops on the window",
  "An electric car drives through a futuristic city at night with neon lights"
];

type AdStatus = "draft" | "generating_video" | "completed" | "failed";

export default function AdGenerator() {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<AdStatus>("draft");
  const [progress, setProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoId, setVideoId] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const EXAMPLE_PROMPTS = language === "de" ? EXAMPLE_PROMPTS_DE : EXAMPLE_PROMPTS_EN;

  useEffect(() => {
    if (status === "generating_video") {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) return prev;
          return prev + Math.random() * 3;
        });
      }, 2000);
      return () => clearInterval(interval);
    } else if (status === "completed") {
      setProgress(100);
    }
  }, [status]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  const generateVideo = async () => {
    if (!prompt.trim()) {
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
          script: prompt.trim(),
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

      const newVideoId = data.data.video_id;
      setVideoId(newVideoId);
      
      toast({
        title: t("ads.status.generating"),
        description: t("ads.progress"),
      });

      pollVideoStatus(newVideoId, apiKey);

    } catch (error) {
      console.error("Error generating video:", error);
      toast({
        title: t("ads.video.error"),
        description: error instanceof Error ? error.message : t("ads.video.error.desc"),
        variant: "destructive"
      });
      setStatus("failed");
      setIsGenerating(false);
    }
  };

  const pollVideoStatus = (vid: string, apiKey: string) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    const interval = setInterval(async () => {
      try {
        const { data, error: invokeErr } = await supabase.functions.invoke("joggai-proxy", {
          body: { endpoint: `/avatar_video/${vid}`, method: "GET", apiKey }
        });
        if (invokeErr) { console.error("Polling proxy error:", invokeErr); return; }
        console.log("JoggAI status check:", JSON.stringify(data));

        const statusRaw = data.data?.status;
        const url = data.data?.video_url || data.data?.videoUrl;
        const cover = data.data?.cover_url || data.data?.coverUrl;

        const isCompleted = statusRaw === "success" || statusRaw === "completed" || statusRaw === 1;
        const isFailed = statusRaw === "failed" || statusRaw === "error" || statusRaw === -1;

        if (isCompleted) {
          clearInterval(interval);
          pollingRef.current = null;
          if (url) setVideoUrl(url);
          if (cover) setCoverUrl(cover);
          setStatus("completed");
          setIsGenerating(false);
          toast({
            title: t("ads.video.generated"),
            description: t("ads.video.generated.desc")
          });
        } else if (isFailed) {
          clearInterval(interval);
          pollingRef.current = null;
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
    }, 8000);

    pollingRef.current = interval;
  };

  const editorUrl = videoId ? `https://app.jogg.ai/editor?id=${videoId}&index=0&from=projects` : "";

  const downloadVideo = () => {
    if (videoUrl) {
      const a = document.createElement("a");
      a.href = videoUrl;
      a.download = `ad-video-${new Date().toISOString().split("T")[0]}.mp4`;
      a.click();
    }
  };

  const resetProject = () => {
    setPrompt("");
    setStatus("draft");
    setProgress(0);
    setVideoId("");
    setVideoUrl("");
    setCoverUrl("");
    setIsGenerating(false);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case "draft": return t("ads.status.draft");
      case "generating_video": return t("ads.status.generating");
      case "completed": return t("ads.status.completed");
      case "failed": return t("ads.status.failed");
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-background">
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
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">1</span>
                  {t("ads.step1.title")}
                </CardTitle>
                <CardDescription>{t("ads.step1.desc")}</CardDescription>
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
                  onClick={generateVideo}
                  disabled={isGenerating || !prompt.trim() || status === "generating_video"}
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
                    <p className="text-xs text-muted-foreground text-center">{t("ads.progress")}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {status === "completed" && videoId && (
              <Card className="border-green-500/30 bg-green-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    {language === "de" ? "Video fertig!" : "Video Ready!"}
                  </CardTitle>
                  <CardDescription>
                    {language === "de" 
                      ? "Dein Video wurde erfolgreich generiert. Bearbeite es im JoggAI Editor oder lade es direkt herunter."
                      : "Your video has been successfully generated. Edit it in the JoggAI Editor or download it directly."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    className="w-full gap-2"
                    size="lg"
                    onClick={() => window.open(editorUrl, "_blank")}
                  >
                    <Pencil className="w-4 h-4" />
                    {language === "de" ? "Im JoggAI Editor bearbeiten" : "Edit in JoggAI Editor"}
                    <ExternalLink className="w-4 h-4 ml-1" />
                  </Button>
                  <div className="flex gap-2">
                    {videoUrl && (
                      <>
                        <Button
                          variant="outline"
                          className="flex-1 gap-2"
                          onClick={() => window.open(videoUrl, "_blank")}
                        >
                          <Play className="w-4 h-4" />
                          {language === "de" ? "Video ansehen" : "Watch Video"}
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 gap-2"
                          onClick={downloadVideo}
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </Button>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground text-center break-all">Video ID: {videoId}</p>
                </CardContent>
              </Card>
            )}

            {status === "failed" && (
              <Card className="border-red-500/30 bg-red-500/5">
                <CardContent className="pt-6 space-y-4">
                  <p className="text-sm text-red-500">
                    {language === "de" 
                      ? "Video-Generierung fehlgeschlagen. Bitte versuche es erneut." 
                      : "Video generation failed. Please try again."}
                  </p>
                  <Button onClick={resetProject} className="w-full">{t("ads.restart")}</Button>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-base">{t("ads.preview")}</CardTitle>
              </CardHeader>
              <CardContent>
                {videoUrl ? (
                  <div className="space-y-4">
                    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                      <video src={videoUrl} controls className="w-full h-full" poster={coverUrl || undefined} />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => window.open(editorUrl, "_blank")}>
                        <Pencil className="w-3 h-3" />
                        Editor
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={downloadVideo}>
                        <Download className="w-3 h-3" />
                        Download
                      </Button>
                    </div>
                  </div>
                ) : coverUrl ? (
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    <img src={coverUrl} alt="Video cover" className="w-full h-full object-cover" />
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

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("ads.workflow")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { key: "draft", label: language === "de" ? "Prompt eingeben" : "Enter Prompt", icon: Type },
                    { key: "generating_video", label: language === "de" ? "Video generieren" : "Generate Video", icon: Video },
                    { key: "completed", label: language === "de" ? "Bearbeiten & Herunterladen" : "Edit & Download", icon: CheckCircle2 }
                  ].map((step) => {
                    const Icon = step.icon;
                    const statusOrder: AdStatus[] = ["draft", "generating_video", "completed"];
                    const currentIndex = statusOrder.indexOf(status === "failed" ? "draft" : status);
                    const stepIndex = statusOrder.indexOf(step.key as AdStatus);
                    const isActive = step.key === status || (step.key === "draft" && status === "failed");
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
                          ) : isActive && status === "generating_video" ? (
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
