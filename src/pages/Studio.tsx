import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2, Sparkles, LayoutTemplate, User, Volume2, Play, Square,
  CheckCircle2, RefreshCw, ImageIcon, ChevronRight, ArrowLeft,
  Mic, Users, Monitor, Radio, ExternalLink, Video
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/i18n/LanguageContext";
import { joggAiService } from "@/lib/joggai";
import type { JoggAiAvatar, JoggAiVoice, JoggAiTemplate } from "@/lib/joggai";
import { cn } from "@/lib/utils";

// Podcast format options (like JoggAI's selectRadio)
const FORMATS = [
  { id: "talkshow", label: "Talk Show", labelDe: "Talkshow", icon: Monitor, desc: "Two speakers in split screen", descDe: "Zwei Sprecher im Splitscreen" },
  { id: "interview", label: "Interview", labelDe: "Interview", icon: Mic, desc: "Host interviews a guest", descDe: "Moderator interviewt einen Gast" },
  { id: "multi", label: "Multi Character", labelDe: "Multi-Charakter", icon: Users, desc: "Multiple AI avatars discussing", descDe: "Mehrere KI-Avatare diskutieren" },
  { id: "solo", label: "Solo Host", labelDe: "Solo-Moderator", icon: Radio, desc: "Single speaker podcast", descDe: "Einzelner Sprecher Podcast" },
] as const;

type FormatId = typeof FORMATS[number]["id"];

