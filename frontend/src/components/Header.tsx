import { useEffect, useState } from "react";
import { Clock, FileText, Home } from "lucide-react";
import { API_BASE_URL, checkApiHealth } from "../api/client";
import potholeLogo from "../assets/pothole_logo.webp";
import rapLogo from "../assets/rap_logo.webp";

interface Props {
  onHome: () => void;
  onOpenHistory: () => void;
}

type HealthState = "checking" | "online" | "offline";

function ApiStatusPill() {
  const [health, setHealth] = useState<HealthState>("checking");

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const ok = await checkApiHealth();
      if (!cancelled) setHealth(ok ? "online" : "offline");
    }

    void poll();
    const interval = setInterval(poll, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const dotColor =
    health === "online" ? "bg-emerald-500" : health === "offline" ? "bg-red-500" : "bg-stone-400";
  const label = health === "online" ? "API online" : health === "offline" ? "API offline" : "Checking…";

  return (
    <a
      href={`${API_BASE_URL}/api/health`}
      target="_blank"
      rel="noreferrer"
      title="Open API health check"
      className="flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:border-orange-300 hover:text-stone-900 dark:border-stone-700 dark:text-stone-300 dark:hover:text-white"
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor} ${health === "checking" ? "animate-pulse" : ""}`} />
      {label}
    </a>
  );
}

export default function Header({ onHome, onOpenHistory }: Props) {
  return (
    <header className="relative border-b border-stone-200 bg-[#F8F1E7] px-6 py-4 dark:border-stone-800 dark:bg-stone-900">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <button onClick={onHome} className="flex items-center gap-3" aria-label="Go to home">
          <img src={potholeLogo} alt="Pothole Detection" className="h-9 w-auto sm:h-10" />
          <span className="hidden border-l border-stone-300 pl-3 text-left text-xs italic leading-tight text-stone-500 sm:block dark:border-stone-700 dark:text-stone-400">
            Safer Roads
            <br />
            Stronger Communities
          </span>
        </button>

        <nav className="flex items-center gap-1.5 sm:gap-3">
          <button
            onClick={onHome}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-orange-600 transition-colors hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/30"
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Home</span>
          </button>
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-white"
          >
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </button>
          <a
            href={`${API_BASE_URL}/docs`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-white"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Docs</span>
          </a>
          <ApiStatusPill />

          <span className="mx-1 hidden h-6 w-px bg-stone-200 sm:block dark:bg-stone-700" />

          <div className="hidden items-center gap-1.5 md:flex" title="Built by Rapid Acceleration Partners">
            <span className="text-xs text-stone-400 dark:text-stone-500">Powered by</span>
            <img src={rapLogo} alt="Rapid Acceleration Partners" className="h-6 w-auto" />
          </div>
        </nav>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-orange-500/0 via-orange-500/60 to-red-600/0" />
    </header>
  );
}
