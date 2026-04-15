import { cn } from "@/app/lib/cn";
import Spinner from "./spinner";

interface ProgressBarProps {
  value: number;
  total: number;
  label?: string;
  pulse?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export default function ProgressBar({
  value,
  total,
  label,
  pulse,
  size = "sm",
  className,
}: ProgressBarProps) {
  const pct = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="flex items-center gap-3">
          {value < total && <Spinner />}
          <p className="text-muted-foreground text-sm">{label}</p>
        </div>
      )}
      <div
        className={cn(
          "bg-surface-alt w-full overflow-hidden rounded-full",
          size === "sm" ? "h-2" : "h-3",
        )}
      >
        <div
          className={cn(
            "bg-spotify h-full rounded-full transition-all duration-500",
            pulse && "animate-pulse",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
