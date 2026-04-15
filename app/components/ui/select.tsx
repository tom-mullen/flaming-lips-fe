"use client";

import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { ChevronUpDownIcon, CheckIcon } from "@heroicons/react/24/outline";
import { cn } from "@/app/lib/cn";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
}

export default function Select({
  value,
  onChange,
  options,
  className,
}: SelectProps) {
  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;

  return (
    <Listbox value={value} onChange={onChange}>
      <div className={cn("relative", className)}>
        <ListboxButton className="form-control focus-ring data-[open]:border-border-focus flex w-full cursor-pointer items-center justify-between text-left text-white">
          <span className="truncate">{selectedLabel}</span>
          <ChevronUpDownIcon className="text-muted ml-2 size-4 shrink-0" />
        </ListboxButton>

        <ListboxOptions
          anchor="bottom start"
          transition
          className="dropdown-panel max-h-60 min-w-[var(--button-width)] overflow-y-auto py-1"
        >
          {options.map((opt) => (
            <ListboxOption
              key={opt.value}
              value={opt.value}
              className="data-[focus]:bg-surface-alt flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm transition-colors"
            >
              {({ selected }) => (
                <>
                  <span
                    className={
                      selected
                        ? "font-medium text-white"
                        : "text-muted-foreground"
                    }
                  >
                    {opt.label}
                  </span>
                  {selected && (
                    <CheckIcon
                      className="text-spotify size-4 shrink-0"
                      strokeWidth={2.5}
                    />
                  )}
                </>
              )}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
