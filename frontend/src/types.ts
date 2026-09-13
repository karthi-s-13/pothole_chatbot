export interface BoxOut {
  class_name: string;
  confidence: number;
  bbox: [number, number, number, number];
  position: string;
  relative_area_pct: number;
  confidence_label: string;
  size_rank: string;
}

export interface DetectionResult {
  id: string;
  original_filename: string;
  annotated_image_url: string;
  num_potholes: number;
  detections: BoxOut[];
  created_at: string;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  created_at: string;
}

export interface ApiErrorPayload {
  detail?: string;
}

export interface HistoryItem {
  id: string;
  original_filename: string;
  annotated_image_url: string;
  num_potholes: number;
  created_at: string;
  message_count: number;
  last_message: string | null;
  last_activity_at: string;
}
