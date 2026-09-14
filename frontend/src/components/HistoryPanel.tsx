import { useEffect, useState } from "react";
import { AlertCircle, ImageIcon, Loader2, MessageSquare, PanelLeftClose, PanelLeftOpen, Plus, Trash2 } from "lucide-react";
import { deleteHistoryItem, extractErrorMessage, fetchHistoryList, resolveImageUrl } from "../api/client";
import type { HistoryItem } from "../types";

interface Props {
  onSelect: (item: HistoryItem) => void;
  onNew: () => void;
  refreshTick: number;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function HistoryPanel({ onSelect, onNew, refreshTick }: Props) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetchHistoryList()
      .then(setItems)
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, [refreshTick]);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await deleteHistoryItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (activeId === id) setActiveId(null);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  function handleSelect(item: HistoryItem) {
    setActiveId(item.id);
    onSelect(item);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const todayItems     = items.filter(i => new Date(i.last_activity_at) >= today);
  const yesterdayItems = items.filter(i => { const d = new Date(i.last_activity_at); return d >= yesterday && d < today; });
  const weekItems      = items.filter(i => { const d = new Date(i.last_activity_at); return d >= weekAgo && d < yesterday; });
  const olderItems     = items.filter(i => new Date(i.last_activity_at) < weekAgo);

  const grouped: { label: string; items: HistoryItem[] }[] = [];
  if (todayItems.length)     grouped.push({ label: "Today",           items: todayItems });
  if (yesterdayItems.length) grouped.push({ label: "Yesterday",       items: yesterdayItems });
  if (weekItems.length)      grouped.push({ label: "Previous 7 Days", items: weekItems });
  if (olderItems.length)     grouped.push({ label: "Older",           items: olderItems });

  return (
    <div
      className={`flex h-full flex-col border-r border-stone-200 bg-[#F4EDE0] transition-all duration-300 dark:border-stone-800 dark:bg-stone-900 ${collapsed ? "w-14" : "w-64"}`}
    >
      {/* Header */}
      <div className={`flex shrink-0 items-center border-b border-stone-200 px-2 py-2.5 dark:border-stone-800 ${collapsed ? "justify-center" : "justify-between gap-2"}`}>
        {!collapsed && (
          <span className="text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
            History
          </span>
        )}
        <div className={`flex items-center ${collapsed ? "flex-col gap-2" : "gap-1"}`}>
          {!collapsed && (
            <button
              onClick={onNew}
              title="New detection"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-orange-100 hover:text-orange-600 dark:hover:bg-orange-950/40 dark:hover:text-orange-400"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-200 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {collapsed && (
        <div className="flex flex-col items-center gap-2 px-2 pt-3">
          <button
            onClick={onNew}
            title="New detection"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-orange-100 hover:text-orange-600 dark:hover:bg-orange-950/40 dark:hover:text-orange-400"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}

      {!collapsed && (
        <div className="flex-1 overflow-y-auto py-2">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-10 text-xs text-stone-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
            </div>
          )}
          {error && (
            <div className="mx-2 mb-2 flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-2 text-[11px] text-red-600 dark:bg-red-950/40 dark:text-red-400">
              <AlertCircle className="h-3 w-3 shrink-0" /> {error}
            </div>
          )}
          {!isLoading && !error && items.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <ImageIcon className="h-8 w-8 text-stone-300 dark:text-stone-700" />
              <p className="text-xs text-stone-400">No detections yet.</p>
              <p className="text-[11px] text-stone-400">Upload a road image to get started.</p>
            </div>
          )}
          {grouped.map(({ label, items: groupItems }) => (
            <div key={label} className="mb-1">
              <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-600">
                {label}
              </p>
              <ul className="flex flex-col gap-0.5 px-1.5">
                {groupItems.map((item) => (
                  <li key={item.id}>
                    <div
                      className={`group flex items-center gap-2 rounded-lg px-2 py-2 transition-colors ${
                        activeId === item.id
                          ? "bg-orange-100 dark:bg-orange-950/40"
                          : "hover:bg-stone-200/70 dark:hover:bg-stone-800/70"
                      }`}
                    >
                      <button
                        onClick={() => handleSelect(item)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <img
                          src={resolveImageUrl(item.annotated_image_url)}
                          alt={item.original_filename}
                          className="h-8 w-8 shrink-0 rounded-md border border-stone-200 object-cover dark:border-stone-700"
                        />
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-[12px] font-medium ${
                            activeId === item.id
                              ? "text-orange-700 dark:text-orange-300"
                              : "text-stone-700 dark:text-stone-200"
                          }`}>
                            {item.original_filename}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-stone-400">
                            <span className={`font-semibold ${item.num_potholes > 0 ? "text-orange-500" : "text-emerald-500"}`}>
                              {item.num_potholes} pothole{item.num_potholes === 1 ? "" : "s"}
                            </span>
                            {item.message_count > 0 && (
                              <span className="flex items-center gap-0.5">
                                <MessageSquare className="h-2.5 w-2.5" />
                                {item.message_count}
                              </span>
                            )}
                            <span>{relativeTime(item.last_activity_at)}</span>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, item.id)}
                        disabled={deletingId === item.id}
                        className="shrink-0 rounded-md p-1 text-stone-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 disabled:opacity-50 dark:hover:bg-red-950/30 dark:text-stone-600"
                        aria-label={`Delete ${item.original_filename}`}
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {collapsed && (
        <div className="flex flex-1 flex-col items-center gap-1.5 overflow-y-auto px-1.5 py-2">
          {items.slice(0, 20).map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              title={item.original_filename}
              className={`h-9 w-9 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                activeId === item.id ? "border-orange-500" : "border-transparent hover:border-orange-300"
              }`}
            >
              <img
                src={resolveImageUrl(item.annotated_image_url)}
                alt={item.original_filename}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}