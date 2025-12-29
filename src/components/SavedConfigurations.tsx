import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, Trash2, FolderOpen, Clock } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface PodcastConfiguration {
  id: string;
  name: string;
  topics: string;
  speaker_background: string | null;
  podcast_structure: string | null;
  text_style: string | null;
  voice_id: string | null;
  video_background: string | null;
  character1: string | null;
  character2: string | null;
  script: string | null;
  audio_url: string | null;
  video_url: string | null;
  created_at: string;
}

interface SavedConfigurationsProps {
  onLoad: (config: PodcastConfiguration) => void;
}

export function SavedConfigurations({ onLoad }: SavedConfigurationsProps) {
  const [configurations, setConfigurations] = useState<PodcastConfiguration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchConfigurations();
  }, []);

  const fetchConfigurations = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("podcast_configurations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching configurations:", error);
      toast.error("Fehler beim Laden der Konfigurationen");
    } else {
      setConfigurations(data || []);
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase
      .from("podcast_configurations")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Fehler beim Löschen");
    } else {
      setConfigurations((prev) => prev.filter((c) => c.id !== id));
      toast.success("Konfiguration gelöscht");
    }
    setDeletingId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (configurations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Keine gespeicherten Konfigurationen</p>
        <p className="text-sm">Erstelle einen Podcast und speichere ihn!</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-3 pr-4">
        {configurations.map((config) => (
          <Card key={config.id} className="border-border/50">
            <CardHeader className="py-3 px-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm font-medium truncate">
                    {config.name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    {config.topics}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {format(new Date(config.created_at), "dd. MMM yyyy, HH:mm", { locale: de })}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onLoad(config)}
                    className="h-8 px-2"
                  >
                    Laden
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(config.id)}
                    disabled={deletingId === config.id}
                    className="h-8 px-2 text-destructive hover:text-destructive"
                  >
                    {deletingId === config.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
