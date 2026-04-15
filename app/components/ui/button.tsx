import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/app/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all cursor-pointer disabled:opacity-50 disabled:cursor-default focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
  {
    variants: {
      variant: {
        primary:
          "bg-spotify text-black font-bold hover:bg-spotify-hover active:scale-95",
        secondary:
          "border border-border text-foreground hover:text-white hover:border-border-focus",
        danger: "border border-red-500/30 text-red-400 hover:bg-red-500/15",
        ghost: "text-muted hover:text-foreground",
        white:
          "bg-white text-black font-semibold hover:bg-zinc-200 active:scale-95",
      },
      size: {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-5 py-2.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export default function Button({
  className,
  variant,
  size,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn(buttonVariants({ variant, size }), className)}
    />
  );
}

export { buttonVariants };
