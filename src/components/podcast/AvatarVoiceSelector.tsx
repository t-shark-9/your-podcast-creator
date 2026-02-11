import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, User, Mic, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { joggAiService, JoggAiAvatar, JoggAiVoice, PodcastSpeakerConfig } from "@/lib/joggai";

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

  const { toast } = useToast();

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

      setPublicAvatars(publicAvatarsData);
      setPhotoAvatars(photoAvatarsData);
      setVoices(voicesData);
    } catch (error) {
      console.error("Error loading JoggAI resources:", error);
      toast({
        title: "Fehler beim Laden",
        description: error instanceof Error ? error.message : "Die Ressourcen konnten nicht geladen werden.",
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

  const handleContinue = () => {
    if (!speaker1Avatar || !speaker1Voice || !speaker2Avatar || !speaker2Voice) {
      toast({
        title: "Unvollständige Auswahl",
        description: "Bitte wähle für beide Sprecher einen Avatar und eine Stimme aus.",
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
            <h3 className="font-semibold">JoggAI API nicht konfiguriert</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Um Avatare und Stimmen auszuwählen, konfiguriere bitte zuerst deinen JoggAI API Key in den Einstellungen.
            </p>
          </div>
          <Button variant="outline" onClick={() => window.location.href = '/settings'}>
            Zu den Einstellungen
          </Button>
          {onSkip && (
            <Button variant="ghost" onClick={onSkip}>
              Überspringen
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
          <p className="text-muted-foreground">Lade Avatare und Stimmen...</p>
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
          Sprecher konfigurieren
        </CardTitle>
        <CardDescription>
          Wähle für jeden Sprecher einen Avatar und eine Stimme aus
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Speaker 1 */}
        <div className="p-4 border rounded-lg space-y-4 bg-muted/20">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Badge variant="secondary">1</Badge>
              Sprecher 1
            </h3>
            {speaker1Avatar && speaker1Voice && (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="speaker1-name">Name</Label>
            <Input
              id="speaker1-name"
              value={speaker1Name}
              onChange={(e) => onSpeaker1NameChange(e.target.value)}
              placeholder="Name des Sprechers"
            />
          </div>

          <div className="space-y-2">
            <Label>Avatar</Label>
            <Select
              value={speaker1AvatarType === 1 ? `photo_${speaker1Avatar}` : speaker1Avatar}
              onValueChange={(val) => handleAvatarChange(1, val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Avatar auswählen" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {photoAvatars.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                      Eigene Avatare
                    </div>
                    {photoAvatars.map((avatar) => (
                      <SelectItem key={`photo_${avatar.avatar_id}`} value={`photo_${avatar.avatar_id}`}>
                        {avatar.name || `Avatar ${avatar.avatar_id}`}
                      </SelectItem>
                    ))}
                  </>
                )}
                <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                  Public Avatare
                </div>
                {publicAvatars.slice(0, 50).map((avatar) => (
                  <SelectItem key={String(avatar.avatar_id)} value={String(avatar.avatar_id)}>
                    {avatar.name || `Avatar ${avatar.avatar_id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Stimme</Label>
            <Select value={speaker1Voice} onValueChange={setSpeaker1Voice}>
              <SelectTrigger>
                <SelectValue placeholder="Stimme auswählen" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {germanVoices.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                      Deutsch
                    </div>
                    {germanVoices.map((voice) => (
                      <SelectItem key={voice.voice_id} value={voice.voice_id}>
                        {voice.name} {voice.gender && `(${voice.gender})`}
                      </SelectItem>
                    ))}
                  </>
                )}
                {englishVoices.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                      English
                    </div>
                    {englishVoices.slice(0, 30).map((voice) => (
                      <SelectItem key={voice.voice_id} value={voice.voice_id}>
                        {voice.name} {voice.gender && `(${voice.gender})`}
                      </SelectItem>
                    ))}
                  </>
                )}
                {otherVoices.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                      Andere Sprachen
                    </div>
                    {otherVoices.slice(0, 30).map((voice) => (
                      <SelectItem key={voice.voice_id} value={voice.voice_id}>
                        {voice.name} {voice.language && `(${voice.language})`}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Speaker 2 */}
        <div className="p-4 border rounded-lg space-y-4 bg-muted/20">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Badge variant="secondary">2</Badge>
              Sprecher 2
            </h3>
            {speaker2Avatar && speaker2Voice && (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="speaker2-name">Name</Label>
            <Input
              id="speaker2-name"
              value={speaker2Name}
              onChange={(e) => onSpeaker2NameChange(e.target.value)}
              placeholder="Name des Sprechers"
            />
          </div>

          <div className="space-y-2">
            <Label>Avatar</Label>
            <Select
              value={speaker2AvatarType === 1 ? `photo_${speaker2Avatar}` : speaker2Avatar}
              onValueChange={(val) => handleAvatarChange(2, val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Avatar auswählen" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {photoAvatars.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                      Eigene Avatare
                    </div>
                    {photoAvatars.map((avatar) => (
                      <SelectItem key={`photo_${avatar.avatar_id}`} value={`photo_${avatar.avatar_id}`}>
                        {avatar.name || `Avatar ${avatar.avatar_id}`}
                      </SelectItem>
                    ))}
                  </>
                )}
                <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                  Public Avatare
                </div>
                {publicAvatars.slice(0, 50).map((avatar) => (
                  <SelectItem key={String(avatar.avatar_id)} value={String(avatar.avatar_id)}>
                    {avatar.name || `Avatar ${avatar.avatar_id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Stimme</Label>
            <Select value={speaker2Voice} onValueChange={setSpeaker2Voice}>
              <SelectTrigger>
                <SelectValue placeholder="Stimme auswählen" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {germanVoices.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                      Deutsch
                    </div>
                    {germanVoices.map((voice) => (
                      <SelectItem key={voice.voice_id} value={voice.voice_id}>
                        {voice.name} {voice.gender && `(${voice.gender})`}
                      </SelectItem>
                    ))}
                  </>
                )}
                {englishVoices.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                      English
                    </div>
                    {englishVoices.slice(0, 30).map((voice) => (
                      <SelectItem key={voice.voice_id} value={voice.voice_id}>
                        {voice.name} {voice.gender && `(${voice.gender})`}
                      </SelectItem>
                    ))}
                  </>
                )}
                {otherVoices.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                      Andere Sprachen
                    </div>
                    {otherVoices.slice(0, 30).map((voice) => (
                      <SelectItem key={voice.voice_id} value={voice.voice_id}>
                        {voice.name} {voice.language && `(${voice.language})`}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
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
            Neu laden
          </Button>
          {onSkip && (
            <Button variant="ghost" onClick={onSkip}>
              Überspringen
            </Button>
          )}
          <Button
            className="flex-1 gap-2"
            onClick={handleContinue}
            disabled={!speaker1Avatar || !speaker1Voice || !speaker2Avatar || !speaker2Voice}
          >
            <CheckCircle2 className="w-4 h-4" />
            Weiter
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
