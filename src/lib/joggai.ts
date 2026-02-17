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

export interface JoggAiTemplate {
  template_id: number | string;
  name: string;
  cover_url?: string;
  preview_url?: string;
  tags?: string[];
  category?: string;
  description?: string;
  aspect_ratio?: string;
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
    if (!data || data.code !== 0) {
      throw new Error(data?.msg || "JoggAI API error");
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

  // Get user's photo avatars (optional – gracefully returns [] on failure)
  async getPhotoAvatars(): Promise<JoggAiAvatar[]> {
    try {
      interface PhotoAvatarResponse {
        avatar_id: string;
        name: string;
        cover_url?: string;
        thumbnail_url?: string;
        status: number;
      }
      
      // Use correct endpoint for JoggAI v2
      const data = await this.request<{ avatars: PhotoAvatarResponse[] }>("/photo_avatar?page=1&limit=100", {
        method: "GET",
      });

      if (!data?.avatars) return [];

      // Convert to standardized format
      return data.avatars
        .map((a) => ({
          avatar_id: a.avatar_id,
          name: a.name,
          preview_url: a.thumbnail_url || a.cover_url,
          isPhotoAvatar: true,
          status: a.status,
        }));
    } catch (error) {
      console.warn("Could not load photo avatars (this is optional):", error);
      return [];
    }
  }

  // Get all voices
  async getVoices(): Promise<JoggAiVoice[]> {
    interface RawVoice {
      voice_id: string;
      name: string;
      language?: string;
      gender?: string;
      preview_url?: string;
      audio_url?: string;
    }
    const data = await this.request<RawVoice[] | { voices: RawVoice[] }>("/voices", {
      method: "GET",
    });
    // Handle both array response and object with voices property
    let rawVoices: RawVoice[];
    if (Array.isArray(data)) {
      rawVoices = data;
    } else if (data && typeof data === 'object' && 'voices' in data && Array.isArray(data.voices)) {
      rawVoices = data.voices;
    } else {
      return [];
    }
    // Map API 'audio_url' field to our standardized 'preview_url' field
    return rawVoices.map((v) => ({
      voice_id: v.voice_id,
      name: v.name,
      language: v.language,
      gender: v.gender,
      preview_url: v.preview_url || v.audio_url,
    }));
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
      "/upload/asset",
      {
        method: "POST",
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type,
        }),
      }
    );

    // Step 2: Upload file via edge function proxy to avoid CORS
    const formData = new FormData();
    formData.append("file", file);
    formData.append("sign_url", uploadInfo.sign_url);
    formData.append("content_type", file.type);

    const { data: uploadResult, error: uploadError } = await supabase.functions.invoke(
      "joggai-upload-proxy",
      { body: formData }
    );

    if (uploadError || !uploadResult?.success) {
      throw new Error(uploadResult?.error || uploadError?.message || "File upload failed");
    }

    return uploadInfo.asset_url;
  }

  // Create avatar video
  async createAvatarVideo(config: {
    avatarId: number | string;
    avatarType: 0 | 1;
    voiceId: string;
    script: string;
    aspectRatio?: "landscape" | "portrait" | "square";
    screenStyle?: number;
    caption?: boolean;
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
        screen_style: config.screenStyle || 1,
        caption: config.caption ?? true,
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

  // Get available templates (public/system + user's custom)
  async getTemplates(): Promise<JoggAiTemplate[]> {
    try {
      interface RawTemplate {
        id?: number | string;
        template_id?: number | string;
        name: string;
        cover_url?: string;
        preview_url?: string;
        tags?: string[];
        category?: string;
        description?: string;
        aspect_ratio?: number | string;
      }

      // Fetch both public and custom templates in parallel
      const [publicData, customData] = await Promise.all([
        this.request<RawTemplate[] | { templates: RawTemplate[] }>("/templates", { method: "GET" }),
        this.request<RawTemplate[] | { templates: RawTemplate[] }>("/templates/custom", { method: "GET" }).catch(() => [] as RawTemplate[]),
      ]);

      const extractTemplates = (data: RawTemplate[] | { templates: RawTemplate[] }): RawTemplate[] => {
        if (Array.isArray(data)) return data;
        if (data && typeof data === 'object' && 'templates' in data && Array.isArray(data.templates)) return data.templates;
        return [];
      };

      const mapAspectRatio = (ar?: number | string): string | undefined => {
        if (ar === 0 || ar === "0") return "portrait";
        if (ar === 1 || ar === "1") return "landscape";
        if (ar === 2 || ar === "2") return "square";
        if (typeof ar === "string") return ar;
        return undefined;
      };

      const publicTemplates = extractTemplates(publicData);
      const customTemplates = extractTemplates(customData);

      // Map API 'id' field to our standardized 'template_id' field
      const mapTemplate = (t: RawTemplate, isCustom = false): JoggAiTemplate => ({
        template_id: t.template_id || t.id || 0,
        name: isCustom ? `★ ${t.name}` : t.name,
        cover_url: t.cover_url,
        preview_url: t.preview_url,
        tags: t.tags,
        category: t.category,
        description: t.description,
        aspect_ratio: mapAspectRatio(t.aspect_ratio),
      });

      const mapped = [
        ...customTemplates.map(t => mapTemplate(t, true)),
        ...publicTemplates.map(t => mapTemplate(t)),
      ];

      console.log(`Loaded ${publicTemplates.length} public + ${customTemplates.length} custom templates`);
      return mapped;
    } catch (error) {
      console.warn("Could not load templates:", error);
      return [];
    }
  }

  // Known podcast-style template IDs from JoggAI's public library
  // These are the closest to "Video Podcast 2.0" templates available via API
  static readonly PODCAST_TEMPLATE_IDS = [417, 418, 419, 420, 421, 422, 431];

  // Find podcast/interview templates from the template list
  async getPodcastTemplates(): Promise<JoggAiTemplate[]> {
    const templates = await this.getTemplates();
    const podcastKeywords = ["podcast", "interview", "dialogue", "talkshow", "talk show", "remote", "conversation", "two speaker", "multi speaker", "dual"];
    // First include known podcast template IDs, then keyword matches
    const knownIds = new Set(JoggAiService.PODCAST_TEMPLATE_IDS.map(String));
    const knownTemplates = templates.filter(t => knownIds.has(String(t.template_id)));
    const keywordTemplates = templates.filter(t => {
      if (knownIds.has(String(t.template_id))) return false; // already included
      const searchText = `${t.name || ""} ${t.category || ""} ${t.description || ""} ${(t.tags || []).join(" ")}`.toLowerCase();
      return podcastKeywords.some(kw => searchText.includes(kw));
    });
    return [...knownTemplates, ...keywordTemplates];
  }

  // Get the curated Video Podcast templates specifically (the 7 known podcast templates)
  async getVideoPodcastTemplates(): Promise<JoggAiTemplate[]> {
    const templates = await this.getTemplates();
    const knownIds = new Set(JoggAiService.PODCAST_TEMPLATE_IDS.map(String));
    return templates.filter(t => knownIds.has(String(t.template_id)));
  }

  // Find UGC (user-generated content) templates
  async getUgcTemplates(): Promise<JoggAiTemplate[]> {
    const templates = await this.getTemplates();
    const ugcKeywords = ["ugc", "user generated", "testimonial", "review", "unboxing", "reaction", "creator", "influencer", "social media", "tiktok", "reel", "short"];
    return templates.filter(t => {
      const searchText = `${t.name || ""} ${t.category || ""} ${t.description || ""} ${(t.tags || []).join(" ")}`.toLowerCase();
      return ugcKeywords.some(kw => searchText.includes(kw));
    });
  }

  // Find promo/advertisement templates
  async getPromoTemplates(): Promise<JoggAiTemplate[]> {
    const templates = await this.getTemplates();
    const promoKeywords = ["promo", "promotion", "ad", "advertisement", "commercial", "product", "marketing", "brand", "sale", "offer", "discount", "launch", "announce"];
    return templates.filter(t => {
      const searchText = `${t.name || ""} ${t.category || ""} ${t.description || ""} ${(t.tags || []).join(" ")}`.toLowerCase();
      return promoKeywords.some(kw => searchText.includes(kw));
    });
  }

  // Create video from a template (JoggAI v2: POST /create_video_with_template)
  async createVideoFromTemplate(config: {
    templateId: number | string;
    variables: Array<{ type: string; name: string; properties: { content?: string; url?: string; asset_id?: number } }>;
    videoName?: string;
    avatarId?: number | string;
    avatarType?: 0 | 1;
    voiceId?: string;
    voiceLanguage?: string;
    captionsEnabled?: boolean;
  }): Promise<{ video_id: string }> {
    const body: Record<string, unknown> = {
      template_id: typeof config.templateId === "string" ? parseInt(config.templateId, 10) : config.templateId,
      variables: config.variables,
      voice_language: config.voiceLanguage || "english",
    };
    if (config.videoName) body.video_name = config.videoName;
    if (config.avatarId) {
      body.avatar_id = typeof config.avatarId === "string" ? parseInt(config.avatarId, 10) : config.avatarId;
      body.avatar_type = config.avatarType ?? 0;
    }
    if (config.voiceId) body.voice_id = config.voiceId;
    if (config.captionsEnabled !== undefined) body.captions_enabled = config.captionsEnabled;

    const data = await this.request<{ video_id: string }>("/create_video_with_template", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return data;
  }

  // Check template video status (JoggAI v2: GET /template_video/{video_id})
  async getTemplateVideoStatus(videoId: string): Promise<{
    status: string;
    video_url?: string;
    cover_url?: string;
    progress?: number;
  }> {
    const data = await this.request<{
      status: string;
      video_url?: string;
      cover_url?: string;
      progress?: number;
    }>(`/template_video/${videoId}`, {
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
