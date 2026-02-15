import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ArrowRight, ExternalLink, Loader2, Mic, Play, Square,
  Sparkles, Users, Video, LayoutTemplate, Monitor, Radio, CheckCircle2
} from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/i18n/LanguageContext";
import { joggAiService } from "@/lib/joggai";
import type { JoggAiTemplate } from "@/lib/joggai";
import { cn } from "@/lib/utils";

// Template metadata enrichment — adds descriptions to the known podcast templates
const TEMPLATE_META: Record<number, { descEn: string; descDe: string; characters: number; style: string }> = {
  417: { descEn: "Trending podcast channel with dynamic split-screen hosts", descDe: "Trendiger Podcast-Kanal mit dynamischen Splitscreen-Moderatoren", characters: 2, style: "Podcast" },
  418: { descEn: "Bob's casual podcast channel — relaxed conversation style", descDe: "Bobs lockerer Podcast-Kanal — entspannter Gesprächsstil", characters: 2, style: "Podcast" },
  419: { descEn: "HotCast — energetic debate and discussion format", descDe: "HotCast — energiegeladenes Diskussions- und Debattenformat", characters: 2, style: "Talk Show" },
  420: { descEn: "SpeechCraft — polished and professional presentation", descDe: "SpeechCraft — stilvolle und professionelle Präsentation", characters: 1, style: "Solo" },
  421: { descEn: "Articulate Chamber — deep-dive intellectual discussions", descDe: "Articulate Chamber — tiefgründige intellektuelle Diskussionen", characters: 2, style: "Interview" },
  422: { descEn: "The Chamber of Discourse — formal debate setting", descDe: "The Chamber of Discourse — formelles Debattenformat", characters: 2, style: "Debate" },
  431: { descEn: "Breaking News — live news broadcast style with anchor desk", descDe: "Breaking News — Live-Nachrichtensendung im Nachrichtenstudio", characters: 1, style: "News" },
};

