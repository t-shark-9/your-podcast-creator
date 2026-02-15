import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, User, Mic, RefreshCw, AlertCircle, CheckCircle2, Play, Square, Volume2, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { joggAiService, JoggAiAvatar, JoggAiVoice, PodcastSpeakerConfig } from "@/lib/joggai";
import { cn } from "@/lib/utils";

interface AvatarVoiceSelectorProps {
  speaker1Name: string;
  speaker2Name: string;
  onSpeaker1NameChange: (name: string) => void;
  onSpeaker2NameChange: (name: string) => void;
  onConfigComplete: (speaker1: PodcastSpeakerConfig, speaker2: PodcastSpeakerConfig) => void;
  onSkip?: () => void;
}

export default function AvatarVoiceSelector({
  speaker1Name,
  speaker2Name,
  onSpeaker1NameChange,
  onSpeaker2NameChange,
  onConfigComplete,
  onSkip,
}: AvatarVoiceSelectorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [publicAvatars, setPublicAvatars] = useState<JoggAiAvatar[]>([]);
  const [photoAvatars, setPhotoAvatars] = useState<JoggAiAvatar[]>([]);
  const [voices, setVoices] = useState<JoggAiVoice[]>([]);
  const [hasApiKey, setHasApiKey] = useState(false);

  // Speaker 1 selections
  const [speaker1Avatar, setSpeaker1Avatar] = useState<string>("");
  const [speaker1AvatarType, setSpeaker1AvatarType] = useState<0 | 1>(0);
  const [speaker1Voice, setSpeaker1Voice] = useState<string>("");

  // Speaker 2 selections
  const [speaker2Avatar, setSpeaker2Avatar] = useState<string>("");
  const [speaker2AvatarType, setSpeaker2AvatarType] = useState<0 | 1>(0);
  const [speaker2Voice, setSpeaker2Voice] = useState<string>("");

  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    loadResources();
    loadSavedSelections();
  }, []);

  const loadSavedSelections = () => {
    // Load from localStorage
    setSpeaker1Avatar(localStorage.getItem("joggai_speaker1_avatar") || "");
    setSpeaker1AvatarType(Number(localStorage.getItem("joggai_speaker1_avatar_type") || "0") as 0 | 1);
    setSpeaker1Voice(localStorage.getItem("joggai_speaker1_voice") || "");
    setSpeaker2Avatar(localStorage.getItem("joggai_speaker2_avatar") || "");
    setSpeaker2AvatarType(Number(localStorage.getItem("joggai_speaker2_avatar_type") || "0") as 0 | 1);
    setSpeaker2Voice(localStorage.getItem("joggai_speaker2_voice") || "");
  };

  const loadResources = async () => {
    setIsLoading(true);

    const apiKey = localStorage.getItem("joggai_api_key") || import.meta.env.VITE_JOGGAI_API_KEY;
    if (!apiKey) {
      setHasApiKey(false);
      setIsLoading(false);
      return;
    }

    setHasApiKey(true);

    try {
      const [publicAvatarsData, photoAvatarsData, voicesData] = await Promise.all([
        joggAiService.getPublicAvatars(),
        joggAiService.getPhotoAvatars(),
        joggAiService.getVoices(),
      ]);

      // Ensure arrays are set even if API returns unexpected format
      setPublicAvatars(Array.isArray(publicAvatarsData) ? publicAvatarsData : []);
      setPhotoAvatars(Array.isArray(photoAvatarsData) ? photoAvatarsData : []);
      setVoices(Array.isArray(voicesData) ? voicesData : []);
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

  const handleAvatarChange = (speaker: 1 | 2, value: string) => {
    const isPhoto = value.startsWith("photo_");
    const avatarId = isPhoto ? value.replace("photo_", "") : value;
    const avatarType: 0 | 1 = isPhoto ? 1 : 0;

    if (speaker === 1) {
      setSpeaker1Avatar(avatarId);
      setSpeaker1AvatarType(avatarType);
    } else {
      setSpeaker2Avatar(avatarId);
      setSpeaker2AvatarType(avatarType);
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
    if (!previewUrl) return;
    const audio = new Audio(previewUrl);
    audioRef.current = audio;
    setPlayingVoiceId(voiceId);
    audio.play().catch(() => setPlayingVoiceId(null));
    audio.onended = () => { setPlayingVoiceId(null); audioRef.current = null; };
    audio.onerror = () => { setPlayingVoiceId(null); audioRef.current = null; };
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

  const handleContinue = () => {
    if (!speaker1Avatar || !speaker1Voice || !speaker2Avatar || !speaker2Voice) {
      toast({
        title: t("avs.incomplete"),
        description: t("avs.incomplete.desc"),
        variant: "destructive",
      });
      return;
    }

    // Save to localStorage
    localStorage.setItem("joggai_speaker1_avatar", speaker1Avatar);
    localStorage.setItem("joggai_speaker1_avatar_type", String(speaker1AvatarType));
    localStorage.setItem("joggai_speaker1_voice", speaker1Voice);
    localStorage.setItem("joggai_speaker2_avatar", speaker2Avatar);
    localStorage.setItem("joggai_speaker2_avatar_type", String(speaker2AvatarType));
    localStorage.setItem("joggai_speaker2_voice", speaker2Voice);

    // Get avatar and voice names for display
    const allAvatars = [...publicAvatars, ...photoAvatars];
    const s1Avatar = allAvatars.find(a => String(a.avatar_id) === speaker1Avatar);
    const s2Avatar = allAvatars.find(a => String(a.avatar_id) === speaker2Avatar);
    const s1Voice = voices.find(v => v.voice_id === speaker1Voice);
    const s2Voice = voices.find(v => v.voice_id === speaker2Voice);

    onConfigComplete(
      {
        speakerName: speaker1Name,
        avatarId: speaker1Avatar,
        avatarType: speaker1AvatarType,
        voiceId: speaker1Voice,
        avatarName: s1Avatar?.name,
        voiceName: s1Voice?.name,
      },
      {
        speakerName: speaker2Name,
        avatarId: speaker2Avatar,
        avatarType: speaker2AvatarType,
        voiceId: speaker2Voice,
        avatarName: s2Avatar?.name,
        voiceName: s2Voice?.name,
      }
    );
  };

  if (!hasApiKey) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="py-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" />
          <div>
            <h3 className="font-semibold">{t("avs.noapi")}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t("avs.noapi.desc")}
            </p>
          </div>
          {onSkip && (
            <Button variant="ghost" onClick={onSkip}>
              {t("avs.skip")}
            </Button>
          )}
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

  const allAvatars = [
    ...publicAvatars.map(a => ({ ...a, isPhotoAvatar: false })),
    ...photoAvatars.map(a => ({ ...a, isPhotoAvatar: true })),
  ];

  const germanVoices = voices.filter(v => v.language?.startsWith("de") || v.name?.toLowerCase().includes("german"));
  const englishVoices = voices.filter(v => v.language?.startsWith("en") || v.name?.toLowerCase().includes("english"));
  const otherVoices = voices.filter(v => !germanVoices.includes(v) && !englishVoices.includes(v));

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          {t("avs.title")}
        </CardTitle>
        <CardDescription>
          {t("avs.desc")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Speaker 1 */}
        <div className="p-4 border rounded-lg space-y-4 bg-muted/20">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Badge variant="secondary">1</Badge>
              {t("avs.speaker1")}
            </h3>
            {speaker1Avatar && speaker1Voice && (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="speaker1-name">{t("avs.name")}</Label>
            <Input
              id="speaker1-name"
              value={speaker1Name}
              onChange={(e) => onSpeaker1NameChange(e.target.value)}
              placeholder={t("avs.name.placeholder")}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              {t("avs.avatar")}
            </Label>
            <Tabs defaultValue={photoAvatars.length > 0 ? "photo" : "public"} className="w-full">
              <TabsList className="w-full">
                {photoAvatars.length > 0 && (
                  <TabsTrigger value="photo" className="flex-1 text-xs">
                    {t("avs.avatar.own")} ({photoAvatars.length})
                  </TabsTrigger>
                )}
                <TabsTrigger value="public" className="flex-1 text-xs">
                  {t("avs.avatar.public")} ({publicAvatars.length})
                </TabsTrigger>
              </TabsList>
              {photoAvatars.length > 0 && (
                <TabsContent value="photo" className="mt-2">
                  <ScrollArea className="h-[160px]">
                    <div className="grid grid-cols-4 gap-2">
                      {photoAvatars.map((avatar) => {
                        const id = String(avatar.avatar_id);
                        const isSelected = speaker1Avatar === id && speaker1AvatarType === 1;
                        const imageUrl = avatar.cover_url || avatar.preview_url;
                        return (
                          <button key={`s1-photo-${id}`} onClick={() => handleAvatarChange(1, `photo_${id}`)}
                            className={cn("relative rounded-lg overflow-hidden border-2 transition-all hover:scale-105",
                              isSelected ? "border-primary ring-2 ring-primary/30" : "border-border/50 hover:border-primary/40"
                            )}>
                            <div className="aspect-square bg-muted">
                              {imageUrl ? <img src={imageUrl} alt={avatar.name || "Avatar"} className="w-full h-full object-cover" loading="lazy" />
                                : <div className="w-full h-full flex items-center justify-center"><User className="w-6 h-6 text-muted-foreground" /></div>}
                              {isSelected && <div className="absolute inset-0 bg-primary/20 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-primary" /></div>}
                            </div>
                            <p className="text-[10px] truncate p-1 text-center">{avatar.name || `Avatar ${id}`}</p>
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </TabsContent>
              )}
              <TabsContent value="public" className="mt-2">
                <ScrollArea className="h-[160px]">
                  <div className="grid grid-cols-4 gap-2">
                    {publicAvatars.slice(0, 50).map((avatar) => {
                      const id = String(avatar.avatar_id);
                      const isSelected = speaker1Avatar === id && speaker1AvatarType === 0;
                      const imageUrl = avatar.cover_url || avatar.preview_url;
                      return (
                        <button key={`s1-pub-${id}`} onClick={() => handleAvatarChange(1, id)}
                          className={cn("relative rounded-lg overflow-hidden border-2 transition-all hover:scale-105",
                            isSelected ? "border-primary ring-2 ring-primary/30" : "border-border/50 hover:border-primary/40"
                          )}>
                          <div className="aspect-square bg-muted">
                            {imageUrl ? <img src={imageUrl} alt={avatar.name || "Avatar"} className="w-full h-full object-cover" loading="lazy" />
                              : <div className="w-full h-full flex items-center justify-center"><User className="w-6 h-6 text-muted-foreground" /></div>}
                            {isSelected && <div className="absolute inset-0 bg-primary/20 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-primary" /></div>}
                          </div>
                          <p className="text-[10px] truncate p-1 text-center">{avatar.name || `Avatar ${id}`}</p>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              {t("avs.voice")}
            </Label>
            <ScrollArea className="h-[160px] border rounded-lg p-2">
              <div className="space-y-3">
                {germanVoices.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("avs.voice.german")}</p>
                    {germanVoices.map((voice) => {
                      const isSelected = speaker1Voice === voice.voice_id;
                      const isPlaying = playingVoiceId === voice.voice_id;
                      return (
                        <button key={`s1v-${voice.voice_id}`} onClick={() => setSpeaker1Voice(voice.voice_id)}
                          className={cn("w-full flex items-center gap-2 p-2 rounded-md text-left transition-all text-sm",
                            isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"
                          )}>
                          <span className="flex-1 truncate">{voice.name} {voice.gender && <span className="text-muted-foreground text-xs">({voice.gender})</span>}</span>
                          {voice.preview_url && (
                            <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0"
                              onClick={(e) => { e.stopPropagation(); playVoicePreview(voice.voice_id, voice.preview_url); }}>
                              {isPlaying ? <Square className="w-3 h-3 text-primary" /> : <Play className="w-3 h-3" />}
                            </Button>
                          )}
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
                {englishVoices.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("avs.voice.english")}</p>
                    {englishVoices.slice(0, 30).map((voice) => {
                      const isSelected = speaker1Voice === voice.voice_id;
                      const isPlaying = playingVoiceId === voice.voice_id;
                      return (
                        <button key={`s1v-${voice.voice_id}`} onClick={() => setSpeaker1Voice(voice.voice_id)}
                          className={cn("w-full flex items-center gap-2 p-2 rounded-md text-left transition-all text-sm",
                            isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"
                          )}>
                          <span className="flex-1 truncate">{voice.name} {voice.gender && <span className="text-muted-foreground text-xs">({voice.gender})</span>}</span>
                          {voice.preview_url && (
                            <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0"
                              onClick={(e) => { e.stopPropagation(); playVoicePreview(voice.voice_id, voice.preview_url); }}>
                              {isPlaying ? <Square className="w-3 h-3 text-primary" /> : <Play className="w-3 h-3" />}
                            </Button>
                          )}
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
                {otherVoices.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("avs.voice.other")}</p>
                    {otherVoices.slice(0, 30).map((voice) => {
                      const isSelected = speaker1Voice === voice.voice_id;
                      const isPlaying = playingVoiceId === voice.voice_id;
                      return (
                        <button key={`s1v-${voice.voice_id}`} onClick={() => setSpeaker1Voice(voice.voice_id)}
                          className={cn("w-full flex items-center gap-2 p-2 rounded-md text-left transition-all text-sm",
                            isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"
                          )}>
                          <span className="flex-1 truncate">{voice.name} {voice.language && <span className="text-muted-foreground text-xs">({voice.language})</span>}</span>
                          {voice.preview_url && (
                            <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0"
                              onClick={(e) => { e.stopPropagation(); playVoicePreview(voice.voice_id, voice.preview_url); }}>
                              {isPlaying ? <Square className="w-3 h-3 text-primary" /> : <Play className="w-3 h-3" />}
                            </Button>
                          )}
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Speaker 2 */}
        <div className="p-4 border rounded-lg space-y-4 bg-muted/20">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Badge variant="secondary">2</Badge>
              {t("avs.speaker2")}
            </h3>
            {speaker2Avatar && speaker2Voice && (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="speaker2-name">{t("avs.name")}</Label>
            <Input
              id="speaker2-name"
              value={speaker2Name}
              onChange={(e) => onSpeaker2NameChange(e.target.value)}
              placeholder={t("avs.name.placeholder")}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              {t("avs.avatar")}
            </Label>
            <Tabs defaultValue={photoAvatars.length > 0 ? "photo" : "public"} className="w-full">
              <TabsList className="w-full">
                {photoAvatars.length > 0 && (
                  <TabsTrigger value="photo" className="flex-1 text-xs">
                    {t("avs.avatar.own")} ({photoAvatars.length})
                  </TabsTrigger>
                )}
                <TabsTrigger value="public" className="flex-1 text-xs">
                  {t("avs.avatar.public")} ({publicAvatars.length})
                </TabsTrigger>
              </TabsList>
              {photoAvatars.length > 0 && (
                <TabsContent value="photo" className="mt-2">
                  <ScrollArea className="h-[160px]">
                    <div className="grid grid-cols-4 gap-2">
                      {photoAvatars.map((avatar) => {
                        const id = String(avatar.avatar_id);
                        const isSelected = speaker2Avatar === id && speaker2AvatarType === 1;
                        const imageUrl = avatar.cover_url || avatar.preview_url;
                        return (
                          <button key={`s2-photo-${id}`} onClick={() => handleAvatarChange(2, `photo_${id}`)}
                            className={cn("relative rounded-lg overflow-hidden border-2 transition-all hover:scale-105",
                              isSelected ? "border-primary ring-2 ring-primary/30" : "border-border/50 hover:border-primary/40"
                            )}>
                            <div className="aspect-square bg-muted">
                              {imageUrl ? <img src={imageUrl} alt={avatar.name || "Avatar"} className="w-full h-full object-cover" loading="lazy" />
                                : <div className="w-full h-full flex items-center justify-center"><User className="w-6 h-6 text-muted-foreground" /></div>}
                              {isSelected && <div className="absolute inset-0 bg-primary/20 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-primary" /></div>}
                            </div>
                            <p className="text-[10px] truncate p-1 text-center">{avatar.name || `Avatar ${id}`}</p>
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </TabsContent>
              )}
              <TabsContent value="public" className="mt-2">
                <ScrollArea className="h-[160px]">
                  <div className="grid grid-cols-4 gap-2">
                    {publicAvatars.slice(0, 50).map((avatar) => {
                      const id = String(avatar.avatar_id);
                      const isSelected = speaker2Avatar === id && speaker2AvatarType === 0;
                      const imageUrl = avatar.cover_url || avatar.preview_url;
                      return (
                        <button key={`s2-pub-${id}`} onClick={() => handleAvatarChange(2, id)}
                          className={cn("relative rounded-lg overflow-hidden border-2 transition-all hover:scale-105",
                            isSelected ? "border-primary ring-2 ring-primary/30" : "border-border/50 hover:border-primary/40"
                          )}>
                          <div className="aspect-square bg-muted">
                            {imageUrl ? <img src={imageUrl} alt={avatar.name || "Avatar"} className="w-full h-full object-cover" loading="lazy" />
                              : <div className="w-full h-full flex items-center justify-center"><User className="w-6 h-6 text-muted-foreground" /></div>}
                            {isSelected && <div className="absolute inset-0 bg-primary/20 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-primary" /></div>}
                          </div>
                          <p className="text-[10px] truncate p-1 text-center">{avatar.name || `Avatar ${id}`}</p>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              {t("avs.voice")}
            </Label>
            <ScrollArea className="h-[160px] border rounded-lg p-2">
              <div className="space-y-3">
                {germanVoices.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("avs.voice.german")}</p>
                    {germanVoices.map((voice) => {
                      const isSelected = speaker2Voice === voice.voice_id;
                      const isPlaying = playingVoiceId === voice.voice_id;
                      return (
                        <button key={`s2v-${voice.voice_id}`} onClick={() => setSpeaker2Voice(voice.voice_id)}
                          className={cn("w-full flex items-center gap-2 p-2 rounded-md text-left transition-all text-sm",
                            isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"
                          )}>
                          <span className="flex-1 truncate">{voice.name} {voice.gender && <span className="text-muted-foreground text-xs">({voice.gender})</span>}</span>
                          {voice.preview_url && (
                            <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0"
                              onClick={(e) => { e.stopPropagation(); playVoicePreview(voice.voice_id, voice.preview_url); }}>
                              {isPlaying ? <Square className="w-3 h-3 text-primary" /> : <Play className="w-3 h-3" />}
                            </Button>
                          )}
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
                {englishVoices.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("avs.voice.english")}</p>
                    {englishVoices.slice(0, 30).map((voice) => {
                      const isSelected = speaker2Voice === voice.voice_id;
                      const isPlaying = playingVoiceId === voice.voice_id;
                      return (
                        <button key={`s2v-${voice.voice_id}`} onClick={() => setSpeaker2Voice(voice.voice_id)}
                          className={cn("w-full flex items-center gap-2 p-2 rounded-md text-left transition-all text-sm",
                            isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"
                          )}>
                          <span className="flex-1 truncate">{voice.name} {voice.gender && <span className="text-muted-foreground text-xs">({voice.gender})</span>}</span>
                          {voice.preview_url && (
                            <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0"
                              onClick={(e) => { e.stopPropagation(); playVoicePreview(voice.voice_id, voice.preview_url); }}>
                              {isPlaying ? <Square className="w-3 h-3 text-primary" /> : <Play className="w-3 h-3" />}
                            </Button>
                          )}
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
                {otherVoices.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("avs.voice.other")}</p>
                    {otherVoices.slice(0, 30).map((voice) => {
                      const isSelected = speaker2Voice === voice.voice_id;
                      const isPlaying = playingVoiceId === voice.voice_id;
                      return (
                        <button key={`s2v-${voice.voice_id}`} onClick={() => setSpeaker2Voice(voice.voice_id)}
                          className={cn("w-full flex items-center gap-2 p-2 rounded-md text-left transition-all text-sm",
                            isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"
                          )}>
                          <span className="flex-1 truncate">{voice.name} {voice.language && <span className="text-muted-foreground text-xs">({voice.language})</span>}</span>
                          {voice.preview_url && (
                            <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0"
                              onClick={(e) => { e.stopPropagation(); playVoicePreview(voice.voice_id, voice.preview_url); }}>
                              {isPlaying ? <Square className="w-3 h-3 text-primary" /> : <Play className="w-3 h-3" />}
                            </Button>
                          )}
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={loadResources}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {t("avs.reload")}
          </Button>
          {onSkip && (
            <Button variant="ghost" onClick={onSkip}>
              {t("avs.skip")}
            </Button>
          )}
          <Button
            className="flex-1 gap-2"
            onClick={handleContinue}
            disabled={!speaker1Avatar || !speaker1Voice || !speaker2Avatar || !speaker2Voice}
          >
            <CheckCircle2 className="w-4 h-4" />
            {t("avs.continue")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
