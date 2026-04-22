"use client";

import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { useApplyEnrichment } from "@/app/lib/queries";
import { cn } from "@/app/lib/cn";
import type { EnrichedTrack, LookupMatches } from "@/app/lib/types";
import { useEnrichStore } from "./store";

interface UpdateButtonProps {
  track: EnrichedTrack;
  matches: LookupMatches;
}

// Shared base classes for the two halves of the split button — keeps the
// visual join (no gap, shared height/color) consistent as variants evolve.
const SPLIT_BASE =
  "inline-flex items-center bg-white text-black font-semibold text-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-default hover:bg-zinc-200 active:scale-95 focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

// UpdateButton is the "Update existing" counterpart to AddButton. The
// "has been updated" state comes from work.last_enriched_at on the
// server; that rides into the lookup response via matches.work and is
// kept fresh after a click by merging the PATCH response back into the
// persisted lookup store (session-scoped, so refresh preserves it).
export default function UpdateButton({ track, matches }: UpdateButtonProps) {
  const apply = useApplyEnrichment();
  const applyWorkEnrichment = useEnrichStore((s) => s.applyWorkEnrichment);

  const work = matches.work;
  if (!work) return null;

  async function run(overwrite: boolean) {
    try {
      const result = await apply.mutateAsync({
        workId: work!.id,
        track,
        overwrite,
      });
      applyWorkEnrichment(work!.id, result);
    } catch {
      // error state handled by React Query mutation status
    }
  }

  const lastEnriched = work.last_enriched_at
    ? new Date(work.last_enriched_at)
    : null;
  const disabled = apply.isPending;
  const buttonLabel = apply.isPending
    ? "Updating..."
    : lastEnriched
      ? "Re-update"
      : "Update";

  const sideLabel = lastEnriched
    ? `Last updated on ${formatDate(lastEnriched)}`
    : "This work exists in your portfolio";

  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground hidden text-xs sm:inline">
        {sideLabel}
      </span>
      <div className="inline-flex">
        <button
          type="button"
          disabled={disabled}
          onClick={() => run(false)}
          className={cn(
            SPLIT_BASE,
            "rounded-l-lg border-r border-zinc-300 px-3 py-1.5",
          )}
        >
          {buttonLabel}
        </button>
        <Menu>
          <MenuButton
            disabled={disabled}
            aria-label="More update options"
            className={cn(SPLIT_BASE, "rounded-r-lg px-1.5 py-1.5")}
          >
            <ChevronDownIcon className="size-4" />
          </MenuButton>
          <MenuItems
            anchor="bottom end"
            className="bg-surface-raised border-border z-10 mt-1 min-w-[14rem] rounded-lg border py-1 shadow-lg focus:outline-none"
          >
            <MenuItem>
              <button
                type="button"
                onClick={() => run(false)}
                className="text-foreground data-focus:bg-surface-alt block w-full cursor-pointer px-3 py-1.5 text-left text-xs"
              >
                Update (fill blanks only)
              </button>
            </MenuItem>
            <MenuItem>
              <button
                type="button"
                onClick={() => run(true)}
                className="text-foreground data-focus:bg-surface-alt block w-full cursor-pointer px-3 py-1.5 text-left text-xs"
              >
                Update and overwrite
              </button>
            </MenuItem>
          </MenuItems>
        </Menu>
      </div>
    </div>
  );
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