export default function VideoPodcast() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<JoggAiTemplate[]>([]);
  const [allPodcastTemplates, setAllPodcastTemplates] = useState<JoggAiTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const [videoPodcast, allPodcast] = await Promise.all([
        joggAiService.getVideoPodcastTemplates(),
        joggAiService.getPodcastTemplates(),
      ]);
      setTemplates(videoPodcast);
      setAllPodcastTemplates(allPodcast);
    } catch (error) {
      console.warn("Could not load templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (tmpl: JoggAiTemplate) => {
    if (previewUrl === tmpl.preview_url) {
      setPreviewUrl(null);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current = null;
      }
    } else {
      setPreviewUrl(tmpl.preview_url || null);
    }
  };

  const handleUseTemplate = (templateId: string) => {
    // Save selected template ID and navigate to podcast creator
    localStorage.setItem("video_template_id", templateId);
    navigate("/podcast");
  };

  const selectedTemplate = [...templates, ...allPodcastTemplates].find(
    t => String(t.template_id) === selectedTemplateId
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-1">
                <ArrowLeft className="w-4 h-4" />
                {language === "de" ? "Zurück" : "Back"}
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <span className="text-lg font-bold">
                {language === "de" ? "Video Podcast" : "Video Podcast"}
              </span>
              <Badge variant="secondary" className="text-[10px]">2.0</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/podcast">
              <Button variant="outline" size="sm" className="gap-1">
                <Mic className="w-3 h-3" />
                {language === "de" ? "Podcast erstellen" : "Create Podcast"}
              </Button>
            </Link>
            <LanguageToggle />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Hero section */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Users className="w-7 h-7 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {language === "de" ? "Video Podcast Templates" : "Video Podcast Templates"}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {language === "de"
              ? "Wähle ein professionelles Podcast-Template und erstelle ein Video mit KI-Avataren im Splitscreen"
              : "Choose a professional podcast template and create a video with AI avatars in split screen"}
          </p>
        </div>

        {/* JoggAI Video Podcast 2.0 — Featured CTA */}
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 overflow-hidden">
          <CardContent className="py-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
                <h3 className="text-lg font-bold">
                  {language === "de" ? "JoggAI Video Podcast 2.0" : "JoggAI Video Podcast 2.0"}
                </h3>
                <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                  {language === "de" ? "Vollversion" : "Full Version"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {language === "de"
                  ? "Erstelle professionelle Video-Podcasts mit zwei KI-Charakteren wie Austin & Roger direkt im JoggAI-Editor — mit voller Kontrolle über Gestik, Mimik und Hintergründe."
                  : "Create professional video podcasts with two AI characters like Austin & Roger directly in the JoggAI editor — with full control over gestures, expressions, and backgrounds."}
              </p>
            </div>
            <Button
              size="lg"
              className="gap-2 shrink-0"
              onClick={() => window.open("https://app.jogg.ai/video-podcast?selectRadio=4", "_blank")}
            >
              <ExternalLink className="w-4 h-4" />
              {language === "de" ? "JoggAI öffnen" : "Open JoggAI"}
            </Button>
          </CardContent>
        </Card>

        {/* Video Preview */}
        {previewUrl && (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <video
                ref={videoRef}
                src={previewUrl}
                controls
                autoPlay
                className="w-full max-h-[400px] bg-black"
                onEnded={() => setPreviewUrl(null)}
              />
            </CardContent>
          </Card>
        )}

        {/* Podcast Templates Gallery */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5 text-primary" />
              {language === "de" ? "Podcast Templates" : "Podcast Templates"}
              {templates.length > 0 && (
                <Badge variant="secondary" className="text-xs">{templates.length}</Badge>
              )}
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
              <span className="text-muted-foreground">
                {language === "de" ? "Templates werden geladen..." : "Loading templates..."}
              </span>
            </div>
          ) : templates.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((tmpl) => {
                const tid = String(tmpl.template_id);
                const isSelected = selectedTemplateId === tid;
                const meta = TEMPLATE_META[Number(tmpl.template_id)];
                return (
                  <Card
                    key={tid}
                    className={cn(
                      "overflow-hidden cursor-pointer transition-all hover:scale-[1.01]",
                      isSelected
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border/50 hover:border-primary/40"
                    )}
                    onClick={() => setSelectedTemplateId(isSelected ? "" : tid)}
                  >
                    {/* Template cover */}
                    <div className="relative aspect-video bg-muted group">
                      {tmpl.cover_url ? (
                        <img
                          src={tmpl.cover_url}
                          alt={tmpl.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <LayoutTemplate className="w-12 h-12 text-muted-foreground/30" />
                        </div>
                      )}

                      {/* Play preview button */}
                      {tmpl.preview_url && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePreview(tmpl); }}
                          className={cn(
                            "absolute bottom-2 right-2 rounded-full p-2 transition-all",
                            previewUrl === tmpl.preview_url
                              ? "bg-primary text-primary-foreground"
                              : "bg-black/50 text-white opacity-0 group-hover:opacity-100"
                          )}
                        >
                          {previewUrl === tmpl.preview_url ? (
                            <Square className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4 ml-0.5" />
                          )}
                        </button>
                      )}

                      {/* Selected checkmark */}
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 className="w-6 h-6 text-primary bg-background rounded-full" />
                        </div>
                      )}

                      {/* Style badge */}
                      {meta && (
                        <div className="absolute top-2 left-2">
                          <Badge variant="secondary" className="text-[10px] bg-black/60 text-white border-0 backdrop-blur-sm">
                            {meta.style}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Template info */}
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm">{tmpl.name}</h3>
                        {meta && (
                          <Badge variant="outline" className="text-[10px] gap-0.5">
                            <Users className="w-3 h-3" />
                            {meta.characters === 2
                              ? (language === "de" ? "2 Sprecher" : "2 Speakers")
                              : (language === "de" ? "1 Sprecher" : "1 Speaker")}
                          </Badge>
                        )}
                      </div>
                      {meta && (
                        <p className="text-xs text-muted-foreground">
                          {language === "de" ? meta.descDe : meta.descEn}
                        </p>
                      )}
                      {tmpl.aspect_ratio && (
                        <Badge variant="outline" className="text-[9px]">
                          {tmpl.aspect_ratio}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <LayoutTemplate className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{language === "de" ? "Keine Templates gefunden." : "No templates found."}</p>
            </div>
          )}
        </section>

        {/* Selected template action bar */}
        {selectedTemplate && (
          <Card className="border-primary/20 bg-primary/5 sticky bottom-4">
            <CardContent className="py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {selectedTemplate.cover_url && (
                  <img
                    src={selectedTemplate.cover_url}
                    alt={selectedTemplate.name}
                    className="w-20 h-12 rounded-lg object-cover shrink-0"
                  />
                )}
                <div>
                  <h3 className="font-semibold text-sm">{selectedTemplate.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {language === "de"
                      ? "Template ausgewählt — starte die Podcast-Erstellung"
                      : "Template selected — start podcast creation"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => {
                    const editorUrl = `https://app.jogg.ai/video-podcast?selectRadio=4`;
                    window.open(editorUrl, "_blank");
                  }}
                >
                  <ExternalLink className="w-3 h-3" />
                  {language === "de" ? "In JoggAI öffnen" : "Open in JoggAI"}
                </Button>
                <Button
                  size="sm"
                  className="gap-1"
                  onClick={() => handleUseTemplate(String(selectedTemplate.template_id))}
                >
                  <ArrowRight className="w-3 h-3" />
                  {language === "de" ? "Podcast erstellen" : "Create Podcast"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* How it works section */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-center">
            {language === "de" ? "So funktioniert's" : "How It Works"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                step: "1",
                icon: LayoutTemplate,
                titleEn: "Choose a Template",
                titleDe: "Template wählen",
                descEn: "Pick a podcast template from our gallery above — each has a unique visual style and layout.",
                descDe: "Wähle ein Podcast-Template aus unserer Galerie — jedes hat einen einzigartigen visuellen Stil.",
              },
              {
                step: "2",
                icon: Mic,
                titleEn: "Configure Speakers",
                titleDe: "Sprecher konfigurieren",
                descEn: "Choose AI avatars and voices for each speaker, then enter your podcast topic.",
                descDe: "Wähle KI-Avatare und Stimmen für jeden Sprecher, dann gib dein Podcast-Thema ein.",
              },
              {
                step: "3",
                icon: Video,
                titleEn: "Generate Video",
                titleDe: "Video generieren",
                descEn: "AI generates the dialogue and creates a split-screen podcast video with your chosen avatars.",
                descDe: "KI generiert den Dialog und erstellt ein Splitscreen-Podcast-Video mit deinen gewählten Avataren.",
              },
            ].map((item) => (
              <Card key={item.step} className="border-border/50 bg-card/50">
                <CardContent className="pt-6 pb-4 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Badge variant="outline" className="text-xs">{language === "de" ? "Schritt" : "Step"} {item.step}</Badge>
                  </div>
                  <h3 className="font-semibold text-sm">
                    {language === "de" ? item.titleDe : item.titleEn}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {language === "de" ? item.descDe : item.descEn}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Full experience CTA at bottom */}
        <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-orange-500/5">
          <CardContent className="py-6 text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-lg">
                {language === "de" ? "Möchtest du mehr?" : "Want More?"}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              {language === "de"
                ? "Für das volle Video Podcast 2.0 Erlebnis mit zwei interaktiven KI-Charakteren, Gestik, Mimik und erweiterten Hintergründen — nutze den JoggAI Editor direkt."
                : "For the full Video Podcast 2.0 experience with two interactive AI characters, gestures, expressions, and advanced backgrounds — use the JoggAI editor directly."}
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                className="gap-2 border-amber-500/30 text-amber-700 hover:bg-amber-500/10"
                onClick={() => window.open("https://app.jogg.ai/video-podcast?selectRadio=4", "_blank")}
              >
                <ExternalLink className="w-4 h-4" />
                {language === "de" ? "JoggAI Video Podcast öffnen" : "Open JoggAI Video Podcast"}
              </Button>
              <Link to="/podcast">
                <Button className="gap-2">
                  <Mic className="w-4 h-4" />
                  {language === "de" ? "Hier erstellen" : "Create Here"}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
