"use client";

import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import { pluralize } from "@/app/lib/utils";

interface SkippedFilesProps {
  skipped: { filename: string; reason: string }[];
}

export default function SkippedFiles({ skipped }: SkippedFilesProps) {
  return (
    <Disclosure>
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3">
        <DisclosureButton className="focus-ring flex w-full cursor-pointer items-center gap-2 rounded text-left">
          <p className="text-sm font-semibold text-amber-400">
            {pluralize(skipped.length, "file")} not processed
          </p>
          <span className="text-xs text-amber-400/50 data-[open]:hidden">
            See details &rarr;
          </span>
          <span className="hidden text-xs text-amber-400/50 data-[open]:inline">
            Hide details
          </span>
        </DisclosureButton>
        <DisclosurePanel className="mt-2 max-h-48 space-y-1 overflow-y-auto">
          {skipped.map((s, i) => (
            <p key={i} className="truncate text-xs text-amber-400/70">
              {s.filename} — {s.reason}
            </p>
          ))}
        </DisclosurePanel>
      </div>
    </Disclosure>
  );
}
