import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/app/lib/cn";

const cardVariants = cva("", {
  variants: {
    variant: {
      default: "bg-surface",
      muted: "bg-surface-alt/50",
    },
    size: {
      sm: "rounded-lg px-4 py-2.5",
      md: "rounded-xl p-5",
      lg: "rounded-2xl p-6",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});

interface CardProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export default function Card({
  className,
  variant,
  size,
  ...props
}: CardProps) {
  return (
    <div
      {...props}
      className={cn(cardVariants({ variant, size }), className)}
    />
  );
}

export { cardVariants };
