import { cn } from "@/app/lib/cn";

interface FilterChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  activeClassName?: string;
}

export default function FilterChip({
  active,
  activeClassName,
  className,
  ...props
}: FilterChipProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "focus-ring focus-visible:ring-offset-canvas cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus-visible:ring-offset-2",
        active
          ? (activeClassName ?? "bg-surface-raised border-zinc-600 text-white")
          : "border-border text-muted hover:border-border-focus hover:text-foreground",
        className,
      )}
    />
  );
}
