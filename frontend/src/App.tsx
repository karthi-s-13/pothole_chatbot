import { useState } from "react";
import Header from "./components/Header";
import ChatPanel from "./components/ChatPanel";
import type { ChatSession } from "./components/ChatPanel";
import HistoryPanel from "./components/HistoryPanel";
import { extractErrorMessage, fetchChatHistory, fetchDetection } from "./api/client";
import type { HistoryItem } from "./types";

export default function App() {
  const [sessionKey, setSessionKey] = useState(0);
  const [initialSession, setInitialSession] = useState<ChatSession | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  function handleHome() {
    setInitialSession(null);
    setSessionKey((k) => k + 1);
  }

  async function handleSelectHistoryItem(item: HistoryItem) {
    setLoadError(null);
    try {
      const [detection, messages] = await Promise.all([
        fetchDetection(item.id),
        fetchChatHistory(item.id),
      ]);
      setInitialSession({ detection, messages });
      setSessionKey((k) => k + 1);
      setHistoryOpen(false);
    } catch (err) {
      setLoadError(extractErrorMessage(err));
    }
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#F8F1E7] dark:bg-stone-950">
      <Header onHome={handleHome} onOpenHistory={() => setHistoryOpen(true)} />

      <main className="flex-1 min-h-0 flex flex-col px-3 py-2 sm:px-6 sm:py-3 max-w-5xl w-full mx-auto">
        <div className="mb-2 flex flex-col shrink-0">
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
            Detect Road Damage <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">with AI</span>
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Upload a road image to detect potholes with RT-DETR, then ask the assistant about the result.
          </p>
        </div>

        {loadError && (
          <div className="mb-2 shrink-0 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {loadError}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-hidden">
          <ChatPanel key={sessionKey} initialSession={initialSession} />
        </div>
      </main>

      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelect={handleSelectHistoryItem}
      />
    </div>
  );
}
