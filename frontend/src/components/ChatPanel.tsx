import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { AlertCircle, ImagePlus, Loader2, Send, Sparkles, X } from "lucide-react";
import { extractErrorMessage, sendChatMessage, uploadImageForDetection } from "../api/client";
import { fetchAsFile } from "../utils";
import type { ChatMessage, ChatRole, DetectionResult } from "../types";
import ChatBubble from "./ChatBubble";
import ImageUploader from "./ImageUploader";
import SampleImages from "./SampleImages";

interface LocalMessage {
  role: ChatRole;
  content: string;
  created_at: string;
  imageUrl?: string;
  detectionResult?: DetectionResult;
}

export interface ChatSession {
  detection: DetectionResult;
  messages: ChatMessage[];
}

function seedFromSession(session: ChatSession | null): LocalMessage[] {
  if (!session) return [];
  const { detection, messages } = session;
  const summary =
    detection.num_potholes === 0
      ? "I didn't find any potholes in this image."
      : `I found ${detection.num_potholes} pothole${detection.num_potholes === 1 ? "" : "s"} in this image.`;
  return [
    { role: "assistant", content: summary, created_at: detection.created_at, detectionResult: detection },
    ...messages.map((m) => ({ role: m.role, content: m.content, created_at: m.created_at })),
  ];
}

const SUGGESTED_QUESTIONS = [
  "How many potholes are there?",
  "How severe does this damage look?",
  "What is the largest pothole here?",
  "Is this road safe to drive on?",
];

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

interface Props {
  initialSession?: ChatSession | null;
}

export default function ChatPanel({ initialSession = null }: Props) {
  const [messages, setMessages] = useState<LocalMessage[]>(() => seedFromSession(initialSession));
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [currentDetection, setCurrentDetection] = useState<DetectionResult | null>(
    initialSession?.detection ?? null
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!pendingAttachment) {
      setAttachmentPreview(null);
      return;
    }
    const url = URL.createObjectURL(pendingAttachment);
    setAttachmentPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingAttachment]);

  useEffect(() => {
    if (messages.length === 0) return; // nothing to scroll to yet -- keep the intro content in view
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  const canSend =
    !isSending && (Boolean(pendingAttachment) || (Boolean(currentDetection) && input.trim().length > 0));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!canSend) return;

    setError(null);
    setIsSending(true);

    try {
      if (pendingAttachment) {
        // A fresh object URL, independent of the attachment-preview box's own lifecycle --
        // that one gets revoked as soon as the attachment is cleared below, which would
        // otherwise break the image already embedded in this sent message.
        const imageUrl = URL.createObjectURL(pendingAttachment);
        setMessages((prev) => [
          ...prev,
          { role: "user", content: trimmed, created_at: new Date().toISOString(), imageUrl },
        ]);
        setInput("");

        const result = await uploadImageForDetection(pendingAttachment);
        setCurrentDetection(result);
        setPendingAttachment(null);

        // Show the detection result as soon as it's ready, independent of the optional
        // follow-up chat call below -- a failed/slow chat reply should never hide a
        // successful detection.
        const summary =
          result.num_potholes === 0
            ? "I didn't find any potholes in this image. Feel free to ask me anything about it."
            : `I found ${result.num_potholes} pothole${result.num_potholes === 1 ? "" : "s"} in this image.${trimmed ? "" : ` Ask me anything about ${result.num_potholes === 1 ? "it" : "them"}.`}`;
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: summary, created_at: new Date().toISOString(), detectionResult: result },
        ]);

        if (trimmed) {
          const { reply } = await sendChatMessage(result.id, trimmed);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: reply, created_at: new Date().toISOString() },
          ]);
        }
      } else if (currentDetection) {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: trimmed, created_at: new Date().toISOString() },
        ]);
        setInput("");
        const { reply } = await sendChatMessage(currentDetection.id, trimmed);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: reply, created_at: new Date().toISOString() },
        ]);
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSending(false);
    }
  }

  function handleFilePicked(file: File) {
    const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
    const isValidType = ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.includes(ext);
    if (!isValidType) {
      setError("Unsupported file type. Please upload a JPEG, PNG, or WEBP image.");
      return;
    }
    setError(null);
    let normalized = file;
    if (!file.type || file.type === "application/octet-stream") {
      const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
      normalized = new File([file], file.name, { type: mime });
    }
    setPendingAttachment(normalized);
  }

  async function handleSamplePick(url: string, filename: string) {
    setError(null);
    try {
      const file = await fetchAsFile(url, filename);
      setPendingAttachment(file);
    } catch {
      setError("Could not load that sample image. Try again.");
    }
  }

  const showEmptyState = messages.length === 0;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center gap-2 bg-gradient-to-r from-red-800 to-red-900 px-4 py-3">
        <Sparkles className="h-4 w-4 text-orange-300" />
        <div>
          <h2 className="text-sm font-semibold text-white">Pothole Assistant</h2>
          <p className="text-xs text-red-100/80">Ask questions about detected road damage</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {showEmptyState ? (
          <div className="mx-auto flex max-w-xl flex-col items-center gap-6 pt-2 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-950/40">
                <Sparkles className="h-6 w-6 text-orange-500" />
              </div>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Attach a road image below to start a conversation about the results.
              </p>
              <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setInput(q)}
                    className="rounded-lg border border-stone-200 px-3 py-2 text-left text-xs text-stone-600 transition-colors hover:border-orange-300 hover:bg-orange-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-orange-950/20"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <ImageUploader onAttach={handleFilePicked} disabled={isSending} />
            <SampleImages onPick={handleSamplePick} disabled={isSending} />
          </div>
        ) : (
          messages.map((m, i) => (
            <ChatBubble
              key={i}
              role={m.role}
              content={m.content}
              imageUrl={m.imageUrl}
              detectionResult={m.detectionResult}
            />
          ))
        )}
        {isSending && (
          <div className="flex items-center gap-2 text-sm text-stone-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Thinking…
          </div>
        )}
      </div>

      {error && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="border-t border-stone-200 p-3 dark:border-stone-800">
        {attachmentPreview && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 p-2 dark:border-orange-900/50 dark:bg-orange-950/20">
            <img src={attachmentPreview} alt="Attached" className="h-10 w-10 rounded object-cover" />
            <span className="flex-1 truncate text-xs text-stone-600 dark:text-stone-300">
              {pendingAttachment?.name}
            </span>
            <button
              type="button"
              onClick={() => setPendingAttachment(null)}
              className="rounded-full p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-700 dark:hover:bg-stone-700"
              aria-label="Remove attachment"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-stone-300 text-stone-500 transition-colors hover:border-orange-400 hover:text-orange-600 dark:border-stone-700 dark:text-stone-400"
            aria-label="Attach an image"
            title="Attach an image"
          >
            <ImagePlus className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFilePicked(file);
              e.target.value = "";
            }}
          />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            disabled={isSending}
            placeholder={
              pendingAttachment
                ? "Add a question (optional) and send…"
                : currentDetection
                  ? "Ask about this pothole result…"
                  : "Upload an image first…"
            }
            rows={1}
            maxLength={2000}
            className="min-h-[40px] flex-1 resize-none rounded-lg border border-stone-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-orange-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-700"
          />
          <button
            type="submit"
            disabled={!canSend}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-sm shadow-orange-500/30 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
