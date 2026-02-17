import { supabase } from "@/integrations/supabase/client";

// ---------- Types ----------

export interface TavusReplica {
  replica_id: string;
  replica_name: string;
  thumbnail_video_url?: string;
  training_progress?: string;
  status: "started" | "completed" | "error";
  created_at?: string;
  updated_at?: string;
  error_message?: string | null;
  replica_type?: "user" | "system";
}

export interface TavusVideo {
  video_id: string;
  video_name?: string;
  status: "queued" | "generating" | "ready" | "deleted" | "error";
  download_url?: string;
  stream_url?: string;
  hosted_url?: string;
  status_details?: string;
  created_at?: string;
  updated_at?: string;
}

// ---------- Config ----------

const TAVUS_API_KEY = "ae960a31e95f4bc895a2f6e9fff1790e";
const TAVUS_BASE_URL = "https://tavusapi.com/v2";

async function tavusRequest<T>(endpoint: string, method: "GET" | "POST" | "DELETE" = "GET", payload?: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke("joggai-proxy", {
    body: { endpoint, method, payload, apiKey: TAVUS_API_KEY, baseUrl: TAVUS_BASE_URL },
  });
  if (error) throw new Error(error.message || "Tavus proxy error");
  if (data?.error) throw new Error(data.error);
  return data as T;
}

// ---------- Replicas ----------

export async function listReplicas(): Promise<TavusReplica[]> {
  const res = await tavusRequest<{ data: TavusReplica[]; total_count: number }>("/replicas?verbose=true&limit=50");
  return res.data || [];
}

export async function getReplica(replicaId: string): Promise<TavusReplica> {
  return tavusRequest<TavusReplica>(`/replicas/${replicaId}`);
}

export async function createReplica(opts: {
  train_video_url: string;
  consent_video_url?: string;
  replica_name?: string;
}): Promise<{ replica_id: string; status: string }> {
  return tavusRequest<{ replica_id: string; status: string }>("/replicas", "POST", opts);
}

export async function deleteReplica(replicaId: string): Promise<void> {
  await tavusRequest(`/replicas/${replicaId}`, "DELETE");
}

// ---------- Videos ----------

export async function createVideo(opts: {
  replica_id: string;
  script: string;
  video_name?: string;
  background_url?: string;
  background_source_url?: string;
}): Promise<TavusVideo> {
  return tavusRequest<TavusVideo>("/videos", "POST", opts);
}

export async function getVideo(videoId: string): Promise<TavusVideo> {
  return tavusRequest<TavusVideo>(`/videos/${videoId}?verbose=true`);
}

export async function listVideos(): Promise<TavusVideo[]> {
  const res = await tavusRequest<{ data: TavusVideo[]; total_count: number }>("/videos?limit=50");
  return res.data || [];
}

// ---------- Convenience ----------

export const tavusService = {
  listReplicas,
  getReplica,
  createReplica,
  deleteReplica,
  createVideo,
  getVideo,
  listVideos,
};

export default tavusService;
