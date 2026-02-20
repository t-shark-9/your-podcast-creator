import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Upload, Wand2, Loader2, Download, X, Image, Film, Music, History, Trash2, Play } from "lucide-react";
import {
  createTextToVideo,
  createImageToVideo,
  createLipSync,
  pollForCompletion,
  fileToBase64,
  MODEL_OPTIONS,
  MODE_OPTIONS,
  ASPECT_RATIO_OPTIONS,
  DURATION_OPTIONS,
  KlingModel,
  KlingMode,
  KlingAspectRatio,
  KlingDuration,
} from "@/lib/kling";

type GenerationMode = "text2video" | "image2video" | "lip-sync";

// Video history type
interface VideoHistoryItem {
  id: string;
  url: string;
  prompt: string;
  model: string;
  mode: string;
  createdAt: string;
  thumbnail?: string;
}

const HISTORY_KEY = "kling-video-history";

export default function KlingAdGenerator() {
  // Generation mode
  const [mode, setMode] = useState<GenerationMode>("text2video");

  // Common params
  const [model, setModel] = useState<KlingModel>("kling-3.0");
  const [qualityMode, setQualityMode] = useState<KlingMode>("std");
  const [aspectRatio, setAspectRatio] = useState<KlingAspectRatio>("16:9");
  const [duration, setDuration] = useState<KlingDuration>("5");
  const [prompt, setPrompt] = useState("");
  const [dialogue, setDialogue] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [cfgScale, setCfgScale] = useState(0.5);

  // Video history
  const [videoHistory, setVideoHistory] = useState<VideoHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) {
      try {
        setVideoHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load video history:", e);
      }
    }
  }, []);

  // Save to history
  const saveToHistory = (url: string, promptText: string) => {
    const newItem: VideoHistoryItem = {
      id: Date.now().toString(),
      url,
      prompt: promptText,
      model,
      mode: qualityMode,
      createdAt: new Date().toISOString(),
    };
    const updated = [newItem, ...videoHistory].slice(0, 20); // Keep last 20
    setVideoHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  // Delete from history
  const deleteFromHistory = (id: string) => {
    const updated = videoHistory.filter((item) => item.id !== id);
    setVideoHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  // Clear all history
  const clearHistory = () => {
    setVideoHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  // Image-to-video params
  const [seedImage, setSeedImage] = useState<File | null>(null);
  const [seedImagePreview, setSeedImagePreview] = useState<string | null>(null);
  const [seedImageUrl, setSeedImageUrl] = useState("");

  // Lip-sync params
  const [seedVideo, setSeedVideo] = useState<File | null>(null);
  const [seedVideoPreview, setSeedVideoPreview] = useState<string | null>(null);
  const [seedVideoUrl, setSeedVideoUrl] = useState("");
  const [seedAudio, setSeedAudio] = useState<File | null>(null);
  const [seedAudioPreview, setSeedAudioPreview] = useState<string | null>(null);
  const [seedAudioUrl, setSeedAudioUrl] = useState("");

  // Camera control (simple)
  const [cameraHorizontal, setCameraHorizontal] = useState(0);
  const [cameraVertical, setCameraVertical] = useState(0);
  const [cameraZoom, setCameraZoom] = useState(0);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);

  // File input refs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Handle file uploads
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSeedImage(file);
      setSeedImagePreview(URL.createObjectURL(file));
      setSeedImageUrl("");
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSeedVideo(file);
      setSeedVideoPreview(URL.createObjectURL(file));
      setSeedVideoUrl("");
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSeedAudio(file);
      setSeedAudioPreview(URL.createObjectURL(file));
      setSeedAudioUrl("");
    }
  };

  const clearImage = () => {
    setSeedImage(null);
    setSeedImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const clearVideo = () => {
    setSeedVideo(null);
    setSeedVideoPreview(null);
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const clearAudio = () => {
    setSeedAudio(null);
    setSeedAudioPreview(null);
    if (audioInputRef.current) audioInputRef.current.value = "";
  };

  // Generate video
  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setStatus("Preparing...");
    setResultVideoUrl(null);

    try {
      let taskId: string;
      let taskType: "text2video" | "image2video" | "lip-sync";

      const cameraControl = (cameraHorizontal !== 0 || cameraVertical !== 0 || cameraZoom !== 0)
        ? {
            type: "simple" as const,
            config: {
              horizontal: cameraHorizontal,
              vertical: cameraVertical,
              zoom: cameraZoom,
            },
          }
        : undefined;

      if (mode === "text2video") {
        if (!prompt.trim()) {
          throw new Error("Please enter a prompt");
        }

        // Combine prompt with dialogue if provided
        const fullPrompt = dialogue.trim() 
          ? `${prompt.trim()}\n\nDialogue: "${dialogue.trim()}"`
          : prompt.trim();

        setStatus("Starting text-to-video generation...");
        const response = await createTextToVideo({
          prompt: fullPrompt,
          negative_prompt: negativePrompt || undefined,
          model_name: model,
          cfg_scale: cfgScale,
          mode: qualityMode,
          aspect_ratio: aspectRatio,
          duration,
          camera_control: cameraControl,
        });

        if (response.code !== 0) {
          throw new Error(`API error: ${response.message}`);
        }

        taskId = response.data.task_id;
        taskType = "text2video";
      } else if (mode === "image2video") {
        let imageData: string;
        let isBase64 = false;
        
        if (seedImage) {
          setStatus("Note: File uploads will use text-to-video (KIE API limitation)...");
          imageData = await fileToBase64(seedImage);
          isBase64 = true;
        } else if (seedImageUrl) {
          if (!seedImageUrl.startsWith("http")) {
            throw new Error("Please provide a valid HTTP/HTTPS image URL");
          }
          imageData = seedImageUrl;
        } else {
          throw new Error("Please provide a seed image (file or URL)");
        }

        setStatus("Starting image-to-video generation...");
        // Combine prompt with dialogue if provided
        const fullPrompt = dialogue.trim() 
          ? `${(prompt || "").trim()}\n\nDialogue: "${dialogue.trim()}"`
          : prompt || undefined;

        // Warn about base64 limitation
        if (isBase64) {
          setStatus("Using text-to-video (uploaded images not supported by KIE API)...");
        }

        const response = await createImageToVideo({
          image: imageData,
          prompt: fullPrompt,
          negative_prompt: negativePrompt || undefined,
          model_name: model,
          cfg_scale: cfgScale,
          mode: qualityMode,
          duration,
          camera_control: cameraControl,
        });

        if (response.code !== 0) {
          throw new Error(`API error: ${response.message}`);
        }

        taskId = response.data.task_id;
        taskType = isBase64 ? "text2video" : "image2video";
      } else {
        // Lip-sync mode
        let videoUrl: string;
        let audioUrl: string;

        if (seedVideoUrl) {
          videoUrl = seedVideoUrl;
        } else {
          throw new Error("Please provide a video URL for lip-sync");
        }

        if (seedAudioUrl) {
          audioUrl = seedAudioUrl;
        } else {
          throw new Error("Please provide an audio URL for lip-sync");
        }

        setStatus("Starting lip-sync generation...");
        const response = await createLipSync({
          video_url: videoUrl,
          audio_url: audioUrl,
          mode: "audio2video",
        });

        if (response.code !== 0) {
          throw new Error(`API error: ${response.message}`);
        }

        taskId = response.data.task_id;
        taskType = "lip-sync";
      }

      setStatus("Processing video...");

      const result = await pollForCompletion(
        taskId,
        taskType,
        (statusMsg) => {
          setStatus(`Status: ${statusMsg}`);
        }
      );

      const videoUrl = result.data?.task_result?.videos?.[0]?.url;
      if (!videoUrl) {
        throw new Error("No video URL in result");
      }

      setResultVideoUrl(videoUrl);
      saveToHistory(videoUrl, prompt + (dialogue ? ` - "${dialogue}"` : ""));
      setStatus("Complete!");
    } catch (err) {
      console.error("Generation error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Kling AI Video Generator
            </h1>
            <p className="text-gray-400 mt-1">
              Create stunning AI videos with text, images, or lip-sync
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Settings */}
          <div className="space-y-6">
            {/* Mode Selection */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">Generation Mode</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={mode} onValueChange={(v) => setMode(v as GenerationMode)}>
                  <TabsList className="grid grid-cols-3 bg-gray-700">
                    <TabsTrigger value="text2video" className="data-[state=active]:bg-purple-600">
                      <Wand2 className="h-4 w-4 mr-2" />
                      Text
                    </TabsTrigger>
                    <TabsTrigger value="image2video" className="data-[state=active]:bg-purple-600">
                      <Image className="h-4 w-4 mr-2" />
                      Image
                    </TabsTrigger>
                    <TabsTrigger value="lip-sync" className="data-[state=active]:bg-purple-600">
                      <Music className="h-4 w-4 mr-2" />
                      Lip-Sync
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>

            {/* Model & Quality Settings */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">Model Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Model</Label>
                    <Select value={model} onValueChange={(v) => setModel(v as KlingModel)}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600 max-h-[400px]">
                        {/* Group models by category */}
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
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Quality</Label>
                    <Select value={qualityMode} onValueChange={(v) => setQualityMode(v as KlingMode)}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        {MODE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-white">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {mode !== "lip-sync" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Aspect Ratio</Label>
                      <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as KlingAspectRatio)}>
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          {ASPECT_RATIO_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-white">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">Duration</Label>
                      <Select value={duration} onValueChange={(v) => setDuration(v as KlingDuration)}>
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          {DURATION_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-white">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-gray-300">CFG Scale: {cfgScale.toFixed(2)}</Label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={cfgScale}
                    onChange={(e) => setCfgScale(parseFloat(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                  <p className="text-xs text-gray-500">Controls prompt adherence (0 = more creative, 1 = strict)</p>
                </div>
              </CardContent>
            </Card>

            {/* Seed Media */}
            {mode === "image2video" && (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Image className="h-5 w-5 text-purple-400" />
                    Seed Image
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  
                  {seedImagePreview ? (
                    <div className="relative">
                      <img
                        src={seedImagePreview}
                        alt="Seed image"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={clearImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full h-32 border-dashed border-gray-600 hover:border-purple-500"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      <Upload className="h-6 w-6 mr-2" />
                      Upload Image
                    </Button>
                  )}

                  <div className="text-center text-gray-500 text-sm">or</div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Image URL</Label>
                    <Input
                      placeholder="https://example.com/image.jpg"
                      value={seedImageUrl}
                      onChange={(e) => {
                        setSeedImageUrl(e.target.value);
                        if (e.target.value) clearImage();
                      }}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {mode === "lip-sync" && (
              <>
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <Film className="h-5 w-5 text-purple-400" />
                      Video Source
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Video URL</Label>
                      <Input
                        placeholder="https://example.com/video.mp4"
                        value={seedVideoUrl}
                        onChange={(e) => setSeedVideoUrl(e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                      <p className="text-xs text-gray-500">
                        Lip-sync requires a video URL (file upload not supported)
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800/50 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <Music className="h-5 w-5 text-purple-400" />
                      Audio Source
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Audio URL</Label>
                      <Input
                        placeholder="https://example.com/audio.mp3"
                        value={seedAudioUrl}
                        onChange={(e) => setSeedAudioUrl(e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                      <p className="text-xs text-gray-500">
                        Lip-sync requires an audio URL (file upload not supported)
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Prompt */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">Prompt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">
                    {mode === "text2video" ? "Describe your video" : "Motion guidance (optional)"}
                  </Label>
                  <Textarea
                    placeholder={
                      mode === "text2video"
                        ? "A golden retriever running through a sunlit meadow, cinematic lighting, 4K quality..."
                        : "The character turns their head and smiles..."
                    }
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Dialogue (optional)</Label>
                  <Textarea
                    placeholder="What should the character say? e.g., 'Hello, welcome to our product launch!'"
                    value={dialogue}
                    onChange={(e) => setDialogue(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white min-h-[80px]"
                  />
                  <p className="text-xs text-gray-500">
                    Add spoken dialogue for characters in your video
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Negative Prompt (optional)</Label>
                  <Textarea
                    placeholder="blurry, low quality, distorted, ugly..."
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white min-h-[60px]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Camera Control */}
            {mode !== "lip-sync" && (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Camera Control</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm">Horizontal: {cameraHorizontal}</Label>
                      <input
                        type="range"
                        min="-10"
                        max="10"
                        value={cameraHorizontal}
                        onChange={(e) => setCameraHorizontal(parseInt(e.target.value))}
                        className="w-full accent-purple-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm">Vertical: {cameraVertical}</Label>
                      <input
                        type="range"
                        min="-10"
                        max="10"
                        value={cameraVertical}
                        onChange={(e) => setCameraVertical(parseInt(e.target.value))}
                        className="w-full accent-purple-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm">Zoom: {cameraZoom}</Label>
                      <input
                        type="range"
                        min="-10"
                        max="10"
                        value={cameraZoom}
                        onChange={(e) => setCameraZoom(parseInt(e.target.value))}
                        className="w-full accent-purple-500"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Set all to 0 to disable camera movement
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  {status}
                </>
              ) : (
                <>
                  <Wand2 className="h-5 w-5 mr-2" />
                  Generate Video
                </>
              )}
            </Button>

            {error && (
              <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
                {error}
              </div>
            )}
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-6">
            <Card className="bg-gray-800/50 border-gray-700 min-h-[400px]">
              <CardHeader>
                <CardTitle className="text-lg text-white">Result</CardTitle>
              </CardHeader>
              <CardContent>
                {resultVideoUrl ? (
                  <div className="space-y-4">
                    <video
                      src={resultVideoUrl}
                      controls
                      autoPlay
                      loop
                      className="w-full rounded-lg"
                    />
                    <div className="flex gap-2">
                      <Button
                        asChild
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                      >
                        <a href={resultVideoUrl} download target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Download Video
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : isGenerating ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <Loader2 className="h-12 w-12 animate-spin mb-4 text-purple-400" />
                    <p>{status}</p>
                    <p className="text-sm text-gray-500 mt-2">This may take a few minutes...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <Film className="h-16 w-16 mb-4 opacity-30" />
                    <p>Your generated video will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-400">
                <p>
                  <strong className="text-purple-400">Text-to-Video:</strong> Be descriptive! Include style,
                  lighting, camera angles, and quality modifiers.
                </p>
                <p>
                  <strong className="text-purple-400">Image-to-Video:</strong> Works best with clear,
                  well-lit images. The AI will animate your image based on the prompt.
                </p>
                <p>
                  <strong className="text-purple-400">Lip-Sync:</strong> Provide a video with a clear face
                  and audio to sync. Great for dubbing or voice-over videos.
                </p>
                <p>
                  <strong className="text-purple-400">Pro Mode:</strong> Higher quality (1080p) but uses more
                  credits and takes longer to process.
                </p>
              </CardContent>
            </Card>

            {/* Video History */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <History className="h-5 w-5 text-purple-400" />
                  Video History
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-gray-400 hover:text-white"
                  >
                    {showHistory ? "Hide" : "Show"} ({videoHistory.length})
                  </Button>
                  {videoHistory.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearHistory}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              {showHistory && (
                <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
                  {videoHistory.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">
                      No videos generated yet
                    </p>
                  ) : (
                    videoHistory.map((item) => (
                      <div
                        key={item.id}
                        className="bg-gray-700/50 rounded-lg p-3 space-y-2"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{item.prompt || "No prompt"}</p>
                            <p className="text-xs text-gray-500">
                              {item.model} • {item.mode} • {new Date(item.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-1 ml-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-purple-400 hover:text-purple-300"
                              onClick={() => setResultVideoUrl(item.url)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-400 hover:text-red-300"
                              onClick={() => deleteFromHistory(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
