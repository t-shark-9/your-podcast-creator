import { Sparkles, Settings2, Zap, FileText } from "lucide-react";

interface ModeSelectionProps {
  onSelectMode: (mode: "simple" | "rigorous") => void;
}

export const ModeSelection = ({ onSelectMode }: ModeSelectionProps) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 gradient-hero opacity-50" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1s" }} />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
            <span className="text-gradient">PodcastAI</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Wie möchtest du deinen Podcast erstellen?
          </p>
        </div>

        {/* Mode Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Simple Mode */}
          <button
            onClick={() => onSelectMode("simple")}
            className="group relative p-8 rounded-3xl bg-card/50 backdrop-blur-sm border border-border hover:border-primary/50 transition-all duration-300 hover:scale-[1.02] hover:glow-primary text-left animate-slide-up"
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-6 group-hover:scale-110 transition-transform">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              
              <h2 className="text-2xl font-display font-bold text-foreground mb-3">
                Schnell & Einfach
              </h2>
              
              <p className="text-muted-foreground mb-6">
                Perfekt für schnelle Podcasts. Du gibst nur das Wesentliche ein – den Rest übernimmt die KI.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-foreground/70">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span>Thema eingeben</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-foreground/70">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span>Stimme wählen</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-foreground/70">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span>Dauer festlegen</span>
                </div>
              </div>
              
              <div className="mt-6 inline-flex items-center gap-2 text-primary font-medium">
                <span>Schnellstart</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </button>

          {/* Rigorous Mode */}
          <button
            onClick={() => onSelectMode("rigorous")}
            className="group relative p-8 rounded-3xl bg-card/50 backdrop-blur-sm border border-border hover:border-accent/50 transition-all duration-300 hover:scale-[1.02] hover:glow-accent text-left animate-slide-up"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 mb-6 group-hover:scale-110 transition-transform">
                <Settings2 className="h-8 w-8 text-accent" />
              </div>
              
              <h2 className="text-2xl font-display font-bold text-foreground mb-3">
                Detailliert & Präzise
              </h2>
              
              <p className="text-muted-foreground mb-6">
                Volle Kontrolle über jeden Aspekt. Definiere Sprecher, Struktur, Stil und mehr.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-foreground/70">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                  <span>Sprecher-Hintergrund definieren</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-foreground/70">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                  <span>Podcast-Struktur festlegen</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-foreground/70">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                  <span>Textstil & Video konfigurieren</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-foreground/70">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                  <span>Script-Varianten & Optimierung</span>
                </div>
              </div>
              
              <div className="mt-6 inline-flex items-center gap-2 text-accent font-medium">
                <span>Vollständiger Workflow</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </button>
        </div>

        {/* Footer hint */}
        <p className="text-center text-sm text-muted-foreground mt-12">
          Du kannst den Modus jederzeit wechseln
        </p>
      </div>
    </div>
  );
};
