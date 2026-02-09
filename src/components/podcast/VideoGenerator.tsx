import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Video, CheckCircle2, AlertCircle, Download, ExternalLink, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { DialogueLine } from "@/types/podcast";

interface VideoGeneratorProps {
  dialogue: DialogueLine[];
  speaker1Name: string;
  speaker2Name: string;
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
  speaker2Name 
}: VideoGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoJob, setVideoJob] = useState<VideoJob | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [progress, setProgress] = useState(0);
  
  const { toast } = useToast();

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

  const getFullScript = () => {
    return dialogue.map(line => {
      const speakerName = line.speaker === "speaker1" ? speaker1Name : speaker2Name;
      return `${speakerName}: ${line.text}`;
    }).join("\n\n");
  };

  const generateVideo = async () => {
    const apiKey = localStorage.getItem("joggai_api_key") || import.meta.env.VITE_JOGGAI_API_KEY;
    
    if (!apiKey) {
      toast({
        title: "API Key fehlt",
        description: "Bitte konfiguriere deinen JoggAI API Key in den Einstellungen.",
        variant: "destructive",
      });
      return;
    }

    if (dialogue.length === 0) {
      toast({
        title: "Kein Dialog",
        description: "Bitte erstelle zuerst einen Podcast-Dialog.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      const script = getFullScript();
      const avatarId = localStorage.getItem("joggai_selected_avatar") || "412";
      const voiceId = localStorage.getItem("joggai_selected_voice") || "MFZUKuGQUsGJPQjTS4wC";

      const response = await fetch("https://api.jogg.ai/v2/create_video_from_avatar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          avatar: {
            avatar_id: parseInt(avatarId),
            avatar_type: 0,
          },
          voice: {
            type: "script",
            voice_id: voiceId,
            script: script,
          },
          aspect_ratio: "landscape",
          screen_style: 1,
          caption: true,
          video_name: `Podcast: ${new Date().toLocaleDateString('de-DE')}`,
        }),
      });

      const data = await response.json();

      if (data.code !== 0) {
        throw new Error(data.msg || "Video creation failed");
      }

      const videoId = data.data.video_id;
      setVideoJob({
        videoId,
        status: "processing",
      });

      toast({
        title: "Video wird generiert",
        description: "Das dauert etwa 2-5 Minuten. Du kannst den Fortschritt hier verfolgen.",
      });

      // Start polling for status
      startPolling(videoId, apiKey);

    } catch (error: any) {
      console.error("Video generation error:", error);
      toast({
        title: "Fehler bei der Video-Generierung",
        description: error.message || "Das Video konnte nicht erstellt werden.",
        variant: "destructive",
      });
      setVideoJob(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const startPolling = (videoId: string, apiKey: string) => {
    // Clear any existing interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`https://api.jogg.ai/v2/avatar_video/${videoId}`, {
          method: "GET",
          headers: {
            "x-api-key": apiKey,
          },
        });

        const data = await response.json();

        if (data.code !== 0) {
          console.error("Status check failed:", data);
          return;
        }

        const status = data.data.status;
        
        setVideoJob({
          videoId,
          status: status === "completed" ? "completed" : 
                  status === "failed" ? "failed" : "processing",
          videoUrl: data.data.video_url,
          coverUrl: data.data.cover_url,
          createdAt: data.data.created_at,
        });

        if (status === "completed") {
          clearInterval(interval);
          setPollingInterval(null);
          toast({
            title: "Video fertig!",
            description: "Dein Podcast-Video wurde erfolgreich erstellt.",
          });
        } else if (status === "failed") {
          clearInterval(interval);
          setPollingInterval(null);
          toast({
            title: "Video-Generierung fehlgeschlagen",
            description: "Bitte versuche es erneut.",
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
            Wird generiert...
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="default" className="gap-1 bg-green-500">
            <CheckCircle2 className="w-3 h-3" />
            Fertig
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="w-3 h-3" />
            Fehlgeschlagen
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
              Video generieren
            </CardTitle>
            <CardDescription>
              Erstelle ein Avatar-Video aus deinem Podcast-Dialog mit JoggAI
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
                <strong>{dialogue.length}</strong> Dialogzeilen bereit für die Video-Generierung.
                Das Video wird mit einem KI-Avatar erstellt, der den Text vorliest.
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
                  Video wird erstellt...
                </>
              ) : (
                <>
                  <Video className="w-4 h-4" />
                  Video generieren
                </>
              )}
            </Button>
          </>
        )}

        {videoJob?.status === "processing" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Video wird generiert... Dies dauert etwa 2-5 Minuten.
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
                Video ansehen
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
                Herunterladen
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
              Neues Video erstellen
            </Button>
          </div>
        )}

        {videoJob?.status === "failed" && (
          <div className="space-y-4">
            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              <p className="text-sm text-red-500">
                Die Video-Generierung ist fehlgeschlagen. Bitte versuche es erneut.
              </p>
            </div>
            <Button
              onClick={() => {
                setVideoJob(null);
                setProgress(0);
              }}
              className="w-full"
            >
              Erneut versuchen
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
