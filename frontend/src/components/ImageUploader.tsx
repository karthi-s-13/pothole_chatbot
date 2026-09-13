import { useRef, useState } from "react";
import type { DragEvent } from "react";
import { ImageUp, UploadCloud } from "lucide-react";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
const MAX_SIZE_MB = 10;

interface Props {
  onAttach: (file: File) => void;
  disabled?: boolean;
}

export default function ImageUploader({ onAttach, disabled }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function validate(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Unsupported file type. Please upload a JPEG, PNG, or WEBP image.";
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File is too large. Max size is ${MAX_SIZE_MB}MB.`;
    }
    return null;
  }

  function handleFile(file: File) {
    const validationError = validate(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    onAttach(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors
          ${isDragging ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30" : "border-orange-300 dark:border-orange-900/50"}
          ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-orange-400"}`}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-600">
          <UploadCloud className="h-7 w-7 text-white" />
        </div>
        <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
          Click or drag a road image here
        </p>
        <p className="text-xs text-stone-400">JPEG, PNG, or WEBP · up to {MAX_SIZE_MB}MB</p>

        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
          className="mt-1 flex items-center gap-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-orange-500/30 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ImageUp className="h-4 w-4" />
          Choose Image
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
