import { ImageIcon, Video } from "lucide-react";

export type VisualOutputType = "image" | "video";

interface VisualOutputSelectorProps {
  value: VisualOutputType;
  onChange: (value: VisualOutputType) => void;
  disabled?: boolean;
}

export const VisualOutputSelector = ({ value, onChange, disabled }: VisualOutputSelectorProps) => {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">Visueller Output</label>
      <div className="grid grid-cols-2 gap-3">
        {/* Image Option */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("image")}
          className={`group relative p-4 rounded-xl border transition-all duration-200 text-left ${
            value === "image"
              ? "border-primary bg-primary/10 ring-2 ring-primary/20"
              : "border-border bg-card/50 hover:border-primary/50 hover:bg-primary/5"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${
              value === "image" ? "bg-primary/20" : "bg-muted"
            }`}>
              <ImageIcon className={`h-5 w-5 ${
                value === "image" ? "text-primary" : "text-muted-foreground"
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`font-medium text-sm ${
                value === "image" ? "text-primary" : "text-foreground"
              }`}>
                Bild
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Schneller, statisches Hintergrundbild mit Audio
              </p>
            </div>
          </div>
          {value === "image" && (
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
          )}
        </button>

        {/* Video Option */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("video")}
          className={`group relative p-4 rounded-xl border transition-all duration-200 text-left ${
            value === "video"
              ? "border-accent bg-accent/10 ring-2 ring-accent/20"
              : "border-border bg-card/50 hover:border-accent/50 hover:bg-accent/5"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${
              value === "video" ? "bg-accent/20" : "bg-muted"
            }`}>
              <Video className={`h-5 w-5 ${
                value === "video" ? "text-accent" : "text-muted-foreground"
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`font-medium text-sm ${
                value === "video" ? "text-accent" : "text-foreground"
              }`}>
                Video
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Animiertes Video mit bewegten Sprechern
              </p>
            </div>
          </div>
          {value === "video" && (
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent" />
          )}
        </button>
      </div>
    </div>
  );
};
