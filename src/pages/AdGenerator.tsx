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
  Megaphone,
  Sparkles,
  Camera,
  Wand2,
  Volume2,
  ImageIcon,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/i18n/LanguageContext";
import AvatarVoiceModal from "@/components/podcast/AvatarVoiceModal";
import type { AvatarVoiceSelection } from "@/components/podcast/AvatarVoiceModal";
import { joggAiService } from "@/lib/joggai";
import type { JoggAiTemplate } from "@/lib/joggai";
import { cn } from "@/lib/utils";

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
type AdType = "ugc" | "promo" | "custom";

const AD_TYPES = [
  { 
    id: "ugc" as AdType, 
    icon: Camera, 
    labelEn: "UGC Video", 
    labelDe: "UGC Video",
    descEn: "User-generated content style — testimonials, reviews, unboxing",
    descDe: "User-Generated-Content — Testimonials, Reviews, Unboxing"
  },
  { 
    id: "promo" as AdType, 
    icon: Megaphone, 
    labelEn: "Promo Video", 
    labelDe: "Promo Video",
    descEn: "Product promotions, ads, marketing campaigns",
    descDe: "Produkt-Promotions, Werbung, Marketing-Kampagnen"
  },
  { 
    id: "custom" as AdType, 
    icon: User, 
    labelEn: "Custom Avatar", 
    labelDe: "Eigener Avatar",
    descEn: "Pick your own avatar & voice, write a script",
    descDe: "Wähle deinen Avatar & Stimme, schreibe ein Skript"
  },
];

