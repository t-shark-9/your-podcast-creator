import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { User, LayoutList, PenTool, ListOrdered } from "lucide-react";

export interface PodcastConfigData {
  speakerBackground: string;
  podcastStructure: string;
  textStyle: string;
  topics: string;
}

interface PodcastConfigProps {
  config: PodcastConfigData;
  onChange: (config: PodcastConfigData) => void;
  disabled?: boolean;
}

const configFields = [
  {
    key: "speakerBackground" as const,
    icon: User,
    label: "Sprecher-Hintergrund",
    placeholder: "Beschreibe den Sprecher: Stil, Denkmuster, typische Redewendungen, Persönlichkeit...\n\nBeispiel:\n- Ruhiger, nachdenklicher Ton\n- Verwendet oft Metaphern aus der Natur\n- Stellt rhetorische Fragen\n- Spricht direkt zum Hörer",
    description: "Stil, Denkmuster und typische Redewendungen des Sprechers"
  },
  {
    key: "podcastStructure" as const,
    icon: LayoutList,
    label: "Podcast-Aufbau",
    placeholder: "Beschreibe den formellen Aufbau: Ablauf, Rhetorik, Struktur...\n\nBeispiel:\n1. Begrüßung mit persönlicher Note\n2. Themenvorstellung mit Hook\n3. Hauptteil mit 3 Kernpunkten\n4. Zusammenfassung\n5. Verabschiedung mit Call-to-Action",
    description: "Formeller Ablauf und rhetorische Struktur der Episode"
  },
  {
    key: "textStyle" as const,
    icon: PenTool,
    label: "Textbeschreibung",
    placeholder: "Wie sollen die Texte des Haupt-Sprechers geschrieben sein?\n\nBeispiel:\n- Umgangssprachlich aber informativ\n- Kurze, prägnante Sätze\n- Persönliche Anekdoten einbauen\n- Fachbegriffe immer erklären",
    description: "Wie die Texte des Sprechers formuliert werden sollen"
  },
  {
    key: "topics" as const,
    icon: ListOrdered,
    label: "Themen-Abfolge",
    placeholder: "Liste die Themen und Unterthemen auf, die behandelt werden sollen...\n\nBeispiel:\n1. Einführung ins Thema\n   - Warum ist das relevant?\n   - Persönliche Erfahrung\n2. Hauptthema\n   - Aspekt A\n   - Aspekt B\n3. Fazit und Ausblick",
    description: "Die Abfolge der zu behandelnden Themen"
  }
];

export const PodcastConfig = ({ config, onChange, disabled }: PodcastConfigProps) => {
  const handleChange = (key: keyof PodcastConfigData, value: string) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-2xl font-display font-bold text-foreground">
          Podcast-Konfiguration
        </h2>
        <p className="text-muted-foreground">
          Definiere die Grundlagen für konsistente Podcast-Episoden
        </p>
      </div>

      <div className="grid gap-6">
        {configFields.map(({ key, icon: Icon, label, placeholder, description }) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" />
              <Label className="text-sm font-medium text-foreground">{label}</Label>
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
            <Textarea
              value={config[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              className="min-h-32 bg-secondary border-border focus:border-primary focus:ring-primary/20 transition-all duration-300 text-sm placeholder:text-muted-foreground/40"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
