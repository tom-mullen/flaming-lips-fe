"use client";

import { Checkbox as HeadlessCheckbox } from "@headlessui/react";
import { CheckIcon } from "@heroicons/react/24/outline";
import { cn } from "@/app/lib/cn";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export default function Checkbox({
  checked,
  onChange,
  disabled,
  className,
}: CheckboxProps) {
  return (
    <HeadlessCheckbox
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className={cn(
        "flex size-4 shrink-0 cursor-pointer items-center justify-center rounded border transition-colors",
        "focus-ring focus-visible:ring-offset-surface focus-visible:ring-offset-1 disabled:cursor-default disabled:opacity-50",
        checked
          ? "bg-brand border-brand"
          : "bg-surface-alt border-zinc-600",
        className,
      )}
    >
      {checked && <CheckIcon className="size-3 text-black" strokeWidth={3} />}
    </HeadlessCheckbox>
  );
}
