import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Video, CheckCircle2, AlertCircle, Download, ExternalLink, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import type { DialogueLine } from "@/types/podcast";
import type { PodcastSpeakerConfig } from "@/lib/joggai";

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

export default function VideoGenerator({ 
  dialogue, 
  speaker1Name, 
  speaker2Name,
  speaker1Config,
  speaker2Config
}: VideoGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoJob, setVideoJob] = useState<VideoJob | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [progress, setProgress] = useState(0);
  
  const { toast } = useToast();
  const { t } = useLanguage();

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Simulate progress while processing
  useEffect(() => {
    if (videoJob?.status === "processing") {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) return prev;
          return prev + Math.random() * 5;
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

    try {
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
      const dialogueScript = getDialogueScript();
      // Also get separate per-speaker scripts as fallback
      const { speaker1Script, speaker2Script } = getSpeakerScripts();

      // Use the proper two-speaker podcast format:
      // - avatar + avatar_b for two speakers
      // - voice + voice_b for two voices
      // - screen_style 2 = split screen (podcast layout)
      // - dialogue script uses [A] and [B] markers for turn-taking
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
        aspect_ratio: "landscape",
        screen_style: 2, // Split screen — podcast format
        caption: true,
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

  const startPolling = (videoId: string) => {
    // Clear any existing interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    const pollApiKey = localStorage.getItem("joggai_api_key") || import.meta.env.VITE_JOGGAI_API_KEY || "";

    const interval = setInterval(async () => {
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
          return;
        }

        console.log("JoggAI status check:", data);

        if (data.code !== 0) {
          console.error("Status check failed:", data);
          return;
        }

        const status = data.data.status;
        
        setVideoJob({
          videoId,
          status: status === "success" || status === "completed" ? "completed" : 
                  status === "failed" ? "failed" : "processing",
          videoUrl: data.data.video_url,
          coverUrl: data.data.cover_url,
          createdAt: data.data.created_at,
        });

        if (status === "success" || status === "completed") {
          clearInterval(interval);
          setPollingInterval(null);
          toast({
            title: t("video.completed"),
            description: t("video.completed.desc"),
          });
        } else if (status === "failed") {
          clearInterval(interval);
          setPollingInterval(null);
          toast({
            title: t("video.failed"),
            description: t("video.failed.desc"),
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 10000); // Poll every 10 seconds

    setPollingInterval(interval);
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
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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

        {videoJob?.status === "processing" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("video.processing")}
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Video ID: {videoJob.videoId}
            </p>
          </div>
        )}

        {videoJob?.status === "completed" && videoJob.videoUrl && (
          <div className="space-y-4">
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
