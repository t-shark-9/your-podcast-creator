import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Image, Plus, Trash2, Upload, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Avatar } from "@/types/podcast";

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
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Ungültiges Format",
          description: "Bitte wähle eine Bilddatei aus.",
          variant: "destructive"
        });
        return;
      }

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAvatar = async () => {
    if (!selectedImage || !avatarName.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte wähle ein Bild aus und gib einen Namen ein.",
        variant: "destructive"
      });
      return;
    }

    const newAvatar: Avatar = {
      id: crypto.randomUUID(),
      name: avatarName.trim(),
      description: avatarDescription.trim(),
      photoUrl: imagePreview || undefined,
      createdAt: new Date().toISOString(),
      isUploaded: false
    };

    onAvatarCreated(newAvatar);

    // Reset form
    setAvatarName("");
    setAvatarDescription("");
    setSelectedImage(null);
    setImagePreview(null);
    setShowNewAvatar(false);

    toast({
      title: "Avatar gespeichert",
      description: `"${newAvatar.name}" wurde erfolgreich hinzugefügt.`
    });
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
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="w-5 h-5" />
          Meine Avatare
        </CardTitle>
        <CardDescription>
          Lade ein Foto hoch, um einen AI-Avatar für den Podcast zu erstellen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing avatars list */}
        {avatars.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {avatars.map(avatar => (
              <div
                key={avatar.id}
                className="relative group rounded-lg border border-border/50 bg-background/50 overflow-hidden"
              >
                {avatar.photoUrl ? (
                  <img
                    src={avatar.photoUrl}
                    alt={avatar.name}
                    className="w-full aspect-square object-cover"
                  />
                ) : (
                  <div className="w-full aspect-square bg-muted flex items-center justify-center">
                    <User className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium truncate">{avatar.name}</p>
                      <div className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${avatar.isUploaded ? 'bg-green-500' : 'bg-yellow-500'}`} />
                        <span className="text-white/70 text-xs">
                          {avatar.isUploaded ? 'Hochgeladen' : 'Lokal'}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-white hover:text-red-400 hover:bg-red-500/20"
                      onClick={() => onAvatarDeleted(avatar.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* New avatar form */}
        {showNewAvatar ? (
          <div className="space-y-4 p-4 rounded-lg border border-dashed border-border">
            {/* Image upload */}
            <div
              className="relative border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              
              {imagePreview ? (
                <div className="flex items-center gap-4">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{selectedImage?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Klicke, um ein anderes Bild auszuwählen
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="font-medium">Bild hochladen</p>
                  <p className="text-sm text-muted-foreground">
                    Klicke oder ziehe ein Bild hierher
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Name des Avatars</label>
              <Input
                value={avatarName}
                onChange={(e) => setAvatarName(e.target.value)}
                placeholder="z.B. Moderator Max, Expertin Anna"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Beschreibung (optional)</label>
              <Textarea
                value={avatarDescription}
                onChange={(e) => setAvatarDescription(e.target.value)}
                placeholder="Beschreibe den Avatar, z.B. Alter, Stil, Kleidung..."
                className="min-h-[80px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Diese Beschreibung hilft der KI, den Avatar passend zu generieren.
              </p>
            </div>

            {/* Save/Cancel buttons */}
            <div className="flex items-center gap-2 justify-end">
              <Button variant="ghost" onClick={resetForm}>
                Abbrechen
              </Button>
              <Button
                onClick={handleSaveAvatar}
                disabled={!selectedImage || !avatarName.trim() || isUploading}
                className="gap-2"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Image className="w-4 h-4" />
                )}
                Avatar speichern
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => setShowNewAvatar(true)}
            className="w-full gap-2"
          >
            <Plus className="w-4 h-4" />
            Neuen Avatar hinzufügen
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default AvatarConfig;
