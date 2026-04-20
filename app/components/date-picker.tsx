"use client";

import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { DayPicker } from "react-day-picker";
import { CalendarIcon } from "@heroicons/react/24/outline";

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function parseDate(str: string): Date | undefined {
  if (!str) return undefined;
  const d = new Date(str + "T00:00:00Z");
  return isNaN(d.getTime()) ? undefined : d;
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const selected = parseDate(value);

  return (
    <Popover className="relative">
      <PopoverButton className="form-control focus-ring data-[open]:border-border-focus flex w-full cursor-pointer items-center gap-2 text-left">
        <CalendarIcon className="text-muted size-4 shrink-0" />
        <span className={value ? "text-white" : "text-muted"}>
          {value || placeholder}
        </span>
        {value && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onChange("");
              }
            }}
            className="text-dimmed hover:text-muted-foreground focus-ring ml-auto cursor-pointer rounded text-xs"
          >
            &times;
          </span>
        )}
      </PopoverButton>

      <PopoverPanel
        anchor="bottom start"
        transition
        className="dropdown-panel p-3"
      >
        {({ close }) => (
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(day) => {
              if (day) {
                onChange(formatDate(day));
              }
              close();
            }}
            classNames={{
              root: "text-white text-sm",
              months: "flex flex-col",
              month_caption:
                "flex justify-center items-center h-10 font-semibold text-foreground",
              nav: "flex items-center justify-between absolute inset-x-0 top-0 h-10 px-1",
              button_previous:
                "size-8 flex items-center justify-center rounded-lg hover:bg-surface-alt text-muted-foreground hover:text-white transition-colors cursor-pointer",
              button_next:
                "size-8 flex items-center justify-center rounded-lg hover:bg-surface-alt text-muted-foreground hover:text-white transition-colors cursor-pointer",
              weekdays: "flex",
              weekday: "w-9 text-center text-xs font-medium text-dimmed py-1",
              week: "flex",
              day: "w-9 h-9 flex items-center justify-center text-sm",
              day_button:
                "w-full h-full flex items-center justify-center rounded-lg hover:bg-surface-alt transition-colors cursor-pointer",
              selected: "bg-brand text-black font-semibold rounded-lg",
              today: "font-bold text-brand",
              outside: "text-faint",
              disabled: "text-zinc-800",
              chevron: "fill-current size-4",
            }}
          />
        )}
      </PopoverPanel>
    </Popover>
  );
}
