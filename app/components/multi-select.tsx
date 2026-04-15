"use client";

import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import Checkbox from "./ui/checkbox";
import { cn } from "@/app/lib/cn";

export default function MultiSelect({
  label,
  options,
  selected,
  onChange,
  colors,
  labels,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  colors?: Record<string, string>;
  labels?: Record<string, string>;
}) {
  const display =
    selected.length === 0 || selected.length === options.length
      ? label
      : `${selected.length} selected`;

  return (
    <Listbox value={selected} onChange={onChange} multiple>
      <div className="relative">
        <ListboxButton className="form-control focus-ring data-[open]:border-border-focus flex min-w-[180px] cursor-pointer items-center gap-2 text-left">
          <span className={selected.length > 0 ? "text-white" : "text-muted"}>
            {display}
          </span>
          <ChevronDownIcon className="text-muted ml-auto size-4 transition-transform data-[open]:rotate-180" />
        </ListboxButton>

        <ListboxOptions
          anchor="bottom start"
          transition
          className="dropdown-panel max-h-60 w-max min-w-[var(--button-width)] overflow-y-auto py-1"
        >
          {options.map((opt) => {
            const isSelected = selected.includes(opt);
            const color = colors?.[opt];
            return (
              <ListboxOption
                key={opt}
                value={opt}
                className="data-[focus]:bg-surface-alt flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
              >
                <Checkbox checked={isSelected} onChange={() => {}} />
                <span
                  className={cn(
                    "whitespace-nowrap",
                    color && isSelected
                      ? color
                      : isSelected
                        ? "text-white"
                        : "text-muted-foreground",
                  )}
                >
                  {labels?.[opt] ?? opt}
                </span>
              </ListboxOption>
            );
          })}
          {selected.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              className="text-muted hover:text-foreground hover:bg-surface-alt border-surface-alt focus-ring w-full cursor-pointer border-t px-3 py-2 text-left text-xs transition-colors"
            >
              Clear all
            </button>
          )}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
