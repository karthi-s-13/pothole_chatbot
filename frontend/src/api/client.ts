import axios, { AxiosError } from "axios";
import type { ApiErrorPayload, ChatMessage, DetectionResult, HistoryItem } from "../types";

function resolveDefaultApiBase(): string {
  const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

  // If running in a browser on a live domain (e.g. Vercel), never call localhost
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
    if (!isLocal && (!rawBaseUrl || rawBaseUrl.includes("localhost") || rawBaseUrl.includes("127.0.0.1"))) {
      return "https://pothole-chatbot.onrender.com";
    }
  }

  if (rawBaseUrl) {
    return rawBaseUrl.replace(/\/+$/, "");
  }

  if (import.meta.env.PROD) {
    return "https://pothole-chatbot.onrender.com";
  }

  return "http://localhost:8000";
}

const API_BASE_URL = resolveDefaultApiBase();

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120_000, // model inference can take a few seconds on CPU
});

/** Turns any error from an API call into a single human-readable message. */
export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorPayload>;
    if (axiosError.response?.data?.detail) {
      return axiosError.response.data.detail;
    }
    if (axiosError.code === "ECONNABORTED") {
      return "The request timed out. The server may be busy — try again.";
    }
    if (!axiosError.response) {
      return "Could not reach the server. Is the backend running?";
    }
    return `Request failed (${axiosError.response.status}).`;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

export async function uploadImageForDetection(file: File): Promise<DetectionResult> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await client.post<DetectionResult>("/api/detect", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function sendChatMessage(
  detectionId: string,
  message: string
): Promise<{ reply: string; history: ChatMessage[] }> {
  const { data } = await client.post<{ reply: string; history: ChatMessage[] }>("/api/chat", {
    detection_id: detectionId,
    message,
  });
  return data;
}

export async function fetchDetection(detectionId: string): Promise<DetectionResult> {
  const { data } = await client.get<DetectionResult>(`/api/detections/${detectionId}`);
  return data;
}

export async function fetchChatHistory(detectionId: string): Promise<ChatMessage[]> {
  const { data } = await client.get<ChatMessage[]>(`/api/chat/${detectionId}`);
  return data;
}

export async function fetchHistoryList(limit = 50): Promise<HistoryItem[]> {
  const { data } = await client.get<HistoryItem[]>("/api/history", { params: { limit } });
  return data;
}

export async function deleteHistoryItem(detectionId: string): Promise<void> {
  await client.delete(`/api/history/${detectionId}`);
}

export function resolveImageUrl(path: string): string {
  if (path.startsWith("http")) return path;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

export interface BackendHealthInfo {
  status: string;
  backend?: string;
  database?: string;
  model?: string;
  vision_model?: string;
  llm_model?: string;
  latencyMs?: number;
}

export async function getBackendHealth(): Promise<{ ok: boolean; info?: BackendHealthInfo }> {
  const start = performance.now();
  try {
    const { status, data } = await client.get<BackendHealthInfo>("/api/health", { timeout: 8_000 });
    const latencyMs = Math.round(performance.now() - start);
    return {
      ok: status === 200,
      info: { ...data, latencyMs },
    };
  } catch {
    return { ok: false };
  }
}

export async function checkApiHealth(): Promise<boolean> {
  const { ok } = await getBackendHealth();
  return ok;
}

export { API_BASE_URL };
