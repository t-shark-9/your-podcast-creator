import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Wand2, Check, Edit3, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScriptOptimizerProps {
  originalScript: string;
  optimizedScript: string | null;
  onOptimize: () => void;
  onAccept: (script: string) => void;
  isOptimizing: boolean;
}

export const ScriptOptimizer = ({
  originalScript,
  optimizedScript,
  onOptimize,
  onAccept,
  isOptimizing
}: ScriptOptimizerProps) => {
  const [editedScript, setEditedScript] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const displayScript = editedScript ?? optimizedScript ?? originalScript;
  const isOptimized = optimizedScript !== null;

  const handleAccept = () => {
    onAccept(displayScript);
  };

  const handleEdit = () => {
    setEditedScript(displayScript);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-display font-bold text-foreground">
          Script-Optimierung
        </h2>
        <p className="text-muted-foreground">
          Verbessere Sprache, Grammatik und füge natürliche Elemente hinzu
        </p>
      </div>

      {/* Optimization features */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Sprache", icon: "✨" },
          { label: "Grammatik", icon: "📝" },
          { label: "Versprecher", icon: "🗣️" },
          { label: "Stimmung", icon: "🎭" }
        ].map((feature) => (
          <div
            key={feature.label}
            className={cn(
              "p-3 rounded-lg border text-center transition-all",
              isOptimized
                ? "border-primary/50 bg-primary/5"
                : "border-border bg-secondary/50"
            )}
          >
            <span className="text-lg mb-1 block">{feature.icon}</span>
            <span className="text-xs text-muted-foreground">{feature.label}</span>
          </div>
        ))}
      </div>

      {/* Script display */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-foreground">
            {isOptimized ? "Optimiertes Script" : "Original Script"}
          </Label>
          {isOptimized && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="gap-1 text-muted-foreground hover:text-foreground"
            >
              <Edit3 className="h-3 w-3" />
              Bearbeiten
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editedScript || ""}
              onChange={(e) => setEditedScript(e.target.value)}
              className="min-h-80 bg-secondary border-border focus:border-primary text-sm font-mono"
            />
            <Button onClick={handleSaveEdit} size="sm" className="gap-1">
              <Check className="h-3 w-3" />
              Änderungen speichern
            </Button>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-muted/30 border border-border max-h-80 overflow-y-auto">
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap font-mono">
              {displayScript}
            </p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {!isOptimized ? (
          <Button
            onClick={onOptimize}
            disabled={isOptimizing}
            className="flex-1 h-12 gap-2 bg-accent hover:bg-accent/90 text-accent-foreground glow-accent"
          >
            {isOptimizing ? (
              <>
                <Sparkles className="h-4 w-4 animate-pulse" />
                Optimiere Script...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                Script optimieren
              </>
            )}
          </Button>
        ) : (
          <>
            <Button
              onClick={onOptimize}
              disabled={isOptimizing}
              variant="outline"
              className="flex-1 h-12 gap-2"
            >
              <Wand2 className="h-4 w-4" />
              Erneut optimieren
            </Button>
            <Button
              onClick={handleAccept}
              className="flex-1 h-12 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground glow-primary"
            >
              <Check className="h-4 w-4" />
              Script akzeptieren
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
