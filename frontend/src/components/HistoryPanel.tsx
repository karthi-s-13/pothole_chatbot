import { useEffect, useState } from "react";
import { AlertCircle, Loader2, MessageSquare, Trash2, X } from "lucide-react";
import { deleteHistoryItem, extractErrorMessage, fetchHistoryList, resolveImageUrl } from "../api/client";
import type { HistoryItem } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (item: HistoryItem) => void;
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

export default function HistoryPanel({ open, onClose, onSelect }: Props) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    setError(null);
    fetchHistoryList()
      .then(setItems)
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, [open]);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await deleteHistoryItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-sm flex-col bg-white shadow-xl dark:bg-stone-900">
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-800">
          <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Detection History</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800"
            aria-label="Close history"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-stone-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          )}

          {error && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {!isLoading && !error && items.length === 0 && (
            <p className="py-10 text-center text-sm text-stone-400">No past detections yet.</p>
          )}

          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 rounded-lg border border-stone-200 p-2 transition-colors hover:border-orange-300 hover:bg-orange-50 dark:border-stone-800 dark:hover:bg-orange-950/20"
              >
                <button
                  onClick={() => onSelect(item)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <img
                    src={resolveImageUrl(item.annotated_image_url)}
                    alt={item.original_filename}
                    className="h-14 w-14 shrink-0 rounded-md border border-stone-200 object-cover dark:border-stone-700"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-stone-800 dark:text-stone-100">
                      {item.original_filename}
                    </p>
                    <p className="text-[11px] text-orange-600 dark:text-orange-400">
                      {item.num_potholes} pothole{item.num_potholes === 1 ? "" : "s"}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-stone-400">
                      {item.message_count > 0 && (
                        <span className="flex items-center gap-0.5">
                          <MessageSquare className="h-3 w-3" />
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
                  className="shrink-0 rounded-full p-1.5 text-stone-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/30"
                  aria-label={`Delete ${item.original_filename}`}
                >
                  {deletingId === item.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
