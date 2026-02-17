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
  Type,
  User,
  LayoutTemplate,
  Wand2,
  Volume2,
  ImageIcon,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/i18n/LanguageContext";
import AvatarBrowserModal from "@/components/podcast/AvatarBrowserModal";
import type { AvatarSelection } from "@/components/podcast/AvatarBrowserModal";
import VoiceBrowserModal from "@/components/podcast/VoiceBrowserModal";
import type { VoiceSelection } from "@/components/podcast/VoiceBrowserModal";
import TemplateBrowserModal from "@/components/podcast/TemplateBrowserModal";
import { joggAiService } from "@/lib/joggai";
import type { JoggAiTemplate } from "@/lib/joggai";
import { cn } from "@/lib/utils";

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
  const [isImproving, setIsImproving] = useState(false);
  const [isTemplateVideo, setIsTemplateVideo] = useState(false);

  // Generation mode: avatar+voice or template
  const [genMode, setGenMode] = useState<"avatar" | "template">("avatar");

  // Avatar modal state
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [selectedAvatarName, setSelectedAvatarName] = useState("");
  const [selectedAvatarImage, setSelectedAvatarImage] = useState("");

  // Voice modal state
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");

  // Template modal state
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedTemplateName, setSelectedTemplateName] = useState("");
  const [selectedTemplateCover, setSelectedTemplateCover] = useState("");

  const { toast } = useToast();
  const { t, language } = useLanguage();

  // Restore saved selections on mount
  useEffect(() => {
    const savedAvatarId = localStorage.getItem("joggai_speaker1_avatar");
    if (savedAvatarId) {
      setSelectedAvatarName(localStorage.getItem("joggai_speaker1_avatar_name") || "");
      setSelectedAvatarImage(localStorage.getItem("joggai_speaker1_avatar_image") || "");
    }
    const savedVoiceId = localStorage.getItem("joggai_speaker1_voice");
    if (savedVoiceId) {
      setSelectedVoiceName(localStorage.getItem("joggai_speaker1_voice_name") || "");
    }
    const savedTmplId = localStorage.getItem("joggai_selected_template_id");
    if (savedTmplId) {
      setSelectedTemplateId(savedTmplId);
      setSelectedTemplateName(localStorage.getItem("joggai_selected_template_name") || "");
      setSelectedTemplateCover(localStorage.getItem("joggai_selected_template_cover") || "");
      setGenMode("template");
    }
  }, []);

  useEffect(() => {
    if (status === "generating_video") {
      const interval = setInterval(() => {
        setProgress((prev) => (prev >= 95 ? prev : prev + Math.random() * 3));
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

  // ---- Modal handlers ----
  const handleAvatarSelection = (selection: AvatarSelection) => {
    setSelectedAvatarName(selection.avatarName || "");
    setSelectedAvatarImage(selection.avatarImage || "");
    localStorage.setItem("joggai_speaker1_avatar_name", selection.avatarName || "");
    localStorage.setItem("joggai_speaker1_avatar_image", selection.avatarImage || "");
  };

  const handleVoiceSelection = (selection: VoiceSelection) => {
    setSelectedVoiceName(selection.voiceName || "");
    localStorage.setItem("joggai_speaker1_voice_name", selection.voiceName || "");
  };

  const switchMode = (mode: "avatar" | "template") => {
    setGenMode(mode);
    if (mode === "avatar") {
      // Clear template selection
      setSelectedTemplateId("");
      setSelectedTemplateName("");
      setSelectedTemplateCover("");
      localStorage.removeItem("joggai_selected_template_id");
      localStorage.removeItem("joggai_selected_template_name");
      localStorage.removeItem("joggai_selected_template_cover");
    }
  };

  const handleTemplateSelection = (template: JoggAiTemplate | null) => {
    if (template) {
      const tid = String(template.template_id);
      setSelectedTemplateId(tid);
      setSelectedTemplateName(template.name || "");
      setSelectedTemplateCover(template.cover_url || "");
      localStorage.setItem("joggai_selected_template_id", tid);
      localStorage.setItem("joggai_selected_template_name", template.name || "");
      localStorage.setItem("joggai_selected_template_cover", template.cover_url || "");
    } else {
      setSelectedTemplateId("");
      setSelectedTemplateName("");
      setSelectedTemplateCover("");
      localStorage.removeItem("joggai_selected_template_id");
      localStorage.removeItem("joggai_selected_template_name");
      localStorage.removeItem("joggai_selected_template_cover");
    }
  };

  // ---- AI improve ----
  const improveMonologue = async () => {
    if (!prompt.trim()) return;
    setIsImproving(true);
    try {
      const { data, error } = await supabase.functions.invoke("optimize-podcast-script", {
        body: {
          script: prompt.trim(),
          instruction: language === "de"
            ? "Verbessere diesen Monolog: Mache ihn nat\u00FCrlicher, \u00FCberzeugender und professioneller. Behalte die Kernaussage bei, aber optimiere Formulierung, Rhythmus und Wirkung. Gib nur den verbesserten Text zur\u00FCck, ohne Erkl\u00E4rungen."
            : "Improve this monologue: Make it more natural, compelling and professional. Keep the core message but optimize wording, rhythm and impact. Return only the improved text, without explanations.",
          type: "edit",
        },
      });
      if (error) throw error;
      const improved = data.optimizedScript || data.script;
      if (improved) {
        setPrompt(improved);
        toast({ title: t("ads.improved"), description: t("ads.improved.desc") });
      }
    } catch (error) {
      console.error("Error improving monologue:", error);
      toast({ title: t("common.error"), description: error instanceof Error ? error.message : "Could not improve monologue", variant: "destructive" });
    } finally {
      setIsImproving(false);
    }
  };

  // ---- Generate video ----
  const generateVideo = async () => {
    if (!prompt.trim()) {
      toast({ title: t("ads.prompt.missing"), description: t("ads.prompt.missing.desc"), variant: "destructive" });
      return;
    }

    const apiKey = localStorage.getItem("joggai_api_key") || import.meta.env.VITE_JOGGAI_API_KEY;
    if (!apiKey) {
      toast({ title: t("ads.apikey.missing"), description: t("ads.apikey.missing.desc"), variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setStatus("generating_video");
    setProgress(0);

    try {
      let newVideoId: string;

      // Template-based generation
      if (selectedTemplateId) {
        console.log("Using template-based generation, template ID:", selectedTemplateId);
        const variables: Array<{ type: string; name: string; properties: { content?: string } }> = [
          { type: "script", name: "script", properties: { content: prompt.trim() } },
        ];
        const avatarId = localStorage.getItem("joggai_speaker1_avatar");
        const avatarType = parseInt(localStorage.getItem("joggai_speaker1_avatar_type") || "0");
        const voiceId = localStorage.getItem("joggai_speaker1_voice");

        const result = await joggAiService.createVideoFromTemplate({
          templateId: selectedTemplateId,
          variables,
          videoName: "Ad - " + new Date().toISOString().split("T")[0],
          avatarId: avatarId ? parseInt(avatarId) : undefined,
          avatarType: avatarType as 0 | 1,
          voiceId: voiceId || undefined,
          voiceLanguage: language === "de" ? "german" : "english",
          captionsEnabled: true,
        });
        newVideoId = result.video_id;
        setIsTemplateVideo(true);
      }
      // Avatar-based generation
      else {
        const avatarId = localStorage.getItem("joggai_speaker1_avatar") || "412";
        const voiceId = localStorage.getItem("joggai_speaker1_voice") || "MFZUKuGQUsGJPQjTS4wC";
        const avatarType = parseInt(localStorage.getItem("joggai_speaker1_avatar_type") || "0");

        const requestBody = {
          avatar: { avatar_id: parseInt(avatarId), avatar_type: avatarType },
          voice: { type: "script", voice_id: voiceId, script: prompt.trim() },
          aspect_ratio: "landscape",
          screen_style: 1,
          caption: true,
        };

        console.log("JoggAI request body:", JSON.stringify(requestBody, null, 2));
        const { data, error: invokeErr } = await supabase.functions.invoke("joggai-proxy", {
          body: { endpoint: "/create_video_from_avatar", method: "POST", payload: requestBody, apiKey },
        });
        if (invokeErr) throw invokeErr;
        console.log("JoggAI response:", data);
        if (data.code !== 0) throw new Error(data.msg || "Video creation failed");
        newVideoId = data.data.video_id;
        setIsTemplateVideo(false);
      }

      setVideoId(newVideoId);
      toast({ title: t("ads.status.generating"), description: t("ads.progress") });
      pollVideoStatus(newVideoId, apiKey, !!selectedTemplateId);
    } catch (error) {
      console.error("Error generating video:", error);
      toast({ title: t("ads.video.error"), description: error instanceof Error ? error.message : t("ads.video.error.desc"), variant: "destructive" });
      setStatus("failed");
      setIsGenerating(false);
    }
  };

  const pollVideoStatus = (vid: string, apiKey: string, useTemplateEndpoint = false) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    const pollEndpoint = useTemplateEndpoint ? "/template_video/" + vid : "/avatar_video/" + vid;
    console.log("Polling video status via:", pollEndpoint);

    const interval = setInterval(async () => {
      try {
        const { data, error: invokeErr } = await supabase.functions.invoke("joggai-proxy", {
          body: { endpoint: pollEndpoint, method: "GET", apiKey },
        });
        if (invokeErr) { console.error("Polling proxy error:", invokeErr); return; }

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
          toast({ title: t("ads.video.generated"), description: t("ads.video.generated.desc") });
        } else if (isFailed) {
          clearInterval(interval);
          pollingRef.current = null;
          setStatus("failed");
          setIsGenerating(false);
          toast({ title: t("ads.video.failed"), variant: "destructive" });
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 8000);

    pollingRef.current = interval;
  };

  const editorUrl = videoId ? "https://app.jogg.ai/editor?id=" + videoId + "&index=0&from=projects" : "";

  const downloadVideo = () => {
    if (videoUrl) {
      const a = document.createElement("a");
      a.href = videoUrl;
      a.download = "ad-video-" + new Date().toISOString().split("T")[0] + ".mp4";
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
    setIsTemplateVideo(false);
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

  const configuredCount = genMode === "template"
    ? (selectedTemplateId ? 1 : 0)
    : [selectedAvatarName, selectedVoiceName].filter(Boolean).length;

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
          <div className="lg:col-span-2 space-y-6">

            {/* Step 1: Configuration – Mode toggle + fields */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">1</span>
                  {language === "de" ? "Konfiguration" : "Configuration"}
                </CardTitle>
                <CardDescription>
                  {language === "de"
                    ? "Wähle entweder ein Template ODER einen Avatar + Stimme"
                    : "Choose either a Template OR an Avatar + Voice"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Mode toggle */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => switchMode("avatar")}
                    disabled={status !== "draft"}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                      genMode === "avatar"
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border/50 hover:border-primary/40 hover:bg-muted/30",
                      status !== "draft" && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      genMode === "avatar" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{language === "de" ? "Avatar + Stimme" : "Avatar + Voice"}</p>
                      <p className="text-xs text-muted-foreground">{language === "de" ? "Avatar spricht dein Skript" : "Avatar speaks your script"}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => switchMode("template")}
                    disabled={status !== "draft"}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                      genMode === "template"
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border/50 hover:border-primary/40 hover:bg-muted/30",
                      status !== "draft" && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      genMode === "template" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      <LayoutTemplate className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Template</p>
                      <p className="text-xs text-muted-foreground">{language === "de" ? "Vorgefertigtes Videodesign" : "Pre-designed video layout"}</p>
                    </div>
                  </button>
                </div>

                {/* Avatar + Voice fields */}
                {genMode === "avatar" && (
                  <div className="space-y-3">
                    {/* Avatar field */}
                    <button
                      onClick={() => setAvatarModalOpen(true)}
                      disabled={status !== "draft"}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left group",
                        selectedAvatarName
                          ? "border-primary/30 bg-primary/5 hover:border-primary/50"
                          : "border-dashed border-border hover:border-primary/40 hover:bg-muted/30",
                        status !== "draft" && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      <div className={cn(
                        "w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden",
                        selectedAvatarImage ? "" : "bg-muted flex items-center justify-center"
                      )}>
                        {selectedAvatarImage ? (
                          <img src={selectedAvatarImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Avatar</p>
                        <p className="text-sm font-medium">
                          {selectedAvatarName || (language === "de" ? "Kein Avatar ausgewählt" : "No avatar selected")}
                        </p>
                        <p className="text-xs text-primary font-medium mt-0.5 group-hover:underline">
                          {language === "de" ? "Optionen anzeigen" : "View options"} {"\u2192"}
                        </p>
                      </div>
                      {selectedAvatarName ? (
                        <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors" />
                      )}
                    </button>

                    {/* Voice field */}
                    <button
                      onClick={() => setVoiceModalOpen(true)}
                      disabled={status !== "draft"}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left group",
                        selectedVoiceName
                          ? "border-primary/30 bg-primary/5 hover:border-primary/50"
                          : "border-dashed border-border hover:border-primary/40 hover:bg-muted/30",
                        status !== "draft" && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                        <Volume2 className={cn("w-6 h-6", selectedVoiceName ? "text-primary" : "text-muted-foreground")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-0.5">
                          {language === "de" ? "Stimme" : "Voice"}
                        </p>
                        <p className="text-sm font-medium">
                          {selectedVoiceName || (language === "de" ? "Keine Stimme ausgewählt" : "No voice selected")}
                        </p>
                        <p className="text-xs text-primary font-medium mt-0.5 group-hover:underline">
                          {language === "de" ? "Optionen anzeigen" : "View options"} {"\u2192"}
                        </p>
                      </div>
                      {selectedVoiceName ? (
                        <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors" />
                      )}
                    </button>
                  </div>
                )}

                {/* Template field */}
                {genMode === "template" && (
                  <button
                    onClick={() => setTemplateModalOpen(true)}
                    disabled={status !== "draft"}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left group",
                      selectedTemplateId
                        ? "border-primary/30 bg-primary/5 hover:border-primary/50"
                        : "border-dashed border-border hover:border-primary/40 hover:bg-muted/30",
                      status !== "draft" && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    <div className={cn(
                      "w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden",
                      selectedTemplateCover ? "" : "bg-muted flex items-center justify-center"
                    )}>
                      {selectedTemplateCover ? (
                        <img src={selectedTemplateCover} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <LayoutTemplate className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Template</p>
                      <p className="text-sm font-medium">
                        {selectedTemplateName || (language === "de" ? "Kein Template ausgewählt" : "No template selected")}
                      </p>
                      <p className="text-xs text-primary font-medium mt-0.5 group-hover:underline">
                        {language === "de" ? "Optionen anzeigen" : "View options"} {"\u2192"}
                      </p>
                    </div>
                    {selectedTemplateId ? (
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors" />
                    )}
                  </button>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Script / Prompt */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">2</span>
                  {genMode === "template"
                    ? (language === "de" ? "Skript / Produktbeschreibung" : "Script / Product Description")
                    : t("ads.step1.title")}
                </CardTitle>
                <CardDescription>
                  {genMode === "template"
                    ? (language === "de"
                        ? "Beschreibe dein Produkt oder schreibe das Skript f\u00FCr das Video"
                        : "Describe your product or write the script for the video")
                    : t("ads.step1.desc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder={genMode === "template"
                    ? (language === "de"
                        ? "z.B. Unser neues Produkt revolutioniert die Art und Weise, wie Sie arbeiten..."
                        : "e.g. Our new product revolutionizes the way you work...")
                    : (language === "de"
                        ? "z.B. Hallo! Heute m\u00F6chte ich euch etwas Spannendes zeigen..."
                        : "e.g. Hey everyone! Today I want to show you something exciting...")}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[100px]"
                  disabled={status !== "draft"}
                />

                {prompt.trim().length > 10 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={improveMonologue}
                    disabled={isImproving || status !== "draft"}
                    className="gap-2 w-full sm:w-auto"
                  >
                    {isImproving ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />{t("ads.improving")}</>
                    ) : (
                      <><Wand2 className="w-4 h-4" />{t("ads.improve")}</>
                    )}
                  </Button>
                )}

                {genMode === "template" && selectedTemplateId && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <LayoutTemplate className="w-3 h-3" />
                    {language === "de" ? "Generierung via Template" : "Template-based generation"}
                    <Badge variant="secondary" className="text-[10px]">{selectedTemplateName || selectedTemplateId}</Badge>
                  </div>
                )}

                <Button
                  onClick={generateVideo}
                  disabled={isGenerating || !prompt.trim() || status === "generating_video"}
                  className="w-full gap-2"
                  size="lg"
                >
                  {isGenerating || status === "generating_video" ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />{t("ads.generating")}</>
                  ) : (
                    <><Video className="w-4 h-4" />{t("ads.generate")}</>
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

            {/* Completed */}
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
                  <Button className="w-full gap-2" size="lg" onClick={() => window.open(editorUrl, "_blank")}>
                    <Pencil className="w-4 h-4" />
                    {language === "de" ? "Im JoggAI Editor bearbeiten" : "Edit in JoggAI Editor"}
                    <ExternalLink className="w-4 h-4 ml-1" />
                  </Button>
                  <div className="flex gap-2">
                    {videoUrl && (
                      <>
                        <Button variant="outline" className="flex-1 gap-2" onClick={() => window.open(videoUrl, "_blank")}>
                          <Play className="w-4 h-4" />
                          {language === "de" ? "Video ansehen" : "Watch Video"}
                        </Button>
                        <Button variant="outline" className="flex-1 gap-2" onClick={downloadVideo}>
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

            {/* Failed */}
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

          {/* Sidebar */}
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

            {/* Workflow */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("ads.workflow")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(() => {
                    const steps = [
                      { label: language === "de" ? "Modus wählen" : "Choose Mode", icon: User },
                      { label: language === "de" ? "Skript eingeben" : "Enter Script", icon: Type },
                      { label: language === "de" ? "Video generieren" : "Generate Video", icon: Video },
                      { label: language === "de" ? "Bearbeiten & Herunterladen" : "Edit & Download", icon: CheckCircle2 },
                    ];

                    let activeIndex = 0;
                    if (status === "draft") {
                      if (configuredCount > 0) activeIndex = 1;
                      if (prompt.trim()) activeIndex = 1;
                    } else if (status === "generating_video") {
                      activeIndex = 2;
                    } else if (status === "completed") {
                      activeIndex = 3;
                    }

                    return steps.map((step, index) => {
                      const Icon = step.icon;
                      const isActive = index === activeIndex;
                      const isCompleted = index < activeIndex;
                      return (
                        <div
                          key={index}
                          className={"flex items-center gap-3 p-2 rounded-lg transition-colors " + (isActive ? "bg-primary/10" : isCompleted ? "bg-green-500/10" : "")}
                        >
                          <div className={"w-6 h-6 rounded-full flex items-center justify-center " + (isCompleted ? "bg-green-500 text-white" : isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                            {isCompleted ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : isActive && status === "generating_video" ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Icon className="w-3 h-3" />
                            )}
                          </div>
                          <span className={"text-sm " + (isActive ? "font-medium" : isCompleted ? "text-muted-foreground" : "")}>
                            {step.label}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Modals */}
      <AvatarBrowserModal
        open={avatarModalOpen}
        onOpenChange={setAvatarModalOpen}
        storagePrefix="joggai_speaker1"
        onConfirm={handleAvatarSelection}
      />
      <VoiceBrowserModal
        open={voiceModalOpen}
        onOpenChange={setVoiceModalOpen}
        storagePrefix="joggai_speaker1"
        onConfirm={handleVoiceSelection}
      />
      <TemplateBrowserModal
        open={templateModalOpen}
        onOpenChange={setTemplateModalOpen}
        selectedTemplateId={selectedTemplateId}
        onConfirm={handleTemplateSelection}
      />
    </div>
  );
}
