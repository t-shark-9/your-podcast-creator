import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Image, Plus, Trash2, Upload, User, RefreshCw, CheckCircle2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import type { Avatar } from "@/types/podcast";

interface JoggAiPhotoAvatar {
  id: number;
  name: string;
  status: number; // 0 = processing, 1 = completed
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
  const { t } = useLanguage();

  const getApiKey = () => {
    return localStorage.getItem("joggai_api_key") || import.meta.env.VITE_JOGGAI_API_KEY;
  };

  // Load JoggAI photo avatars on mount
  useEffect(() => {
    loadJoggAiAvatars();
  }, []);

  const loadJoggAiAvatars = async () => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    setIsLoadingAvatars(true);
    try {
      const { data, error } = await supabase.functions.invoke("joggai-proxy", {
        body: { endpoint: "/avatars/photo_avatars", method: "GET", apiKey }
      });
      if (error) throw error;
      
      if (data.code === 0 && data.data?.avatars) {
        setJoggAiAvatars(data.data.avatars);
      }
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
        toast({
          title: t("avatar.error.format"),
          description: t("avatar.error.format.desc"),
          variant: "destructive"
        });
        return;
      }

      // Check file size (max 10MB for JoggAI)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: t("avatar.error.size"),
          description: t("avatar.error.size.desc"),
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

  const uploadImageToJoggAi = async (file: File): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("JoggAI API Key fehlt");

    // First, get upload URL via proxy
    const { data: uploadData, error: uploadError } = await supabase.functions.invoke("joggai-proxy", {
      body: {
        endpoint: "/assets/upload_url",
        method: "POST",
        payload: { file_name: file.name, content_type: file.type },
        apiKey
      }
    });
    if (uploadError) throw uploadError;
    if (uploadData.code !== 0) {
      throw new Error(uploadData.msg || "Upload URL konnte nicht erstellt werden");
    }

    // Upload file to the provided URL
    const { upload_url, asset_url } = uploadData.data;
    
    await fetch(upload_url, {
      method: "PUT",
      headers: {
        "Content-Type": file.type
      },
      body: file
    });

