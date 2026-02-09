import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Mic, Square, Upload, Check, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Voice } from "@/types/podcast";

interface VoiceRecorderProps {
  voices: Voice[];
  onVoiceCreated: (voice: Voice) => void;
  onVoiceDeleted: (voiceId: string) => void;
  isUploading: boolean;
}

const SAMPLE_TEXT = "Hallo! Das ist ein Beispieltext für die Stimmaufnahme. Bitte lies diesen Text langsam und deutlich vor, damit deine Stimme gut erkannt wird. Die Aufnahme sollte etwa fünfzehn Sekunden dauern.";

export const VoiceRecorder = ({
  voices,
  onVoiceCreated,
  onVoiceDeleted,
  isUploading
}: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [voiceName, setVoiceName] = useState("");
  const [showNewVoice, setShowNewVoice] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      toast({
        title: "Mikrofon-Fehler",
        description: "Bitte erlaube den Zugriff auf dein Mikrofon.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleSaveVoice = async () => {
    if (!audioBlob || !voiceName.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte nimm eine Aufnahme auf und gib einen Namen ein.",
        variant: "destructive"
      });
      return;
    }

    // Create a new voice entry
    const newVoice: Voice = {
      id: crypto.randomUUID(),
      name: voiceName.trim(),
      audioSampleUrl: audioUrl || undefined,
      createdAt: new Date().toISOString(),
      isUploaded: false
    };

    onVoiceCreated(newVoice);
    
    // Reset form
    setAudioBlob(null);
    setAudioUrl(null);
    setVoiceName("");
    setShowNewVoice(false);
    
    toast({
      title: "Stimme gespeichert",
      description: `"${newVoice.name}" wurde erfolgreich hinzugefügt.`
    });
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Mic className="w-5 h-5" />
          Meine Stimmen
        </CardTitle>
        <CardDescription>
          Nimm deine Stimme auf, um sie für den Podcast zu verwenden.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing voices list */}
        {voices.length > 0 && (
          <div className="space-y-2">
            {voices.map(voice => (
              <div
                key={voice.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${voice.isUploaded ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className="font-medium">{voice.name}</span>
                  {voice.isUploaded && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      Hochgeladen
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {voice.audioSampleUrl && (
                    <audio src={voice.audioSampleUrl} controls className="h-8 w-32" />
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => onVoiceDeleted(voice.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* New voice form */}
        {showNewVoice ? (
          <div className="space-y-4 p-4 rounded-lg border border-dashed border-border">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name der Stimme</label>
              <Input
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                placeholder="z.B. Meine Stimme, Moderator, etc."
              />
            </div>

            {/* Sample text to read */}
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <p className="font-medium mb-1">Bitte lies diesen Text vor:</p>
              <p className="text-muted-foreground italic">{SAMPLE_TEXT}</p>
            </div>

            {/* Recording controls */}
            <div className="flex items-center gap-4">
              {!audioBlob ? (
                <>
                  <Button
                    variant={isRecording ? "destructive" : "default"}
                    onClick={isRecording ? stopRecording : startRecording}
                    className="gap-2"
                  >
                    {isRecording ? (
                      <>
                        <Square className="w-4 h-4" />
                        Stoppen
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4" />
                        Aufnahme starten
                      </>
                    )}
                  </Button>
                  {isRecording && (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-sm font-mono">{formatTime(recordingTime)}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-4 w-full">
                  <audio src={audioUrl!} controls className="flex-1" />
                  <Button variant="outline" size="sm" onClick={resetRecording}>
                    Neu aufnehmen
                  </Button>
                </div>
              )}
            </div>

            {/* Save/Cancel buttons */}
            <div className="flex items-center gap-2 justify-end">
              <Button variant="ghost" onClick={() => {
                setShowNewVoice(false);
                resetRecording();
                setVoiceName("");
              }}>
                Abbrechen
              </Button>
              <Button
                onClick={handleSaveVoice}
                disabled={!audioBlob || !voiceName.trim() || isUploading}
                className="gap-2"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Stimme speichern
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => setShowNewVoice(true)}
            className="w-full gap-2"
          >
            <Plus className="w-4 h-4" />
            Neue Stimme hinzufügen
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default VoiceRecorder;
