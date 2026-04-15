import { cn } from "@/app/lib/cn";

interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("bg-surface-alt animate-pulse rounded", className)} />
  );
}
