// Core types for the podcast creator

export interface DialogueLine {
  id: string;
  speaker: "speaker1" | "speaker2";
  text: string;
  voiceId?: string;
}

export interface PodcastScript {
  id: string;
  title: string;
  topic: string;
  dialogue: DialogueLine[];
  createdAt: string;
  updatedAt: string;
}

export interface Voice {
  id: string;
  name: string;
  userId?: string;
  audioSampleUrl?: string;
  joggAiVoiceId?: string;
  createdAt: string;
  isUploaded?: boolean;
}

export interface Avatar {
  id: string;
  name: string;
  userId?: string;
  photoUrl?: string;
  description?: string;
  joggAiAvatarId?: string;
  linkedVoiceId?: string;
  createdAt: string;
  isUploaded?: boolean;
}

export interface UserSettings {
  speaker1Name: string;
  speaker2Name: string;
  speaker1VoiceId?: string;
  speaker2VoiceId?: string;
  speaker1AvatarId?: string;
  speaker2AvatarId?: string;
}

export interface GeneratedVideo {
  id: string;
  scriptId: string;
  videoUrl?: string;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: Date;
}
