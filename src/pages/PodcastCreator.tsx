import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, Settings, Mic, User, Video, ChevronRight, Film, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/i18n/LanguageContext";
import DialogueEditor from "@/components/podcast/DialogueEditor";
import VoiceRecorder from "@/components/podcast/VoiceRecorder";
import AvatarConfig from "@/components/podcast/AvatarConfig";
import VideoGenerator from "@/components/podcast/VideoGenerator";
import AvatarVoiceSelector from "@/components/podcast/AvatarVoiceSelector";
import type { DialogueLine, Voice, Avatar, PodcastScript } from "@/types/podcast";
import type { PodcastSpeakerConfig } from "@/lib/joggai";

const EXAMPLE_TOPICS_DE = [
  "Die Zukunft der künstlichen Intelligenz und wie sie unseren Alltag verändert",
  "Nachhaltige Ernährung: Tipps und Tricks für einen umweltbewussten Lebensstil",
  "Die spannendsten Tech-Trends 2024 und was sie für uns bedeuten",
  "Work-Life-Balance: Wie man Beruf und Privatleben erfolgreich vereint"
];

const EXAMPLE_TOPICS_EN = [
  "The future of artificial intelligence and how it changes our daily lives",
  "Sustainable nutrition: tips and tricks for an eco-conscious lifestyle",
  "The most exciting tech trends of 2024 and what they mean for us",
  "Work-life balance: how to successfully combine work and personal life"
];

type AppView = "input" | "customize" | "editor" | "settings";

export default function PodcastCreator() {
  const [view, setView] = useState<AppView>("input");
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [dialogue, setDialogue] = useState<DialogueLine[]>([]);
  const [speaker1Name, setSpeaker1Name] = useState("Alex");
  const [speaker2Name, setSpeaker2Name] = useState("Sam");
  const [speaker1Config, setSpeaker1Config] = useState<PodcastSpeakerConfig | null>(null);
  const [speaker2Config, setSpeaker2Config] = useState<PodcastSpeakerConfig | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLineId, setProcessingLineId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const EXAMPLE_TOPICS = language === "de" ? EXAMPLE_TOPICS_DE : EXAMPLE_TOPICS_EN;

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

  const startCustomization = () => {
    if (!topic.trim()) {
      toast({
        title: t("podcast.topic.missing"),
        description: t("podcast.topic.missing.desc"),
        variant: "destructive"
      });
      return;
    }
    setView("customize");
  };

  const handleSpeakerConfigComplete = (s1: PodcastSpeakerConfig, s2: PodcastSpeakerConfig) => {
    setSpeaker1Config(s1);
    setSpeaker2Config(s2);
    setSpeaker1Name(s1.speakerName);
    setSpeaker2Name(s2.speakerName);
    generatePodcast();
  };

  const generatePodcast = async () => {
    if (!topic.trim()) {
      toast({
        title: t("podcast.topic.missing"),
        description: t("podcast.topic.missing.desc"),
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
        title: t("podcast.generated"),
        description: `${lines.length} ${t("podcast.generated.desc")}`
      });

    } catch (error: any) {
      console.error('Error generating podcast:', error);
      toast({
        title: t("podcast.error"),
        description: error.message || t("podcast.error.desc"),
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
        title: t("podcast.ai.edited"),
        description: t("podcast.ai.edited.desc")
      });

    } catch (error: any) {
      toast({
        title: t("podcast.ai.error"),
        description: error.message || t("podcast.ai.error.edit"),
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
          instruction: language === "de" ? "Mache diesen Text etwas länger und ausführlicher, aber behalte den Inhalt bei." : "Make this text a bit longer and more detailed, but keep the content.",
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
        title: t("podcast.ai.error"),
        description: t("podcast.ai.error.lengthen"),
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
          instruction: language === "de" ? "Kürze diesen Text und mache ihn prägnanter, ohne wichtige Informationen zu verlieren." : "Shorten this text and make it more concise, without losing important information.",
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
        title: t("podcast.ai.error"),
        description: t("podcast.ai.error.shorten"),
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
      title: t("podcast.export.success"),
      description: t("podcast.export.desc")
    });
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

  // Render customize view (avatar/voice selection)
  if (view === "customize") {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setView("input")}>
              {t("podcast.back")}
            </Button>
            <LanguageToggle />
          </div>

          <div className="text-center space-y-2 mb-6">
            <h1 className="text-2xl font-bold">{t("podcast.configure.speakers")}</h1>
            <p className="text-muted-foreground">
              {t("podcast.configure.speakers.desc")}
            </p>
            <p className="text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg inline-block">
              {t("podcast.topic.label")} {topic}
            </p>
          </div>

          {isGenerating ? (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="py-12 text-center space-y-4">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
                <p className="text-muted-foreground">{t("podcast.generating")}</p>
              </CardContent>
            </Card>
          ) : (
            <AvatarVoiceSelector
              speaker1Name={speaker1Name}
              speaker2Name={speaker2Name}
              onSpeaker1NameChange={setSpeaker1Name}
              onSpeaker2NameChange={setSpeaker2Name}
              onConfigComplete={handleSpeakerConfigComplete}
              onSkip={generatePodcast}
            />
          )}
        </div>
      </div>
    );
  }

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
        speaker1Config={speaker1Config}
        speaker2Config={speaker2Config}
      />
    );
  }

  if (view === "settings") {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" onClick={() => setView("input")}>
              {t("podcast.back")}
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{t("podcast.settings")}</h1>
              <p className="text-sm text-muted-foreground">
                {t("podcast.settings.desc")}
              </p>
            </div>
            <div className="ml-auto">
              <LanguageToggle />
            </div>
          </div>

          <Tabs defaultValue="voices" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="voices" className="gap-2">
                <Mic className="w-4 h-4" />
                {t("podcast.voices")}
              </TabsTrigger>
              <TabsTrigger value="avatars" className="gap-2">
                <User className="w-4 h-4" />
                {t("podcast.avatars")}
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
            {t("podcast.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("podcast.subtitle")}
          </p>
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between">
          <Link to="/">
            <Button variant="outline" size="sm" className="gap-2">
              {t("nav.home")}
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Link to="/auth">
              <Button variant="outline" size="sm" className="gap-2">
                <LogIn className="w-4 h-4" />
                {t("nav.login")}
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setView("settings")}
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              {t("podcast.settings")}
            </Button>
          </div>
        </div>

        {/* Main input card */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>{t("podcast.new")}</CardTitle>
            <CardDescription>
              {t("podcast.new.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                placeholder={t("podcast.placeholder")}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="min-h-[120px] resize-none"
                disabled={isGenerating}
              />
            </div>

            <Button
              onClick={startCustomization}
              disabled={isGenerating || !topic.trim()}
              className="w-full gap-2"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("podcast.generating")}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {t("podcast.generate")}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Example topics */}
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground text-center">
            {t("podcast.examples")}
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
                      {voices.length} {voices.length !== 1 ? t("podcast.voices.count") : t("podcast.voice.count")}
                    </span>
                  )}
                  {avatars.length > 0 && (
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {avatars.length} {avatars.length !== 1 ? t("podcast.avatars.count") : t("podcast.avatar.count")}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView("settings")}
                  className="text-xs"
                >
                  {t("podcast.manage")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
