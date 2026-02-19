import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  Wand2,
  Loader2,
  Download,
  X,
  Image as ImageIcon,
  Film,
  User,
  MessageSquare,
  Settings,
  Clock,
  Layers,
  RefreshCw,
  Check,
  Plus,
  Trash2,
  Play,
  Pause,
  Save,
  Edit3,
  Scissors,
  FileVideo,
  Monitor,
  Type,
} from "lucide-react";
import {
  createTextToVideo,
  createImageToVideo,
  pollForCompletion,
  fileToBase64,
  MODEL_OPTIONS,
  KlingModel,
  KlingMode,
  KlingAspectRatio,
  KlingDuration,
} from "@/lib/kling";

// Types
interface SavedAvatar {
  id: string;
  name: string;
  imageUrl: string;
  prompt?: string;
  createdAt: string;
}

interface SceneAsset {
  id: string;
  type: "background" | "screen";
  imageUrl: string;
  name: string;
}

interface DialogueSegment {
  id: string;
  text: string;
  duration: number; // estimated seconds
}

interface GeneratedVideo {
  id: string;
  url: string;
  duration: number;
  segmentIndex: number;
}

type WorkflowStep = "avatar" | "preview" | "scene" | "dialogue" | "settings" | "generate" | "finish";

const STEPS: { id: WorkflowStep; label: string; icon: React.ReactNode }[] = [
  { id: "avatar", label: "Avatar", icon: <User className="h-4 w-4" /> },
  { id: "preview", label: "Preview", icon: <Check className="h-4 w-4" /> },
  { id: "scene", label: "Scene", icon: <Layers className="h-4 w-4" /> },
  { id: "dialogue", label: "Dialogue", icon: <MessageSquare className="h-4 w-4" /> },
  { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
  { id: "generate", label: "Generate", icon: <Film className="h-4 w-4" /> },
  { id: "finish", label: "Finish", icon: <Download className="h-4 w-4" /> },
];

// Models that support 15 second videos
const LONG_VIDEO_MODELS: KlingModel[] = ["kling-3.0", "veo-3.1", "sora-2-pro"];

const AVATARS_KEY = "saved-avatars";
const WORKFLOW_KEY = "workflow-state";

// Estimate speaking duration (roughly 150 words per minute)
function estimateDialogueDuration(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(3, Math.ceil((words / 150) * 60));
}

// Split dialogue into segments
function splitDialogue(text: string, maxDuration: number): DialogueSegment[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const segments: DialogueSegment[] = [];
  let currentSegment = "";
  let currentDuration = 0;

  for (const sentence of sentences) {
    const sentenceDuration = estimateDialogueDuration(sentence);
    
    if (currentDuration + sentenceDuration > maxDuration && currentSegment) {
      segments.push({
        id: `seg-${segments.length}`,
        text: currentSegment.trim(),
        duration: currentDuration,
      });
      currentSegment = sentence;
      currentDuration = sentenceDuration;
    } else {
      currentSegment += sentence;
      currentDuration += sentenceDuration;
    }
  }

  if (currentSegment.trim()) {
    segments.push({
      id: `seg-${segments.length}`,
      text: currentSegment.trim(),
      duration: currentDuration,
    });
  }

  return segments;
}

export default function VideoWorkflow() {
  // Current step
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("avatar");
  const [completedSteps, setCompletedSteps] = useState<Set<WorkflowStep>>(new Set());

  // Avatar state
  const [avatarMode, setAvatarMode] = useState<"prompt" | "image" | "video">("prompt");
  const [avatarPrompt, setAvatarPrompt] = useState("");
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [avatarVideo, setAvatarVideo] = useState<string | null>(null);
  const [generatedAvatar, setGeneratedAvatar] = useState<string | null>(null);
  const [avatarName, setAvatarName] = useState("");
  const [savedAvatars, setSavedAvatars] = useState<SavedAvatar[]>([]);
  const [selectedSavedAvatar, setSelectedSavedAvatar] = useState<string | null>(null);

  // Scene assets
  const [sceneAssets, setSceneAssets] = useState<SceneAsset[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [screenOverlays, setScreenOverlays] = useState<string[]>([]);

  // Dialogue
  const [dialogue, setDialogue] = useState("");
  const [dialogueSegments, setDialogueSegments] = useState<DialogueSegment[]>([]);

  // Settings
  const [model, setModel] = useState<KlingModel>("kling-3.0");
  const [qualityMode, setQualityMode] = useState<KlingMode>("std");
  const [aspectRatio, setAspectRatio] = useState<KlingAspectRatio>("16:9");
  const [videoLength, setVideoLength] = useState<"single" | "multi">("single");
  const [singleVideoDuration, setSingleVideoDuration] = useState<number>(5);
  const [totalDuration, setTotalDuration] = useState<number>(0);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState("");
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([]);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);

  // Post-processing
  const [showCaptions, setShowCaptions] = useState(false);
  const [captionStyle, setCaptionStyle] = useState<"bottom" | "dynamic">("bottom");

  // Refs
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const screenInputRef = useRef<HTMLInputElement>(null);

  // Load saved avatars
  useEffect(() => {
    const saved = localStorage.getItem(AVATARS_KEY);
    if (saved) {
      try {
        setSavedAvatars(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load avatars:", e);
      }
    }
  }, []);

  // Calculate total duration when dialogue changes
  useEffect(() => {
    const duration = estimateDialogueDuration(dialogue);
    setTotalDuration(duration);
    
    // Check if we need multi-video mode
    const maxDuration = LONG_VIDEO_MODELS.includes(model) ? 15 : 8;
    if (duration > maxDuration) {
      setVideoLength("multi");
      setDialogueSegments(splitDialogue(dialogue, maxDuration));
    } else {
      setDialogueSegments([{ id: "single", text: dialogue, duration }]);
    }
  }, [dialogue, model]);

  // Navigation
  const goToStep = (step: WorkflowStep) => {
    setCurrentStep(step);
  };

  const nextStep = () => {
    const currentIndex = STEPS.findIndex((s) => s.id === currentStep);
    if (currentIndex < STEPS.length - 1) {
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      setCurrentStep(STEPS[currentIndex + 1].id);
    }
  };

  const prevStep = () => {
    const currentIndex = STEPS.findIndex((s) => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].id);
    }
  };

  // Avatar handling
  const handleAvatarImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      setAvatarImage(base64);
      setGeneratedAvatar(base64);
    }
  };

  const handleAvatarVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarVideo(url);
    }
  };

  const generateAvatarFromPrompt = async () => {
    if (!avatarPrompt) return;
    setIsGenerating(true);
    setGenerationStatus("Generating avatar from prompt...");
    
    try {
      // Use text-to-image generation for avatar
      // For now, we'll simulate this - in production, use DALL-E or similar
      const result = await createTextToVideo({
        model,
        mode: qualityMode,
        prompt: `Portrait photo of ${avatarPrompt}, professional headshot, neutral background, high quality`,
        aspectRatio: "1:1",
        duration: "5",
      });
      
      const completed = await pollForCompletion(result.taskId);
      if (completed.videoUrl) {
        // Extract first frame as avatar
        setGeneratedAvatar(completed.videoUrl);
      }
    } catch (error) {
      console.error("Failed to generate avatar:", error);
      setGenerationStatus("Failed to generate avatar");
    } finally {
      setIsGenerating(false);
    }
  };

  const selectSavedAvatar = (avatar: SavedAvatar) => {
    setSelectedSavedAvatar(avatar.id);
    setGeneratedAvatar(avatar.imageUrl);
    setAvatarName(avatar.name);
  };

  const saveAvatar = () => {
    if (!generatedAvatar || !avatarName) return;
    
    const newAvatar: SavedAvatar = {
      id: Date.now().toString(),
      name: avatarName,
      imageUrl: generatedAvatar,
      prompt: avatarPrompt,
      createdAt: new Date().toISOString(),
    };
    
    const updated = [newAvatar, ...savedAvatars].slice(0, 20);
    setSavedAvatars(updated);
    localStorage.setItem(AVATARS_KEY, JSON.stringify(updated));
    setSelectedSavedAvatar(newAvatar.id);
  };

  const deleteAvatar = (id: string) => {
    const updated = savedAvatars.filter((a) => a.id !== id);
    setSavedAvatars(updated);
    localStorage.setItem(AVATARS_KEY, JSON.stringify(updated));
    if (selectedSavedAvatar === id) {
      setSelectedSavedAvatar(null);
    }
  };

  // Scene handling
  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      setBackgroundImage(base64);
      setSceneAssets((prev) => [
        ...prev,
        { id: Date.now().toString(), type: "background", imageUrl: base64, name: file.name },
      ]);
    }
  };

  const handleScreenUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      setScreenOverlays((prev) => [...prev, base64]);
      setSceneAssets((prev) => [
        ...prev,
        { id: Date.now().toString(), type: "screen", imageUrl: base64, name: file.name },
      ]);
    }
  };

  const removeScreenOverlay = (index: number) => {
    setScreenOverlays((prev) => prev.filter((_, i) => i !== index));
  };

  // Video generation
  const generateVideos = async () => {
    if (!generatedAvatar) return;
    
    setIsGenerating(true);
    setGenerationProgress(0);
    setGeneratedVideos([]);
    
    const segments = videoLength === "multi" ? dialogueSegments : [{ id: "single", text: dialogue, duration: totalDuration }];
    const totalSegments = segments.length;
    
    try {
      let previousFrameUrl: string | null = null;
      
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        setGenerationStatus(`Generating video ${i + 1} of ${totalSegments}...`);
        
        // Build the prompt
        let fullPrompt = segment.text;
        if (backgroundImage) {
          fullPrompt += `. Background: professional studio setting`;
        }
        
        // Use the avatar image or previous frame for continuity
        const inputImage = i === 0 ? generatedAvatar : previousFrameUrl || generatedAvatar;
        
        const result = await createImageToVideo({
          model,
          mode: qualityMode,
          prompt: fullPrompt,
          aspectRatio,
          duration: videoLength === "single" ? (singleVideoDuration.toString() as KlingDuration) : "5",
          imageUrl: inputImage,
        });
        
        const completed = await pollForCompletion(result.taskId);
        
        if (completed.videoUrl) {
          setGeneratedVideos((prev) => [
            ...prev,
            {
              id: `video-${i}`,
              url: completed.videoUrl,
              duration: parseInt(videoLength === "single" ? singleVideoDuration.toString() : "5"),
              segmentIndex: i,
            },
          ]);
          
          // Store last frame for next video (in production, extract actual last frame)
          previousFrameUrl = completed.videoUrl;
        }
        
        setGenerationProgress(((i + 1) / totalSegments) * 100);
      }
      
      setGenerationStatus("Videos generated successfully!");
      
      // If single video or all segments complete, set final URL
      if (totalSegments === 1 && generatedVideos.length > 0) {
        setFinalVideoUrl(generatedVideos[0]?.url || null);
      }
      
      nextStep();
    } catch (error) {
      console.error("Generation failed:", error);
      setGenerationStatus(`Generation failed: ${error}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Download video
  const downloadVideo = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  // Check if model supports long videos
  const supportsLongVideos = LONG_VIDEO_MODELS.includes(model);
  const maxSingleDuration = supportsLongVideos ? 15 : 8;

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case "avatar":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Create Your Avatar</h2>
              <p className="text-gray-400">Describe, upload, or select an existing avatar</p>
            </div>

            {/* Saved Avatars */}
            {savedAvatars.length > 0 && (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Save className="h-5 w-5" />
                    My Saved Avatars
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                    {savedAvatars.map((avatar) => (
                      <div
                        key={avatar.id}
                        className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                          selectedSavedAvatar === avatar.id
                            ? "border-purple-500 ring-2 ring-purple-500/50"
                            : "border-gray-600 hover:border-gray-500"
                        }`}
                        onClick={() => selectSavedAvatar(avatar)}
                      >
                        <img
                          src={avatar.imageUrl}
                          alt={avatar.name}
                          className="w-full aspect-square object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-white hover:bg-red-500/50"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteAvatar(avatar.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1">
                          <p className="text-xs text-white truncate">{avatar.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Create New Avatar */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">Create New Avatar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs value={avatarMode} onValueChange={(v) => setAvatarMode(v as typeof avatarMode)}>
                  <TabsList className="grid w-full grid-cols-3 bg-gray-700">
                    <TabsTrigger value="prompt" className="data-[state=active]:bg-purple-600">
                      <Wand2 className="h-4 w-4 mr-2" />
                      Describe
                    </TabsTrigger>
                    <TabsTrigger value="image" className="data-[state=active]:bg-purple-600">
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Upload Image
                    </TabsTrigger>
                    <TabsTrigger value="video" className="data-[state=active]:bg-purple-600">
                      <Film className="h-4 w-4 mr-2" />
                      Upload Video
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="prompt" className="space-y-4 mt-4">
                    <Textarea
                      value={avatarPrompt}
                      onChange={(e) => setAvatarPrompt(e.target.value)}
                      placeholder="Describe your avatar... e.g., 'A professional woman in her 30s with brown hair, wearing a blue blazer, friendly expression'"
                      className="bg-gray-700 border-gray-600 text-white min-h-[100px]"
                    />
                    <Button
                      onClick={generateAvatarFromPrompt}
                      disabled={!avatarPrompt || isGenerating}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Wand2 className="h-4 w-4 mr-2" />
                      )}
                      Generate Avatar
                    </Button>
                  </TabsContent>

                  <TabsContent value="image" className="mt-4">
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarImageUpload}
                    />
                    <div
                      onClick={() => avatarInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-purple-500 transition-colors"
                    >
                      <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-300">Click to upload avatar image</p>
                      <p className="text-sm text-gray-500 mt-2">PNG, JPG up to 10MB</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="video" className="mt-4">
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={handleAvatarVideoUpload}
                    />
                    <div
                      onClick={() => avatarInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-purple-500 transition-colors"
                    >
                      <Film className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-300">Click to upload avatar video</p>
                      <p className="text-sm text-gray-500 mt-2">MP4, MOV up to 50MB</p>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Avatar Preview */}
                {(generatedAvatar || avatarImage || avatarVideo) && (
                  <div className="mt-6 p-4 bg-gray-700/50 rounded-lg">
                    <div className="flex items-start gap-4">
                      <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-600 flex-shrink-0">
                        {avatarVideo ? (
                          <video src={avatarVideo} className="w-full h-full object-cover" controls />
                        ) : (
                          <img
                            src={generatedAvatar || avatarImage || ""}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 space-y-3">
                        <div>
                          <Label className="text-gray-300">Avatar Name</Label>
                          <Input
                            value={avatarName}
                            onChange={(e) => setAvatarName(e.target.value)}
                            placeholder="Give your avatar a name..."
                            className="bg-gray-700 border-gray-600 text-white mt-1"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={saveAvatar}
                            disabled={!avatarName}
                            variant="outline"
                            className="border-gray-600 text-gray-300 hover:bg-gray-700"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save Avatar
                          </Button>
                          <Button
                            onClick={() => {
                              setGeneratedAvatar(null);
                              setAvatarImage(null);
                              setAvatarVideo(null);
                              setAvatarPrompt("");
                            }}
                            variant="ghost"
                            className="text-gray-400 hover:text-white"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Reset
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case "preview":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Confirm Your Avatar</h2>
              <p className="text-gray-400">Review and confirm your avatar selection</p>
            </div>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <div className="w-48 h-48 rounded-full overflow-hidden bg-gray-600 border-4 border-purple-500 mb-6">
                    {generatedAvatar || avatarImage ? (
                      <img
                        src={generatedAvatar || avatarImage || ""}
                        alt="Selected Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="h-20 w-20 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {avatarName || "Unnamed Avatar"}
                  </h3>
                  
                  {avatarPrompt && (
                    <p className="text-gray-400 text-sm text-center max-w-md mb-4">
                      "{avatarPrompt}"
                    </p>
                  )}

                  <div className="flex gap-3">
                    <Button
                      onClick={() => goToStep("avatar")}
                      variant="outline"
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Change Avatar
                    </Button>
                    <Button
                      onClick={nextStep}
                      disabled={!generatedAvatar && !avatarImage}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Continue
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "scene":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Set Up Your Scene</h2>
              <p className="text-gray-400">Add backgrounds and screen overlays</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Background */}
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Background
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Set the scene behind your avatar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <input
                    ref={backgroundInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBackgroundUpload}
                  />
                  
                  {backgroundImage ? (
                    <div className="relative rounded-lg overflow-hidden">
                      <img
                        src={backgroundImage}
                        alt="Background"
                        className="w-full aspect-video object-cover"
                      />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2"
                        onClick={() => setBackgroundImage(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => backgroundInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-purple-500 transition-colors"
                    >
                      <ImageIcon className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-300">Add Background Image</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Screen Overlays */}
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    Screen Overlays
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Add images to display on screens in the video
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <input
                    ref={screenInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleScreenUpload}
                  />
                  
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {screenOverlays.map((overlay, index) => (
                      <div key={index} className="relative rounded-lg overflow-hidden">
                        <img
                          src={overlay}
                          alt={`Screen ${index + 1}`}
                          className="w-full aspect-video object-cover"
                        />
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => removeScreenOverlay(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    
                    <div
                      onClick={() => screenInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-600 rounded-lg aspect-video flex items-center justify-center cursor-pointer hover:border-purple-500 transition-colors"
                    >
                      <Plus className="h-8 w-8 text-gray-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Scene Preview */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">Scene Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-video bg-gray-700 rounded-lg overflow-hidden">
                  {backgroundImage && (
                    <img
                      src={backgroundImage}
                      alt="Background"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  
                  {/* Avatar overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {(generatedAvatar || avatarImage) && (
                      <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-white/50 shadow-lg">
                        <img
                          src={generatedAvatar || avatarImage || ""}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Screen overlays in corners */}
                  {screenOverlays[0] && (
                    <div className="absolute top-4 right-4 w-24 h-16 rounded overflow-hidden shadow-lg">
                      <img
                        src={screenOverlays[0]}
                        alt="Screen 1"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  {!backgroundImage && !generatedAvatar && !avatarImage && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-gray-400">Add assets to preview your scene</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "dialogue":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Write Your Script</h2>
              <p className="text-gray-400">What should your avatar say?</p>
            </div>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Dialogue
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={dialogue}
                  onChange={(e) => setDialogue(e.target.value)}
                  placeholder="Write the script for your avatar... e.g., 'Hello everyone! Welcome to our product demo. Today I'm going to show you three amazing features that will transform your workflow.'"
                  className="bg-gray-700 border-gray-600 text-white min-h-[200px]"
                />
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">
                    {dialogue.split(/\s+/).filter(Boolean).length} words
                  </span>
                  <span className="text-gray-400 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    ~{totalDuration} seconds
                  </span>
                </div>

                {totalDuration > maxSingleDuration && (
                  <div className="p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                    <p className="text-yellow-400 text-sm">
                      <strong>Note:</strong> Your dialogue exceeds the maximum single video duration 
                      ({maxSingleDuration}s for {MODEL_OPTIONS.find(m => m.value === model)?.label}). 
                      The system will automatically split it into {dialogueSegments.length} video segments.
                    </p>
                  </div>
                )}

                {dialogueSegments.length > 1 && (
                  <div className="space-y-3 mt-4">
                    <Label className="text-gray-300">Video Segments</Label>
                    {dialogueSegments.map((segment, index) => (
                      <div
                        key={segment.id}
                        className="p-3 bg-gray-700/50 rounded-lg border border-gray-600"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="text-purple-400 border-purple-500">
                            Segment {index + 1}
                          </Badge>
                          <span className="text-xs text-gray-400">~{segment.duration}s</span>
                        </div>
                        <p className="text-sm text-gray-300">{segment.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case "settings":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Video Settings</h2>
              <p className="text-gray-400">Configure your video generation options</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* AI Model */}
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Wand2 className="h-5 w-5" />
                    AI Model
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={model} onValueChange={(v) => setModel(v as KlingModel)}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600 max-h-[300px]">
                      {Object.entries(
                        MODEL_OPTIONS.reduce((acc, opt) => {
                          if (!acc[opt.category]) acc[opt.category] = [];
                          acc[opt.category].push(opt);
                          return acc;
                        }, {} as Record<string, typeof MODEL_OPTIONS>)
                      ).filter(([cat]) => cat !== "Legacy").map(([category, models]) => (
                        <SelectGroup key={category}>
                          <SelectLabel className="text-purple-400 font-semibold">{category}</SelectLabel>
                          {models.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-white">
                              <div className="flex flex-col">
                                <span>{opt.label}</span>
                                <span className="text-xs text-gray-400">{opt.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>

                  {supportsLongVideos && (
                    <Badge className="bg-green-600">
                      Supports 15s videos
                    </Badge>
                  )}
                </CardContent>
              </Card>

              {/* Quality & Format */}
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Quality & Format
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Quality Mode</Label>
                    <Select value={qualityMode} onValueChange={(v) => setQualityMode(v as KlingMode)}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="std" className="text-white">Standard</SelectItem>
                        <SelectItem value="pro" className="text-white">Professional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Aspect Ratio</Label>
                    <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as KlingAspectRatio)}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="16:9" className="text-white">16:9 (Landscape)</SelectItem>
                        <SelectItem value="9:16" className="text-white">9:16 (Portrait)</SelectItem>
                        <SelectItem value="1:1" className="text-white">1:1 (Square)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Video Length Strategy */}
              <Card className="bg-gray-800/50 border-gray-700 md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Video Length Strategy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Single Video Option */}
                    <div
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        videoLength === "single"
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-gray-600 hover:border-gray-500"
                      }`}
                      onClick={() => setVideoLength("single")}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          videoLength === "single" ? "border-purple-500" : "border-gray-500"
                        }`}>
                          {videoLength === "single" && (
                            <div className="w-3 h-3 rounded-full bg-purple-500" />
                          )}
                        </div>
                        <h4 className="font-semibold text-white">Single Video</h4>
                      </div>
                      <p className="text-sm text-gray-400 mb-3">
                        Generate one continuous video up to {maxSingleDuration} seconds
                      </p>
                      
                      {videoLength === "single" && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Duration</span>
                            <span className="text-white">{singleVideoDuration}s</span>
                          </div>
                          <Slider
                            value={[singleVideoDuration]}
                            onValueChange={(v) => setSingleVideoDuration(v[0])}
                            min={3}
                            max={maxSingleDuration}
                            step={1}
                            className="py-2"
                          />
                        </div>
                      )}
                    </div>

                    {/* Multi-Video Option */}
                    <div
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        videoLength === "multi"
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-gray-600 hover:border-gray-500"
                      }`}
                      onClick={() => setVideoLength("multi")}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          videoLength === "multi" ? "border-purple-500" : "border-gray-500"
                        }`}>
                          {videoLength === "multi" && (
                            <div className="w-3 h-3 rounded-full bg-purple-500" />
                          )}
                        </div>
                        <h4 className="font-semibold text-white flex items-center gap-2">
                          Multi-Segment
                          <Badge variant="outline" className="text-xs">Seamless</Badge>
                        </h4>
                      </div>
                      <p className="text-sm text-gray-400 mb-3">
                        Chain multiple videos for longer content. Each segment uses the last frame of the previous for seamless transitions.
                      </p>
                      
                      {videoLength === "multi" && dialogueSegments.length > 1 && (
                        <div className="text-sm">
                          <span className="text-purple-400 font-medium">
                            {dialogueSegments.length} segments
                          </span>
                          <span className="text-gray-400"> • ~{totalDuration}s total</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {totalDuration > maxSingleDuration && videoLength === "single" && (
                    <div className="p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                      <p className="text-yellow-400 text-sm">
                        ⚠️ Your dialogue ({totalDuration}s) exceeds the single video limit ({maxSingleDuration}s). 
                        Consider using multi-segment mode or shortening your script.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "generate":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Generate Video</h2>
              <p className="text-gray-400">Review and start generation</p>
            </div>

            {/* Summary */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">Generation Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <User className="h-4 w-4" />
                      <span className="text-sm">Avatar</span>
                    </div>
                    <p className="text-white font-medium">{avatarName || "Custom Avatar"}</p>
                  </div>
                  
                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <Wand2 className="h-4 w-4" />
                      <span className="text-sm">Model</span>
                    </div>
                    <p className="text-white font-medium">
                      {MODEL_OPTIONS.find(m => m.value === model)?.label}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">Duration</span>
                    </div>
                    <p className="text-white font-medium">
                      {videoLength === "single" 
                        ? `${singleVideoDuration}s (single)` 
                        : `~${totalDuration}s (${dialogueSegments.length} segments)`
                      }
                    </p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-sm">Script Preview</span>
                  </div>
                  <p className="text-gray-300 text-sm line-clamp-3">{dialogue || "No dialogue"}</p>
                </div>
              </CardContent>
            </Card>

            {/* Generation Progress */}
            {isGenerating && (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="pt-6">
                  <div className="text-center mb-4">
                    <Loader2 className="h-12 w-12 mx-auto text-purple-500 animate-spin mb-4" />
                    <p className="text-white font-medium">{generationStatus}</p>
                  </div>
                  <Progress value={generationProgress} className="h-2" />
                  <p className="text-center text-gray-400 text-sm mt-2">
                    {Math.round(generationProgress)}% complete
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Generated Videos */}
            {generatedVideos.length > 0 && !isGenerating && (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Generated Segments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {generatedVideos.map((video, index) => (
                      <div key={video.id} className="rounded-lg overflow-hidden bg-gray-700">
                        <video
                          src={video.url}
                          controls
                          className="w-full aspect-video"
                        />
                        <div className="p-3 flex justify-between items-center">
                          <Badge>Segment {index + 1}</Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => downloadVideo(video.url, `segment-${index + 1}.mp4`)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Start Generation */}
            {!isGenerating && generatedVideos.length === 0 && (
              <div className="text-center">
                <Button
                  size="lg"
                  onClick={generateVideos}
                  disabled={!generatedAvatar && !avatarImage}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-8"
                >
                  <Wand2 className="h-5 w-5 mr-2" />
                  Start Generation
                </Button>
              </div>
            )}
          </div>
        );

      case "finish":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Video Complete!</h2>
              <p className="text-gray-400">Your video has been generated successfully</p>
            </div>

            {/* Video Preview */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="pt-6">
                {generatedVideos.length > 0 && (
                  <div className="aspect-video bg-gray-700 rounded-lg overflow-hidden mb-6">
                    <video
                      src={generatedVideos[0]?.url}
                      controls
                      className="w-full h-full"
                    />
                  </div>
                )}

                {/* Post-processing options */}
                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="bg-gray-700/50 border-gray-600 hover:border-purple-500 cursor-pointer transition-colors">
                    <CardContent className="pt-6 text-center">
                      <Type className="h-10 w-10 mx-auto text-purple-400 mb-3" />
                      <h4 className="font-medium text-white mb-2">Add Captions</h4>
                      <p className="text-sm text-gray-400">
                        Auto-generate captions for your video
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-700/50 border-gray-600 hover:border-purple-500 cursor-pointer transition-colors">
                    <CardContent className="pt-6 text-center">
                      <Scissors className="h-10 w-10 mx-auto text-purple-400 mb-3" />
                      <h4 className="font-medium text-white mb-2">Open in Editor</h4>
                      <p className="text-sm text-gray-400">
                        Edit in video editing software
                      </p>
                    </CardContent>
                  </Card>

                  <Card 
                    className="bg-gray-700/50 border-gray-600 hover:border-purple-500 cursor-pointer transition-colors"
                    onClick={() => generatedVideos[0] && downloadVideo(generatedVideos[0].url, "final-video.mp4")}
                  >
                    <CardContent className="pt-6 text-center">
                      <Download className="h-10 w-10 mx-auto text-purple-400 mb-3" />
                      <h4 className="font-medium text-white mb-2">Download</h4>
                      <p className="text-sm text-gray-400">
                        Save video to your device
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* All segments download */}
                {generatedVideos.length > 1 && (
                  <div className="mt-6 p-4 bg-gray-700/50 rounded-lg">
                    <h4 className="font-medium text-white mb-3">All Segments</h4>
                    <div className="flex flex-wrap gap-2">
                      {generatedVideos.map((video, index) => (
                        <Button
                          key={video.id}
                          variant="outline"
                          size="sm"
                          onClick={() => downloadVideo(video.url, `segment-${index + 1}.mp4`)}
                          className="border-gray-600 text-gray-300"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Segment {index + 1}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Start Over */}
                <div className="mt-6 text-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCurrentStep("avatar");
                      setCompletedSteps(new Set());
                      setGeneratedVideos([]);
                      setDialogue("");
                    }}
                    className="border-gray-600 text-gray-300"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Create New Video
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const canContinue = () => {
    switch (currentStep) {
      case "avatar":
        return !!(generatedAvatar || avatarImage);
      case "preview":
        return !!(generatedAvatar || avatarImage);
      case "scene":
        return true; // Optional
      case "dialogue":
        return true; // Optional but recommended
      case "settings":
        return true;
      case "generate":
        return generatedVideos.length > 0;
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">Video Workflow</h1>
                <p className="text-sm text-gray-400">Create AI-powered videos step by step</p>
              </div>
            </div>

            {/* Model selector in header */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">Model:</span>
              <Select value={model} onValueChange={(v) => setModel(v as KlingModel)}>
                <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {MODEL_OPTIONS.filter(m => m.category !== "Legacy").map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-white">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="border-b border-gray-800 bg-gray-900/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const isActive = step.id === currentStep;
              const isCompleted = completedSteps.has(step.id);
              const isPast = index < currentStepIndex;

              return (
                <div
                  key={step.id}
                  className="flex items-center"
                >
                  <button
                    onClick={() => (isCompleted || isPast) && goToStep(step.id)}
                    disabled={!isCompleted && !isPast && !isActive}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                      isActive
                        ? "bg-purple-600 text-white"
                        : isCompleted || isPast
                        ? "bg-gray-700 text-white cursor-pointer hover:bg-gray-600"
                        : "bg-gray-800 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      isCompleted ? "bg-green-500" : isActive ? "bg-purple-400" : "bg-gray-600"
                    }`}>
                      {isCompleted ? (
                        <Check className="h-3 w-3 text-white" />
                      ) : (
                        step.icon
                      )}
                    </div>
                    <span className="hidden md:block text-sm font-medium">{step.label}</span>
                  </button>
                  
                  {index < STEPS.length - 1 && (
                    <div className={`w-8 md:w-16 h-0.5 mx-2 ${
                      isPast || isCompleted ? "bg-purple-500" : "bg-gray-700"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {renderStepContent()}

        {/* Navigation Buttons */}
        {currentStep !== "finish" && (
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-800">
            <Button
              onClick={prevStep}
              disabled={currentStepIndex === 0}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {currentStep !== "generate" && (
              <Button
                onClick={nextStep}
                disabled={!canContinue()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {currentStep === "settings" ? "Review & Generate" : "Continue"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
