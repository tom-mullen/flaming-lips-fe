import { cn } from "@/app/lib/cn";
import Card from "./card";
import SectionLabel from "./section-label";

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
  mono?: boolean;
  large?: boolean;
  className?: string;
}

export default function StatCard({
  label,
  value,
  color,
  mono,
  large,
  className,
}: StatCardProps) {
  return (
    <Card className={className}>
      <SectionLabel>{label}</SectionLabel>
      <p
        className={cn(
          "mt-1 truncate font-semibold",
          color ?? "text-white",
          mono && "font-mono text-sm",
          !mono && (large ? "text-2xl font-bold" : "text-lg"),
        )}
      >
        {value}
      </p>
    </Card>
  );
}
