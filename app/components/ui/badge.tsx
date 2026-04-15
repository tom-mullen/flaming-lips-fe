import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/app/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      color: {
        default: "bg-surface-raised text-foreground",
        muted: "bg-surface-raised/60 text-foreground",
        green: "bg-green-500/15 text-green-400",
        red: "bg-red-500/15 text-red-400",
        amber: "bg-amber-500/15 text-amber-400",
        blue: "bg-blue-500/15 text-blue-400",
        purple: "bg-purple-500/15 text-purple-400",
        teal: "bg-teal-500/15 text-teal-400",
        spotify: "bg-spotify/15 text-spotify",
      },
    },
    defaultVariants: {
      color: "default",
    },
  },
);

interface BadgeProps
  extends
    Omit<React.HTMLAttributes<HTMLSpanElement>, "color">,
    VariantProps<typeof badgeVariants> {}

export default function Badge({
  children,
  className,
  color,
  ...props
}: BadgeProps) {
  return (
    <span {...props} className={cn(badgeVariants({ color }), className)}>
      {children}
    </span>
  );
}

export { badgeVariants };
