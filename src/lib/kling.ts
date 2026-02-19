import { supabase } from "@/integrations/supabase/client";

const KIE_API_KEY = "3c2d33f582b294eb4c873a3f6b1d2189";
const KIE_BASE_URL = "https://api.kie.ai";

// Types
export type KlingModel = "kling-v1" | "kling-v1-5" | "kling-v1-6" | "kling-v2-master";
export type KlingMode = "std" | "pro";
export type KlingAspectRatio = "16:9" | "9:16" | "1:1" | "4:3" | "3:4";
export type KlingDuration = "5" | "10";
export type KieQuality = "720p" | "1080p";

export interface KieApiResponse<T = unknown> {
  code: number;
  msg: string;
  data: T;
}

export interface KieTaskData {
  taskId: string;
  state?: string; // "queueing" | "processing" | "success" | "fail"
  generateTime?: string;
  videoInfo?: {
    videoId?: string;
    videoUrl?: string;
    imageUrl?: string;
  };
  expireFlag?: number;
}

// Legacy alias for compatibility with KlingAdGenerator
export interface KlingApiResponse<T = unknown> {
  code: number;
  message: string;
  request_id?: string;
  data: T;
}

export interface KlingTaskData {
  task_id: string;
  task_status?: string;
  task_status_msg?: string;
  task_result?: {
    videos?: Array<{
      id: string;
      url: string;
      duration: string;
    }>;
  };
}

export interface TextToVideoParams {
  prompt: string;
  negative_prompt?: string;
  model_name?: KlingModel;
  cfg_scale?: number;
  mode?: KlingMode;
  aspect_ratio?: KlingAspectRatio;
  duration?: KlingDuration;
  camera_control?: {
    type?: "simple" | "custom";
    config?: {
      horizontal?: number;
      vertical?: number;
      zoom?: number;
      tilt?: number;
      pan?: number;
      roll?: number;
    };
  };
}

export interface ImageToVideoParams {
  image: string; // URL or base64
  image_tail?: string;
  prompt?: string;
  negative_prompt?: string;
  model_name?: KlingModel;
  cfg_scale?: number;
  mode?: KlingMode;
  duration?: KlingDuration;
  camera_control?: {
    type?: "simple" | "custom";
    config?: {
      horizontal?: number;
      vertical?: number;
      zoom?: number;
      tilt?: number;
      pan?: number;
      roll?: number;
    };
  };
}

export interface LipSyncParams {
  video_url: string;
  audio_url: string;
  mode?: "audio2video";
}

// Helper to call KIE AI API via kling-proxy
async function kieRequest<T>(
  endpoint: string,
  method: "GET" | "POST" = "GET",
  payload?: unknown
): Promise<KieApiResponse<T>> {
  const { data, error } = await supabase.functions.invoke("kling-proxy", {
    body: {
      endpoint,
      method,
      payload,
      apiKey: KIE_API_KEY,
      baseUrl: KIE_BASE_URL,
    },
  });

  if (error) {
    throw new Error(`KIE proxy error: ${error.message}`);
  }

  return data as KieApiResponse<T>;
}

// Convert KIE response to legacy KlingApiResponse shape for UI compatibility
function toKlingResponse(kieResp: KieApiResponse<KieTaskData>): KlingApiResponse<KlingTaskData> {
  const taskId = kieResp.data?.taskId;
  const state = kieResp.data?.state;
  const videoUrl = kieResp.data?.videoInfo?.videoUrl;

  let task_status: string | undefined;
  if (state === "success") task_status = "succeed";
  else if (state === "fail") task_status = "failed";
  else if (state === "processing" || state === "queueing") task_status = "processing";

  return {
    code: kieResp.code === 200 ? 0 : kieResp.code,
    message: kieResp.msg,
    data: {
      task_id: taskId || "",
      task_status,
      task_result: videoUrl
        ? { videos: [{ id: taskId || "", url: videoUrl, duration: "5" }] }
        : undefined,
    },
  };
}

// Text to Video
export async function createTextToVideo(
  params: TextToVideoParams
): Promise<KlingApiResponse<KlingTaskData>> {
  const kiePayload = {
    prompt: params.prompt,
    duration: Number(params.duration || 5),
    quality: "720p" as KieQuality,
    aspectRatio: params.aspect_ratio || "16:9",
    waterMark: "",
  };

  const resp = await kieRequest<KieTaskData>("/api/v1/runway/generate", "POST", kiePayload);
  return toKlingResponse(resp);
}

