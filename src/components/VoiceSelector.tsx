import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mic, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Voice {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
}

interface VoiceSelectorProps {
  selectedVoiceId: string;
  onVoiceSelect: (voiceId: string) => void;
}

export const VoiceSelector = ({ selectedVoiceId, onVoiceSelect }: VoiceSelectorProps) => {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Default professional voices if API fails
  const defaultVoices: Voice[] = [
    { voice_id: "JBFqnCBsd6RMkjVDRZzb", name: "George", category: "premade", description: "Deep, professional narrator" },
    { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", category: "premade", description: "Warm, engaging voice" },
    { voice_id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", category: "premade", description: "British accent, authoritative" },
    { voice_id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", category: "premade", description: "Youthful, energetic" },
    { voice_id: "nPczCjzI2devNBz1zQrb", name: "Brian", category: "premade", description: "American, conversational" },
  ];

  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("list-voices");
        
        if (error) throw error;
        
        if (data?.voices && data.voices.length > 0) {
          setVoices(data.voices);
        } else {
          setVoices(defaultVoices);
        }
      } catch (error) {
        console.error("Error fetching voices:", error);
        setVoices(defaultVoices);
        toast({
          title: "Using default voices",
          description: "Could not fetch your custom voices. Using preset options.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchVoices();
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Mic className="h-4 w-4 text-primary" />
        <label className="text-sm font-medium text-foreground">Voice</label>
      </div>
      
      <Select value={selectedVoiceId} onValueChange={onVoiceSelect}>
        <SelectTrigger className="w-full bg-secondary border-border">
          <SelectValue placeholder={loading ? "Loading voices..." : "Select a voice"} />
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          {loading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          ) : (
            voices.map((voice) => (
              <SelectItem key={voice.voice_id} value={voice.voice_id}>
                <div className="flex flex-col">
                  <span className="font-medium">{voice.name}</span>
                  {voice.category === "cloned" && (
                    <span className="text-xs text-primary">Cloned Voice</span>
                  )}
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
        <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          Want to use your own voice? Visit{" "}
          <a 
            href="https://elevenlabs.io/voice-cloning" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            ElevenLabs Voice Cloning
          </a>{" "}
          to clone your voice, then it will appear here automatically.
        </p>
      </div>
    </div>
  );
};
