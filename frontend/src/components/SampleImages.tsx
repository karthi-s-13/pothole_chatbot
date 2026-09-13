import sample1 from "../assets/sample_image/sample1.webp";
import sample2 from "../assets/sample_image/sample2.webp";
import sample3 from "../assets/sample_image/sample3.webp";

const SAMPLES = [
  { file: sample1, filename: "sample1.jpg", label: "Roadside pothole" },
  { file: sample2, filename: "sample2.jpg", label: "Water-filled potholes" },
  { file: sample3, filename: "sample3.jpg", label: "Multiple potholes" },
];

interface Props {
  onPick: (url: string, filename: string) => void;
  disabled?: boolean;
}

export default function SampleImages({ onPick, disabled }: Props) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
        <span className="text-xs font-medium uppercase tracking-wide text-stone-400">
          Or try a sample image
        </span>
        <div className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        {SAMPLES.map((s) => (
          <button
            key={s.file}
            type="button"
            disabled={disabled}
            onClick={() => onPick(s.file, s.filename)}
            className="group flex flex-col items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="block w-full overflow-hidden rounded-lg border border-stone-200 shadow-sm transition-transform group-hover:scale-[1.03] group-hover:border-orange-400 dark:border-stone-700">
              <img src={s.file} alt={s.label} className="aspect-[4/3] w-full object-cover" />
            </span>
            <span className="text-[11px] text-stone-500 dark:text-stone-400">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