// Image to Video
export async function createImageToVideo(
  params: ImageToVideoParams
): Promise<KlingApiResponse<KlingTaskData>> {
  const kiePayload: Record<string, unknown> = {
    prompt: params.prompt || "",
    duration: Number(params.duration || 5),
    quality: "720p" as KieQuality,
    waterMark: "",
  };

  // If image is a URL (starts with http), use imageUrl field
  if (params.image && params.image.startsWith("http")) {
    kiePayload.imageUrl = params.image;
  } else if (params.image) {
    // base64 — upload is not supported directly, use as imageUrl if it's a data URL
    kiePayload.imageUrl = params.image;
  }

  const resp = await kieRequest<KieTaskData>("/api/v1/runway/generate", "POST", kiePayload);
  return toKlingResponse(resp);
}

// Lip Sync — not natively supported by KIE Runway API, fall back gracefully
export async function createLipSync(
  _params: LipSyncParams
): Promise<KlingApiResponse<KlingTaskData>> {
  throw new Error("Lip-sync is not supported by the KIE AI Runway API.");
}

// Get task status
async function getTaskStatus(taskId: string): Promise<KlingApiResponse<KlingTaskData>> {
  const resp = await kieRequest<KieTaskData>(
    `/api/v1/runway/record-detail?taskId=${taskId}`,
    "GET"
  );
  return toKlingResponse(resp);
}

// Get Text-to-Video task status (alias)
export async function getTextToVideoStatus(
  taskId: string
): Promise<KlingApiResponse<KlingTaskData>> {
  return getTaskStatus(taskId);
}

// Get Image-to-Video task status (alias)
export async function getImageToVideoStatus(
  taskId: string
): Promise<KlingApiResponse<KlingTaskData>> {
  return getTaskStatus(taskId);
}

// Get Lip Sync task status (alias)
export async function getLipSyncStatus(
  taskId: string
): Promise<KlingApiResponse<KlingTaskData>> {
  return getTaskStatus(taskId);
}

// Poll for task completion
export async function pollForCompletion(
  taskId: string,
  _taskType: "text2video" | "image2video" | "lip-sync",
  onProgress?: (status: string) => void,
  maxAttempts = 120,
  intervalMs = 5000
): Promise<KlingApiResponse<KlingTaskData>> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await getTaskStatus(taskId);

    if (response.code !== 0) {
      throw new Error(`KIE API error: ${response.message}`);
    }

    const status = response.data?.task_status;
    onProgress?.(status || "unknown");

    if (status === "succeed") {
      return response;
    }

    if (status === "failed") {
      throw new Error(
        `Video generation failed: ${response.data?.task_status_msg || "Unknown error"}`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Polling timeout - video generation took too long");
}

// Convert file to base64
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result); // Keep full data URL for KIE
    };
    reader.onerror = (error) => reject(error);
  });
}

// Model display names (maps to KIE Runway internally)
export const MODEL_OPTIONS: { value: KlingModel; label: string; description: string }[] = [
  { value: "kling-v1", label: "Runway Gen3", description: "Standard quality, good balance" },
  { value: "kling-v1-5", label: "Runway Gen3 Alpha", description: "Improved motion and consistency" },
  { value: "kling-v1-6", label: "Runway Gen3 Turbo", description: "Fast generation, good quality" },
  { value: "kling-v2-master", label: "Runway Gen3 Master", description: "Highest quality output" },
];

export const MODE_OPTIONS: { value: KlingMode; label: string }[] = [
  { value: "std", label: "Standard (720p)" },
  { value: "pro", label: "Professional (1080p, 5s only)" },
];

export const ASPECT_RATIO_OPTIONS: { value: KlingAspectRatio; label: string }[] = [
  { value: "16:9", label: "16:9 (Landscape)" },
  { value: "9:16", label: "9:16 (Portrait)" },
  { value: "1:1", label: "1:1 (Square)" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
];

export const DURATION_OPTIONS: { value: KlingDuration; label: string }[] = [
  { value: "5", label: "5 seconds" },
  { value: "10", label: "10 seconds" },
];
