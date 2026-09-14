import { useEffect, useState } from "react";
import Header from "./components/Header";
import ChatPanel from "./components/ChatPanel";
import type { ChatSession } from "./components/ChatPanel";
import HistoryPanel from "./components/HistoryPanel";
import DocsPage from "./components/DocsPage";
import { extractErrorMessage, fetchChatHistory, fetchDetection } from "./api/client";
import type { HistoryItem } from "./types";

function navigate(path: string) {
  if (window.location.pathname !== path) {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

export default function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [sessionKey, setSessionKey] = useState(0);
  const [initialSession, setInitialSession] = useState<ChatSession | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    function handlePopState() {
      setPathname(window.location.pathname);
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const isDocsRoute = pathname.startsWith("/docs");

  function handleNew() {
    setInitialSession(null);
    setSessionKey((k) => k + 1);
    navigate("/");
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
      navigate("/");
    } catch (err) {
      setLoadError(extractErrorMessage(err));
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F8F1E7] dark:bg-stone-950">
      <Header
        onHome={handleNew}
        onOpenDocs={() => navigate("/docs")}
        activeRoute={isDocsRoute ? "docs" : "home"}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Persistent left sidebar — only shown on home route */}
        {!isDocsRoute && (
          <HistoryPanel
            onSelect={handleSelectHistoryItem}
            onNew={handleNew}
            refreshTick={refreshTick}
          />
        )}

        <main className="flex-1 min-h-0 overflow-hidden">
          <div
            className={
              isDocsRoute
                ? "hidden"
                : "flex h-full min-h-0 w-full flex-col px-4 py-3 sm:px-6 sm:py-4"
            }
          >
            <div className="mb-2 flex flex-col shrink-0">
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
                Detect Road Damage{" "}
                <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">with AI</span>
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
              <ChatPanel
                key={sessionKey}
                initialSession={initialSession}
                onDetectionComplete={() => setRefreshTick((t) => t + 1)}
              />
            </div>
          </div>

          <div className={isDocsRoute ? "h-full w-full overflow-y-auto px-3 py-4 sm:px-6 sm:py-6" : "hidden"}>
            <DocsPage onBack={() => navigate("/")} />
          </div>
        </main>
      </div>
    </div>
  );
}
