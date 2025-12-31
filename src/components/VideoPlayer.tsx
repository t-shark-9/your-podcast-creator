import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX, Maximize, Download, RefreshCw } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface VideoPlayerProps {
  videoUrl: string;
  audioUrl?: string;
  title?: string;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

export const VideoPlayer = ({ 
  videoUrl, 
  audioUrl, 
  title = "Podcast Video",
  onRegenerate,
  isRegenerating 
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("ended", handleEnded);
    };
  }, [videoUrl]);

  // Sync audio with video if both exist
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio || !audioUrl) return;

    const syncAudio = () => {
      if (Math.abs(audio.currentTime - video.currentTime) > 0.3) {
        audio.currentTime = video.currentTime;
      }
    };

    video.addEventListener("timeupdate", syncAudio);
    return () => video.removeEventListener("timeupdate", syncAudio);
  }, [audioUrl]);

  const togglePlay = () => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      audio?.pause();
    } else {
      video.play();
      audio?.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video) return;

    const time = value[0];
    video.currentTime = time;
    if (audio) audio.currentTime = time;
    setCurrentTime(time);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video) return;

    const newMuted = !isMuted;
    video.muted = newMuted;
    if (audio) audio.muted = newMuted;
    setIsMuted(newMuted);
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video) return;

    const vol = value[0];
    video.volume = vol;
    if (audio) audio.volume = vol;
    setVolume(vol);
    setIsMuted(vol === 0);
  };

  const handleFullscreen = () => {
    videoRef.current?.requestFullscreen();
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `${title}.mp4`;
    a.click();
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Video Container */}
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          playsInline
          loop
          muted={!!audioUrl}
          autoPlay
        />
        
        {/* Hidden audio for synchronized playback */}
        {audioUrl && (
          <audio ref={audioRef} src={audioUrl} />
        )}

        {/* Play overlay */}
        {!isPlaying && (
          <div 
            className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer transition-opacity hover:bg-black/20"
            onClick={togglePlay}
          >
            <div className="p-6 rounded-full bg-primary/90 text-primary-foreground">
              <Play className="h-12 w-12" />
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-3 p-4 rounded-xl bg-secondary/50 border border-border">
        {/* Progress bar */}
        <Slider
          value={[currentTime]}
          min={0}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSeek}
          className="cursor-pointer"
        />

        {/* Control buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlay}
              className="h-10 w-10"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>

            <div className="flex items-center gap-2 w-32">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="h-8 w-8"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
                className="w-20"
              />
            </div>

            <span className="text-xs text-muted-foreground font-mono ml-2">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {onRegenerate && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="h-8 w-8"
                title="Video neu generieren"
              >
                <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFullscreen}
              className="h-8 w-8"
              title="Vollbild"
            >
              <Maximize className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="h-8 w-8"
              title="Herunterladen"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <p className="text-sm font-medium text-foreground text-center">{title}</p>
      </div>
    </div>
  );
};
