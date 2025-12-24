import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, FileText, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScriptVariant {
  id: number;
  content: string;
}

interface ScriptVariantSelectorProps {
  variants: ScriptVariant[];
  selectedVariant: number | null;
  onSelect: (variantId: number) => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

export const ScriptVariantSelector = ({
  variants,
  selectedVariant,
  onSelect,
  onRegenerate,
  isRegenerating
}: ScriptVariantSelectorProps) => {
  const [expandedVariant, setExpandedVariant] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-display font-bold text-foreground">
          Script-Varianten
        </h2>
        <p className="text-muted-foreground">
          Wähle die beste Variante für deinen Podcast
        </p>
      </div>

      <div className="grid gap-4">
        {variants.map((variant) => (
          <Card
            key={variant.id}
            className={cn(
              "p-4 cursor-pointer transition-all duration-300 border-2",
              selectedVariant === variant.id
                ? "border-primary bg-primary/5 glow-primary"
                : "border-border hover:border-primary/50 bg-card/50"
            )}
            onClick={() => onSelect(variant.id)}
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                  selectedVariant === variant.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {selectedVariant === variant.id ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <FileText className="h-5 w-5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground">
                    Variante {variant.id}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {variant.content.split(' ').length} Wörter
                  </span>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-3">
                  {variant.content.slice(0, 300)}...
                </p>

                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-primary hover:text-primary/80"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedVariant(expandedVariant === variant.id ? null : variant.id);
                  }}
                >
                  {expandedVariant === variant.id ? "Weniger anzeigen" : "Mehr anzeigen"}
                </Button>

                {expandedVariant === variant.id && (
                  <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border max-h-64 overflow-y-auto">
                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap font-mono">
                      {variant.content}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {onRegenerate && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isRegenerating && "animate-spin")} />
            Neue Varianten generieren
          </Button>
        </div>
      )}
    </div>
  );
};
