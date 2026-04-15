import { cn } from "@/app/lib/cn";

interface AlertProps {
  children: React.ReactNode;
  variant?: "error" | "warning" | "info";
  className?: string;
}

const styles = {
  error: "bg-red-500/10 border-red-500/20 text-red-400",
  warning: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  info: "bg-blue-500/10 border-blue-500/20 text-blue-400",
};

export default function Alert({
  children,
  variant = "error",
  className,
}: AlertProps) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        styles[variant],
        className,
      )}
    >
      {children}
    </div>
  );
}
