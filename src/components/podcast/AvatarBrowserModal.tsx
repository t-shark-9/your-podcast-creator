import { useState, useEffect } from "react";
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
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ImageIcon,
  Search,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { joggAiService, JoggAiAvatar } from "@/lib/joggai";
import { cn } from "@/lib/utils";

export interface AvatarSelection {
  avatarId: string;
  avatarType: 0 | 1;
  avatarName?: string;
  avatarImage?: string;
}

interface AvatarBrowserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storagePrefix?: string;
  onConfirm?: (selection: AvatarSelection) => void;
}

export default function AvatarBrowserModal({
  open,
  onOpenChange,
  storagePrefix = "joggai_speaker1",
  onConfirm,
}: AvatarBrowserModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [publicAvatars, setPublicAvatars] = useState<JoggAiAvatar[]>([]);
  const [photoAvatars, setPhotoAvatars] = useState<JoggAiAvatar[]>([]);
  const [hasApiKey, setHasApiKey] = useState(false);

  const [selectedAvatarId, setSelectedAvatarId] = useState<string>("");
  const [selectedAvatarType, setSelectedAvatarType] = useState<0 | 1>(0);
  const [avatarSearch, setAvatarSearch] = useState("");

  const { toast } = useToast();
  const { t, language } = useLanguage();

  useEffect(() => {
    if (open) {
      loadSavedSelection();
      loadAvatars();
    }
  }, [open]);

  const loadSavedSelection = () => {
    setSelectedAvatarId(localStorage.getItem(`${storagePrefix}_avatar`) || "");
    setSelectedAvatarType(
      Number(localStorage.getItem(`${storagePrefix}_avatar_type`) || "0") as 0 | 1
    );
  };

  const loadAvatars = async () => {
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
      const [pub, photo] = await Promise.all([
        joggAiService.getPublicAvatars(),
        joggAiService.getPhotoAvatars(),
      ]);
      setPublicAvatars(Array.isArray(pub) ? pub : []);
      setPhotoAvatars(Array.isArray(photo) ? photo : []);
    } catch (error) {
      console.error("Error loading avatars:", error);
      toast({
        title: language === "de" ? "Fehler" : "Error",
        description: error instanceof Error ? error.message : "Failed to load avatars",
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

  const handleConfirm = () => {
    const allAvatars = [...publicAvatars, ...photoAvatars];
    const avatar = allAvatars.find((a) => String(a.avatar_id) === selectedAvatarId);

    localStorage.setItem(`${storagePrefix}_avatar`, selectedAvatarId);
    localStorage.setItem(`${storagePrefix}_avatar_type`, String(selectedAvatarType));
    localStorage.setItem(`${storagePrefix}_avatar_name`, avatar?.name || "");
    localStorage.setItem(`${storagePrefix}_avatar_image`, avatar?.cover_url || avatar?.preview_url || "");

    onConfirm?.({
      avatarId: selectedAvatarId,
      avatarType: selectedAvatarType,
      avatarName: avatar?.name,
      avatarImage: avatar?.cover_url || avatar?.preview_url,
    });
    onOpenChange(false);
  };

  const filterAvatars = (avatars: JoggAiAvatar[]) => {
    if (!avatarSearch.trim()) return avatars;
    const q = avatarSearch.toLowerCase();
    return avatars.filter(
      (a) =>
        a.name?.toLowerCase().includes(q) ||
        String(a.avatar_id).includes(q)
    );
  };

  const allAvatars = [...publicAvatars, ...photoAvatars];
  const selectedAvatar = allAvatars.find((a) => String(a.avatar_id) === selectedAvatarId);

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
      <DialogContent className="max-w-4xl w-[95vw] h-[95vh] max-h-[95vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b space-y-1.5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ImageIcon className="w-5 h-5 text-primary" />
              {language === "de" ? "Avatar wählen" : "Choose Avatar"}
            </DialogTitle>
            <DialogDescription>
              {language === "de"
                ? "Wähle einen Avatar für dein Video"
                : "Select an avatar for your video"}
            </DialogDescription>
          </DialogHeader>

          {selectedAvatar && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="secondary" className="gap-1.5 py-1 px-2.5">
                {(selectedAvatar.cover_url || selectedAvatar.preview_url) ? (
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
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between gap-4 bg-card/80">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadAvatars}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
            {t("avs.reload")}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {language === "de" ? "Abbrechen" : "Cancel"}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedAvatarId}
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
