import { cn } from "@/app/lib/cn";

interface SectionLabelProps {
  children: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
}

export default function SectionLabel({
  children,
  size = "md",
  className,
}: SectionLabelProps) {
  return (
    <p
      className={cn(
        "font-medium tracking-wider uppercase",
        size === "sm" ? "text-2xs text-dimmed" : "text-muted text-xs",
        className,
      )}
    >
      {children}
    </p>
  );
}
