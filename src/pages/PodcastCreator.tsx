import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, Settings, Mic, User, Video, ChevronRight, Webhook } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import DialogueEditor from "@/components/podcast/DialogueEditor";
import VoiceRecorder from "@/components/podcast/VoiceRecorder";
import AvatarConfig from "@/components/podcast/AvatarConfig";
import N8nConfig from "@/components/podcast/N8nConfig";
import JoggAiConfig from "@/components/podcast/JoggAiConfig";
import VideoGenerator from "@/components/podcast/VideoGenerator";
import type { DialogueLine, Voice, Avatar, PodcastScript } from "@/types/podcast";

const EXAMPLE_TOPICS = [
  "Die Zukunft der künstlichen Intelligenz und wie sie unseren Alltag verändert",
  "Nachhaltige Ernährung: Tipps und Tricks für einen umweltbewussten Lebensstil",
  "Die spannendsten Tech-Trends 2024 und was sie für uns bedeuten",
  "Work-Life-Balance: Wie man Beruf und Privatleben erfolgreich vereint"
];

type AppView = "input" | "editor" | "settings";

export default function PodcastCreator() {
  const [view, setView] = useState<AppView>("input");
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [dialogue, setDialogue] = useState<DialogueLine[]>([]);
  const [speaker1Name, setSpeaker1Name] = useState("Alex");
  const [speaker2Name, setSpeaker2Name] = useState("Sam");
  const [voices, setVoices] = useState<Voice[]>([]);
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLineId, setProcessingLineId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const { toast } = useToast();

  // Load saved voices and avatars from localStorage
  useEffect(() => {
    const savedVoices = localStorage.getItem('podcast-voices');
    const savedAvatars = localStorage.getItem('podcast-avatars');
    if (savedVoices) setVoices(JSON.parse(savedVoices));
    if (savedAvatars) setAvatars(JSON.parse(savedAvatars));
  }, []);

  // Save voices and avatars to localStorage
  useEffect(() => {
    localStorage.setItem('podcast-voices', JSON.stringify(voices));
  }, [voices]);

  useEffect(() => {
    localStorage.setItem('podcast-avatars', JSON.stringify(avatars));
  }, [avatars]);

  const generatePodcast = async () => {
    if (!topic.trim()) {
      toast({
        title: "Thema fehlt",
        description: "Bitte gib ein Thema für den Podcast ein.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-podcast-script', {
        body: {
          topic: topic.trim(),
          speakerNames: [speaker1Name, speaker2Name],
          style: "conversational",
          duration: "medium"
        }
      });

      if (error) throw error;

      // Parse the response into dialogue lines
      const script = data.script || data;
      const lines = parseScriptToDialogue(script);
      
      setDialogue(lines);
      setView("editor");

      toast({
        title: "Podcast generiert!",
        description: `${lines.length} Dialogzeilen wurden erstellt.`
      });

    } catch (error: any) {
      console.error('Error generating podcast:', error);
      toast({
        title: "Fehler beim Generieren",
        description: error.message || "Der Podcast konnte nicht generiert werden.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const parseScriptToDialogue = (script: string): DialogueLine[] => {
    const lines: DialogueLine[] = [];
    const regex = /\*\*([^*]+)\*\*:\s*(.+?)(?=\n\*\*|\n\n|$)/gs;
    let match;

    while ((match = regex.exec(script)) !== null) {
      const speakerName = match[1].trim();
      const text = match[2].trim();
      
      const speaker = speakerName.toLowerCase() === speaker1Name.toLowerCase() 
        ? "speaker1" 
        : "speaker2";

      lines.push({
        id: crypto.randomUUID(),
        speaker,
        text
      });
    }

    // If no matches, try simple line-by-line parsing
    if (lines.length === 0) {
      const simpleLines = script.split('\n').filter(l => l.trim());
      simpleLines.forEach((line, index) => {
        lines.push({
          id: crypto.randomUUID(),
          speaker: index % 2 === 0 ? "speaker1" : "speaker2",
          text: line.replace(/^[^:]+:\s*/, '').trim()
        });
      });
    }

    return lines;
  };

  const handleAIEdit = async (lineId: string, instruction: string) => {
    setIsProcessing(true);
    setProcessingLineId(lineId);

    try {
      const line = dialogue.find(l => l.id === lineId);
      if (!line) return;

      const { data, error } = await supabase.functions.invoke('optimize-podcast-script', {
        body: {
          script: line.text,
          instruction: instruction,
          type: "edit"
        }
      });

      if (error) throw error;

      const updatedDialogue = dialogue.map(l =>
        l.id === lineId ? { ...l, text: data.optimizedScript || data.script || line.text } : l
      );
      setDialogue(updatedDialogue);

      toast({
        title: "Text angepasst",
        description: "Die Änderung wurde erfolgreich angewendet."
      });

    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message || "Die Änderung konnte nicht angewendet werden.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setProcessingLineId(null);
    }
  };

  const handleAILengthen = async (lineId: string) => {
    setIsProcessing(true);
    setProcessingLineId(lineId);

    try {
      const line = dialogue.find(l => l.id === lineId);
      if (!line) return;

      const { data, error } = await supabase.functions.invoke('optimize-podcast-script', {
        body: {
          script: line.text,
          instruction: "Mache diesen Text etwas länger und ausführlicher, aber behalte den Inhalt bei.",
          type: "lengthen"
        }
      });

      if (error) throw error;

      const updatedDialogue = dialogue.map(l =>
        l.id === lineId ? { ...l, text: data.optimizedScript || data.script || line.text } : l
      );
      setDialogue(updatedDialogue);

    } catch (error: any) {
      toast({
        title: "Fehler",
        description: "Der Text konnte nicht verlängert werden.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setProcessingLineId(null);
    }
  };

  const handleAIShorten = async (lineId: string) => {
    setIsProcessing(true);
    setProcessingLineId(lineId);

    try {
      const line = dialogue.find(l => l.id === lineId);
      if (!line) return;

      const { data, error } = await supabase.functions.invoke('optimize-podcast-script', {
        body: {
          script: line.text,
          instruction: "Kürze diesen Text und mache ihn prägnanter, ohne wichtige Informationen zu verlieren.",
          type: "shorten"
        }
      });

      if (error) throw error;

      const updatedDialogue = dialogue.map(l =>
        l.id === lineId ? { ...l, text: data.optimizedScript || data.script || line.text } : l
      );
      setDialogue(updatedDialogue);

    } catch (error: any) {
      toast({
        title: "Fehler",
        description: "Der Text konnte nicht gekürzt werden.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setProcessingLineId(null);
    }
  };

  const handleExport = () => {
    const content = dialogue.map(line => {
      const speakerName = line.speaker === "speaker1" ? speaker1Name : speaker2Name;
      return `${speakerName}: ${line.text}`;
    }).join('\n\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `podcast-script-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export erfolgreich",
      description: "Das Skript wurde als .txt heruntergeladen."
    });

    // Trigger n8n webhook if configured
    triggerN8nWebhook(content);
  };

  const triggerN8nWebhook = async (scriptContent: string) => {
    const webhookUrl = localStorage.getItem('n8n_webhook_url');
    if (!webhookUrl) return;

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'script_exported',
          script: scriptContent,
          speakers: {
            speaker1: speaker1Name,
            speaker2: speaker2Name
          },
          voices: voices.filter(v => dialogue.some(d => d.voiceId === v.id)),
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        toast({
          title: "n8n Workflow gestartet",
          description: "Das Skript wurde an den n8n Workflow gesendet."
        });
      }
    } catch (error) {
      console.error('n8n webhook error:', error);
    }
  };

  const handleVoiceCreated = (voice: Voice) => {
    setVoices(prev => [...prev, voice]);
  };

  const handleVoiceDeleted = (voiceId: string) => {
    setVoices(prev => prev.filter(v => v.id !== voiceId));
  };

  const handleAvatarCreated = (avatar: Avatar) => {
    setAvatars(prev => [...prev, avatar]);
  };

  const handleAvatarDeleted = (avatarId: string) => {
    setAvatars(prev => prev.filter(a => a.id !== avatarId));
  };

  const handleSpeakerNameChange = (speaker: "speaker1" | "speaker2", name: string) => {
    if (speaker === "speaker1") {
      setSpeaker1Name(name);
    } else {
      setSpeaker2Name(name);
    }
  };

  // Render based on current view
  if (view === "editor") {
    return (
      <DialogueEditor
        dialogue={dialogue}
        onDialogueChange={setDialogue}
        onBack={() => setView("input")}
        onExport={handleExport}
        voices={voices}
        avatars={avatars}
        speaker1Name={speaker1Name}
        speaker2Name={speaker2Name}
        onSpeakerNameChange={handleSpeakerNameChange}
        onAIEdit={handleAIEdit}
        onAILengthen={handleAILengthen}
        onAIShorten={handleAIShorten}
        isProcessing={isProcessing}
        processingLineId={processingLineId}
      />
    );
  }

  if (view === "settings") {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" onClick={() => setView("input")}>
              ← Zurück
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Einstellungen</h1>
              <p className="text-sm text-muted-foreground">
                Konfiguriere deine Stimmen und Avatare
              </p>
            </div>
          </div>

          <Tabs defaultValue="voices" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="voices" className="gap-2">
                <Mic className="w-4 h-4" />
                Stimmen
              </TabsTrigger>
              <TabsTrigger value="avatars" className="gap-2">
                <User className="w-4 h-4" />
                Avatare
              </TabsTrigger>
              <TabsTrigger value="joggai" className="gap-2">
                <Video className="w-4 h-4" />
                JoggAI
              </TabsTrigger>
              <TabsTrigger value="n8n" className="gap-2">
                <Webhook className="w-4 h-4" />
                n8n
              </TabsTrigger>
            </TabsList>
            <TabsContent value="voices" className="mt-4">
              <VoiceRecorder
                voices={voices}
                onVoiceCreated={handleVoiceCreated}
                onVoiceDeleted={handleVoiceDeleted}
                isUploading={isUploading}
              />
            </TabsContent>
            <TabsContent value="avatars" className="mt-4">
              <AvatarConfig
                avatars={avatars}
                onAvatarCreated={handleAvatarCreated}
                onAvatarDeleted={handleAvatarDeleted}
                isUploading={isUploading}
              />
            </TabsContent>
            <TabsContent value="joggai" className="mt-4">
              <JoggAiConfig />
            </TabsContent>
            <TabsContent value="n8n" className="mt-4">
              <N8nConfig />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  // Main input view
  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Video className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Podcast Creator
          </h1>
          <p className="text-muted-foreground">
            Erstelle professionelle Podcast-Dialoge mit KI
          </p>
        </div>

        {/* Settings button */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView("settings")}
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            Einstellungen
          </Button>
        </div>

        {/* Main input card */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Neuer Podcast</CardTitle>
            <CardDescription>
              Beschreibe das Thema für deinen Podcast. Die KI generiert einen Dialog zwischen zwei Sprechern.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                placeholder="z.B. Ein Gespräch über die Zukunft der Elektromobilität, die Vor- und Nachteile, und was das für den Alltag bedeutet..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="min-h-[120px] resize-none"
                disabled={isGenerating}
              />
            </div>

            <Button
              onClick={generatePodcast}
              disabled={isGenerating || !topic.trim()}
              className="w-full gap-2"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generiere Podcast...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Podcast generieren
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Example topics */}
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground text-center">
            Beispielthemen zum Ausprobieren:
          </p>
          <div className="grid gap-2">
            {EXAMPLE_TOPICS.map((example, i) => (
              <button
                key={i}
                onClick={() => setTopic(example)}
                disabled={isGenerating}
                className="text-left px-4 py-3 rounded-lg border border-border/50 bg-card/30 hover:bg-card/60 transition-colors text-sm group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                    {example}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Info about voices and avatars */}
        {(voices.length > 0 || avatars.length > 0) && (
          <Card className="border-border/30 bg-muted/30">
            <CardContent className="py-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  {voices.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Mic className="w-4 h-4 text-muted-foreground" />
                      {voices.length} Stimme{voices.length !== 1 ? 'n' : ''}
                    </span>
                  )}
                  {avatars.length > 0 && (
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {avatars.length} Avatar{avatars.length !== 1 ? 'e' : ''}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView("settings")}
                  className="text-xs"
                >
                  Verwalten
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
