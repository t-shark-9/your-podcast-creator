import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Image, Plus, Upload, User, RefreshCw, CheckCircle2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Avatar } from "@/types/podcast";
import joggAiService from "@/lib/joggai";

interface JoggAiPhotoAvatar {
  id: number;
  name: string;
  status: number;
  cover_url?: string;
}

interface AvatarConfigProps {
  avatars: Avatar[];
  onAvatarCreated: (avatar: Avatar) => void;
  onAvatarDeleted: (avatarId: string) => void;
  isUploading: boolean;
}

export const AvatarConfig = ({
  avatars,
  onAvatarCreated,
  onAvatarDeleted,
  isUploading
}: AvatarConfigProps) => {
  const [showNewAvatar, setShowNewAvatar] = useState(false);
  const [avatarName, setAvatarName] = useState("");
  const [avatarDescription, setAvatarDescription] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCreatingAvatar, setIsCreatingAvatar] = useState(false);
  const [joggAiAvatars, setJoggAiAvatars] = useState<JoggAiPhotoAvatar[]>([]);
  const [isLoadingAvatars, setIsLoadingAvatars] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadJoggAiAvatars();
  }, []);

  const loadJoggAiAvatars = async () => {
    setIsLoadingAvatars(true);
    try {
      const avatars = await joggAiService.getPhotoAvatars();
      // Map back to the local interface (getPhotoAvatars returns completed only)
      const mapped: JoggAiPhotoAvatar[] = avatars.map(a => ({
        id: typeof a.avatar_id === "string" ? parseInt(a.avatar_id, 10) : (a.avatar_id as number),
        name: a.name,
        status: a.status ?? 1,
        cover_url: a.preview_url,
      }));
      setJoggAiAvatars(mapped);
    } catch (error) {
      console.error("Error loading photo avatars:", error);
    } finally {
      setIsLoadingAvatars(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ title: "Ungültiges Format", description: "Bitte wähle eine Bilddatei aus.", variant: "destructive" });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "Datei zu groß", description: "Die maximale Dateigröße beträgt 10MB.", variant: "destructive" });
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAvatar = async () => {
    if (!selectedImage || !avatarName.trim()) {
      toast({ title: "Fehler", description: "Bitte wähle ein Bild aus und gib einen Namen ein.", variant: "destructive" });
      return;
    }

    setIsCreatingAvatar(true);

    try {
      toast({ title: "Bild wird hochgeladen...", description: "Bitte warten..." });
      const imageUrl = await joggAiService.uploadAsset(selectedImage);

      toast({ title: "Avatar wird erstellt...", description: "Dies kann einige Minuten dauern." });
      const result = await joggAiService.createPhotoAvatar({
        photo_url: imageUrl,
        name: avatarName.trim(),
      });

      const newAvatar: Avatar = {
        id: result.avatar_id?.toString() || crypto.randomUUID(),
        name: avatarName.trim(),
        description: avatarDescription.trim(),
        photoUrl: imagePreview || undefined,
        createdAt: new Date().toISOString(),
        isUploaded: true,
        joggAiAvatarId: result.avatar_id,
      };

      onAvatarCreated(newAvatar);
      setAvatarName("");
      setAvatarDescription("");
      setSelectedImage(null);
      setImagePreview(null);
      setShowNewAvatar(false);
      setTimeout(() => loadJoggAiAvatars(), 2000);

      toast({ title: "Avatar wird erstellt!", description: `"${newAvatar.name}" wird bei JoggAI verarbeitet. Dies dauert etwa 2-5 Minuten.` });
    } catch (error) {
      console.error("Error creating avatar:", error);
      toast({ title: "Fehler beim Erstellen", description: error instanceof Error ? error.message : "Der Avatar konnte nicht erstellt werden.", variant: "destructive" });
    } finally {
      setIsCreatingAvatar(false);
    }
  };

  const selectJoggAiAvatar = (avatar: JoggAiPhotoAvatar, speaker: 1 | 2) => {
    if (avatar.status !== 1) {
      toast({ title: "Avatar wird noch verarbeitet", description: "Bitte warte, bis der Avatar fertig ist.", variant: "destructive" });
      return;
    }
    const prefix = `joggai_speaker${speaker}`;
    localStorage.setItem(`${prefix}_avatar`, avatar.id.toString());
    localStorage.setItem(`${prefix}_avatar_type`, "1");
    toast({ title: `Avatar für Sprecher ${speaker} ausgewählt`, description: `"${avatar.name}" wird für Sprecher ${speaker} verwendet.` });
  };

  const resetForm = () => {
    setShowNewAvatar(false);
    setAvatarName("");
    setAvatarDescription("");
    setSelectedImage(null);
    setImagePreview(null);
  };

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5" />
              Meine Photo Avatare
            </CardTitle>
            <CardDescription>
              Erstelle personalisierte AI-Avatare aus deinen Fotos mit JoggAI.
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={loadJoggAiAvatars} disabled={isLoadingAvatars}>
            <RefreshCw className={`w-4 h-4 ${isLoadingAvatars ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {joggAiAvatars.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Deine JoggAI Avatare</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {joggAiAvatars.map(avatar => {
                const isSpeaker1 = localStorage.getItem("joggai_speaker1_avatar") === avatar.id.toString()
                  && localStorage.getItem("joggai_speaker1_avatar_type") === "1";
                const isSpeaker2 = localStorage.getItem("joggai_speaker2_avatar") === avatar.id.toString()
                  && localStorage.getItem("joggai_speaker2_avatar_type") === "1";
                return (
                  <div key={avatar.id} className={`relative group rounded-lg border border-border/50 bg-background/50 overflow-hidden ${isSpeaker1 || isSpeaker2 ? 'ring-2 ring-primary' : ''}`}>
                    {avatar.cover_url ? (
                      <img src={avatar.cover_url} alt={avatar.name} className="w-full aspect-square object-cover" />
                    ) : (
                      <div className="w-full aspect-square bg-muted flex items-center justify-center">
                        <User className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <p className="text-white text-sm font-medium truncate mb-1">{avatar.name}</p>
                      <div className="flex items-center gap-1 mb-2">
                        <Badge variant={avatar.status === 1 ? "default" : "secondary"} className="text-xs">
                          {avatar.status === 1 ? (<><CheckCircle2 className="w-3 h-3 mr-1" /> Fertig</>) : (<><Clock className="w-3 h-3 mr-1" /> Verarbeitung</>)}
                        </Badge>
                        {isSpeaker1 && <Badge variant="outline" className="text-xs bg-primary/20 text-primary-foreground">S1</Badge>}
                        {isSpeaker2 && <Badge variant="outline" className="text-xs bg-secondary/20 text-secondary-foreground">S2</Badge>}
                      </div>
                      {avatar.status === 1 && (
                        <div className="flex gap-1">
                          <Button size="sm" variant={isSpeaker1 ? "default" : "secondary"} className="h-6 text-xs flex-1" onClick={() => selectJoggAiAvatar(avatar, 1)}>Sprecher 1</Button>
                          <Button size="sm" variant={isSpeaker2 ? "default" : "secondary"} className="h-6 text-xs flex-1" onClick={() => selectJoggAiAvatar(avatar, 2)}>Sprecher 2</Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {showNewAvatar ? (
          <div className="space-y-4 p-4 rounded-lg border border-dashed border-border">
            <div className="relative border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => fileInputRef.current?.click()}>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              {imagePreview ? (
                <div className="flex items-center gap-4">
                  <img src={imagePreview} alt="Preview" className="w-20 h-20 rounded-lg object-cover" />
                  <div className="flex-1">
                    <p className="font-medium">{selectedImage?.name}</p>
                    <p className="text-sm text-muted-foreground">Klicke, um ein anderes Bild auszuwählen</p>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="font-medium">Foto hochladen</p>
                  <p className="text-sm text-muted-foreground">Verwende ein klares Portraitfoto mit gutem Licht</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Name des Avatars</label>
              <Input value={avatarName} onChange={(e) => setAvatarName(e.target.value)} placeholder="z.B. Moderator Max, Expertin Anna" />
            </div>

            <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <p className="font-medium mb-1">Tipps für beste Ergebnisse:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Verwende ein klares Frontalfoto des Gesichts</li>
                <li>Gute Beleuchtung ohne harte Schatten</li>
                <li>Mindestens 512x512 Pixel Auflösung</li>
                <li>Die Verarbeitung dauert 2-5 Minuten</li>
              </ul>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <Button variant="ghost" onClick={resetForm}>Abbrechen</Button>
              <Button onClick={handleSaveAvatar} disabled={!selectedImage || !avatarName.trim() || isCreatingAvatar} className="gap-2">
                {isCreatingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                Avatar bei JoggAI erstellen
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setShowNewAvatar(true)} className="w-full gap-2">
            <Plus className="w-4 h-4" />
            Neuen Photo Avatar erstellen
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default AvatarConfig;
