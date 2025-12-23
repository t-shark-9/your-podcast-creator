import { WaveformVisualizer } from "./WaveformVisualizer";
import { Loader2, FileText, Volume2 } from "lucide-react";

type GenerationStep = "idle" | "script" | "audio" | "complete";

interface GenerationStatusProps {
  step: GenerationStep;
  script?: string;
}

export const GenerationStatus = ({ step, script }: GenerationStatusProps) => {
  if (step === "idle") return null;

  const steps = [
    { id: "script", label: "Generating Script", icon: FileText },
    { id: "audio", label: "Creating Audio", icon: Volume2 },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 animate-fade-in">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isActive = step === s.id;
          const isComplete = 
            (step === "audio" && s.id === "script") || 
            (step === "complete");

          return (
            <div key={s.id} className="flex items-center gap-2">
              {i > 0 && (
                <div className={`h-px w-8 ${isComplete ? "bg-primary" : "bg-border"}`} />
              )}
              <div className="flex items-center gap-2">
                <div 
                  className={`h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isComplete 
                      ? "bg-primary text-primary-foreground" 
                      : isActive 
                        ? "bg-primary/20 text-primary border-2 border-primary" 
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isActive ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span className={`text-sm font-medium ${
                  isActive || isComplete ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {s.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Waveform Animation */}
      <div className="relative">
        <WaveformVisualizer isGenerating={step !== "complete"} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="px-4 py-2 rounded-full bg-background/80 backdrop-blur-sm border border-border">
            <p className="text-sm font-medium text-primary animate-pulse">
              {step === "script" && "Writing your podcast script..."}
              {step === "audio" && "Converting to speech..."}
            </p>
          </div>
        </div>
      </div>

      {/* Script Preview */}
      {script && step !== "script" && (
        <div className="space-y-2 animate-fade-in">
          <h3 className="text-sm font-medium text-muted-foreground">Script Preview</h3>
          <div className="p-4 rounded-lg bg-muted/30 border border-border max-h-40 overflow-y-auto">
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
              {script.slice(0, 500)}...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
