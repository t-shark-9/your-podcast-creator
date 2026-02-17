import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Loader2,
  Video,
  Download,
  ExternalLink,
  Play,
  CheckCircle2,
  RefreshCw,
  LogIn,
  Pencil,
  Type,
  User,
  Wand2,
  Upload,
  Plus,
  Trash2,
  Clock,
  AlertCircle,
  ChevronRight,
  Link as LinkIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/i18n/LanguageContext";
import tavusService from "@/lib/tavus";
import type { TavusReplica, TavusVideo } from "@/lib/tavus";
import { cn } from "@/lib/utils";

type AdStatus = "draft" | "generating_video" | "completed" | "failed";

export default function TavusAdGenerator() {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<AdStatus>("draft");
  const [progress, setProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoId, setVideoId] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [hostedUrl, setHostedUrl] = useState("");
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const [isImproving, setIsImproving] = useState(false);

  // Replica state
  const [replicas, setReplicas] = useState<TavusReplica[]>([]);
  const [loadingReplicas, setLoadingReplicas] = useState(false);
  const [selectedReplicaId, setSelectedReplicaId] = useState("");
  const [selectedReplicaName, setSelectedReplicaName] = useState("");
  const [selectedReplicaThumb, setSelectedReplicaThumb] = useState("");

  // Create replica dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [trainVideoUrl, setTrainVideoUrl] = useState("");
  const [consentVideoUrl, setConsentVideoUrl] = useState("");
  const [newReplicaName, setNewReplicaName] = useState("");
  const [isCreatingReplica, setIsCreatingReplica] = useState(false);

  // Replica browser modal
  const [replicaModalOpen, setReplicaModalOpen] = useState(false);

  const { toast } = useToast();
  const { t, language } = useLanguage();

  // Load replicas on mount
  useEffect(() => {
    loadReplicas();
    // Restore selected replica from localStorage
    const savedId = localStorage.getItem("tavus_replica_id");
    if (savedId) {
      setSelectedReplicaId(savedId);
      setSelectedReplicaName(localStorage.getItem("tavus_replica_name") || "");
      setSelectedReplicaThumb(localStorage.getItem("tavus_replica_thumb") || "");
    }
  }, []);

  useEffect(() => {
    if (status === "generating_video") {
      const interval = setInterval(() => {
        setProgress((prev) => (prev >= 95 ? prev : prev + Math.random() * 3));
      }, 2000);
      return () => clearInterval(interval);
    } else if (status === "completed") {
      setProgress(100);
    }
  }, [status]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  const loadReplicas = async () => {
    setLoadingReplicas(true);
    try {
      const list = await tavusService.listReplicas();
      setReplicas(list);
    } catch (err) {
      console.error("Error loading replicas:", err);
      toast({
        title: language === "de" ? "Fehler" : "Error",
        description: err instanceof Error ? err.message : "Could not load replicas",
        variant: "destructive",
      });
    } finally {
      setLoadingReplicas(false);
    }
  };

  // ---- Create Replica ----
  const handleCreateReplica = async () => {
    if (!trainVideoUrl.trim()) {
      toast({
        title: language === "de" ? "URL fehlt" : "URL missing",
        description: language === "de" ? "Bitte gib die URL deines Trainingsvideos ein" : "Please enter your training video URL",
        variant: "destructive",
      });
      return;
    }
    setIsCreatingReplica(true);
    try {
      const result = await tavusService.createReplica({
        train_video_url: trainVideoUrl.trim(),
        consent_video_url: consentVideoUrl.trim() || undefined,
        replica_name: newReplicaName.trim() || "My Replica",
      });
      toast({
        title: language === "de" ? "Replica erstellt!" : "Replica created!",
        description: language === "de"
          ? `Training gestartet (ID: ${result.replica_id}). Das dauert 4-6 Stunden.`
          : `Training started (ID: ${result.replica_id}). This takes 4-6 hours.`,
      });
      setCreateDialogOpen(false);
      setTrainVideoUrl("");
      setConsentVideoUrl("");
      setNewReplicaName("");
      // Refresh replicas list
      await loadReplicas();
    } catch (err) {
      console.error("Error creating replica:", err);
      toast({
        title: language === "de" ? "Fehler" : "Error",
        description: err instanceof Error ? err.message : "Could not create replica",
        variant: "destructive",
      });
    } finally {
      setIsCreatingReplica(false);
    }
  };

  // ---- Select Replica ----
  const selectReplica = (replica: TavusReplica) => {
    setSelectedReplicaId(replica.replica_id);
    setSelectedReplicaName(replica.replica_name || replica.replica_id);
    setSelectedReplicaThumb(replica.thumbnail_video_url || "");
    localStorage.setItem("tavus_replica_id", replica.replica_id);
    localStorage.setItem("tavus_replica_name", replica.replica_name || replica.replica_id);
    localStorage.setItem("tavus_replica_thumb", replica.thumbnail_video_url || "");
    setReplicaModalOpen(false);
  };

  // ---- AI improve ----
  const improveMonologue = async () => {
    if (!prompt.trim()) return;
    setIsImproving(true);
    try {
      const { data, error } = await supabase.functions.invoke("optimize-podcast-script", {
        body: {
          script: prompt.trim(),
          instruction: language === "de"
            ? "Verbessere diesen Monolog: Mache ihn natürlicher, überzeugender und professioneller. Behalte die Kernaussage bei, aber optimiere Formulierung, Rhythmus und Wirkung. Gib nur den verbesserten Text zurück, ohne Erklärungen."
            : "Improve this monologue: Make it more natural, compelling and professional. Keep the core message but optimize wording, rhythm and impact. Return only the improved text, without explanations.",
          type: "edit",
        },
      });
      if (error) throw error;
      const improved = data.optimizedScript || data.script;
      if (improved) {
        setPrompt(improved);
        toast({ title: t("ads.improved"), description: t("ads.improved.desc") });
      }
    } catch (error) {
      console.error("Error improving monologue:", error);
      toast({ title: t("common.error"), description: error instanceof Error ? error.message : "Could not improve monologue", variant: "destructive" });
    } finally {
      setIsImproving(false);
    }
  };

  // ---- Generate video ----
  const generateVideo = async () => {
    if (!prompt.trim()) {
      toast({
        title: language === "de" ? "Skript fehlt" : "Script missing",
        description: language === "de" ? "Bitte schreibe ein Skript für dein Video" : "Please write a script for your video",
        variant: "destructive",
      });
      return;
    }

    if (!selectedReplicaId) {
      toast({
        title: language === "de" ? "Replica fehlt" : "Replica missing",
        description: language === "de" ? "Bitte wähle oder erstelle zuerst eine Replica" : "Please select or create a replica first",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setStatus("generating_video");
    setProgress(0);

    try {
      const result = await tavusService.createVideo({
        replica_id: selectedReplicaId,
        script: prompt.trim(),
        video_name: "Tavus Ad - " + new Date().toISOString().split("T")[0],
      });

      const newVideoId = result.video_id;
      setVideoId(newVideoId);
      if (result.hosted_url) setHostedUrl(result.hosted_url);

      toast({
        title: language === "de" ? "Video wird generiert..." : "Generating video...",
        description: language === "de" ? "Das kann einige Minuten dauern" : "This may take a few minutes",
      });

      pollVideoStatus(newVideoId);
    } catch (error) {
      console.error("Error generating video:", error);
      toast({
        title: language === "de" ? "Fehler" : "Error",
        description: error instanceof Error ? error.message : "Video generation failed",
        variant: "destructive",
      });
      setStatus("failed");
      setIsGenerating(false);
    }
  };

  const pollVideoStatus = (vid: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    const interval = setInterval(async () => {
      try {
        const videoData = await tavusService.getVideo(vid);
        console.log("Tavus video poll:", videoData.status, videoData);

        if (videoData.status === "ready") {
          clearInterval(interval);
          pollingRef.current = null;
          if (videoData.download_url) setVideoUrl(videoData.download_url);
          if (videoData.hosted_url) setHostedUrl(videoData.hosted_url);
          setStatus("completed");
          setIsGenerating(false);
          toast({
            title: language === "de" ? "Video fertig!" : "Video ready!",
            description: language === "de" ? "Dein Video wurde erfolgreich generiert" : "Your video has been generated successfully",
          });
        } else if (videoData.status === "error" || videoData.status === "deleted") {
          clearInterval(interval);
          pollingRef.current = null;
          setStatus("failed");
          setIsGenerating(false);
          toast({
            title: language === "de" ? "Fehler" : "Error",
            description: videoData.status_details || "Video generation failed",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 8000);

    pollingRef.current = interval;
  };

  const downloadVideo = () => {
    if (videoUrl) {
      const a = document.createElement("a");
      a.href = videoUrl;
      a.download = "tavus-ad-" + new Date().toISOString().split("T")[0] + ".mp4";
      a.click();
    }
  };

  const resetProject = () => {
    setPrompt("");
    setStatus("draft");
    setProgress(0);
    setVideoId("");
    setVideoUrl("");
    setHostedUrl("");
    setIsGenerating(false);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case "draft": return language === "de" ? "Entwurf" : "Draft";
      case "generating_video": return language === "de" ? "Generiert..." : "Generating...";
      case "completed": return language === "de" ? "Fertig" : "Completed";
      case "failed": return language === "de" ? "Fehlgeschlagen" : "Failed";
      default: return status;
    }
  };

  const getReplicaStatusBadge = (r: TavusReplica) => {
    if (r.status === "completed") return <Badge className="bg-green-500/10 text-green-500 border-green-500/30 text-[10px]">Ready</Badge>;
    if (r.status === "started") return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30 text-[10px]">{r.training_progress || "Training..."}</Badge>;
    return <Badge variant="destructive" className="text-[10px]">Error</Badge>;
  };

  const completedReplicas = replicas.filter((r) => r.status === "completed");
  const userReplicas = replicas.filter((r) => r.replica_type === "user" || !r.replica_type);
  const stockReplicas = replicas.filter((r) => r.replica_type === "system");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold">
                {language === "de" ? "Tavus Ad Generator" : "Tavus Ad Generator"}
              </h1>
              <Badge variant="secondary">{getStatusLabel()}</Badge>
              <Badge variant="outline" className="text-[10px]">Tavus AI</Badge>
            </div>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <Link to="/auth">
                <Button variant="ghost" size="sm" className="gap-2">
                  <LogIn className="w-4 h-4" />
                  {t("nav.login")}
                </Button>
              </Link>
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  {t("nav.home")}
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={resetProject}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {language === "de" ? "Neustart" : "Restart"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">

            {/* Step 1: Replica Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">1</span>
                  {language === "de" ? "Deine Replica" : "Your Replica"}
                </CardTitle>
                <CardDescription>
                  {language === "de"
                    ? "Wähle eine existierende Replica oder erstelle eine neue aus einem Video von dir"
                    : "Choose an existing replica or create a new one from a video of yourself"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Selected replica display / picker */}
                <button
                  onClick={() => setReplicaModalOpen(true)}
                  disabled={status !== "draft"}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left group",
                    selectedReplicaId
                      ? "border-primary/30 bg-primary/5 hover:border-primary/50"
                      : "border-dashed border-border hover:border-primary/40 hover:bg-muted/30",
                    status !== "draft" && "opacity-60 cursor-not-allowed"
                  )}
                >
                  <div className={cn(
                    "w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden",
                    selectedReplicaThumb ? "" : "bg-muted flex items-center justify-center"
                  )}>
                    {selectedReplicaThumb ? (
                      <video src={selectedReplicaThumb} className="w-full h-full object-cover" muted />
                    ) : (
                      <User className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Replica</p>
                    <p className="text-sm font-medium">
                      {selectedReplicaName || (language === "de" ? "Keine Replica ausgewählt" : "No replica selected")}
                    </p>
                    <p className="text-xs text-primary font-medium mt-0.5 group-hover:underline">
                      {language === "de" ? "Replica wählen" : "Choose replica"} {"\u2192"}
                    </p>
                  </div>
                  {selectedReplicaId ? (
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors" />
                  )}
                </button>

                {/* Quick create */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => setCreateDialogOpen(true)}
                  disabled={status !== "draft"}
                >
                  <Plus className="w-4 h-4" />
                  {language === "de" ? "Neue Replica erstellen (von Video)" : "Create New Replica (from video)"}
                </Button>
              </CardContent>
            </Card>

            {/* Step 2: Script / Prompt */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">2</span>
                  {language === "de" ? "Skript schreiben" : "Write Script"}
                </CardTitle>
                <CardDescription>
                  {language === "de"
                    ? "Schreibe den Text, den deine Replica sprechen soll"
                    : "Write the text that your replica will speak"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder={
                    language === "de"
                      ? "z.B. Hallo! Heute möchte ich euch etwas Spannendes zeigen..."
                      : "e.g. Hey everyone! Today I want to show you something exciting..."
                  }
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[100px]"
                  disabled={status !== "draft"}
                />

                {prompt.trim().length > 10 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={improveMonologue}
                    disabled={isImproving || status !== "draft"}
                    className="gap-2 w-full sm:w-auto"
                  >
                    {isImproving ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />{language === "de" ? "Verbessere..." : "Improving..."}</>
                    ) : (
                      <><Wand2 className="w-4 h-4" />{language === "de" ? "Skript verbessern" : "Improve Script"}</>
                    )}
                  </Button>
                )}

                {selectedReplicaId && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="w-3 h-3" />
                    {language === "de" ? "Replica:" : "Replica:"}
                    <Badge variant="secondary" className="text-[10px]">{selectedReplicaName}</Badge>
                  </div>
                )}

                <Button
                  onClick={generateVideo}
                  disabled={isGenerating || !prompt.trim() || !selectedReplicaId || status === "generating_video"}
                  className="w-full gap-2"
                  size="lg"
                >
                  {isGenerating || status === "generating_video" ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />{language === "de" ? "Generiert..." : "Generating..."}</>
                  ) : (
                    <><Video className="w-4 h-4" />{language === "de" ? "Video generieren" : "Generate Video"}</>
                  )}
                </Button>

                {status === "generating_video" && (
                  <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center">
                      {language === "de" ? "Dein Video wird generiert, bitte warte..." : "Your video is being generated, please wait..."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Completed */}
            {status === "completed" && videoId && (
              <Card className="border-green-500/30 bg-green-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    {language === "de" ? "Video fertig!" : "Video Ready!"}
                  </CardTitle>
                  <CardDescription>
                    {language === "de"
                      ? "Dein Video wurde erfolgreich generiert."
                      : "Your video has been generated successfully."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {hostedUrl && (
                    <Button className="w-full gap-2" size="lg" onClick={() => window.open(hostedUrl, "_blank")}>
                      <ExternalLink className="w-4 h-4" />
                      {language === "de" ? "Video auf Tavus ansehen" : "View on Tavus"}
                    </Button>
                  )}
                  <div className="flex gap-2">
                    {videoUrl && (
                      <>
                        <Button variant="outline" className="flex-1 gap-2" onClick={() => window.open(videoUrl, "_blank")}>
                          <Play className="w-4 h-4" />
                          {language === "de" ? "Video ansehen" : "Watch Video"}
                        </Button>
                        <Button variant="outline" className="flex-1 gap-2" onClick={downloadVideo}>
                          <Download className="w-4 h-4" />
                          Download
                        </Button>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground text-center break-all">Video ID: {videoId}</p>
                </CardContent>
              </Card>
            )}

            {/* Failed */}
            {status === "failed" && (
              <Card className="border-red-500/30 bg-red-500/5">
                <CardContent className="pt-6 space-y-4">
                  <p className="text-sm text-red-500">
                    {language === "de"
                      ? "Video-Generierung fehlgeschlagen. Bitte versuche es erneut."
                      : "Video generation failed. Please try again."}
                  </p>
                  <Button onClick={resetProject} className="w-full">{language === "de" ? "Neustart" : "Restart"}</Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-base">{language === "de" ? "Vorschau" : "Preview"}</CardTitle>
              </CardHeader>
              <CardContent>
                {videoUrl ? (
                  <div className="space-y-4">
                    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                      <video src={videoUrl} controls className="w-full h-full" />
                    </div>
                    <div className="flex gap-2">
                      {hostedUrl && (
                        <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => window.open(hostedUrl, "_blank")}>
                          <ExternalLink className="w-3 h-3" />
                          Tavus
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={downloadVideo}>
                        <Download className="w-3 h-3" />
                        Download
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{language === "de" ? "Noch kein Video" : "No video yet"}</p>
                      <p className="text-xs">{language === "de" ? "Generiere ein Video um es hier zu sehen" : "Generate a video to see it here"}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Workflow */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{language === "de" ? "Ablauf" : "Workflow"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(() => {
                    const steps = [
                      { label: language === "de" ? "Replica wählen" : "Choose Replica", icon: User },
                      { label: language === "de" ? "Skript eingeben" : "Enter Script", icon: Type },
                      { label: language === "de" ? "Video generieren" : "Generate Video", icon: Video },
                      { label: language === "de" ? "Herunterladen" : "Download", icon: CheckCircle2 },
                    ];

                    let activeIndex = 0;
                    if (status === "draft") {
                      if (selectedReplicaId) activeIndex = 1;
                      if (selectedReplicaId && prompt.trim()) activeIndex = 1;
                    } else if (status === "generating_video") {
                      activeIndex = 2;
                    } else if (status === "completed") {
                      activeIndex = 3;
                    }

                    return steps.map((step, index) => {
                      const Icon = step.icon;
                      const isActive = index === activeIndex;
                      const isCompleted = index < activeIndex;
                      return (
                        <div
                          key={index}
                          className={"flex items-center gap-3 p-2 rounded-lg transition-colors " + (isActive ? "bg-primary/10" : isCompleted ? "bg-green-500/10" : "")}
                        >
                          <div className={"w-6 h-6 rounded-full flex items-center justify-center " + (isCompleted ? "bg-green-500 text-white" : isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                            {isCompleted ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : isActive && status === "generating_video" ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Icon className="w-3 h-3" />
                            )}
                          </div>
                          <span className={"text-sm " + (isActive ? "font-medium" : isCompleted ? "text-muted-foreground" : "")}>
                            {step.label}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Info card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {language === "de" ? "Über Tavus" : "About Tavus"}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>
                  {language === "de"
                    ? "Tavus erstellt eine KI-Replica von dir aus einem 2-minütigen Video. Diese Replica kann dann beliebige Texte sprechen."
                    : "Tavus creates an AI replica of you from a 2-minute video. This replica can then speak any text."}
                </p>
                <p className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {language === "de"
                    ? "Replica-Training dauert 4-6 Stunden"
                    : "Replica training takes 4-6 hours"}
                </p>
                <p>
                  {language === "de"
                    ? "Video-Anforderungen: min. 1080p, 2 Min (1 Min sprechen + 1 Min zuhören), gute Beleuchtung, ruhiger Hintergrund."
                    : "Video requirements: min. 1080p, 2 min (1 min speaking + 1 min listening), good lighting, quiet background."}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Replica Browser Modal */}
      <Dialog open={replicaModalOpen} onOpenChange={setReplicaModalOpen}>
        <DialogContent className="w-[95vw] max-w-4xl h-[95vh] max-h-[95vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <DialogTitle>{language === "de" ? "Replica auswählen" : "Select Replica"}</DialogTitle>
            <DialogDescription>
              {language === "de"
                ? "Wähle eine fertige Replica oder erstelle eine neue"
                : "Choose a trained replica or create a new one"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">

                {/* Create new */}
                <button
                  onClick={() => { setReplicaModalOpen(false); setCreateDialogOpen(true); }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Plus className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{language === "de" ? "Neue Replica erstellen" : "Create New Replica"}</p>
                    <p className="text-xs text-muted-foreground">
                      {language === "de"
                        ? "Lade ein 2-Minuten-Video von dir hoch um eine KI-Replica zu trainieren"
                        : "Upload a 2-minute video of yourself to train an AI replica"}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 group-hover:text-primary" />
                </button>

                {loadingReplicas && (
                  <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {language === "de" ? "Replicas laden..." : "Loading replicas..."}
                  </div>
                )}

                {/* User replicas */}
                {userReplicas.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      {language === "de" ? "Deine Replicas" : "Your Replicas"}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {userReplicas.map((replica) => (
                        <button
                          key={replica.replica_id}
                          onClick={() => replica.status === "completed" && selectReplica(replica)}
                          disabled={replica.status !== "completed"}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                            selectedReplicaId === replica.replica_id
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : replica.status === "completed"
                              ? "border-border/50 hover:border-primary/40 hover:bg-muted/30"
                              : "border-border/30 opacity-60 cursor-not-allowed",
                          )}
                        >
                          <div className="w-12 h-12 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                            {replica.thumbnail_video_url ? (
                              <video src={replica.thumbnail_video_url} className="w-full h-full object-cover" muted />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <User className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{replica.replica_name || replica.replica_id}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {getReplicaStatusBadge(replica)}
                              {replica.created_at && (
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(replica.created_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          {selectedReplicaId === replica.replica_id && (
                            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stock replicas */}
                {stockReplicas.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      {language === "de" ? "Stock Replicas" : "Stock Replicas"}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {stockReplicas.map((replica) => (
                        <button
                          key={replica.replica_id}
                          onClick={() => replica.status === "completed" && selectReplica(replica)}
                          disabled={replica.status !== "completed"}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                            selectedReplicaId === replica.replica_id
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "border-border/50 hover:border-primary/40 hover:bg-muted/30",
                          )}
                        >
                          <div className="w-12 h-12 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                            {replica.thumbnail_video_url ? (
                              <video src={replica.thumbnail_video_url} className="w-full h-full object-cover" muted />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <User className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{replica.replica_name || replica.replica_id}</p>
                            {getReplicaStatusBadge(replica)}
                          </div>
                          {selectedReplicaId === replica.replica_id && (
                            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!loadingReplicas && replicas.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <User className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-medium">{language === "de" ? "Keine Replicas gefunden" : "No replicas found"}</p>
                    <p className="text-xs mt-1">
                      {language === "de"
                        ? "Erstelle deine erste Replica mit einem Video von dir"
                        : "Create your first replica with a video of yourself"}
                    </p>
                  </div>
                )}

                {/* Refresh */}
                <div className="flex justify-center pt-2">
                  <Button variant="ghost" size="sm" onClick={loadReplicas} disabled={loadingReplicas} className="gap-2">
                    <RefreshCw className={cn("w-4 h-4", loadingReplicas && "animate-spin")} />
                    {language === "de" ? "Aktualisieren" : "Refresh"}
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Replica Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              {language === "de" ? "Neue Replica erstellen" : "Create New Replica"}
            </DialogTitle>
            <DialogDescription>
              {language === "de"
                ? "Gib die URL deines Trainingsvideos ein. Das Video muss öffentlich zugänglich sein (z.B. S3, Google Drive Link etc.)."
                : "Enter the URL of your training video. The video must be publicly accessible (e.g. S3, Google Drive link etc.)."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{language === "de" ? "Name der Replica" : "Replica Name"}</label>
              <Input
                placeholder={language === "de" ? "z.B. Mein Avatar" : "e.g. My Avatar"}
                value={newReplicaName}
                onChange={(e) => setNewReplicaName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <LinkIcon className="w-3 h-3" />
                {language === "de" ? "Trainingsvideo URL *" : "Training Video URL *"}
              </label>
              <Input
                placeholder="https://example.com/my-training-video.mp4"
                value={trainVideoUrl}
                onChange={(e) => setTrainVideoUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {language === "de"
                  ? "2 Min Video: 1 Min sprechen + 1 Min zuhören. Min. 1080p, MP4/WebM Format."
                  : "2 min video: 1 min speaking + 1 min listening. Min 1080p, MP4/WebM format."}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <LinkIcon className="w-3 h-3" />
                {language === "de" ? "Consent Video URL (optional)" : "Consent Video URL (optional)"}
              </label>
              <Input
                placeholder="https://example.com/my-consent-video.mp4"
                value={consentVideoUrl}
                onChange={(e) => setConsentVideoUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {language === "de"
                  ? "Für persönliche Replicas: Sage 'I, [Name], give consent to Tavus to create an AI clone of me...'"
                  : "For personal replicas: Say 'I, [Name], give consent to Tavus to create an AI clone of me...'"}
              </p>
            </div>

            {/* Video requirements info */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="text-xs font-semibold">{language === "de" ? "Video-Anforderungen:" : "Video Requirements:"}</p>
              <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                <li>{language === "de" ? "Ruhiger, gut beleuchteter Raum" : "Quiet, well-lit room"}</li>
                <li>{language === "de" ? "Kamera auf Augenhöhe, Gesicht füllt min. 25% des Bildes" : "Camera at eye level, face fills at least 25% of frame"}</li>
                <li>{language === "de" ? "Min. 1080p Auflösung" : "Min. 1080p resolution"}</li>
                <li>{language === "de" ? "1 Min sprechen + 1 Min ruhig zuhören" : "1 min speaking + 1 min quietly listening"}</li>
                <li>{language === "de" ? "Keine Hüte, Schals oder Accessoires" : "No hats, scarves, or accessories"}</li>
              </ul>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setCreateDialogOpen(false)}>
                {language === "de" ? "Abbrechen" : "Cancel"}
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleCreateReplica}
                disabled={isCreatingReplica || !trainVideoUrl.trim()}
              >
                {isCreatingReplica ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />{language === "de" ? "Erstelle..." : "Creating..."}</>
                ) : (
                  <><Upload className="w-4 h-4" />{language === "de" ? "Replica erstellen" : "Create Replica"}</>
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" />
              {language === "de"
                ? "Training dauert ca. 4-6 Stunden"
                : "Training takes approximately 4-6 hours"}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