export default function AdGenerator() {
  const [adType, setAdType] = useState<AdType>("ugc");
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<AdStatus>("draft");
  const [progress, setProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoId, setVideoId] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Template state
  const [allTemplates, setAllTemplates] = useState<JoggAiTemplate[]>([]);
  const [ugcTemplates, setUgcTemplates] = useState<JoggAiTemplate[]>([]);
  const [promoTemplates, setPromoTemplates] = useState<JoggAiTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [isImproving, setIsImproving] = useState(false);

  // Avatar/Voice modal state
  const [avModalOpen, setAvModalOpen] = useState(false);
  const [avModalTab, setAvModalTab] = useState<"avatar" | "voice">("avatar");
  const [selectedAvatarName, setSelectedAvatarName] = useState<string>("");
  const [selectedAvatarImage, setSelectedAvatarImage] = useState<string>("");
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");
  
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const EXAMPLE_PROMPTS = language === "de" ? EXAMPLE_PROMPTS_DE : EXAMPLE_PROMPTS_EN;

  // Load templates on mount + restore saved avatar/voice names
  useEffect(() => {
    loadTemplates();
    // Restore saved selection labels from localStorage
    const savedAvatarId = localStorage.getItem("joggai_speaker1_avatar");
    const savedVoiceId = localStorage.getItem("joggai_speaker1_voice");
    if (savedAvatarId) setSelectedAvatarName(localStorage.getItem("joggai_speaker1_avatar_name") || "");
    if (savedAvatarId) setSelectedAvatarImage(localStorage.getItem("joggai_speaker1_avatar_image") || "");
    if (savedVoiceId) setSelectedVoiceName(localStorage.getItem("joggai_speaker1_voice_name") || "");
  }, []);

  const openAvatarModal = () => {
    setAvModalTab("avatar");
    setAvModalOpen(true);
  };
  const openVoiceModal = () => {
    setAvModalTab("voice");
    setAvModalOpen(true);
  };
  const handleAvSelection = (selection: AvatarVoiceSelection) => {
    setSelectedAvatarName(selection.avatarName || "");
    setSelectedAvatarImage(selection.avatarImage || "");
    setSelectedVoiceName(selection.voiceName || "");
    // Also persist labels for restoring on reload
    localStorage.setItem("joggai_speaker1_avatar_name", selection.avatarName || "");
    localStorage.setItem("joggai_speaker1_avatar_image", selection.avatarImage || "");
    localStorage.setItem("joggai_speaker1_voice_name", selection.voiceName || "");
  };

  // Clear selected template when switching ad type
  useEffect(() => {
    setSelectedTemplateId("");
  }, [adType]);

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

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const [all, ugc, promo] = await Promise.all([
        joggAiService.getTemplates(),
        joggAiService.getUgcTemplates(),
        joggAiService.getPromoTemplates(),
      ]);
      setAllTemplates(all);
      setUgcTemplates(ugc);
      setPromoTemplates(promo);
      console.log(`Loaded ${all.length} templates (${ugc.length} UGC, ${promo.length} Promo)`);
    } catch (error) {
      console.warn("Could not load templates:", error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const improveMonologue = async () => {
    if (!prompt.trim()) return;
    setIsImproving(true);
    try {
      const { data, error } = await supabase.functions.invoke('optimize-podcast-script', {
        body: {
          script: prompt.trim(),
          instruction: language === "de"
            ? "Verbessere diesen Monolog: Mache ihn natürlicher, überzeugender und professioneller. Behalte die Kernaussage bei, aber optimiere Formulierung, Rhythmus und Wirkung. Gib nur den verbesserten Text zurück, ohne Erklärungen."
            : "Improve this monologue: Make it more natural, compelling and professional. Keep the core message but optimize wording, rhythm and impact. Return only the improved text, without explanations.",
          type: "edit"
        }
      });
      if (error) throw error;
      const improved = data.optimizedScript || data.script;
      if (improved) {
        setPrompt(improved);
        toast({
          title: t("ads.improved"),
          description: t("ads.improved.desc"),
        });
      }
    } catch (error) {
      console.error("Error improving monologue:", error);
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : "Could not improve monologue",
        variant: "destructive",
      });
    } finally {
      setIsImproving(false);
    }
  };

  const getDisplayTemplates = (): JoggAiTemplate[] => {
    if (adType === "ugc") return ugcTemplates.length > 0 ? ugcTemplates : allTemplates;
    if (adType === "promo") return promoTemplates.length > 0 ? promoTemplates : allTemplates;
    return [];
  };

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
      let newVideoId: string;

      // ===== Template-based generation (UGC / Promo) =====
      if (selectedTemplateId && adType !== "custom") {
        console.log("Using template-based generation, template ID:", selectedTemplateId);

        const variables: Array<{ key: string; value: string }> = [
          { key: "script", value: prompt.trim() },
          { key: "text_content", value: prompt.trim() },
          { key: "product_description", value: prompt.trim() },
          { key: "ad_copy", value: prompt.trim() },
          { key: "title", value: prompt.trim().substring(0, 60) },
        ];

        const avatarId = localStorage.getItem("joggai_speaker1_avatar");
        const voiceId = localStorage.getItem("joggai_speaker1_voice");
        if (avatarId) variables.push({ key: "avatar_id", value: avatarId });
        if (voiceId) variables.push({ key: "voice_id", value: voiceId });

        const result = await joggAiService.createVideoFromTemplate({
          templateId: selectedTemplateId,
          variables,
          videoName: `${adType.toUpperCase()} Ad - ${new Date().toISOString().split("T")[0]}`,
          aspectRatio: "landscape",
        });

        newVideoId = result.video_id;
      }
      // ===== Avatar-based generation (Custom) =====
      else {
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

      newVideoId = data.data.video_id;
      }

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
    setSelectedTemplateId("");
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

  const displayTemplates = getDisplayTemplates();
  const selectedTemplate = allTemplates.find(t => String(t.template_id) === selectedTemplateId);
  const isTemplateMode = adType !== "custom";

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
        {/* ===== Ad Type Selector ===== */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {language === "de" ? "Video-Typ wählen" : "Choose Video Type"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {AD_TYPES.map((type) => {
              const Icon = type.icon;
              const isActive = adType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setAdType(type.id)}
                  disabled={status !== "draft"}
                  className={cn(
                    "relative flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all text-left",
                    isActive
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md"
                      : "border-border/50 bg-card hover:border-primary/40 hover:bg-muted/30",
                    status !== "draft" && "opacity-60 cursor-not-allowed"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="font-semibold text-sm">
                    {language === "de" ? type.labelDe : type.labelEn}
                  </span>
                  <span className="text-xs text-muted-foreground text-center leading-tight">
                    {language === "de" ? type.descDe : type.descEn}
                  </span>
                  {isActive && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* ===== Template Gallery (UGC / Promo) ===== */}
            {isTemplateMode && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">1</span>
                      <LayoutTemplate className="w-4 h-4" />
                      {language === "de" ? "Template wählen" : "Choose Template"}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadTemplates}
                      disabled={loadingTemplates}
                      className="gap-1 h-7 text-xs"
                    >
                      <RefreshCw className={cn("w-3 h-3", loadingTemplates && "animate-spin")} />
                      {language === "de" ? "Neu laden" : "Reload"}
                    </Button>
                  </div>
                  <CardDescription>
                    {adType === "ugc"
                      ? (language === "de" 
                          ? "UGC-Templates — Testimonials, Reviews, Social Media" 
                          : "UGC templates — testimonials, reviews, social media")
                      : (language === "de" 
                          ? "Promo-Templates — Produkt-Werbung, Marketing, Kampagnen" 
                          : "Promo templates — product ads, marketing, campaigns")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingTemplates ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {language === "de" ? "Lade Templates..." : "Loading templates..."}
                    </div>
                  ) : displayTemplates.length > 0 ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[360px] overflow-y-auto pr-1">
                        {displayTemplates.map((tmpl) => {
                          const tid = String(tmpl.template_id);
                          const isSelected = selectedTemplateId === tid;
                          return (
                            <button
                              key={tid}
                              onClick={() => setSelectedTemplateId(isSelected ? "" : tid)}
                              disabled={status !== "draft"}
                              className={cn(
                                "relative rounded-lg overflow-hidden border-2 transition-all hover:scale-[1.02] text-left",
                                isSelected
                                  ? "border-primary ring-2 ring-primary/30"
                                  : "border-border/50 hover:border-primary/40",
                                status !== "draft" && "opacity-60 cursor-not-allowed"
                              )}
                            >
                              {tmpl.cover_url ? (
                                <img
                                  src={tmpl.cover_url}
                                  alt={tmpl.name}
                                  className="aspect-video w-full object-cover bg-muted"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="aspect-video bg-muted flex items-center justify-center">
                                  <LayoutTemplate className="w-8 h-8 text-muted-foreground/50" />
                                </div>
                              )}
                              <div className="p-2">
                                <p className="text-xs font-medium truncate">{tmpl.name || `Template ${tid}`}</p>
                                {tmpl.tags && tmpl.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {tmpl.tags.slice(0, 2).map((tag) => (
                                      <Badge key={tag} variant="secondary" className="text-[9px] px-1 py-0">{tag}</Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {isSelected && (
                                <div className="absolute top-1.5 right-1.5">
                                  <CheckCircle2 className="w-5 h-5 text-primary bg-background rounded-full" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {selectedTemplate && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                          {selectedTemplate.cover_url && (
                            <img src={selectedTemplate.cover_url} alt="" className="w-16 h-10 rounded object-cover" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{selectedTemplate.name}</p>
                            {selectedTemplate.description && (
                              <p className="text-xs text-muted-foreground truncate">{selectedTemplate.description}</p>
                            )}
                          </div>
                          <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground text-center">
                        {displayTemplates.length} {language === "de" ? "Templates verfügbar" : "templates available"}
                        {((adType === "ugc" && ugcTemplates.length === 0) || (adType === "promo" && promoTemplates.length === 0)) && (
                          <span className="ml-1">
                            ({language === "de" ? "alle Templates angezeigt" : "showing all templates"})
                          </span>
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <LayoutTemplate className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">{language === "de" ? "Keine Templates gefunden" : "No templates found"}</p>
                      <Button variant="ghost" size="sm" className="mt-2" onClick={loadTemplates}>
                        {language === "de" ? "Erneut versuchen" : "Try again"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Avatar & Voice Selection (Custom mode only) */}
            {adType === "custom" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">1</span>
                    <User className="w-4 h-4" />
                    {language === "de" ? "Avatar & Stimme" : "Avatar & Voice"}
                  </CardTitle>
                  <CardDescription>
                    {language === "de"
                      ? "Klicke auf ein Feld, um Avatare oder Stimmen zu durchstöbern"
                      : "Click a field to browse avatars or voices"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Avatar selection field */}
                  <button
                    onClick={openAvatarModal}
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
                      <p className="text-sm font-medium">
                        {selectedAvatarName || (language === "de" ? "Kein Avatar ausgewählt" : "No avatar selected")}
                      </p>
                      <p className="text-xs text-primary font-medium mt-0.5 group-hover:underline">
                        {language === "de" ? "Optionen anzeigen" : "View options"} →
                      </p>
                    </div>
                    {selectedAvatarName ? (
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors" />
                    )}
                  </button>

                  {/* Voice selection field */}
                  <button
                    onClick={openVoiceModal}
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
                      <p className="text-sm font-medium">
                        {selectedVoiceName || (language === "de" ? "Keine Stimme ausgewählt" : "No voice selected")}
                      </p>
                      <p className="text-xs text-primary font-medium mt-0.5 group-hover:underline">
                        {language === "de" ? "Optionen anzeigen" : "View options"} →
                      </p>
                    </div>
                    {selectedVoiceName ? (
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors" />
                    )}
                  </button>
                </CardContent>
              </Card>
            )}

            {/* Avatar/Voice Browser Modal */}
            <AvatarVoiceModal
              open={avModalOpen}
              onOpenChange={setAvModalOpen}
              initialTab={avModalTab}
              storagePrefix="joggai_speaker1"
              onConfirm={handleAvSelection}
            />

            {/* Step: Prompt / Script */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">{isTemplateMode ? "2" : "2"}</span>
                  {isTemplateMode
                    ? (language === "de" ? "Skript / Produktbeschreibung" : "Script / Product Description")
                    : t("ads.step1.title")}
                </CardTitle>
                <CardDescription>
                  {isTemplateMode
                    ? (language === "de" 
                        ? "Beschreibe dein Produkt oder schreibe das Skript für das Video"
                        : "Describe your product or write the script for the video")
                    : t("ads.step1.desc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder={isTemplateMode
                    ? (language === "de" 
                        ? "z.B. Unser neues Produkt revolutioniert die Art und Weise, wie Sie arbeiten..."
                        : "e.g. Our new product revolutionizes the way you work...")
                    : (language === "de"
                        ? "z.B. Hallo! Heute möchte ich euch etwas Spannendes zeigen..."
                        : "e.g. Hey everyone! Today I want to show you something exciting...")}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[100px]"
                  disabled={status !== "draft"}
                />
                {adType === "custom" && (
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
                )}

                {/* Improve Monologue button */}
                {prompt.trim().length > 10 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={improveMonologue}
                    disabled={isImproving || status !== "draft"}
                    className="gap-2 w-full sm:w-auto"
                  >
                    {isImproving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t("ads.improving")}
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        {t("ads.improve")}
                      </>
                    )}
                  </Button>
                )}

                {isTemplateMode && selectedTemplateId && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <LayoutTemplate className="w-3 h-3" />
                    {language === "de" ? "Generierung via Template" : "Template-based generation"}
                    <Badge variant="secondary" className="text-[10px]">{selectedTemplate?.name || selectedTemplateId}</Badge>
                  </div>
                )}
                {isTemplateMode && !selectedTemplateId && (
                  <div className="flex items-center gap-2 text-xs text-amber-600">
                    <LayoutTemplate className="w-3 h-3" />
                    {language === "de" ? "Wähle oben ein Template aus oder generiere mit Avatar" : "Select a template above or generate with avatar"}
                  </div>
                )}

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
                  {(() => {
                    const steps = isTemplateMode
                      ? [
                          { label: language === "de" ? "Video-Typ wählen" : "Choose Video Type", icon: Sparkles },
                          { label: language === "de" ? "Template auswählen" : "Select Template", icon: LayoutTemplate },
                          { label: language === "de" ? "Skript eingeben" : "Enter Script", icon: Type },
                          { label: language === "de" ? "Video generieren" : "Generate Video", icon: Video },
                          { label: language === "de" ? "Bearbeiten & Herunterladen" : "Edit & Download", icon: CheckCircle2 }
                        ]
                      : [
                          { label: language === "de" ? "Video-Typ wählen" : "Choose Video Type", icon: Sparkles },
                          { label: language === "de" ? "Avatar & Stimme wählen" : "Choose Avatar & Voice", icon: User },
                          { label: language === "de" ? "Prompt eingeben" : "Enter Prompt", icon: Type },
                          { label: language === "de" ? "Video generieren" : "Generate Video", icon: Video },
                          { label: language === "de" ? "Bearbeiten & Herunterladen" : "Edit & Download", icon: CheckCircle2 }
                        ];

                    let activeIndex = 0;
                    if (status === "draft") {
                      if (isTemplateMode && selectedTemplateId) activeIndex = 2;
                      else if (isTemplateMode) activeIndex = 1;
                      else activeIndex = 1;
                      if (prompt.trim()) activeIndex = Math.max(activeIndex, 2);
                    } else if (status === "generating_video") {
                      activeIndex = 3;
                    } else if (status === "completed") {
                      activeIndex = 4;
                    }

                    return steps.map((step, index) => {
                      const Icon = step.icon;
                      const isActive = index === activeIndex;
                      const isCompleted = index < activeIndex;
                      return (
                        <div
                          key={index}
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
                    });
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
