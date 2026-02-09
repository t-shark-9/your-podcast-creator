import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, Mic2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TopicInputProps {
  onGenerate: (topic: string) => Promise<void>;
  isGenerating: boolean;
}

export const TopicInput = ({ onGenerate, isGenerating }: TopicInputProps) => {
  const [topic, setTopic] = useState("");
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({
        title: "Thema fehlt",
        description: "Bitte beschreibe das Podcast-Thema.",
        variant: "destructive"
      });
      return;
    }
    await onGenerate(topic);
  };

  const exampleTopics = [
    "Ein Gespräch über die Zukunft der künstlichen Intelligenz und ihre Auswirkungen auf den Arbeitsmarkt",
    "Zwei Freunde diskutieren über ihre Lieblings-Reiseziele und teilen Geheimtipps",
    "Eine Debatte über die Vor- und Nachteile von Remote-Arbeit",
    "Ein Interview über gesunde Ernährung und Fitness-Tipps für Anfänger"
  ];

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10 w-fit">
            <Mic2 className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">
            <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              Podcast erstellen
            </span>
          </CardTitle>
          <CardDescription className="text-base">
            Beschreibe das Thema für einen Podcast mit zwei Sprechern
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Textarea
              placeholder="Beschreibe das Podcast-Thema, die Sprecher und den Stil...

Beispiel: Zwei Tech-Enthusiasten diskutieren über die neuesten Entwicklungen in der KI. Der eine ist skeptisch, der andere begeistert. Der Ton ist locker und humorvoll."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="min-h-[180px] text-base resize-none"
              disabled={isGenerating}
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !topic.trim()}
            className="w-full h-12 text-lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Podcast wird generiert...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Podcast generieren
              </>
            )}
          </Button>

          {/* Example topics */}
          <div className="pt-4 border-t border-border/50">
            <p className="text-sm text-muted-foreground mb-3">Beispiel-Themen:</p>
            <div className="flex flex-wrap gap-2">
              {exampleTopics.map((example, i) => (
                <button
                  key={i}
                  onClick={() => setTopic(example)}
                  disabled={isGenerating}
                  className="text-xs px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-left"
                >
                  {example.slice(0, 50)}...
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TopicInput;
