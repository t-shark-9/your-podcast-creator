import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Play, Pause, Volume2, VolumeX, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

interface VideoClip {
  id: number;
  url: string;
  status: string;
}

const QuickCreate = () => {
  // Input state
  const [prompt, setPrompt] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  
  // Generation state
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  
  // Output state
  const [script, setScript] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [videoClips, setVideoClips] = useState<VideoClip[]>([]);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const { toast } = useToast();

  // Handle video end - loop to next clip or restart
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      if (videoClips.length > 0) {
        const nextIndex = (currentClipIndex + 1) % videoClips.length;
        setCurrentClipIndex(nextIndex);
      }
    };

    video.addEventListener("ended", handleEnded);
    return () => video.removeEventListener("ended", handleEnded);
  }, [currentClipIndex, videoClips.length]);

  // Auto-play next clip when index changes
  useEffect(() => {
    if (videoRef.current && videoClips.length > 0 && isPlaying) {
      videoRef.current.play();
    }
  }, [currentClipIndex, isPlaying, videoClips]);

  const handleGenerateAll = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Eingabe fehlt",
        description: "Bitte gib einen Text oder Thema ein.",
        variant: "destructive"
      });
      return;
    }

    // Step 1: Generate Script
    setIsGeneratingScript(true);
    try {
      const { data: scriptData, error: scriptError } = await supabase.functions.invoke("generate-podcast-script", {
        body: {
          config: {
            topics: prompt,
            speakerBackground: "Ein erfahrener, leicht sarkastischer Sprecher",
            podcastStructure: "Kurz und prägnant",
            textStyle: "Natürlich, gesprächig, mit Humor"
          },
          duration: "2",
          variantCount: 1
        }
      });

      if (scriptError) throw new Error(scriptError.message);
      if (scriptData?.error) throw new Error(scriptData.error);
      
      const generatedScript = scriptData.variants?.[0]?.content || "";
      setScript(generatedScript);
      
      toast({
        title: "Script erstellt",
        description: "Das Podcast-Script wurde generiert."
      });

      // Step 2: Generate Audio
      setIsGeneratingScript(false);
      setIsGeneratingAudio(true);
      
      const { data: audioData, error: audioError } = await supabase.functions.invoke("generate-podcast-audio", {
        body: {
          script: generatedScript,
          voiceId: "JBFqnCBsd6RMkjVDRZzb" // Default voice
        }
      });

      if (audioError) throw new Error(audioError.message);
      if (audioData?.error) throw new Error(audioData.error);

      const audioBlob = new Blob(
        [Uint8Array.from(atob(audioData.audioContent), c => c.charCodeAt(0))],
        { type: "audio/mpeg" }
      );
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

      toast({
        title: "Audio erstellt",
        description: "Das Podcast-Audio wurde generiert."
      });

      setIsGeneratingAudio(false);

      // Step 3: Generate Video Clips (3 clips)
      await generateVideoClips();

    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Generierung fehlgeschlagen",
        variant: "destructive"
      });
      setIsGeneratingScript(false);
      setIsGeneratingAudio(false);
      setIsGeneratingVideo(false);
    }
  };

  const generateVideoClips = async () => {
    setIsGeneratingVideo(true);
    const clips: VideoClip[] = [];
    const videoPromptBase = videoDescription || prompt;

    // Generate 3 different video clips with slight variations
    const variations = [
      `${videoPromptBase} - establishing shot, wide angle`,
      `${videoPromptBase} - medium shot, dynamic`,
      `${videoPromptBase} - close up, detailed`
    ];

    for (let i = 0; i < 3; i++) {
      try {
        toast({
          title: `Video ${i + 1}/3`,
          description: "Wird generiert..."
        });

        const { data, error } = await supabase.functions.invoke("generate-podcast-video", {
          body: {
            prompt: variations[i],
            background: videoDescription || "cinematic, high quality"
          }
        });

        if (error) {
          const errorMsg = typeof error === 'string' ? error : (error.message || 'Unknown error');
          throw new Error(errorMsg);
        }
        
        // Handle rate limit with retry
        if (data?.isRateLimit && data?.retryAfter) {
          const retrySeconds = data.retryAfter || 10;
          toast({
            title: "Rate Limit",
            description: `Warte ${retrySeconds} Sekunden...`
          });
          await new Promise(resolve => setTimeout(resolve, retrySeconds * 1000));
          i--; // Retry this clip
          continue;
        }

        if (data?.error) throw new Error(data.error);
        if (!data?.predictionId) throw new Error("Video konnte nicht gestartet werden");

        // Poll for completion
        const videoUrl = await pollForVideo(data.predictionId);
        if (videoUrl) {
          clips.push({ id: i, url: videoUrl, status: "complete" });
          setVideoClips([...clips]);
        }

      } catch (err) {
        console.error(`Error generating clip ${i}:`, err);
        toast({
          title: `Video ${i + 1} Fehler`,
          description: err instanceof Error ? err.message : "Fehler",
          variant: "destructive"
        });
      }
    }

    setIsGeneratingVideo(false);
    if (clips.length > 0) {
      toast({
        title: "Videos fertig!",
        description: `${clips.length} Video-Clips wurden erstellt.`
      });
    }
  };

  const pollForVideo = async (predictionId: string): Promise<string | null> => {
    const maxAttempts = 60; // 3 minutes max
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 3000));

      const { data, error } = await supabase.functions.invoke("generate-podcast-video", {
        body: { predictionId }
      });

      if (error) continue;

      if (data?.status === "succeeded" && data?.output) {
        return Array.isArray(data.output) ? data.output[0] : data.output;
      }
      
      if (data?.status === "failed") {
        throw new Error("Video generation failed");
      }
    }
    return null;
  };

  const togglePlayback = () => {
    if (isPlaying) {
      videoRef.current?.pause();
      audioRef.current?.pause();
    } else {
      videoRef.current?.play();
      audioRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  const handleReset = () => {
    setPrompt("");
    setVideoDescription("");
    setScript("");
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl("");
    setVideoClips([]);
    setCurrentClipIndex(0);
    setIsPlaying(false);
  };

  const isGenerating = isGeneratingScript || isGeneratingAudio || isGeneratingVideo;
  const hasContent = audioUrl || videoClips.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Quick Create
            </h1>
            <p className="text-muted-foreground">Einfacher Podcast + Video Generator</p>
          </div>
          <Link to="/">
            <Button variant="outline">Zurück zur Hauptseite</Button>
          </Link>
        </div>

        {/* Input Section */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>Dein Content</CardTitle>
            <CardDescription>
              Beschreibe dein Thema und optional das Video-Setting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Podcast-Thema / Text</label>
              <Textarea
                placeholder="z.B. Ein alter Mann auf einem Berg erzählt sarkastisch über das Schnitzen..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[120px]"
                disabled={isGenerating}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Video-Beschreibung (optional)</label>
              <Textarea
                placeholder="z.B. Alter Mann mit weißem Mantel und schwarzer Hose auf einem Berg, eine Ziege neben ihm..."
                value={videoDescription}
                onChange={(e) => setVideoDescription(e.target.value)}
                className="min-h-[80px]"
                disabled={isGenerating}
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleGenerateAll}
                disabled={isGenerating || !prompt.trim()}
                className="flex-1"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isGeneratingScript ? "Script..." : isGeneratingAudio ? "Audio..." : "Videos..."}
                  </>
                ) : (
                  "Alles Generieren"
                )}
              </Button>
              {hasContent && (
                <Button variant="outline" onClick={handleReset}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Zurücksetzen
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Script Preview */}
        {script && (
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Generiertes Script</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 p-4 rounded-lg max-h-[200px] overflow-y-auto">
                <p className="whitespace-pre-wrap text-sm">{script}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Video Player with Looping */}
        {videoClips.length > 0 && (
          <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Podcast Video</span>
                <span className="text-sm font-normal text-muted-foreground">
                  Clip {currentClipIndex + 1} / {videoClips.length} (loops endlessly)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Video */}
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  src={videoClips[currentClipIndex]?.url}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                
                {/* Overlay Controls */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="rounded-full w-16 h-16"
                    onClick={togglePlayback}
                  >
                    {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                  </Button>
                </div>
              </div>

              {/* Audio Player (hidden but functional) */}
              {audioUrl && (
                <audio ref={audioRef} src={audioUrl} loop />
              )}

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                <Button onClick={togglePlayback} variant="outline" size="lg">
                  {isPlaying ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                  {isPlaying ? "Pause" : "Play"}
                </Button>
                <Button onClick={toggleMute} variant="ghost" size="lg">
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </Button>
              </div>

              {/* Clip indicators */}
              <div className="flex justify-center gap-2">
                {videoClips.map((clip, index) => (
                  <button
                    key={clip.id}
                    onClick={() => setCurrentClipIndex(index)}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      index === currentClipIndex ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Audio Only (if no video yet) */}
        {audioUrl && videoClips.length === 0 && !isGeneratingVideo && (
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Podcast Audio</CardTitle>
            </CardHeader>
            <CardContent>
              <audio controls src={audioUrl} className="w-full" />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default QuickCreate;
