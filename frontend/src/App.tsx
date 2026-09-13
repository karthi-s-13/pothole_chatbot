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
    <div className="min-h-screen bg-[#F8F1E7] dark:bg-stone-950">
      <Header onHome={handleHome} onOpenHistory={() => setHistoryOpen(true)} />

      <main className="mx-auto max-w-4xl p-6">
        <div className="mb-8 flex flex-col gap-1">
          <h2 className="text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl dark:text-stone-50">
            Detect Road Damage <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">with AI</span>
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Upload a road image to detect potholes with RT-DETR, then ask the assistant about the result.
          </p>
        </div>

        {loadError && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {loadError}
          </div>
        )}

        <div className="h-[75vh] min-h-[560px]">
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
