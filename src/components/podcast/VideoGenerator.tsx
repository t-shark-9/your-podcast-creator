import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Video, CheckCircle2, AlertCircle, Download, ExternalLink, Play, RefreshCw, Settings2, LayoutTemplate } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { joggAiService } from "@/lib/joggai";
import type { JoggAiTemplate } from "@/lib/joggai";
import type { DialogueLine } from "@/types/podcast";
import type { PodcastSpeakerConfig } from "@/lib/joggai";
import { cn } from "@/lib/utils";

interface VideoGeneratorProps {
  dialogue: DialogueLine[];
  speaker1Name: string;
  speaker2Name: string;
  speaker1Config?: PodcastSpeakerConfig | null;
  speaker2Config?: PodcastSpeakerConfig | null;
}

interface VideoJob {
  videoId: string;
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  coverUrl?: string;
  createdAt?: number;
}

const VIDEO_JOB_STORAGE_KEY = "podcast_video_job";

function loadVideoJobFromStorage(): VideoJob | null {
  try {
    const stored = localStorage.getItem(VIDEO_JOB_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

function saveVideoJobToStorage(job: VideoJob | null) {
  if (job) {
    localStorage.setItem(VIDEO_JOB_STORAGE_KEY, JSON.stringify(job));
  } else {
    localStorage.removeItem(VIDEO_JOB_STORAGE_KEY);
  }
}

export default function VideoGenerator({ 
  dialogue, 
  speaker1Name, 
  speaker2Name,
  speaker1Config,
  speaker2Config
}: VideoGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoJob, setVideoJob] = useState<VideoJob | null>(loadVideoJobFromStorage);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const [progress, setProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  // Template state
  const [allTemplates, setAllTemplates] = useState<JoggAiTemplate[]>([]);
  const [podcastTemplates, setPodcastTemplates] = useState<JoggAiTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    localStorage.getItem("video_template_id") || ""
  );
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [generationMethod, setGenerationMethod] = useState<"template" | "avatar" | null>(null);
  const [showAllTemplates, setShowAllTemplates] = useState(false);

  // Video settings
  const [aspectRatio, setAspectRatio] = useState<string>(
    localStorage.getItem("video_aspect_ratio") || "landscape"
  );
  const [screenStyle, setScreenStyle] = useState<string>(
    localStorage.getItem("video_screen_style") || "2"
  );
  const [captionsEnabled, setCaptionsEnabled] = useState<boolean>(
    localStorage.getItem("video_captions") !== "false"
  );
  
  const { toast } = useToast();
  const { t } = useLanguage();

  // Persist videoJob changes to localStorage
  useEffect(() => {
    saveVideoJobToStorage(videoJob);
  }, [videoJob]);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem("video_aspect_ratio", aspectRatio);
  }, [aspectRatio]);
  useEffect(() => {
    localStorage.setItem("video_screen_style", screenStyle);
  }, [screenStyle]);
  useEffect(() => {
    localStorage.setItem("video_captions", String(captionsEnabled));
  }, [captionsEnabled]);

  // Persist selected template
  useEffect(() => {
    if (selectedTemplateId) {
      localStorage.setItem("video_template_id", selectedTemplateId);
    } else {
      localStorage.removeItem("video_template_id");
    }
  }, [selectedTemplateId]);

  // Load podcast templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const [all, podcast] = await Promise.all([
        joggAiService.getTemplates(),
        joggAiService.getPodcastTemplates(),
      ]);
      setAllTemplates(all);
      setPodcastTemplates(podcast);
      console.log(`Loaded ${all.length} templates (${podcast.length} podcast-related)`);
    } catch (error) {
      console.warn("Could not load templates:", error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  // Resume polling for persisted in-progress jobs
  useEffect(() => {
    if (videoJob && (videoJob.status === "processing" || videoJob.status === "pending") && !pollingRef.current) {
      startPolling(videoJob.videoId);
    }
  }, []);

  // Simulate progress while processing
  useEffect(() => {
    if (videoJob?.status === "processing" || videoJob?.status === "pending") {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) return prev;
          return prev + Math.random() * 3;
        });
      }, 3000);
      return () => clearInterval(interval);
    } else if (videoJob?.status === "completed") {
      setProgress(100);
    }
  }, [videoJob?.status]);

  // Build separate scripts for each speaker (no speaker labels)
  const getSpeakerScripts = () => {
    const speaker1Lines: string[] = [];
    const speaker2Lines: string[] = [];
    
    for (const line of dialogue) {
      if (line.speaker === "speaker1") {
        speaker1Lines.push(line.text);
      } else {
        speaker2Lines.push(line.text);
      }
    }
    
    return {
      speaker1Script: speaker1Lines.join(" "),
      speaker2Script: speaker2Lines.join(" "),
    };
  };

  // Build a combined dialogue script with speaker turns marked by [A] and [B]
  const getDialogueScript = () => {
    return dialogue.map(line => {
      const marker = line.speaker === "speaker1" ? "[A]" : "[B]";
      return `${marker} ${line.text}`;
    }).join("\n");
  };

  // Helper to parse an avatar ID from config or localStorage
  const parseAvatarId = (raw: string | number): number => {
    if (typeof raw === "number") return raw;
    const cleanId = String(raw).replace(/^photo_/, "");
    const parsed = parseInt(cleanId, 10);
    return isNaN(parsed) || parsed <= 0 ? 412 : parsed;
  };

  const generateVideo = async () => {
    const apiKey = localStorage.getItem("joggai_api_key") || import.meta.env.VITE_JOGGAI_API_KEY;
    
    if (!apiKey) {
      toast({
        title: t("video.apikey.missing"),
        description: t("video.apikey.missing.desc"),
        variant: "destructive",
      });
      return;
    }

    if (dialogue.length === 0) {
      toast({
        title: t("video.no.dialogue"),
        description: t("video.no.dialogue.desc"),
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setGenerationMethod(null);

    try {
      // ========== Try template-based generation first ==========
      const templateToUse = selectedTemplateId
        ? podcastTemplates.find(t => String(t.template_id) === selectedTemplateId)
        : podcastTemplates[0]; // Auto-use first podcast template if available

      if (templateToUse) {
        try {
          console.log("Attempting template-based generation with template:", templateToUse);

          // Build a combined dialogue text for the template
          const dialogueText = dialogue.map(line => {
            const speakerLabel = line.speaker === "speaker1" ? speaker1Name : speaker2Name;
            return `${speakerLabel}: ${line.text}`;
          }).join("\n\n");

          // Also prepare per-speaker scripts
          const { speaker1Script, speaker2Script } = getSpeakerScripts();

          // Template variables – try common variable names
          const variables: Array<{ key: string; value: string }> = [
            { key: "text_content", value: dialogueText },
            { key: "script", value: dialogueText },
            { key: "dialogue", value: dialogueText },
            { key: "speaker_a_script", value: speaker1Script },
            { key: "speaker_b_script", value: speaker2Script },
            { key: "speaker_a_name", value: speaker1Name },
            { key: "speaker_b_name", value: speaker2Name },
            { key: "title", value: `${speaker1Name} & ${speaker2Name} Podcast` },
          ];

          // If speaker configs have avatar/voice info, include them
          if (speaker1Config) {
            variables.push({ key: "avatar_a", value: String(speaker1Config.avatarId) });
            variables.push({ key: "voice_a", value: speaker1Config.voiceId });
          }
          if (speaker2Config) {
            variables.push({ key: "avatar_b", value: String(speaker2Config.avatarId) });
            variables.push({ key: "voice_b", value: speaker2Config.voiceId });
          }

          const result = await joggAiService.createVideoFromTemplate({
            templateId: templateToUse.template_id,
            variables,
            videoName: `${speaker1Name} & ${speaker2Name} Podcast`,
            aspectRatio: aspectRatio as "landscape" | "portrait" | "square",
          });

          setGenerationMethod("template");
          setVideoJob({
            videoId: result.video_id,
            status: "processing",
          });

          toast({
            title: t("video.started"),
            description: `Using template: ${templateToUse.name}`,
          });

          startPolling(result.video_id);
          return; // Success – don't fall through to avatar method
        } catch (templateError) {
          console.warn("Template-based generation failed, falling back to avatar method:", templateError);
        }
      }

      // ========== Fallback: avatar-based generation ==========
      setGenerationMethod("avatar");

      // --- Speaker 1 config ---
      let avatar1Id: number;
      let avatar1Type: number;
      let voice1Id: string;

      if (speaker1Config) {
        avatar1Id = parseAvatarId(speaker1Config.avatarId);
        avatar1Type = speaker1Config.avatarType;
        voice1Id = speaker1Config.voiceId;
      } else {
        avatar1Id = parseAvatarId(
          localStorage.getItem("joggai_speaker1_avatar") || localStorage.getItem("joggai_selected_avatar") || "412"
        );
        avatar1Type = parseInt(localStorage.getItem("joggai_speaker1_avatar_type") || "0");
        voice1Id = localStorage.getItem("joggai_speaker1_voice") || "en-US-ChristopherNeural";
      }

      // --- Speaker 2 config ---
      let avatar2Id: number;
      let avatar2Type: number;
      let voice2Id: string;

      if (speaker2Config) {
        avatar2Id = parseAvatarId(speaker2Config.avatarId);
        avatar2Type = speaker2Config.avatarType;
        voice2Id = speaker2Config.voiceId;
      } else {
        avatar2Id = parseAvatarId(
          localStorage.getItem("joggai_speaker2_avatar") || "127"
        );
        avatar2Type = parseInt(localStorage.getItem("joggai_speaker2_avatar_type") || "0");
        voice2Id = localStorage.getItem("joggai_speaker2_voice") || "en-US-JennyNeural";
      }

      // Fallback voice IDs
      if (!voice1Id || voice1Id.trim() === "") voice1Id = "en-US-ChristopherNeural";
      if (!voice2Id || voice2Id.trim() === "") voice2Id = "en-US-JennyNeural";

      // Build the dialogue script with [A]/[B] turn markers
      // (kept for potential future use in single-input dialogue APIs)
      // const dialogueScript = getDialogueScript();
      // Get separate per-speaker scripts
      const { speaker1Script, speaker2Script } = getSpeakerScripts();

      // Use the proper two-speaker podcast format:
      // - avatar + avatar_b for two speakers
      // - voice + voice_b for two voices
      // - screen_style: 1=full, 2=split, 3=pip
      // - dialogue script uses [A] and [B] markers for turn-taking
      const usedScreenStyle = parseInt(screenStyle, 10) || 2;
      const requestBody = {
        avatar: {
          avatar_id: avatar1Id,
          avatar_type: avatar1Type,
        },
        avatar_b: {
          avatar_id: avatar2Id,
          avatar_type: avatar2Type,
        },
        voice: {
          type: "script" as const,
          voice_id: voice1Id,
          script: speaker1Script,
        },
        voice_b: {
          type: "script" as const,
          voice_id: voice2Id,
          script: speaker2Script,
        },
        dialogue: true,
        aspect_ratio: aspectRatio,
        screen_style: usedScreenStyle,
        caption: captionsEnabled,
      };

      console.log("JoggAI podcast request body:", JSON.stringify(requestBody, null, 2));

      // Route through Supabase Edge Function proxy to avoid CORS
      const { data, error: invokeError } = await supabase.functions.invoke("joggai-proxy", {
        body: {
          endpoint: "/create_video_from_avatar",
          method: "POST",
          payload: requestBody,
          apiKey: apiKey || undefined,
        },
      });

      if (invokeError) {
        throw new Error(`Proxy error: ${invokeError.message}`);
      }

      console.log("JoggAI response:", data);

      if (data.code !== 0) {
        // Log detailed error info
        if (data.details && Array.isArray(data.details)) {
          console.error("JoggAI error details:", data.details);
        }
        throw new Error(data.msg || "Video creation failed");
      }

      const videoId = data.data.video_id;
      setVideoJob({
        videoId: videoId,
        status: "processing",
      });

      toast({
        title: t("video.started"),
        description: t("video.started.desc"),
      });

      // Start polling for status
      startPolling(videoId);

    } catch (error) {
      console.error("Video generation error:", error);
      toast({
        title: t("video.error"),
        description: error instanceof Error ? error.message : t("video.error.desc"),
        variant: "destructive",
      });
      setVideoJob(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const checkVideoStatus = useCallback(async (videoId: string): Promise<VideoJob | null> => {
    const pollApiKey = localStorage.getItem("joggai_api_key") || import.meta.env.VITE_JOGGAI_API_KEY || "";
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("joggai-proxy", {
        body: {
          endpoint: `/avatar_video/${videoId}`,
          method: "GET",
          apiKey: pollApiKey || undefined,
        },
      });

      if (invokeError) {
        console.error("Polling proxy error:", invokeError);
        return null;
      }

      console.log("JoggAI status check raw:", JSON.stringify(data));

      if (!data || data.code !== 0) {
        console.error("Status check failed:", data);
        return null;
      }

      const statusRaw = data.data?.status;
      const mappedStatus = 
        statusRaw === "success" || statusRaw === "completed" || statusRaw === 1 ? "completed" :
        statusRaw === "failed" || statusRaw === "error" || statusRaw === -1 ? "failed" :
        "processing";

      return {
        videoId,
        status: mappedStatus,
        videoUrl: data.data?.video_url || data.data?.videoUrl,
        coverUrl: data.data?.cover_url || data.data?.coverUrl,
        createdAt: data.data?.created_at || data.data?.createdAt,
      };
    } catch (error) {
      console.error("Polling error:", error);
      return null;
    }
  }, []);

  const startPolling = (videoId: string) => {
    // Clear any existing interval
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    const interval = setInterval(async () => {
      const result = await checkVideoStatus(videoId);
      if (!result) return; // Transient error, keep polling

      setVideoJob(result);

      if (result.status === "completed") {
        clearInterval(interval);
        pollingRef.current = null;
        toast({
          title: t("video.completed"),
          description: t("video.completed.desc"),
        });
      } else if (result.status === "failed") {
        clearInterval(interval);
        pollingRef.current = null;
        toast({
          title: t("video.failed"),
          description: t("video.failed.desc"),
          variant: "destructive",
        });
      }
    }, 8000); // Poll every 8 seconds

    pollingRef.current = interval;
  };

  const handleManualRefresh = async () => {
    if (!videoJob?.videoId) return;
    const result = await checkVideoStatus(videoJob.videoId);
    if (result) {
      setVideoJob(result);
      if (result.status === "completed") {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        toast({ title: t("video.completed"), description: t("video.completed.desc") });
      }
    } else {
      toast({ title: t("video.error"), description: "Status check failed. Retrying...", variant: "destructive" });
    }
  };

  const getStatusBadge = () => {
    if (!videoJob) return null;

    switch (videoJob.status) {
      case "processing":
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            {t("video.badge.processing")}
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="default" className="gap-1 bg-green-500">
            <CheckCircle2 className="w-3 h-3" />
            {t("video.badge.completed")}
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="w-3 h-3" />
            {t("video.badge.failed")}
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              {t("video.title")}
            </CardTitle>
            <CardDescription>
              {t("video.desc")}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {!videoJob && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(!showSettings)}
                title={t("video.settings")}
              >
                <Settings2 className="w-4 h-4" />
              </Button>
            )}
            {getStatusBadge()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Video Settings Panel */}
        {showSettings && !videoJob && (
          <div className="p-4 border rounded-lg space-y-4 bg-muted/20">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              {t("video.settings")}
            </h4>

            {/* Template Gallery */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1">
                  <LayoutTemplate className="w-3 h-3" />
                  Template
                </Label>
                <div className="flex items-center gap-1">
                  {allTemplates.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllTemplates(!showAllTemplates)}
                      className="h-7 text-xs gap-1"
                    >
                      {showAllTemplates ? "Show Recommended" : `Browse All (${allTemplates.length})`}
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={loadTemplates} disabled={loadingTemplates} className="gap-1 h-7 text-xs">
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {loadingTemplates ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading templates...
                </div>
              ) : (() => {
                const displayTemplates = showAllTemplates ? allTemplates : podcastTemplates;
                return displayTemplates.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[240px] overflow-y-auto pr-1">
                      {/* No template / auto option */}
                      <button
                        onClick={() => setSelectedTemplateId("")}
                        className={cn(
                          "relative rounded-lg overflow-hidden border-2 transition-all hover:scale-[1.02]",
                          !selectedTemplateId
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-border/50 hover:border-primary/40"
                        )}
                      >
                        <div className="aspect-video bg-muted flex items-center justify-center">
                          <Video className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-[10px] truncate p-1.5 text-center font-medium">Auto / Avatar</p>
                        {!selectedTemplateId && (
                          <div className="absolute top-1 right-1">
                            <CheckCircle2 className="w-4 h-4 text-primary bg-background rounded-full" />
                          </div>
                        )}
                      </button>
                      {displayTemplates.map((tmpl) => {
                        const tid = String(tmpl.template_id);
                        const isSelected = selectedTemplateId === tid;
                        const isPodcast = podcastTemplates.some(p => String(p.template_id) === tid);
                        return (
                          <button
                            key={tid}
                            onClick={() => setSelectedTemplateId(tid)}
                            className={cn(
                              "relative rounded-lg overflow-hidden border-2 transition-all hover:scale-[1.02]",
                              isSelected
                                ? "border-primary ring-2 ring-primary/30"
                                : "border-border/50 hover:border-primary/40"
                            )}
                          >
                            <div className="aspect-video bg-muted">
                              {tmpl.cover_url ? (
                                <img
                                  src={tmpl.cover_url}
                                  alt={tmpl.name}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <LayoutTemplate className="w-6 h-6 text-muted-foreground" />
                                </div>
                              )}
                              {isSelected && (
                                <div className="absolute top-1 right-1">
                                  <CheckCircle2 className="w-4 h-4 text-primary bg-background rounded-full" />
                                </div>
                              )}
                              {isPodcast && showAllTemplates && (
                                <div className="absolute top-1 left-1">
                                  <Badge variant="secondary" className="text-[8px] px-1 py-0 h-4">Podcast</Badge>
                                </div>
                              )}
                            </div>
                            <p className="text-[10px] truncate p-1.5 text-center">{tmpl.name}</p>
                          </button>
                        );
                      })}
                    </div>
                    {selectedTemplateId && (() => {
                      const sel = displayTemplates.find(t => String(t.template_id) === selectedTemplateId);
                      return sel ? (
                        <div className="p-2 bg-primary/5 rounded-md border border-primary/20">
                          <p className="text-xs font-medium">{sel.name}</p>
                          {sel.description && <p className="text-[10px] text-muted-foreground mt-0.5">{sel.description}</p>}
                          {sel.tags && sel.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {sel.tags.map(tag => (
                                <Badge key={tag} variant="outline" className="text-[8px] px-1 py-0 h-4">{tag}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null;
                    })()}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-3 text-center">
                    No templates found — will use avatar-based generation
                  </p>
                );
              })()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">{t("video.settings.aspect")}</Label>
                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="landscape">Landscape (16:9)</SelectItem>
                    <SelectItem value="portrait">Portrait (9:16)</SelectItem>
                    <SelectItem value="square">Square (1:1)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{t("video.settings.screen")}</Label>
                <Select value={screenStyle} onValueChange={setScreenStyle}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t("video.settings.screen.full")}</SelectItem>
                    <SelectItem value="2">{t("video.settings.screen.split")}</SelectItem>
                    <SelectItem value="3">{t("video.settings.screen.pip")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{t("video.settings.captions")}</Label>
                <div className="flex items-center gap-2 h-9">
                  <Switch checked={captionsEnabled} onCheckedChange={setCaptionsEnabled} />
                  <span className="text-sm text-muted-foreground">
                    {captionsEnabled ? t("video.settings.captions.on") : t("video.settings.captions.off")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {!videoJob && (
          <>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>{dialogue.length}</strong> {t("video.ready.count")}
              </p>
            </div>
            
            <Button
              onClick={generateVideo}
              disabled={isGenerating || dialogue.length === 0}
              className="w-full gap-2"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("video.generating")}
                </>
              ) : (
                <>
                  <Video className="w-4 h-4" />
                  {t("video.generate")}
                </>
              )}
            </Button>
          </>
        )}

        {(videoJob?.status === "processing" || videoJob?.status === "pending") && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("video.processing")}
              </div>
              <div className="flex items-center gap-2">
                {generationMethod && (
                  <Badge variant="outline" className="text-xs gap-1">
                    {generationMethod === "template" ? (
                      <><LayoutTemplate className="w-3 h-3" /> Template</>
                    ) : (
                      <><Video className="w-3 h-3" /> Avatar</>
                    )}
                  </Badge>
                )}
                <Button variant="ghost" size="sm" onClick={handleManualRefresh} className="gap-1">
                  <RefreshCw className="w-3 h-3" />
                  {t("video.refresh")}
                </Button>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Video ID: {videoJob.videoId}
            </p>
          </div>
        )}

        {videoJob?.status === "completed" && (
          <div className="space-y-4">
            {videoJob.videoUrl ? (
              <>
                {videoJob.coverUrl && (
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                    <img 
                      src={videoJob.coverUrl} 
                      alt="Video preview" 
                      className="w-full h-full object-cover"
                    />
                    <a 
                      href={videoJob.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors"
                    >
                      <Play className="w-16 h-16 text-white" fill="white" />
                    </a>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 gap-2"
                    onClick={() => window.open(videoJob.videoUrl, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4" />
                    {t("video.watch")}
                  </Button>
                  <Button 
                    className="flex-1 gap-2"
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = videoJob.videoUrl!;
                      a.download = `podcast-video-${new Date().toISOString().split('T')[0]}.mp4`;
                      a.click();
                    }}
                  >
                    <Download className="w-4 h-4" />
                    {t("video.download")}
                  </Button>
                </div>

                {/* JoggAI Editor link */}
                <Button
                  variant="outline"
                  className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/5"
                  onClick={() => {
                    const editorUrl = `https://app.jogg.ai/editor?id=${videoJob.videoId}&index=0&from=projects`;
                    window.open(editorUrl, "_blank");
                  }}
                >
                  <ExternalLink className="w-4 h-4" />
                  {t("video.edit.joggai") || "Edit in JoggAI Editor"}
                </Button>
              </>
            ) : (
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20 space-y-2">
                <p className="text-sm text-green-600">
                  {t("video.completed.nourl")}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleManualRefresh} className="gap-1">
                    <RefreshCw className="w-3 h-3" />
                    {t("video.refresh")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 border-primary/30 text-primary"
                    onClick={() => {
                      const editorUrl = `https://app.jogg.ai/editor?id=${videoJob.videoId}&index=0&from=projects`;
                      window.open(editorUrl, "_blank");
                    }}
                  >
                    <ExternalLink className="w-3 h-3" />
                    {t("video.edit.joggai") || "Edit in JoggAI Editor"}
                  </Button>
                </div>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setVideoJob(null);
                setProgress(0);
              }}
              className="w-full"
            >
              {t("video.new")}
            </Button>
          </div>
        )}

        {videoJob?.status === "failed" && (
          <div className="space-y-4">
            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              <p className="text-sm text-red-500">
                {t("video.failed.message")}
              </p>
            </div>
            <Button
              onClick={() => {
                setVideoJob(null);
                setProgress(0);
              }}
              className="w-full"
            >
              {t("video.retry")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
