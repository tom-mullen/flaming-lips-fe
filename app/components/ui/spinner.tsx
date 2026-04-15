import { cn } from "@/app/lib/cn";

interface SpinnerProps {
  className?: string;
}

export default function Spinner({ className }: SpinnerProps) {
  return (
    <div
      className={cn(
        "border-spotify size-4 animate-spin rounded-full border-2 border-t-transparent",
        className,
      )}
    />
  );
}
