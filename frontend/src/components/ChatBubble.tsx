import ReactMarkdown from "react-markdown";
import { Bot, User } from "lucide-react";
import type { ChatRole, DetectionResult } from "../types";
import DetectionPanel from "./DetectionPanel";

interface Props {
  role: ChatRole;
  content: string;
  imageUrl?: string;
  detectionResult?: DetectionResult;
}

export default function ChatBubble({ role, content, imageUrl, detectionResult }: Props) {
  const isUser = role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full
          ${isUser ? "bg-gradient-to-br from-orange-500 to-red-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200"}`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={`flex flex-col gap-2 ${detectionResult ? "w-full max-w-[90%]" : "max-w-[80%]"}`}>
        {detectionResult && <DetectionPanel result={detectionResult} />}

        {(content || imageUrl) && (
          <div
            className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed
              ${
                isUser
                  ? "bg-gradient-to-br from-orange-500 to-red-600 text-white"
                  : "bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100"
              }`}
          >
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Uploaded road"
                className="mb-2 max-h-48 w-full rounded-lg object-cover"
              />
            )}
            {content && (
              <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
