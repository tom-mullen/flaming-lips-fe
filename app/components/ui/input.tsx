import { cn } from "@/app/lib/cn";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export default function Input({ className, ...props }: InputProps) {
  return (
    <input
      autoComplete="off"
      data-1p-ignore
      data-lpignore="true"
      {...props}
      className={cn(
        "form-control focus-ring placeholder:text-muted text-white",
        className,
      )}
    />
  );
}
