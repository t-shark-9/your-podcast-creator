import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Volume2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Play,
  Square,
  Search,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { joggAiService, JoggAiVoice } from "@/lib/joggai";
import { cn } from "@/lib/utils";

export interface VoiceSelection {
  voiceId: string;
  voiceName?: string;
}

interface VoiceBrowserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storagePrefix?: string;
  onConfirm?: (selection: VoiceSelection) => void;
}

export default function VoiceBrowserModal({
  open,
  onOpenChange,
  storagePrefix = "joggai_speaker1",
  onConfirm,
}: VoiceBrowserModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [voices, setVoices] = useState<JoggAiVoice[]>([]);
  const [hasApiKey, setHasApiKey] = useState(false);

  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");
  const [voiceSearch, setVoiceSearch] = useState("");
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { toast } = useToast();
  const { t, language } = useLanguage();

  useEffect(() => {
    if (open) {
      setSelectedVoiceId(localStorage.getItem(`${storagePrefix}_voice`) || "");
      loadVoices();
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingVoiceId(null);
    };
  }, [open]);

  const loadVoices = async () => {
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
      const v = await joggAiService.getVoices();
      setVoices(Array.isArray(v) ? v : []);
    } catch (error) {
      console.error("Error loading voices:", error);
      toast({
        title: language === "de" ? "Fehler" : "Error",
        description: error instanceof Error ? error.message : "Failed to load voices",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
    const voice = voices.find((v) => v.voice_id === selectedVoiceId);

    localStorage.setItem(`${storagePrefix}_voice`, selectedVoiceId);
    localStorage.setItem(`${storagePrefix}_voice_name`, voice?.name || "");

    onConfirm?.({
      voiceId: selectedVoiceId,
      voiceName: voice?.name,
    });
    onOpenChange(false);
  };

  // ---- Grouped & filtered voices ----
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

  const selectedVoice = voices.find((v) => v.voice_id === selectedVoiceId);

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
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
            isSelected
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
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
          <Badge variant="secondary" className="text-[10px]">
            {filtered.length}
          </Badge>
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
              <p className="text-sm text-muted-foreground mt-1">
                {t("avs.noapi.desc")}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[95vh] max-h-[95vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b space-y-1.5 shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Volume2 className="w-5 h-5 text-primary" />
              {language === "de" ? "Stimme wählen" : "Choose Voice"}
            </DialogTitle>
            <DialogDescription>
              {language === "de"
                ? "Wähle eine Stimme für dein Video"
                : "Select a voice for your video"}
            </DialogDescription>
          </DialogHeader>

          {selectedVoice && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="secondary" className="gap-1.5 py-1 px-2.5">
                <Volume2 className="w-3 h-3" />
                {selectedVoice.name || selectedVoiceId}
              </Badge>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="flex items-center justify-center h-full gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-muted-foreground">{t("avs.loading")}</span>
            </div>
          ) : (
            <>
              <div className="px-6 py-3 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={
                      language === "de"
                        ? "Stimmen durchsuchen..."
                        : "Search voices..."
                    }
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
                  {renderVoiceGroup(
                    t("avs.voice.german"),
                    germanVoices
                  )}
                  {renderVoiceGroup(
                    t("avs.voice.english"),
                    englishVoices
                  )}
                  {renderVoiceGroup(
                    t("avs.voice.other"),
                    otherVoices
                  )}
                  {filterVoices(voices).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">
                        {language === "de"
                          ? "Keine Stimmen gefunden"
                          : "No voices found"}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between gap-4 bg-card/80 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadVoices}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw
              className={cn("w-3.5 h-3.5", isLoading && "animate-spin")}
            />
            {t("avs.reload")}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {language === "de" ? "Abbrechen" : "Cancel"}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedVoiceId}
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
