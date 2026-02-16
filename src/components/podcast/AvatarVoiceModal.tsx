import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Search,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { joggAiService, JoggAiAvatar, JoggAiVoice } from "@/lib/joggai";
import { cn } from "@/lib/utils";

export interface AvatarVoiceSelection {
  avatarId: string;
  avatarType: 0 | 1;
  voiceId: string;
  avatarName?: string;
  voiceName?: string;
  avatarImage?: string;
}

interface AvatarVoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Which tab to show first */
  initialTab?: "avatar" | "voice";
  /** localStorage prefix for persisting selections */
  storagePrefix?: string;
  /** Callback when user confirms selection */
  onConfirm?: (selection: AvatarVoiceSelection) => void;
}

export default function AvatarVoiceModal({
  open,
  onOpenChange,
  initialTab = "avatar",
  storagePrefix = "joggai_speaker1",
  onConfirm,
}: AvatarVoiceModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [publicAvatars, setPublicAvatars] = useState<JoggAiAvatar[]>([]);
  const [photoAvatars, setPhotoAvatars] = useState<JoggAiAvatar[]>([]);
  const [voices, setVoices] = useState<JoggAiVoice[]>([]);
  const [hasApiKey, setHasApiKey] = useState(false);

  const [selectedAvatarId, setSelectedAvatarId] = useState<string>("");
  const [selectedAvatarType, setSelectedAvatarType] = useState<0 | 1>(0);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");

  const [avatarSearch, setAvatarSearch] = useState("");
  const [voiceSearch, setVoiceSearch] = useState("");
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const { toast } = useToast();
  const { t, language } = useLanguage();

  // Load on first open
  useEffect(() => {
    if (open) {
      loadSavedSelections();
      loadResources();
      setActiveTab(initialTab);
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingVoiceId(null);
    };
  }, [open]);

  const loadSavedSelections = () => {
    setSelectedAvatarId(localStorage.getItem(`${storagePrefix}_avatar`) || "");
    setSelectedAvatarType(
      Number(localStorage.getItem(`${storagePrefix}_avatar_type`) || "0") as 0 | 1
    );
    setSelectedVoiceId(localStorage.getItem(`${storagePrefix}_voice`) || "");
  };

  const loadResources = async () => {
    const apiKey =
      localStorage.getItem("joggai_api_key") || import.meta.env.VITE_JOGGAI_API_KEY;
    if (!apiKey) {
      setHasApiKey(false);
      setIsLoading(false);
      return;
    }
    setHasApiKey(true);
    setIsLoading(true);
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
    audio.play().catch(() => setPlayingVoiceId(null));
    audio.onended = () => {
      setPlayingVoiceId(null);
      audioRef.current = null;
    };
    audio.onerror = () => {
      setPlayingVoiceId(null);
      audioRef.current = null;
    };
  };

  const handleConfirm = () => {
    const allAvatars = [...publicAvatars, ...photoAvatars];
    const avatar = allAvatars.find((a) => String(a.avatar_id) === selectedAvatarId);
    const voice = voices.find((v) => v.voice_id === selectedVoiceId);

    // Persist
    localStorage.setItem(`${storagePrefix}_avatar`, selectedAvatarId);
    localStorage.setItem(`${storagePrefix}_avatar_type`, String(selectedAvatarType));
    localStorage.setItem(`${storagePrefix}_voice`, selectedVoiceId);

    onConfirm?.({
      avatarId: selectedAvatarId,
      avatarType: selectedAvatarType,
      voiceId: selectedVoiceId,
      avatarName: avatar?.name,
      voiceName: voice?.name,
      avatarImage: avatar?.cover_url || avatar?.preview_url,
    });
    onOpenChange(false);
  };

  // ---- Filtered data ----
  const filterAvatars = (avatars: JoggAiAvatar[]) => {
    if (!avatarSearch.trim()) return avatars;
    const q = avatarSearch.toLowerCase();
    return avatars.filter(
      (a) =>
        a.name?.toLowerCase().includes(q) ||
        String(a.avatar_id).includes(q)
    );
  };

  const germanVoices = voices.filter(
    (v) => v.language?.startsWith("de") || v.name?.toLowerCase().includes("german")
  );
  const englishVoices = voices.filter(
    (v) => v.language?.startsWith("en") || v.name?.toLowerCase().includes("english")
  );
  const otherVoices = voices.filter(
    (v) => !germanVoices.includes(v) && !englishVoices.includes(v)
  );

  const filterVoices = (voiceList: JoggAiVoice[]) => {
    if (!voiceSearch.trim()) return voiceList;
    const q = voiceSearch.toLowerCase();
    return voiceList.filter(
      (v) =>
        v.name?.toLowerCase().includes(q) ||
        v.language?.toLowerCase().includes(q) ||
        v.gender?.toLowerCase().includes(q)
    );
  };

  // ---- Resolve current selection names for summary ----
  const allAvatars = [...publicAvatars, ...photoAvatars];
  const selectedAvatar = allAvatars.find((a) => String(a.avatar_id) === selectedAvatarId);
  const selectedVoice = voices.find((v) => v.voice_id === selectedVoiceId);

  // ---- Render helpers ----
  const renderAvatarGrid = (avatars: JoggAiAvatar[], isPhoto: boolean) => {
    const filtered = filterAvatars(avatars);
    if (filtered.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">{language === "de" ? "Keine Avatare gefunden" : "No avatars found"}</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
        {filtered.slice(0, 60).map((avatar) => {
          const id = String(avatar.avatar_id);
          const isSelected = selectedAvatarId === id && selectedAvatarType === (isPhoto ? 1 : 0);
          const imageUrl = avatar.cover_url || avatar.preview_url;
          return (
            <button
              key={`${isPhoto ? "photo_" : ""}${id}`}
              onClick={() => handleAvatarSelect(id, isPhoto)}
              className={cn(
                "relative rounded-xl overflow-hidden border-2 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50 group",
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
                    <User className="w-10 h-10 text-muted-foreground" />
                  </div>
                )}
                {isSelected && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-primary drop-shadow-lg" />
                  </div>
                )}
                {!isSelected && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                )}
              </div>
              <div className="p-2 text-center bg-card">
                <p className="text-xs truncate font-medium">
                  {avatar.name || `Avatar ${avatar.avatar_id}`}
                </p>
                {avatar.gender && (
                  <p className="text-[10px] text-muted-foreground">{avatar.gender}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderVoiceItem = (voice: JoggAiVoice) => {
    const isSelected = selectedVoiceId === voice.voice_id;
    const isPlaying = playingVoiceId === voice.voice_id;
    return (
      <button
        key={voice.voice_id}
        onClick={() => setSelectedVoiceId(voice.voice_id)}
        className={cn(
          "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left group",
          isSelected
            ? "border-primary bg-primary/5 ring-1 ring-primary/30 shadow-sm"
            : "border-border/50 hover:border-primary/40 hover:bg-muted/50"
        )}
      >
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
          isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}>
          <Volume2 className="w-5 h-5" />
        </div>
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
              className="h-9 w-9 p-0 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                playVoicePreview(voice.voice_id, voice.preview_url);
              }}
            >
              {isPlaying ? (
                <Square className="w-4 h-4 text-primary" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
          )}
          {isSelected && <CheckCircle2 className="w-5 h-5 text-primary" />}
        </div>
      </button>
    );
  };

  const renderVoiceGroup = (label: string, groupVoices: JoggAiVoice[]) => {
    const filtered = filterVoices(groupVoices);
    if (filtered.length === 0) return null;
    return (
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 flex items-center gap-2">
          {label}
          <Badge variant="secondary" className="text-[10px]">{filtered.length}</Badge>
        </h4>
        <div className="space-y-1.5">
          {filtered.slice(0, 30).map(renderVoiceItem)}
        </div>
      </div>
    );
  };

  if (!hasApiKey && !isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="py-8 text-center space-y-4">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-semibold">{t("avs.noapi")}</h3>
              <p className="text-sm text-muted-foreground mt-1">{t("avs.noapi.desc")}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b space-y-1.5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <User className="w-5 h-5 text-primary" />
              {language === "de" ? "Avatar & Stimme wählen" : "Choose Avatar & Voice"}
            </DialogTitle>
            <DialogDescription>
              {language === "de"
                ? "Wähle einen Avatar und eine Stimme für dein Video"
                : "Select an avatar and voice for your video"}
            </DialogDescription>
          </DialogHeader>

          {/* Current selection chips */}
          {(selectedAvatarId || selectedVoiceId) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {selectedAvatar && (
                <Badge variant="secondary" className="gap-1.5 py-1 px-2.5">
                  {selectedAvatar.cover_url || selectedAvatar.preview_url ? (
                    <img
                      src={selectedAvatar.cover_url || selectedAvatar.preview_url}
                      alt=""
                      className="w-4 h-4 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-3 h-3" />
                  )}
                  {selectedAvatar.name || `Avatar ${selectedAvatarId}`}
                </Badge>
              )}
              {selectedVoice && (
                <Badge variant="secondary" className="gap-1.5 py-1 px-2.5">
                  <Volume2 className="w-3 h-3" />
                  {selectedVoice.name || selectedVoiceId}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-muted-foreground">{t("avs.loading")}</span>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
              <div className="px-6 pt-3">
                <TabsList className="w-full">
                  <TabsTrigger value="avatar" className="flex-1 gap-2">
                    <ImageIcon className="w-4 h-4" />
                    {language === "de" ? "Avatare" : "Avatars"}
                    <Badge variant="secondary" className="text-[10px] ml-1">
                      {publicAvatars.length + photoAvatars.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="voice" className="flex-1 gap-2">
                    <Volume2 className="w-4 h-4" />
                    {language === "de" ? "Stimmen" : "Voices"}
                    <Badge variant="secondary" className="text-[10px] ml-1">
                      {voices.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* ===== Avatar Tab ===== */}
              <TabsContent value="avatar" className="flex-1 min-h-0 flex flex-col mt-0">
                <div className="px-6 py-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={language === "de" ? "Avatare durchsuchen..." : "Search avatars..."}
                      value={avatarSearch}
                      onChange={(e) => setAvatarSearch(e.target.value)}
                      className="pl-9 pr-9"
                    />
                    {avatarSearch && (
                      <button
                        onClick={() => setAvatarSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <ScrollArea className="flex-1 px-6 pb-3">
                  <Tabs defaultValue={photoAvatars.length > 0 ? "photo" : "public"} className="w-full">
                    <TabsList className="mb-3">
                      {photoAvatars.length > 0 && (
                        <TabsTrigger value="photo">
                          {t("avs.avatar.own")} ({filterAvatars(photoAvatars).length})
                        </TabsTrigger>
                      )}
                      <TabsTrigger value="public">
                        {t("avs.avatar.public")} ({filterAvatars(publicAvatars).length})
                      </TabsTrigger>
                    </TabsList>
                    {photoAvatars.length > 0 && (
                      <TabsContent value="photo">
                        {renderAvatarGrid(photoAvatars, true)}
                      </TabsContent>
                    )}
                    <TabsContent value="public">
                      {renderAvatarGrid(publicAvatars, false)}
                    </TabsContent>
                  </Tabs>
                </ScrollArea>
              </TabsContent>

              {/* ===== Voice Tab ===== */}
              <TabsContent value="voice" className="flex-1 min-h-0 flex flex-col mt-0">
                <div className="px-6 py-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={language === "de" ? "Stimmen durchsuchen..." : "Search voices..."}
                      value={voiceSearch}
                      onChange={(e) => setVoiceSearch(e.target.value)}
                      className="pl-9 pr-9"
                    />
                    {voiceSearch && (
                      <button
                        onClick={() => setVoiceSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <ScrollArea className="flex-1 px-6 pb-3">
                  <div className="space-y-5">
                    {renderVoiceGroup(t("avs.voice.german"), germanVoices)}
                    {renderVoiceGroup(t("avs.voice.english"), englishVoices)}
                    {renderVoiceGroup(t("avs.voice.other"), otherVoices)}
                    {filterVoices(voices).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">{language === "de" ? "Keine Stimmen gefunden" : "No voices found"}</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between gap-4 bg-card/80">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadResources}
              disabled={isLoading}
              className="gap-1.5"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
              {t("avs.reload")}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {language === "de" ? "Abbrechen" : "Cancel"}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedAvatarId || !selectedVoiceId}
              className="gap-2 min-w-[120px]"
            >
              <CheckCircle2 className="w-4 h-4" />
              {language === "de" ? "Bestätigen" : "Confirm"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
