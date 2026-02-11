// JoggAI API Service
// Handles all interactions with the JoggAI API

const API_BASE = "https://api.jogg.ai/v2";

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

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error("JoggAI API Key nicht konfiguriert");
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const data = await response.json();

    if (data.code !== 0) {
      throw new Error(data.msg || "JoggAI API Fehler");
    }

    return data.data;
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
    const data = await this.request<JoggAiAvatar[] | { avatars: JoggAiAvatar[] }>("/avatars/public", {
      method: "GET",
    });
    // Handle both array response and object with avatars property
    if (Array.isArray(data)) {
      return data;
    }
    if (data && typeof data === 'object' && 'avatars' in data && Array.isArray(data.avatars)) {
      return data.avatars;
    }
    return [];
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
    // Step 1: Get signed upload URL
    const uploadInfo = await this.request<{ sign_url: string; asset_url: string }>(
      "/upload/asset",
      {
        method: "POST",
        body: JSON.stringify({
          file_name: file.name,
          file_type: file.type,
        }),
      }
    );

    // Step 2: Upload file to signed URL
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
