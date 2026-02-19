import { supabase } from "@/integrations/supabase/client";

const KLING_API_KEY = "3c2d33f582b294eb4c873a3f6b1d2189";
const KLING_BASE_URL = "https://api.klingai.com";

// Types
export type KlingModel = "kling-v1" | "kling-v1-5" | "kling-v1-6" | "kling-v2-master";
export type KlingMode = "std" | "pro";
export type KlingAspectRatio = "16:9" | "9:16" | "1:1";
export type KlingDuration = "5" | "10";

export interface KlingApiResponse<T = unknown> {
  code: number;
  message: string;
  request_id: string;
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
  image_tail?: string; // End frame image (URL or base64)
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
  video_url: string; // URL to video
  audio_url: string; // URL to audio
  mode?: "audio2video";
}

// Helper to call Kling API via joggai-proxy with baseUrl
async function klingRequest<T>(
  endpoint: string,
  method: "GET" | "POST" = "GET",
  payload?: unknown
): Promise<KlingApiResponse<T>> {
  const { data, error } = await supabase.functions.invoke("kling-proxy", {
    body: {
      endpoint,
      method,
      payload,
      apiKey: KLING_API_KEY,
    },
  });

  if (error) {
    throw new Error(`Kling proxy error: ${error.message}`);
  }

  return data as KlingApiResponse<T>;
}

// Text to Video
export async function createTextToVideo(
  params: TextToVideoParams
): Promise<KlingApiResponse<KlingTaskData>> {
  return klingRequest<KlingTaskData>(
    "/v1/videos/text2video",
    "POST",
    params
  );
}

// Image to Video
export async function createImageToVideo(
  params: ImageToVideoParams
): Promise<KlingApiResponse<KlingTaskData>> {
  return klingRequest<KlingTaskData>(
    "/v1/videos/image2video",
    "POST",
    params
  );
}

// Lip Sync (audio to video)
export async function createLipSync(
  params: LipSyncParams
): Promise<KlingApiResponse<KlingTaskData>> {
  return klingRequest<KlingTaskData>(
    "/v1/videos/lip-sync",
    "POST",
    params
  );
}

// Get Text-to-Video task status
export async function getTextToVideoStatus(
  taskId: string
): Promise<KlingApiResponse<KlingTaskData>> {
  return klingRequest<KlingTaskData>(
    `/v1/videos/text2video/${taskId}`,
    "GET"
  );
}

// Get Image-to-Video task status
export async function getImageToVideoStatus(
  taskId: string
): Promise<KlingApiResponse<KlingTaskData>> {
  return klingRequest<KlingTaskData>(
    `/v1/videos/image2video/${taskId}`,
    "GET"
  );
}

// Get Lip Sync task status
export async function getLipSyncStatus(
  taskId: string
): Promise<KlingApiResponse<KlingTaskData>> {
  return klingRequest<KlingTaskData>(
    `/v1/videos/lip-sync/${taskId}`,
    "GET"
  );
}

// Poll for task completion
export async function pollForCompletion(
  taskId: string,
  taskType: "text2video" | "image2video" | "lip-sync",
  onProgress?: (status: string) => void,
  maxAttempts = 120,
  intervalMs = 5000
): Promise<KlingApiResponse<KlingTaskData>> {
  const getStatus =
    taskType === "text2video"
      ? getTextToVideoStatus
      : taskType === "image2video"
      ? getImageToVideoStatus
      : getLipSyncStatus;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await getStatus(taskId);

    if (response.code !== 0) {
      throw new Error(`Kling API error: ${response.message}`);
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

    // Wait before next poll
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
      // Remove the data:mime;base64, prefix
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

// Model display names
export const MODEL_OPTIONS: { value: KlingModel; label: string }[] = [
  { value: "kling-v1", label: "Kling v1" },
  { value: "kling-v1-5", label: "Kling v1.5" },
  { value: "kling-v1-6", label: "Kling v1.6" },
  { value: "kling-v2-master", label: "Kling v2 Master" },
];

export const MODE_OPTIONS: { value: KlingMode; label: string }[] = [
  { value: "std", label: "Standard" },
  { value: "pro", label: "Professional" },
];

export const ASPECT_RATIO_OPTIONS: { value: KlingAspectRatio; label: string }[] = [
  { value: "16:9", label: "16:9 (Landscape)" },
  { value: "9:16", label: "9:16 (Portrait)" },
  { value: "1:1", label: "1:1 (Square)" },
];

export const DURATION_OPTIONS: { value: KlingDuration; label: string }[] = [
  { value: "5", label: "5 seconds" },
  { value: "10", label: "10 seconds" },
];
