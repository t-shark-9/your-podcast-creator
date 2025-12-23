import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { VoiceSelector } from "./VoiceSelector";
import { Sparkles, Clock, Wand2 } from "lucide-react";

interface TopicInputProps {
  onGenerate: (topic: string, duration: number, voiceId: string) => void;
  isGenerating: boolean;
}

export const TopicInput = ({ onGenerate, isGenerating }: TopicInputProps) => {
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState(5);
  const [voiceId, setVoiceId] = useState("JBFqnCBsd6RMkjVDRZzb");

  const handleSubmit = () => {
    if (topic.trim()) {
      onGenerate(topic.trim(), duration, voiceId);
    }
  };

  const exampleTopics = [
    "The future of artificial intelligence",
    "How to build good habits",
    "The science of sleep",
    "Cryptocurrency explained",
  ];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 animate-slide-up">
      {/* Topic Input */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <label className="text-sm font-medium text-foreground">Podcast Topic</label>
        </div>
        <Textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter your podcast topic... (e.g., 'The psychology of productivity')"
          className="min-h-28 bg-secondary border-border focus:border-primary focus:ring-primary/20 transition-all duration-300 text-lg placeholder:text-muted-foreground/50"
          disabled={isGenerating}
        />
        
        {/* Example topics */}
        <div className="flex flex-wrap gap-2">
          {exampleTopics.map((example) => (
            <button
              key={example}
              onClick={() => setTopic(example)}
              disabled={isGenerating}
              className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors duration-200 disabled:opacity-50"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Duration Slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <label className="text-sm font-medium text-foreground">Duration</label>
          </div>
          <span className="text-sm font-mono text-primary">{duration} min</span>
        </div>
        <Slider
          value={[duration]}
          min={2}
          max={15}
          step={1}
          onValueChange={(value) => setDuration(value[0])}
          disabled={isGenerating}
          className="py-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>2 min</span>
          <span>15 min</span>
        </div>
      </div>

      {/* Voice Selector */}
      <VoiceSelector 
        selectedVoiceId={voiceId} 
        onVoiceSelect={setVoiceId} 
      />

      {/* Generate Button */}
      <Button
        onClick={handleSubmit}
        disabled={!topic.trim() || isGenerating}
        size="lg"
        className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground glow-primary transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
      >
        {isGenerating ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin">⟳</span>
            Generating your podcast...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Generate Podcast
          </span>
        )}
      </Button>
    </div>
  );
};
