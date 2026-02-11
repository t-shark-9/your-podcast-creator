// JoggAI API Service
// All requests are proxied through Supabase Edge Functions to avoid CORS issues

import { supabase } from "@/integrations/supabase/client";

export interface JoggAiAvatar {
  avatar_id: number | string;
  name: string;
  preview_url?: string;
  gender?: string;
  cover_url?: string;
  isPhotoAvatar?: boolean;
  status?: number; // For photo avatars: 0 = processing, 1 = completed
}

export interface JoggAiVoice {
  voice_id: string;
  name: string;
  language?: string;
  gender?: string;
  preview_url?: string;
}

export interface PodcastSpeakerConfig {
  speakerName: string;
  avatarId: string | number;
  avatarType: 0 | 1; // 0 = public, 1 = photo avatar
  voiceId: string;
  avatarName?: string;
  voiceName?: string;
}

export interface CreatePhotoAvatarRequest {
  photo_url: string;
  name?: string;
  description?: string;
}

export interface CreatePhotoAvatarResponse {
  avatar_id: string;
  status: number;
}

class JoggAiService {
  private getApiKey(): string {
    return localStorage.getItem("joggai_api_key") || import.meta.env.VITE_JOGGAI_API_KEY || "";
  }

  /**
   * All JoggAI requests go through the Supabase Edge Function proxy
   * to avoid CORS issues when deployed to GitHub Pages.
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const apiKey = this.getApiKey();

    const method = options.method || "GET";
    let payload: unknown = undefined;
    if (options.body && typeof options.body === "string") {
      try {
        payload = JSON.parse(options.body);
      } catch {
        payload = options.body;
      }
    }

    const { data, error } = await supabase.functions.invoke("joggai-proxy", {
      body: {
        endpoint,
        method,
        payload,
        apiKey: apiKey || undefined, // let proxy fall back to server env var
      },
    });

    if (error) {
      throw new Error(`Supabase proxy error: ${error.message}`);
    }

    // The proxy returns the raw JoggAI response: { code, msg, data }
    if (data.code !== 0) {
      throw new Error(data.msg || "JoggAI API Fehler");
    }

    return data.data as T;
  }

  // Validate API key
  async validateApiKey(): Promise<{ email: string; username: string } | null> {
    try {
      const data = await this.request<{ email: string; username: string }>("/user/whoami", {
        method: "GET",
      });
      return data;
    } catch (error) {
      return null;
    }
  }

  // Get public avatars
  async getPublicAvatars(): Promise<JoggAiAvatar[]> {
    interface PublicAvatarResponse {
      id: number | string;
      name: string;
      cover_url?: string;
      video_url?: string;
      gender?: string;
      style?: string;
      age?: string;
      aspect_ratio?: number;
    }
    const data = await this.request<PublicAvatarResponse[] | { avatars: PublicAvatarResponse[] }>("/avatars/public", {
      method: "GET",
    });
    // Handle both array response and object with avatars property
    let rawAvatars: PublicAvatarResponse[];
    if (Array.isArray(data)) {
      rawAvatars = data;
    } else if (data && typeof data === 'object' && 'avatars' in data && Array.isArray(data.avatars)) {
      rawAvatars = data.avatars;
    } else {
      return [];
    }
    // Map API 'id' field to our standardized 'avatar_id' field
    return rawAvatars.map((a) => ({
      avatar_id: a.id,
      name: a.name,
      preview_url: a.cover_url,
      cover_url: a.cover_url,
      gender: a.gender,
    }));
  }

  // Get user's photo avatars
  async getPhotoAvatars(): Promise<JoggAiAvatar[]> {
    interface PhotoAvatarResponse {
      id: number | string;
      name: string;
      cover_url?: string;
      status: number;
    }
    const data = await this.request<{ avatars: PhotoAvatarResponse[] }>("/avatars/photo_avatars", {
      method: "GET",
    });

    if (!data?.avatars) return [];

    // Convert to standardized format and filter for completed only
    return data.avatars
      .filter((a) => a.status === 1)
      .map((a) => ({
        avatar_id: a.id,
        name: a.name,
        preview_url: a.cover_url,
        isPhotoAvatar: true,
        status: a.status,
      }));
  }

  // Get all voices
  async getVoices(): Promise<JoggAiVoice[]> {
    const data = await this.request<JoggAiVoice[] | { voices: JoggAiVoice[] }>("/voices", {
      method: "GET",
    });
    // Handle both array response and object with voices property
    if (Array.isArray(data)) {
      return data;
    }
    if (data && typeof data === 'object' && 'voices' in data && Array.isArray(data.voices)) {
      return data.voices;
    }
    return [];
  }

  // Create a photo avatar
  async createPhotoAvatar(request: CreatePhotoAvatarRequest): Promise<CreatePhotoAvatarResponse> {
    const data = await this.request<CreatePhotoAvatarResponse>("/photo_avatar/photo/generate", {
      method: "POST",
      body: JSON.stringify(request),
    });
    return data;
  }

  // Upload an asset and get the URL
  async uploadAsset(file: File): Promise<string> {
    // Step 1: Get signed upload URL (via proxy)
    const uploadInfo = await this.request<{ sign_url: string; asset_url: string }>(
      "/assets/upload_url",
      {
        method: "POST",
        body: JSON.stringify({
          file_name: file.name,
          file_type: file.type,
        }),
      }
    );

    // Step 2: Upload file to the signed URL (direct — this is cloud storage, not jogg.ai)
    await fetch(uploadInfo.sign_url, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });

    return uploadInfo.asset_url;
  }

  // Create avatar video
  async createAvatarVideo(config: {
    avatarId: number | string;
    avatarType: 0 | 1;
    voiceId: string;
    script: string;
    aspectRatio?: "landscape" | "portrait" | "square";
    backgroundColor?: string;
  }): Promise<{ video_id: string }> {
    const data = await this.request<{ video_id: string }>("/create_video_from_avatar", {
      method: "POST",
      body: JSON.stringify({
        avatar: {
          avatar_id: typeof config.avatarId === "string" ? parseInt(config.avatarId, 10) : config.avatarId,
          avatar_type: config.avatarType,
        },
        voice: {
          type: "script",
          script: config.script,
          voice_id: config.voiceId,
        },
        aspect_ratio: config.aspectRatio || "landscape",
        video_background: {
          type: "color",
          value: config.backgroundColor || "#1a1a2e",
        },
      }),
    });
    return data;
  }

  // Check video status
  async getVideoStatus(videoId: string): Promise<{
    status: string;
    video_url?: string;
    progress?: number;
  }> {
    const data = await this.request<{
      status: string;
      video_url?: string;
      progress?: number;
    }>(`/avatar_video/${videoId}`, {
      method: "GET",
    });
    return data;
  }

  // Clone voice from audio
  async cloneVoice(audioUrl: string, name: string): Promise<{ voice_id: string }> {
    const data = await this.request<{ voice_id: string }>("/voice/clone", {
      method: "POST",
      body: JSON.stringify({
        audio_url: audioUrl,
        name: name,
      }),
    });
    return data;
  }
}

export const joggAiService = new JoggAiService();
export default joggAiService;
