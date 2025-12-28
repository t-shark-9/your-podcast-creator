import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Image, User, Users } from "lucide-react";

export interface VideoConfigData {
  background: string;
  character1: string;
  character2: string;
}

interface VideoConfigProps {
  config: VideoConfigData;
  onChange: (config: VideoConfigData) => void;
  disabled?: boolean;
}

export const VideoConfig = ({ config, onChange, disabled }: VideoConfigProps) => {
  const handleChange = (key: keyof VideoConfigData, value: string) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2 mb-6">
        <h3 className="text-xl font-display font-bold text-foreground">
          Video-Konfiguration
        </h3>
        <p className="text-sm text-muted-foreground">
          Definiere den visuellen Stil für dein Podcast-Video
        </p>
      </div>

      <div className="grid gap-6">
        {/* Background */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4 text-primary" />
            <Label className="text-sm font-medium text-foreground">Hintergrund / Setting</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Beschreibe das Studio oder den Ort, an dem das Gespräch stattfindet
          </p>
          <Textarea
            value={config.background}
            onChange={(e) => handleChange("background", e.target.value)}
            placeholder="Beispiele:
• Modernes Podcast-Studio mit warmem Licht
• Gemütliches Wohnzimmer mit Bücherregal
• Industrieller Loft mit Backsteinwänden
• Outdoor-Setting auf einer Terrasse"
            disabled={disabled}
            className="min-h-24 bg-secondary border-border focus:border-primary focus:ring-primary/20 transition-all duration-300 text-sm placeholder:text-muted-foreground/40"
          />
        </div>

        {/* Character 1 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <Label className="text-sm font-medium text-foreground">Sprecher 1 (Hauptsprecher)</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Beschreibe das Aussehen des Hauptsprechers
          </p>
          <Textarea
            value={config.character1}
            onChange={(e) => handleChange("character1", e.target.value)}
            placeholder="Beispiel:
Mann, 35 Jahre, kurze dunkle Haare, Bart, trägt blaues Hemd, freundliches Lächeln, sitzt vor Mikrofon"
            disabled={disabled}
            className="min-h-20 bg-secondary border-border focus:border-primary focus:ring-primary/20 transition-all duration-300 text-sm placeholder:text-muted-foreground/40"
          />
        </div>

        {/* Character 2 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <Label className="text-sm font-medium text-foreground">Sprecher 2 (Co-Host / Gast)</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Beschreibe das Aussehen des zweiten Sprechers
          </p>
          <Textarea
            value={config.character2}
            onChange={(e) => handleChange("character2", e.target.value)}
            placeholder="Beispiel:
Frau, 30 Jahre, lange blonde Haare, trägt schwarzen Pullover, nachdenklicher Ausdruck, Kopfhörer"
            disabled={disabled}
            className="min-h-20 bg-secondary border-border focus:border-primary focus:ring-primary/20 transition-all duration-300 text-sm placeholder:text-muted-foreground/40"
          />
        </div>
      </div>
    </div>
  );
};
