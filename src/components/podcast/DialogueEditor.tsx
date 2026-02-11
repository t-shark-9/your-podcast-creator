import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2, Minus, Plus, Wand2, Download, ArrowLeft, User, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import VideoGenerator from "@/components/podcast/VideoGenerator";
import type { DialogueLine, Voice, Avatar } from "@/types/podcast";
import type { PodcastSpeakerConfig } from "@/lib/joggai";

interface DialogueEditorProps {
  dialogue: DialogueLine[];
  onDialogueChange: (dialogue: DialogueLine[]) => void;
  onBack: () => void;
  onExport: () => void;
  voices: Voice[];
  avatars: Avatar[];
  speaker1Name: string;
  speaker2Name: string;
  onSpeakerNameChange: (speaker: "speaker1" | "speaker2", name: string) => void;
  onAIEdit: (lineId: string, instruction: string) => Promise<void>;
  onAILengthen: (lineId: string) => Promise<void>;
  onAIShorten: (lineId: string) => Promise<void>;
  isProcessing: boolean;
  processingLineId: string | null;
  speaker1Config?: PodcastSpeakerConfig | null;
  speaker2Config?: PodcastSpeakerConfig | null;
}

export const DialogueEditor = ({
  dialogue,
  onDialogueChange,
  onBack,
  onExport,
  voices,
  avatars,
  speaker1Name,
  speaker2Name,
  onSpeakerNameChange,
  onAIEdit,
  onAILengthen,
  onAIShorten,
  isProcessing,
  processingLineId,
  speaker1Config,
  speaker2Config
}: DialogueEditorProps) => {
  const [editInstructions, setEditInstructions] = useState<Record<string, string>>({});
  const [hoveredLineId, setHoveredLineId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleTextChange = (lineId: string, newText: string) => {
    const updated = dialogue.map(line => 
      line.id === lineId ? { ...line, text: newText } : line
    );
    onDialogueChange(updated);
  };

  const handleDelete = (lineId: string) => {
    const updated = dialogue.filter(line => line.id !== lineId);
    onDialogueChange(updated);
  };

  const handleVoiceChange = (lineId: string, voiceId: string) => {
    const updated = dialogue.map(line =>
      line.id === lineId ? { ...line, voiceId } : line
    );
    onDialogueChange(updated);
  };

  const handleAIEdit = async (lineId: string) => {
    const instruction = editInstructions[lineId];
    if (!instruction?.trim()) {
      toast({
        title: "Anweisung fehlt",
        description: "Bitte beschreibe, wie der Text geändert werden soll.",
        variant: "destructive"
      });
      return;
    }
    await onAIEdit(lineId, instruction);
    setEditInstructions(prev => ({ ...prev, [lineId]: "" }));
  };

  const getSpeakerColor = (speaker: "speaker1" | "speaker2") => {
    return speaker === "speaker1" 
      ? "border-l-primary bg-primary/5" 
      : "border-l-purple-500 bg-purple-500/5";
  };

  const getSpeakerName = (speaker: "speaker1" | "speaker2") => {
    return speaker === "speaker1" ? speaker1Name : speaker2Name;
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Dialog bearbeiten</h1>
              <p className="text-sm text-muted-foreground">
                {dialogue.length} Dialogzeilen
              </p>
            </div>
          </div>
          <Button onClick={onExport} className="gap-2">
            <Download className="w-4 h-4" />
            Als .txt exportieren
          </Button>
        </div>

        {/* Speaker Names */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              Sprecher konfigurieren
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary">Sprecher 1</label>
                <Input
                  value={speaker1Name}
                  onChange={(e) => onSpeakerNameChange("speaker1", e.target.value)}
                  placeholder="Name Sprecher 1"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-500">Sprecher 2</label>
                <Input
                  value={speaker2Name}
                  onChange={(e) => onSpeakerNameChange("speaker2", e.target.value)}
                  placeholder="Name Sprecher 2"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dialogue Lines */}
        <div className="space-y-4">
          {dialogue.map((line, index) => (
            <div
              key={line.id}
              className={`relative group rounded-lg border-l-4 ${getSpeakerColor(line.speaker)} border border-border/50 bg-card/50 backdrop-blur-sm transition-all`}
              onMouseEnter={() => setHoveredLineId(line.id)}
              onMouseLeave={() => setHoveredLineId(null)}
            >
              {/* Delete button - shows on hover */}
              <div className={`absolute -left-12 top-1/2 -translate-y-1/2 transition-opacity ${
                hoveredLineId === line.id ? 'opacity-100' : 'opacity-0'
              }`}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(line.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="p-4 space-y-3">
                {/* Speaker label and voice selector */}
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${
                    line.speaker === "speaker1" ? "text-primary" : "text-purple-500"
                  }`}>
                    {getSpeakerName(line.speaker)}
                  </span>
                  {voices.length > 0 && (
                    <Select
                      value={line.voiceId || ""}
                      onValueChange={(value) => handleVoiceChange(line.id, value)}
                    >
                      <SelectTrigger className="w-40 h-8 text-xs">
                        <SelectValue placeholder="Stimme wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {voices.map(voice => (
                          <SelectItem key={voice.id} value={voice.id}>
                            {voice.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Text area */}
                <Textarea
                  value={line.text}
                  onChange={(e) => handleTextChange(line.id, e.target.value)}
                  className="min-h-[80px] resize-none bg-background/50"
                  disabled={isProcessing && processingLineId === line.id}
                />

                {/* AI Edit controls */}
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Beschreibe die gewünschte Änderung..."
                    value={editInstructions[line.id] || ""}
                    onChange={(e) => setEditInstructions(prev => ({
                      ...prev,
                      [line.id]: e.target.value
                    }))}
                    className="flex-1 h-9 text-sm"
                    disabled={isProcessing && processingLineId === line.id}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAIEdit(line.id)}
                    disabled={isProcessing || !editInstructions[line.id]?.trim()}
                    className="gap-1"
                  >
                    {isProcessing && processingLineId === line.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Wand2 className="w-3 h-3" />
                    )}
                    Ändern
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAIShorten(line.id)}
                    disabled={isProcessing}
                    className="gap-1"
                  >
                    <Minus className="w-3 h-3" />
                    Kürzer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAILengthen(line.id)}
                    disabled={isProcessing}
                    className="gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Länger
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {dialogue.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Keine Dialogzeilen vorhanden.</p>
          </div>
        )}

        {/* Video Generation */}
        {dialogue.length > 0 && (
          <div className="pt-6 border-t">
            <VideoGenerator
              dialogue={dialogue}
              speaker1Name={speaker1Name}
              speaker2Name={speaker2Name}
              speaker1Config={speaker1Config}
              speaker2Config={speaker2Config}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DialogueEditor;