    return asset_url;
  };

  const handleSaveAvatar = async () => {
    if (!selectedImage || !avatarName.trim()) {
      toast({
        title: t("avatar.error.form"),
        description: t("avatar.error.form.desc"),
        variant: "destructive"
      });
      return;
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      toast({
        title: "API Key fehlt",
        description: "Bitte konfiguriere deinen JoggAI API Key in den Einstellungen.",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingAvatar(true);

    try {
      // Upload the image first
      toast({
        title: t("avatar.uploading"),
        description: t("avatar.uploading.wait")
      });

      const imageUrl = await uploadImageToJoggAi(selectedImage);

      // Create photo avatar in JoggAI
      toast({
        title: t("avatar.creating"),
        description: t("avatar.creating.wait")
      });

      const { data, error: invokeErr } = await supabase.functions.invoke("joggai-proxy", {
        body: {
          endpoint: "/avatars/create_photo_avatar",
          method: "POST",
          payload: { name: avatarName.trim(), image_url: imageUrl },
          apiKey
        }
      });
      if (invokeErr) throw invokeErr;

      if (data.code !== 0) {
        throw new Error(data.msg || "Avatar konnte nicht erstellt werden");
      }

      // Save locally and reload JoggAI avatars
      const newAvatar: Avatar = {
        id: data.data?.avatar_id?.toString() || crypto.randomUUID(),
        name: avatarName.trim(),
        description: avatarDescription.trim(),
        photoUrl: imagePreview || undefined,
        createdAt: new Date().toISOString(),
        isUploaded: true,
        joggAiAvatarId: data.data?.avatar_id
      };

      onAvatarCreated(newAvatar);

      // Reset form
      setAvatarName("");
      setAvatarDescription("");
      setSelectedImage(null);
      setImagePreview(null);
      setShowNewAvatar(false);

      // Reload JoggAI avatars
      setTimeout(() => loadJoggAiAvatars(), 2000);

      toast({
        title: t("avatar.created"),
        description: `"${newAvatar.name}" ${t("avatar.created.desc")}`
      });

    } catch (error) {
      console.error("Error creating avatar:", error);
      toast({
        title: t("avatar.error"),
        description: error instanceof Error ? error.message : t("avatar.error.desc"),
        variant: "destructive"
      });
    } finally {
      setIsCreatingAvatar(false);
    }
  };

  const selectJoggAiAvatar = (avatar: JoggAiPhotoAvatar, speaker: 1 | 2) => {
    if (avatar.status !== 1) {
      toast({
        title: t("avatar.processing.wait"),
        description: t("avatar.processing.wait.desc"),
        variant: "destructive"
      });
      return;
    }
    
    const prefix = `joggai_speaker${speaker}`;
    localStorage.setItem(`${prefix}_avatar`, avatar.id.toString());
    localStorage.setItem(`${prefix}_avatar_type`, "1"); // Photo avatar type
    
    toast({
      title: `${t("avatar.selected")} ${speaker}`,
      description: `"${avatar.name}" ${t("avatar.selected.desc")} ${speaker}`
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5" />
              {t("avatar.title")}
            </CardTitle>
            <CardDescription>
              {t("avatar.desc")}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={loadJoggAiAvatars}
            disabled={isLoadingAvatars}
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingAvatars ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* JoggAI Photo Avatars */}
        {joggAiAvatars.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">{t("avatar.joggai.list")}</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {joggAiAvatars.map(avatar => {
                const isSpeaker1 = localStorage.getItem("joggai_speaker1_avatar") === avatar.id.toString() 
                  && localStorage.getItem("joggai_speaker1_avatar_type") === "1";
                const isSpeaker2 = localStorage.getItem("joggai_speaker2_avatar") === avatar.id.toString()
                  && localStorage.getItem("joggai_speaker2_avatar_type") === "1";
                
                return (
                  <div
                    key={avatar.id}
                    className={`relative group rounded-lg border border-border/50 bg-background/50 overflow-hidden ${
                      isSpeaker1 || isSpeaker2 ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    {avatar.cover_url ? (
                      <img
                        src={avatar.cover_url}
                        alt={avatar.name}
                        className="w-full aspect-square object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-square bg-muted flex items-center justify-center">
                        <User className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <p className="text-white text-sm font-medium truncate mb-1">{avatar.name}</p>
                      <div className="flex items-center gap-1 mb-2">
                        <Badge 
                          variant={avatar.status === 1 ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {avatar.status === 1 ? (
                            <><CheckCircle2 className="w-3 h-3 mr-1" /> {t("avatar.status.ready")}</>
                          ) : (
                            <><Clock className="w-3 h-3 mr-1" /> {t("avatar.status.processing")}</>
                          )}
                        </Badge>
                        {isSpeaker1 && <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-200">S1</Badge>}
                        {isSpeaker2 && <Badge variant="outline" className="text-xs bg-green-500/20 text-green-200">S2</Badge>}
                      </div>
                      {avatar.status === 1 && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant={isSpeaker1 ? "default" : "secondary"}
                            className="h-6 text-xs flex-1"
                            onClick={() => selectJoggAiAvatar(avatar, 1)}
                          >
                            {t("avatar.speaker1")}
                          </Button>
                          <Button
                            size="sm"
                            variant={isSpeaker2 ? "default" : "secondary"}
                            className="h-6 text-xs flex-1"
                            onClick={() => selectJoggAiAvatar(avatar, 2)}
                          >
                            {t("avatar.speaker2")}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
                      {t("avatar.upload.change")}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="font-medium">{t("avatar.upload.photo")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("avatar.upload.hint")}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("avatar.name.label")}</label>
              <Input
                value={avatarName}
                onChange={(e) => setAvatarName(e.target.value)}
                placeholder={t("avatar.name.placeholder")}
              />
            </div>

            <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <p className="font-medium mb-1">{t("avatar.tips")}</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>{t("avatar.tip1")}</li>
                <li>{t("avatar.tip2")}</li>
                <li>{t("avatar.tip3")}</li>
                <li>{t("avatar.tip4")}</li>
              </ul>
            </div>

            {/* Save/Cancel buttons */}
            <div className="flex items-center gap-2 justify-end">
              <Button variant="ghost" onClick={resetForm}>
                {t("avatar.cancel")}
              </Button>
              <Button
                onClick={handleSaveAvatar}
                disabled={!selectedImage || !avatarName.trim() || isCreatingAvatar}
                className="gap-2"
              >
                {isCreatingAvatar ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Image className="w-4 h-4" />
                )}
                {t("avatar.create")}
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
            {t("avatar.add")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default AvatarConfig;
