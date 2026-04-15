import { cn } from "@/app/lib/cn";

interface PageLayoutProps {
  children: React.ReactNode;
  maxWidth?: "4xl" | "5xl";
  className?: string;
}

export default function PageLayout({
  children,
  maxWidth = "5xl",
  className,
}: PageLayoutProps) {
  return (
    <div
      className={cn(
        "mx-auto space-y-8 px-4 py-10 sm:px-6 lg:px-8",
        maxWidth === "4xl" ? "max-w-4xl" : "max-w-5xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
