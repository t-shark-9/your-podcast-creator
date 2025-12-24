import { cn } from "@/lib/utils";
import { Check, Settings, FileText, Wand2, Volume2 } from "lucide-react";

export type WorkflowStep = "config" | "variants" | "optimize" | "audio";

interface WorkflowStepperProps {
  currentStep: WorkflowStep;
  completedSteps: WorkflowStep[];
}

const steps: { id: WorkflowStep; label: string; icon: React.ElementType }[] = [
  { id: "config", label: "Konfiguration", icon: Settings },
  { id: "variants", label: "Script-Varianten", icon: FileText },
  { id: "optimize", label: "Optimierung", icon: Wand2 },
  { id: "audio", label: "Vertonung", icon: Volume2 }
];

export const WorkflowStepper = ({ currentStep, completedSteps }: WorkflowStepperProps) => {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          const isUpcoming = !isCompleted && !isCurrent;

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              {/* Step circle */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                    isCompleted && "bg-primary border-primary text-primary-foreground",
                    isCurrent && "border-primary bg-primary/10 text-primary glow-primary",
                    isUpcoming && "border-border bg-secondary text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium text-center hidden sm:block",
                    isCurrent && "text-primary",
                    isCompleted && "text-foreground",
                    isUpcoming && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 transition-colors duration-300",
                    index < currentIndex ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
