import { useEffect, useRef, useState } from "react";
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  Clock,
  Cpu,
  Database,
  ExternalLink,
  FileText,
  Home,
  RefreshCw,
  Server,
  XCircle,
} from "lucide-react";
import { API_BASE_URL, getBackendHealth, type BackendHealthInfo } from "../api/client";
import potholeLogo from "../assets/pothole_logo.webp";
import rapLogo from "../assets/rap_logo.webp";

interface Props {
  onHome: () => void;
  onOpenHistory: () => void;
}

type HealthState = "checking" | "online" | "offline";

function BackendHealthPill() {
  const [health, setHealth] = useState<HealthState>("checking");
  const [info, setInfo] = useState<BackendHealthInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  async function checkHealth() {
    setIsRefreshing(true);
    const { ok, info: data } = await getBackendHealth();
    setHealth(ok ? "online" : "offline");
    if (data) {
      setInfo(data);
    }
    setIsRefreshing(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const { ok, info: data } = await getBackendHealth();
      if (!cancelled) {
        setHealth(ok ? "online" : "offline");
        if (data) setInfo(data);
      }
    }

    void poll();
    const interval = setInterval(poll, 25_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const dotColor =
    health === "online" ? "bg-emerald-500" : health === "offline" ? "bg-red-500" : "bg-amber-400";
  const pillBorder =
    health === "online"
      ? "border-emerald-200 hover:border-emerald-400 dark:border-emerald-800/60"
      : health === "offline"
        ? "border-red-200 hover:border-red-400 dark:border-red-800/60"
        : "border-stone-200 dark:border-stone-700";

  const label =
    health === "online" ? "Backend Healthy" : health === "offline" ? "Backend Offline" : "Checking...";

  const hostDisplay = (() => {
    try {
      const parsed = new URL(API_BASE_URL);
      return parsed.hostname;
    } catch {
      return API_BASE_URL;
    }
  })();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        title="View live backend service health"
        className={`flex items-center gap-1.5 rounded-full border bg-white/70 px-3 py-1.5 text-xs font-medium text-stone-700 backdrop-blur-sm transition-all dark:bg-stone-800/80 dark:text-stone-200 ${pillBorder}`}
        aria-expanded={isOpen}
      >
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${dotColor} ${
            health === "online" ? "animate-pulse" : health === "checking" ? "animate-ping" : ""
          }`}
        />
        <span>{label}</span>
        {info?.latencyMs !== undefined && health === "online" && (
          <span className="hidden text-[10px] text-emerald-600 sm:inline dark:text-emerald-400">
            ({info.latencyMs}ms)
          </span>
        )}
        <ChevronDown
          className={`h-3 w-3 text-stone-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Health Details Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 origin-top-right rounded-2xl border border-stone-200/90 bg-white/95 p-4 shadow-xl backdrop-blur-md transition-all dark:border-stone-700/80 dark:bg-stone-900/95 dark:shadow-stone-950/40">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3 dark:border-stone-800">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-orange-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-white">
                Backend Service Health
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                void checkHealth();
              }}
              title="Refresh health status"
              disabled={isRefreshing}
              className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-50 dark:hover:bg-stone-800 dark:hover:text-stone-200"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-orange-500" : ""}`} />
            </button>
          </div>

          <div className="mt-3 space-y-2.5 text-xs">
            {/* Status Summary */}
            <div className="flex items-center justify-between rounded-lg bg-stone-50 px-2.5 py-2 dark:bg-stone-800/60">
              <span className="flex items-center gap-1.5 font-medium text-stone-600 dark:text-stone-300">
                <Server className="h-3.5 w-3.5 text-stone-400" /> API Server
              </span>
              <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                {health === "online" ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Online (200 OK)
                  </>
                ) : (
                  <>
                    <XCircle className="h-3.5 w-3.5 text-red-500" /> Offline
                  </>
                )}
              </span>
            </div>

            {/* Latency */}
            {info?.latencyMs !== undefined && (
              <div className="flex items-center justify-between px-1">
                <span className="text-stone-500 dark:text-stone-400">Response Latency</span>
                <span className="font-mono text-stone-700 dark:text-stone-300">{info.latencyMs} ms</span>
              </div>
            )}

            {/* MongoDB Health */}
            <div className="flex items-center justify-between px-1">
              <span className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400">
                <Database className="h-3.5 w-3.5 text-stone-400" /> MongoDB Atlas
              </span>
              <span
                className={`font-semibold ${
                  info?.database === "connected"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-500 dark:text-amber-400"
                }`}
              >
                {info?.database === "connected" ? "Connected" : info?.database ?? "Standby"}
              </span>
            </div>

            {/* Model Health */}
            <div className="flex items-center justify-between px-1">
              <span className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400">
                <Cpu className="h-3.5 w-3.5 text-stone-400" /> RT-DETR Model
              </span>
              <span
                className={`font-semibold ${
                  info?.model === "ready"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-orange-500 dark:text-orange-400"
                }`}
              >
                {info?.model === "ready" ? "Ready" : info?.model === "warming_up" ? "Warming up" : "Active"}
              </span>
            </div>

            {/* AI Assistant */}
            <div className="flex items-center justify-between px-1">
              <span className="text-stone-500 dark:text-stone-400">AI Assistant</span>
              <span className="font-mono text-[11px] text-stone-700 dark:text-stone-300">
                {info?.llm_model ?? "openai/gpt-oss-120b"}
              </span>
            </div>

            {/* Host info */}
            <div className="flex items-center justify-between truncate border-t border-stone-100 pt-2 text-[11px] text-stone-400 dark:border-stone-800 dark:text-stone-500">
              <span className="shrink-0">Endpoint:</span>
              <span className="truncate font-mono" title={API_BASE_URL}>
                {hostDisplay}
              </span>
            </div>
          </div>

          {/* Quick links */}
          <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-stone-100 pt-2.5 dark:border-stone-800">
            <a
              href={`${API_BASE_URL}/docs`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[11px] font-medium text-orange-600 transition-colors hover:text-orange-700 dark:text-orange-400"
            >
              <FileText className="h-3 w-3" /> Swagger Docs <ExternalLink className="h-2.5 w-2.5" />
            </a>
            <a
              href={`${API_BASE_URL}/api/health`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[11px] font-medium text-stone-500 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200"
            >
              Raw Health JSON <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </div>
      )}
    </div>
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

          {/* Enhanced Backend Health Section */}
          <BackendHealthPill />

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