export default function Studio() {
  const { t, language } = useLanguage();
  const { toast } = useToast();

  // Format selection
  const [selectedFormat, setSelectedFormat] = useState<FormatId>("talkshow");

  // Templates
  const [allTemplates, setAllTemplates] = useState<JoggAiTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateFilter, setTemplateFilter] = useState<"all" | "podcast" | "talkshow" | "interview">("all");

  // Voices
  const [voices, setVoices] = useState<JoggAiVoice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [voiceSearch, setVoiceSearch] = useState("");
  const [voiceLangFilter, setVoiceLangFilter] = useState<"all" | "de" | "en" | "other">("all");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Avatars
  const [publicAvatars, setPublicAvatars] = useState<JoggAiAvatar[]>([]);
  const [photoAvatars, setPhotoAvatars] = useState<JoggAiAvatar[]>([]);
  const [loadingAvatars, setLoadingAvatars] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<"templates" | "voices" | "avatars">("templates");

  // Load everything on mount
  useEffect(() => {
    loadAll();
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const loadAll = async () => {
    loadTemplates();
    loadVoices();
    loadAvatars();
  };

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const templates = await joggAiService.getTemplates();
      setAllTemplates(templates);
    } catch (error) {
      console.warn("Could not load templates:", error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadVoices = async () => {
    setLoadingVoices(true);
    try {
      const v = await joggAiService.getVoices();
      setVoices(Array.isArray(v) ? v : []);
    } catch (error) {
      console.warn("Could not load voices:", error);
    } finally {
      setLoadingVoices(false);
    }
  };

  const loadAvatars = async () => {
    setLoadingAvatars(true);
    try {
      const [pub, photo] = await Promise.all([
        joggAiService.getPublicAvatars(),
        joggAiService.getPhotoAvatars(),
      ]);
      setPublicAvatars(Array.isArray(pub) ? pub : []);
      setPhotoAvatars(Array.isArray(photo) ? photo : []);
    } catch (error) {
      console.warn("Could not load avatars:", error);
    } finally {
      setLoadingAvatars(false);
    }
  };

  const playVoicePreview = (voiceId: string, previewUrl?: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (playingVoiceId === voiceId) {
      setPlayingVoiceId(null);
      return;
    }
    if (!previewUrl) return;
    const audio = new Audio(previewUrl);
    audioRef.current = audio;
    setPlayingVoiceId(voiceId);
    audio.play().catch(() => setPlayingVoiceId(null));
    audio.onended = () => { setPlayingVoiceId(null); audioRef.current = null; };
    audio.onerror = () => { setPlayingVoiceId(null); audioRef.current = null; };
  };

  // Filter templates
  const filteredTemplates = allTemplates.filter(tmpl => {
    if (templateFilter === "all") return true;
    const searchText = `${tmpl.name || ""} ${tmpl.category || ""} ${tmpl.description || ""} ${(tmpl.tags || []).join(" ")}`.toLowerCase();
    const keywords: Record<string, string[]> = {
      podcast: ["podcast", "dialogue", "conversation", "remote"],
      talkshow: ["talkshow", "talk show", "talk_show", "multi speaker", "multi character", "panel"],
      interview: ["interview", "host", "guest"],
    };
    return (keywords[templateFilter] || []).some(kw => searchText.includes(kw));
  });

  // Filter voices
  const filteredVoices = voices.filter(v => {
    const matchesSearch = !voiceSearch ||
      v.name?.toLowerCase().includes(voiceSearch.toLowerCase()) ||
      v.language?.toLowerCase().includes(voiceSearch.toLowerCase());
    if (!matchesSearch) return false;

    if (voiceLangFilter === "all") return true;
    if (voiceLangFilter === "de") return v.language?.startsWith("de") || v.name?.toLowerCase().includes("german");
    if (voiceLangFilter === "en") return v.language?.startsWith("en") || v.name?.toLowerCase().includes("english");
    return !v.language?.startsWith("de") && !v.language?.startsWith("en") &&
      !v.name?.toLowerCase().includes("german") && !v.name?.toLowerCase().includes("english");
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-1">
                <ArrowLeft className="w-4 h-4" />
                {language === "de" ? "Zurück" : "Back"}
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-lg font-bold">{language === "de" ? "Podcast Studio" : "Podcast Studio"}</span>
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

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Format Selector — like JoggAI's selectRadio */}
        <section>
          <h2 className="text-xl font-semibold mb-3">
            {language === "de" ? "Format wählen" : "Choose Format"}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {FORMATS.map((fmt) => {
              const Icon = fmt.icon;
              const isSelected = selectedFormat === fmt.id;
              return (
                <button
                  key={fmt.id}
                  onClick={() => setSelectedFormat(fmt.id)}
                  className={cn(
                    "relative p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02]",
                    isSelected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border/50 bg-card/50 hover:border-primary/40"
                  )}
                >
                  <Icon className={cn("w-6 h-6 mb-2", isSelected ? "text-primary" : "text-muted-foreground")} />
                  <p className="font-medium text-sm">{language === "de" ? fmt.labelDe : fmt.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{language === "de" ? fmt.descDe : fmt.desc}</p>
                  {isSelected && (
                    <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Main Content: Templates / Voices / Avatars */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
          <TabsList className="w-full max-w-md">
            <TabsTrigger value="templates" className="flex-1 gap-1">
              <LayoutTemplate className="w-3.5 h-3.5" />
              Templates {allTemplates.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] px-1 h-4">{allTemplates.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="voices" className="flex-1 gap-1">
              <Volume2 className="w-3.5 h-3.5" />
              {language === "de" ? "Stimmen" : "Voices"} {voices.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] px-1 h-4">{voices.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="avatars" className="flex-1 gap-1">
              <User className="w-3.5 h-3.5" />
              Avatars {(publicAvatars.length + photoAvatars.length) > 0 && <Badge variant="secondary" className="ml-1 text-[10px] px-1 h-4">{publicAvatars.length + photoAvatars.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* ========== TEMPLATES TAB ========== */}
          <TabsContent value="templates" className="space-y-4">
            {/* Filter bar */}
            <div className="flex flex-wrap gap-2">
              {(["all", "podcast", "talkshow", "interview"] as const).map((f) => {
                const labels: Record<string, { en: string; de: string }> = {
                  all: { en: "All Templates", de: "Alle Templates" },
                  podcast: { en: "Podcast", de: "Podcast" },
                  talkshow: { en: "Talk Show / Multi", de: "Talkshow / Multi" },
                  interview: { en: "Interview", de: "Interview" },
                };
                return (
                  <Button
                    key={f}
                    variant={templateFilter === f ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTemplateFilter(f)}
                    className="text-xs"
                  >
                    {language === "de" ? labels[f].de : labels[f].en}
                  </Button>
                );
              })}
              <Button variant="ghost" size="sm" onClick={loadTemplates} disabled={loadingTemplates} className="ml-auto gap-1 text-xs">
                <RefreshCw className={cn("w-3 h-3", loadingTemplates && "animate-spin")} />
                {language === "de" ? "Aktualisieren" : "Refresh"}
              </Button>
            </div>

            {/* Template grid */}
            {loadingTemplates && allTemplates.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                <span className="text-muted-foreground">{language === "de" ? "Templates werden geladen..." : "Loading templates..."}</span>
              </div>
            ) : filteredTemplates.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredTemplates.map((tmpl) => {
                  const tid = String(tmpl.template_id);
                  const isSelected = selectedTemplateId === tid;
                  return (
                    <button
                      key={tid}
                      onClick={() => setSelectedTemplateId(isSelected ? "" : tid)}
                      className={cn(
                        "relative rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.02] text-left group",
                        isSelected
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-border/50 hover:border-primary/40"
                      )}
                    >
                      <div className="aspect-video bg-muted">
                        {tmpl.cover_url ? (
                          <img
                            src={tmpl.cover_url}
                            alt={tmpl.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : tmpl.preview_url ? (
                          <img
                            src={tmpl.preview_url}
                            alt={tmpl.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <LayoutTemplate className="w-8 h-8 text-muted-foreground/50" />
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5">
                            <CheckCircle2 className="w-5 h-5 text-primary bg-background rounded-full" />
                          </div>
                        )}
                        {tmpl.tags && tmpl.tags.length > 0 && (
                          <div className="absolute bottom-1 left-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {tmpl.tags.slice(0, 2).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-[8px] px-1 py-0 h-3.5 bg-background/80 backdrop-blur-sm">{tag}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium truncate">{tmpl.name}</p>
                        {tmpl.description && (
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{tmpl.description}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <LayoutTemplate className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {language === "de"
                    ? "Keine Templates gefunden. Versuche einen anderen Filter."
                    : "No templates found. Try a different filter."}
                </p>
              </div>
            )}

            {/* Selected template detail */}
            {selectedTemplateId && (() => {
              const sel = allTemplates.find(t => String(t.template_id) === selectedTemplateId);
              return sel ? (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="py-4 flex gap-4 items-start">
                    {sel.cover_url && (
                      <img src={sel.cover_url} alt={sel.name} className="w-32 h-20 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">{sel.name}</h3>
                      {sel.description && <p className="text-xs text-muted-foreground mt-1">{sel.description}</p>}
                      {sel.tags && sel.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {sel.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-[10px] px-1.5 h-5">{tag}</Badge>
                          ))}
                        </div>
                      )}
                      {sel.aspect_ratio && (
                        <p className="text-[10px] text-muted-foreground mt-1">{language === "de" ? "Format" : "Aspect Ratio"}: {sel.aspect_ratio}</p>
                      )}
                    </div>
                    <Link to="/podcast">
                      <Button size="sm" className="gap-1 shrink-0">
                        {language === "de" ? "Verwenden" : "Use Template"}
                        <ChevronRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : null;
            })()}
          </TabsContent>

          {/* ========== VOICES TAB ========== */}
          <TabsContent value="voices" className="space-y-4">
            {/* Search and filter */}
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder={language === "de" ? "Stimmen suchen..." : "Search voices..."}
                value={voiceSearch}
                onChange={(e) => setVoiceSearch(e.target.value)}
                className="max-w-xs h-9"
              />
              {(["all", "de", "en", "other"] as const).map((f) => {
                const labels: Record<string, string> = {
                  all: language === "de" ? "Alle" : "All",
                  de: "Deutsch",
                  en: "English",
                  other: language === "de" ? "Andere" : "Other",
                };
                return (
                  <Button
                    key={f}
                    variant={voiceLangFilter === f ? "default" : "outline"}
                    size="sm"
                    onClick={() => setVoiceLangFilter(f)}
                    className="text-xs"
                  >
                    {labels[f]}
                  </Button>
                );
              })}
              <Button variant="ghost" size="sm" onClick={loadVoices} disabled={loadingVoices} className="ml-auto gap-1 text-xs">
                <RefreshCw className={cn("w-3 h-3", loadingVoices && "animate-spin")} />
              </Button>
            </div>

            {/* Voice list */}
            {loadingVoices && voices.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                <span className="text-muted-foreground">{language === "de" ? "Stimmen werden geladen..." : "Loading voices..."}</span>
              </div>
            ) : filteredVoices.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {filteredVoices.map((voice) => {
                  const isPlaying = playingVoiceId === voice.voice_id;
                  return (
                    <div
                      key={voice.voice_id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-card/80 transition-colors"
                    >
                      {/* Play button */}
                      <Button
                        variant={isPlaying ? "default" : "outline"}
                        size="sm"
                        className="h-9 w-9 p-0 shrink-0 rounded-full"
                        onClick={() => playVoicePreview(voice.voice_id, voice.preview_url)}
                        disabled={!voice.preview_url}
                      >
                        {isPlaying ? (
                          <Square className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5 ml-0.5" />
                        )}
                      </Button>

                      {/* Voice info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{voice.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {voice.language && (
                            <Badge variant="outline" className="text-[9px] px-1 h-4">{voice.language}</Badge>
                          )}
                          {voice.gender && (
                            <span className="text-[10px] text-muted-foreground capitalize">{voice.gender}</span>
                          )}
                        </div>
                      </div>

                      {/* Status indicator */}
                      {isPlaying && (
                        <div className="flex gap-0.5 items-end h-4">
                          <div className="w-0.5 bg-primary rounded-full animate-pulse" style={{ height: "8px", animationDelay: "0ms" }} />
                          <div className="w-0.5 bg-primary rounded-full animate-pulse" style={{ height: "14px", animationDelay: "150ms" }} />
                          <div className="w-0.5 bg-primary rounded-full animate-pulse" style={{ height: "10px", animationDelay: "300ms" }} />
                          <div className="w-0.5 bg-primary rounded-full animate-pulse" style={{ height: "16px", animationDelay: "100ms" }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <Volume2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {language === "de"
                    ? "Keine Stimmen gefunden. Versuche eine andere Suche."
                    : "No voices found. Try a different search."}
                </p>
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              {language === "de"
                ? `${filteredVoices.length} von ${voices.length} Stimmen angezeigt`
                : `Showing ${filteredVoices.length} of ${voices.length} voices`}
            </p>
          </TabsContent>

          {/* ========== AVATARS TAB ========== */}
          <TabsContent value="avatars" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">
                  {language === "de" ? "Verfügbare Avatare" : "Available Avatars"}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {publicAvatars.length + photoAvatars.length}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={loadAvatars} disabled={loadingAvatars} className="gap-1 text-xs">
                <RefreshCw className={cn("w-3 h-3", loadingAvatars && "animate-spin")} />
                {language === "de" ? "Aktualisieren" : "Refresh"}
              </Button>
            </div>

            {loadingAvatars && publicAvatars.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                <span className="text-muted-foreground">{language === "de" ? "Avatare werden geladen..." : "Loading avatars..."}</span>
              </div>
            ) : (
              <>
                {/* Photo avatars */}
                {photoAvatars.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {language === "de" ? "Deine Avatare" : "Your Avatars"} ({photoAvatars.length})
                    </h4>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                      {photoAvatars.map((avatar) => {
                        const imageUrl = avatar.cover_url || avatar.preview_url;
                        return (
                          <div key={`photo-${avatar.avatar_id}`} className="relative group rounded-xl overflow-hidden border-2 border-primary/30 bg-muted">
                            <div className="aspect-square">
                              {imageUrl ? (
                                <img src={imageUrl} alt={avatar.name || "Avatar"} className="w-full h-full object-cover" loading="lazy" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <User className="w-6 h-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <p className="text-[9px] truncate px-1 py-0.5 text-center bg-background/80">{avatar.name || "Avatar"}</p>
                            <Badge variant="default" className="absolute top-0.5 right-0.5 text-[7px] px-1 py-0 h-3">
                              {language === "de" ? "Eigener" : "Custom"}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Public avatars */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {language === "de" ? "Öffentliche Avatare" : "Public Avatars"} ({publicAvatars.length})
                  </h4>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                    {publicAvatars.map((avatar) => {
                      const imageUrl = avatar.cover_url || avatar.preview_url;
                      return (
                        <div key={`pub-${avatar.avatar_id}`} className="relative group rounded-xl overflow-hidden border border-border/50 bg-muted hover:border-primary/40 transition-colors">
                          <div className="aspect-square">
                            {imageUrl ? (
                              <img src={imageUrl} alt={avatar.name || "Avatar"} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <User className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <p className="text-[9px] truncate px-1 py-0.5 text-center bg-background/80">{avatar.name || `#${avatar.avatar_id}`}</p>
                          {avatar.gender && (
                            <Badge variant="outline" className="absolute top-0.5 right-0.5 text-[7px] px-0.5 py-0 h-3 bg-background/80">
                              {avatar.gender === "male" ? "♂" : avatar.gender === "female" ? "♀" : ""}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Bottom CTA */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
          <CardContent className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold">
                {language === "de" ? "Bereit einen Podcast zu erstellen?" : "Ready to create a podcast?"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === "de"
                  ? "Wähle deine Sprecher, Stimmen und ein Template — dann los!"
                  : "Pick your speakers, voices and a template — then go!"}
              </p>
            </div>
            <div className="flex gap-2">
              <Link to="/podcast">
                <Button className="gap-2">
                  <Mic className="w-4 h-4" />
                  {language === "de" ? "Podcast erstellen" : "Create Podcast"}
                </Button>
              </Link>
              <Link to="/ads">
                <Button variant="outline" className="gap-2">
                  <Video className="w-4 h-4" />
                  {language === "de" ? "Ad erstellen" : "Create Ad"}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
