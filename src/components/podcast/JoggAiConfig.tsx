import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, AlertCircle, Video, RefreshCw, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface JoggAiAvatar {
  avatar_id: number;
  name: string;
  preview_url?: string;
  gender?: string;
}

interface JoggAiVoice {
  voice_id: string;
  name: string;
  language?: string;
  gender?: string;
}

interface JoggAiConfigProps {
  onAvatarsLoaded?: (avatars: JoggAiAvatar[]) => void;
  onVoicesLoaded?: (voices: JoggAiVoice[]) => void;
}

export default function JoggAiConfig({ onAvatarsLoaded, onVoicesLoaded }: JoggAiConfigProps) {
  const [apiKey, setApiKey] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [avatars, setAvatars] = useState<JoggAiAvatar[]>([]);
  const [voices, setVoices] = useState<JoggAiVoice[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<string>("");
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    // Load saved settings
    const savedApiKey = localStorage.getItem("joggai_api_key") || import.meta.env.VITE_JOGGAI_API_KEY || "";
    const savedAvatar = localStorage.getItem("joggai_selected_avatar") || "";
    const savedVoice = localStorage.getItem("joggai_selected_voice") || "";
    
    setApiKey(savedApiKey);
    setSelectedAvatar(savedAvatar);
    setSelectedVoice(savedVoice);
    
    if (savedApiKey) {
      validateApiKey(savedApiKey);
    }
  }, []);

  const validateApiKey = async (key: string) => {
    if (!key.trim()) {
      setIsValid(null);
      return;
    }

    setIsValidating(true);
    
    try {
      // Direct API call to JoggAI
      const response = await fetch("https://api.jogg.ai/v2/user/whoami", {
        method: "GET",
        headers: {
          "x-api-key": key,
        },
      });

      const data = await response.json();
      
      if (data.code === 0) {
        setIsValid(true);
        setUserEmail(data.data?.email || "");
        localStorage.setItem("joggai_api_key", key);
        
        toast({
          title: "API Key validiert",
          description: `Verbunden als ${data.data?.email || data.data?.username}`,
        });
        
        // Load avatars and voices after successful validation
        loadResources(key);
      } else {
        setIsValid(false);
        toast({
          title: "Ungültiger API Key",
          description: data.msg || "Der API Key konnte nicht validiert werden.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Validation error:", error);
      setIsValid(false);
      toast({
        title: "Validierungsfehler",
        description: error.message || "Verbindung zu JoggAI fehlgeschlagen.",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const loadResources = async (key: string) => {
    setIsLoadingResources(true);
    
    try {
      // Load avatars
      const avatarsRes = await fetch("https://api.jogg.ai/v2/avatars/public", {
        method: "GET",
        headers: { "x-api-key": key },
      });
      const avatarsData = await avatarsRes.json();
      
      if (avatarsData.code === 0 && avatarsData.data) {
        setAvatars(avatarsData.data);
        onAvatarsLoaded?.(avatarsData.data);
      }

      // Load voices
      const voicesRes = await fetch("https://api.jogg.ai/v2/voices", {
        method: "GET",
        headers: { "x-api-key": key },
      });
      const voicesData = await voicesRes.json();
      
      if (voicesData.code === 0 && voicesData.data) {
        setVoices(voicesData.data);
        onVoicesLoaded?.(voicesData.data);
      }

      toast({
        title: "Ressourcen geladen",
        description: `${avatarsData.data?.length || 0} Avatare, ${voicesData.data?.length || 0} Stimmen`,
      });
    } catch (error) {
      console.error("Error loading resources:", error);
    } finally {
      setIsLoadingResources(false);
    }
  };

  const handleAvatarChange = (avatarId: string) => {
    setSelectedAvatar(avatarId);
    localStorage.setItem("joggai_selected_avatar", avatarId);
  };

  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoice(voiceId);
    localStorage.setItem("joggai_selected_voice", voiceId);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            JoggAI Konfiguration
          </CardTitle>
          <CardDescription>
            Verbinde deinen JoggAI Account für die automatische Video-Generierung
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="joggai-api-key">API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="joggai-api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Dein JoggAI API Key"
                  className="pr-10"
                />
                {isValid !== null && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isValid ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              <Button 
                onClick={() => validateApiKey(apiKey)}
                disabled={isValidating || !apiKey.trim()}
              >
                {isValidating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Validieren"
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Hole deinen API Key von{" "}
              <a 
                href="https://app.jogg.ai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                app.jogg.ai
              </a>
            </p>
          </div>

          {isValid && (
            <>
              <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm">
                  Verbunden als <strong>{userEmail}</strong>
                </span>
              </div>

              <div className="pt-4 border-t space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Ressourcen</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadResources(apiKey)}
                    disabled={isLoadingResources}
                  >
                    {isLoadingResources ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Aktualisieren
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Standard-Avatar</Label>
                    <Select value={selectedAvatar} onValueChange={handleAvatarChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Avatar auswählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {avatars.slice(0, 50).map((avatar) => (
                          <SelectItem 
                            key={avatar.avatar_id} 
                            value={String(avatar.avatar_id)}
                          >
                            {avatar.name || `Avatar ${avatar.avatar_id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {avatars.length} Avatare verfügbar
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Standard-Stimme</Label>
                    <Select value={selectedVoice} onValueChange={handleVoiceChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Stimme auswählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {voices.slice(0, 50).map((voice) => (
                          <SelectItem 
                            key={voice.voice_id} 
                            value={voice.voice_id}
                          >
                            {voice.name} {voice.language && `(${voice.language})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {voices.length} Stimmen verfügbar
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Video-Einstellungen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Seitenverhältnis</Label>
              <Select defaultValue="landscape">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="landscape">Querformat (16:9)</SelectItem>
                  <SelectItem value="portrait">Hochformat (9:16)</SelectItem>
                  <SelectItem value="square">Quadratisch (1:1)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Bildstil</Label>
              <Select defaultValue="1">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Vollbild</SelectItem>
                  <SelectItem value="2">Split Screen</SelectItem>
                  <SelectItem value="3">Bild in Bild</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Untertitel</Label>
              <Select defaultValue="true">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Aktiviert</SelectItem>
                  <SelectItem value="false">Deaktiviert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
