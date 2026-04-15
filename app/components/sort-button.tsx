"use client";

import { cn } from "@/app/lib/cn";

export default function SortButton({
  label,
  field,
  current,
  dir,
  onSort,
}: {
  label: string;
  field: string;
  current: string;
  dir: string;
  onSort: (field: string, dir: "asc" | "desc") => void;
}) {
  const isActive = current === field;
  return (
    <button
      type="button"
      onClick={() => {
        if (isActive) {
          onSort(field, dir === "asc" ? "desc" : "asc");
        } else {
          onSort(field, "asc");
        }
      }}
      className={cn(
        "focus-ring cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
        isActive
          ? "bg-surface-alt text-white"
          : "text-muted hover:text-foreground",
      )}
    >
      {label}
      {isActive && (
        <span className="ml-1">{dir === "asc" ? "\u2191" : "\u2193"}</span>
      )}
    </button>
  );
}
