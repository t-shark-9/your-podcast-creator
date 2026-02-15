import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  User,
  Volume2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Play,
  Square,
  ImageIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { joggAiService, JoggAiAvatar, JoggAiVoice } from "@/lib/joggai";
import { cn } from "@/lib/utils";

interface AvatarVoicePickerProps {
  /** Called whenever avatar or voice selection changes */
  onSelectionChange?: (selection: {
    avatarId: string;
    avatarType: 0 | 1;
    voiceId: string;
    avatarName?: string;
    voiceName?: string;
  }) => void;
  /** localStorage prefix for persisting selections */
  storagePrefix?: string;
}

export default function AvatarVoicePicker({
  onSelectionChange,
  storagePrefix = "joggai_speaker1",
}: AvatarVoicePickerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [publicAvatars, setPublicAvatars] = useState<JoggAiAvatar[]>([]);
  const [photoAvatars, setPhotoAvatars] = useState<JoggAiAvatar[]>([]);
  const [voices, setVoices] = useState<JoggAiVoice[]>([]);
  const [hasApiKey, setHasApiKey] = useState(false);

  const [selectedAvatarId, setSelectedAvatarId] = useState<string>("");
  const [selectedAvatarType, setSelectedAvatarType] = useState<0 | 1>(0);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");

  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { toast } = useToast();
  const { t, language } = useLanguage();

  useEffect(() => {
    loadResources();
    loadSavedSelections();
  }, []);

  // Notify parent when selection changes
  useEffect(() => {
    if (selectedAvatarId && selectedVoiceId) {
      const allAvatars = [...publicAvatars, ...photoAvatars];
      const avatar = allAvatars.find((a) => String(a.avatar_id) === selectedAvatarId);
      const voice = voices.find((v) => v.voice_id === selectedVoiceId);

      // Save to localStorage
      localStorage.setItem(`${storagePrefix}_avatar`, selectedAvatarId);
      localStorage.setItem(`${storagePrefix}_avatar_type`, String(selectedAvatarType));
      localStorage.setItem(`${storagePrefix}_voice`, selectedVoiceId);

      onSelectionChange?.({
        avatarId: selectedAvatarId,
        avatarType: selectedAvatarType,
        voiceId: selectedVoiceId,
        avatarName: avatar?.name,
        voiceName: voice?.name,
      });
    }
  }, [selectedAvatarId, selectedAvatarType, selectedVoiceId]);

  const loadSavedSelections = () => {
    setSelectedAvatarId(localStorage.getItem(`${storagePrefix}_avatar`) || "");
    setSelectedAvatarType(
      (Number(localStorage.getItem(`${storagePrefix}_avatar_type`) || "0") as 0 | 1)
    );
    setSelectedVoiceId(localStorage.getItem(`${storagePrefix}_voice`) || "");
  };

  const loadResources = async () => {
    setIsLoading(true);
    const apiKey =
      localStorage.getItem("joggai_api_key") || import.meta.env.VITE_JOGGAI_API_KEY;
    if (!apiKey) {
      setHasApiKey(false);
      setIsLoading(false);
      return;
    }
    setHasApiKey(true);
    try {
      const [pub, photo, v] = await Promise.all([
        joggAiService.getPublicAvatars(),
        joggAiService.getPhotoAvatars(),
        joggAiService.getVoices(),
      ]);
      setPublicAvatars(Array.isArray(pub) ? pub : []);
      setPhotoAvatars(Array.isArray(photo) ? photo : []);
      setVoices(Array.isArray(v) ? v : []);
    } catch (error) {
      console.error("Error loading JoggAI resources:", error);
      toast({
        title: t("avs.error"),
        description: error instanceof Error ? error.message : t("avs.error.desc"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarSelect = (avatarId: string, isPhoto: boolean) => {
    setSelectedAvatarId(avatarId);
    setSelectedAvatarType(isPhoto ? 1 : 0);
  };

  const playVoicePreview = (voiceId: string, previewUrl?: string) => {
    // Stop current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (playingVoiceId === voiceId) {
      setPlayingVoiceId(null);
      return;
    }

    if (!previewUrl) {
      toast({
        title: language === "de" ? "Keine Vorschau" : "No preview",
        description:
          language === "de"
            ? "Für diese Stimme ist keine Audio-Vorschau verfügbar."
            : "No audio preview available for this voice.",
      });
      return;
    }

    const audio = new Audio(previewUrl);
    audioRef.current = audio;
    setPlayingVoiceId(voiceId);

    audio.play().catch(() => {
      setPlayingVoiceId(null);
    });

    audio.onended = () => {
      setPlayingVoiceId(null);
      audioRef.current = null;
    };
    audio.onerror = () => {
      setPlayingVoiceId(null);
      audioRef.current = null;
    };
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (!hasApiKey) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="py-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" />
          <div>
            <h3 className="font-semibold">{t("avs.noapi")}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t("avs.noapi.desc")}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/settings")}
          >
            {t("avs.goto.settings")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="py-12 text-center space-y-4">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
          <p className="text-muted-foreground">{t("avs.loading")}</p>
        </CardContent>
      </Card>
    );
  }

  const germanVoices = voices.filter(
    (v) => v.language?.startsWith("de") || v.name?.toLowerCase().includes("german")
  );
  const englishVoices = voices.filter(
    (v) => v.language?.startsWith("en") || v.name?.toLowerCase().includes("english")
  );
  const otherVoices = voices.filter(
    (v) => !germanVoices.includes(v) && !englishVoices.includes(v)
  );

  const renderAvatarGrid = (avatars: JoggAiAvatar[], isPhoto: boolean) => (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
      {avatars.slice(0, 50).map((avatar) => {
        const id = String(avatar.avatar_id);
        const isSelected = selectedAvatarId === id && selectedAvatarType === (isPhoto ? 1 : 0);
        const imageUrl = avatar.cover_url || avatar.preview_url;
        return (
          <button
            key={`${isPhoto ? "photo_" : ""}${id}`}
            onClick={() => handleAvatarSelect(id, isPhoto)}
            className={cn(
              "relative rounded-lg overflow-hidden border-2 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50",
              isSelected
                ? "border-primary ring-2 ring-primary/30 shadow-lg"
                : "border-border/50 hover:border-primary/40"
            )}
          >
            <div className="aspect-square bg-muted relative">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={avatar.name || "Avatar"}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              {isSelected && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-primary drop-shadow-lg" />
                </div>
              )}
            </div>
            <div className="p-1.5 text-center">
              <p className="text-xs truncate font-medium">
                {avatar.name || `Avatar ${avatar.avatar_id}`}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );

  const renderVoiceItem = (voice: JoggAiVoice) => {
    const isSelected = selectedVoiceId === voice.voice_id;
    const isPlaying = playingVoiceId === voice.voice_id;
    return (
      <button
        key={voice.voice_id}
        onClick={() => setSelectedVoiceId(voice.voice_id)}
        className={cn(
          "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
          isSelected
            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
            : "border-border/50 hover:border-primary/40 hover:bg-muted/50"
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{voice.name}</span>
            {voice.gender && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {voice.gender}
              </Badge>
            )}
          </div>
          {voice.language && (
            <p className="text-xs text-muted-foreground mt-0.5">{voice.language}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {voice.preview_url && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                playVoicePreview(voice.voice_id, voice.preview_url);
              }}
            >
              {isPlaying ? (
                <Square className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
            </Button>
          )}
          {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
        </div>
      </button>
    );
  };

  const renderVoiceGroup = (label: string, groupVoices: JoggAiVoice[]) => {
    if (groupVoices.length === 0) return null;
    return (
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
          {label}
        </h4>
        <div className="space-y-1.5">
          {groupVoices.slice(0, 30).map(renderVoiceItem)}
        </div>
      </div>
    );
  };

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          {language === "de" ? "Avatar & Stimme wählen" : "Choose Avatar & Voice"}
        </CardTitle>
        <CardDescription>
          {language === "de"
            ? "Wähle einen Avatar und eine Stimme für dein Video"
            : "Select an avatar and voice for your video"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2 text-sm">
              <ImageIcon className="w-4 h-4" />
              {language === "de" ? "Avatar" : "Avatar"}
              {selectedAvatarId && (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              )}
            </h3>
            <Button variant="ghost" size="sm" onClick={loadResources} className="h-7 gap-1.5">
              <RefreshCw className="w-3 h-3" />
              {t("avs.reload")}
            </Button>
          </div>

          <Tabs defaultValue={photoAvatars.length > 0 ? "photo" : "public"} className="w-full">
            <TabsList className="w-full">
              {photoAvatars.length > 0 && (
                <TabsTrigger value="photo" className="flex-1">
                  {t("avs.avatar.own")} ({photoAvatars.length})
                </TabsTrigger>
              )}
              <TabsTrigger value="public" className="flex-1">
                {t("avs.avatar.public")} ({publicAvatars.length})
              </TabsTrigger>
            </TabsList>
            {photoAvatars.length > 0 && (
              <TabsContent value="photo" className="mt-3">
                <ScrollArea className="h-[240px] pr-3">
                  {renderAvatarGrid(photoAvatars, true)}
                </ScrollArea>
              </TabsContent>
            )}
            <TabsContent value="public" className="mt-3">
              <ScrollArea className="h-[240px] pr-3">
                {renderAvatarGrid(publicAvatars, false)}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Voice Selection */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2 text-sm">
            <Volume2 className="w-4 h-4" />
            {language === "de" ? "Stimme" : "Voice"}
            {selectedVoiceId && (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            )}
          </h3>
          <ScrollArea className="h-[260px] pr-3">
            <div className="space-y-4">
              {renderVoiceGroup(t("avs.voice.german"), germanVoices)}
              {renderVoiceGroup(t("avs.voice.english"), englishVoices)}
              {renderVoiceGroup(t("avs.voice.other"), otherVoices)}
            </div>
          </ScrollArea>
        </div>

        {/* Selection Summary */}
        {(selectedAvatarId || selectedVoiceId) && (
          <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-xs text-muted-foreground mb-1.5">
              {language === "de" ? "Aktuelle Auswahl:" : "Current selection:"}
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedAvatarId && (() => {
                const allAvatars = [...publicAvatars, ...photoAvatars];
                const avatar = allAvatars.find(
                  (a) => String(a.avatar_id) === selectedAvatarId
                );
                return (
                  <Badge variant="secondary" className="gap-1">
                    <User className="w-3 h-3" />
                    {avatar?.name || `Avatar ${selectedAvatarId}`}
                  </Badge>
                );
              })()}
              {selectedVoiceId && (() => {
                const voice = voices.find((v) => v.voice_id === selectedVoiceId);
                return (
                  <Badge variant="secondary" className="gap-1">
                    <Volume2 className="w-3 h-3" />
                    {voice?.name || selectedVoiceId}
                  </Badge>
                );
              })()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
