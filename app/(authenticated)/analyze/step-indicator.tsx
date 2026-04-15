import { cn } from "@/app/lib/cn";
import type { Step } from "./types";
import { STEP_LABELS } from "./types";

const STEP_ORDER: Step[] = [
  "drop",
  "assign",
  "uploading",
  "importing",
  "enrich",
  "done",
];

export default function StepIndicator({ current }: { current: Step }) {
  const currentIdx = STEP_ORDER.indexOf(current);

  return (
    <div className="flex items-center gap-2 text-xs">
      {STEP_LABELS.map((s, i) => {
        const thisIdx = STEP_ORDER.indexOf(s.key as Step);
        const isActive =
          thisIdx === currentIdx ||
          (s.key === "importing" &&
            (current === "uploading" || current === "importing")) ||
          (s.key === "enrich" && (current === "enrich" || current === "done"));
        const isPast = thisIdx < currentIdx;

        return (
          <div key={s.key} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={cn(
                  "h-px w-8",
                  isPast || isActive ? "bg-spotify" : "bg-surface-raised",
                )}
              />
            )}
            <span
              className={cn(
                "rounded-full px-3 py-1 font-semibold whitespace-nowrap",
                isActive
                  ? "bg-spotify text-black"
                  : isPast
                    ? "bg-surface-raised text-white"
                    : "bg-surface-alt text-muted",
              )}
            >
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
