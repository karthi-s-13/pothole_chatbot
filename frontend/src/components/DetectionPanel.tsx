import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { resolveImageUrl } from "../api/client";
import type { DetectionResult } from "../types";

interface Props {
  result: DetectionResult;
}

export default function DetectionPanel({ result }: Props) {
  const hasPotholes = result.num_potholes > 0;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      <img
        src={resolveImageUrl(result.annotated_image_url)}
        alt={`Detection result for ${result.original_filename}`}
        className="h-48 w-full rounded-lg border border-stone-200 object-contain bg-stone-50 dark:border-stone-800 dark:bg-stone-800/60"
      />

      <div
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium
          ${
            hasPotholes
              ? "bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300"
              : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          }`}
      >
        {hasPotholes ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
        {hasPotholes
          ? `${result.num_potholes} pothole${result.num_potholes === 1 ? "" : "s"} detected`
          : "No potholes detected"}
      </div>

      {hasPotholes && (
        <ul className="flex flex-col gap-2">
          {result.detections.map((d, i) => (
            <li
              key={i}
              className="flex flex-col gap-1 rounded-lg border-l-2 border-orange-500 bg-stone-50 px-3 py-2 text-xs text-stone-600 dark:bg-stone-800/60 dark:text-stone-300"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium capitalize">
                  {d.class_name} #{i + 1}
                </span>
                <span className="font-medium text-orange-700 dark:text-orange-400">
                  {(d.confidence * 100).toFixed(1)}% confidence
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[10px] text-stone-500 dark:text-stone-400">
                <span className="rounded bg-stone-200 px-1.5 py-0.5 capitalize dark:bg-stone-700">
                  {d.position}
                </span>
                <span className="rounded bg-stone-200 px-1.5 py-0.5 capitalize dark:bg-stone-700">
                  {d.size_rank} · {d.relative_area_pct}% of image
                </span>
                <span className="rounded bg-stone-200 px-1.5 py-0.5 capitalize dark:bg-stone-700">
                  {d.confidence_label} confidence
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
