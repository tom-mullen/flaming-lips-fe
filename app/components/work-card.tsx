"use client";

import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import { MusicalNoteIcon } from "@heroicons/react/24/outline";
import Badge from "./ui/badge";
import Card from "./ui/card";
import Checkbox from "./ui/checkbox";
import SectionLabel from "./ui/section-label";
import type { Work } from "@/app/lib/types";

const STATUS_COLORS: Record<string, "amber" | "green" | "muted"> = {
  unresolved: "amber",
  resolved: "green",
  merged: "muted",
};

interface WorkCardProps {
  work: Work;
  defaultExpanded?: boolean;
  action?: React.ReactNode;
  // Inline selection control. When provided, the checkbox lives
  // inside the card (left of the content, separated by a divider) so
  // it feels like part of the row rather than a detached element.
  selectable?: {
    checked: boolean;
    onChange: () => void;
  };
}

export default function WorkCard({
  work,
  defaultExpanded = false,
  action,
  selectable,
}: WorkCardProps) {
  // Body is the existing card content — kept as one block so the
  // selectable and non-selectable layouts share it exactly.
  const body = (
    <>
      <div className="flex items-start gap-4">
        <WorkArtwork url={work.artwork_url} title={work.canonical_title} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-white">
            {work.canonical_title}
          </p>
          <p className="text-muted-foreground truncate text-sm">
            {work.canonical_artist}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge color={STATUS_COLORS[work.status] ?? "muted"}>
              {work.status}
            </Badge>
            {work.canonical_source && (
              <span className="bg-surface-alt text-2xs text-muted-foreground inline-flex items-center rounded px-1.5 py-0.5">
                {work.canonical_source}
              </span>
            )}
            {work.iswc && (
              <span className="bg-surface-alt text-2xs text-muted-foreground inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono">
                <span className="text-dimmed">ISWC</span>
                {work.iswc}
              </span>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      <DisclosurePanel>
        <div className="border-border-subtle mt-4 grid grid-cols-2 gap-x-6 gap-y-2 border-t pt-4 sm:grid-cols-3">
          <MetaField label="ID" value={work.id} mono />
          <MetaField label="ISWC" value={work.iswc} mono />
          <MetaField label="Source" value={work.canonical_source} />
          <MetaField label="Status" value={work.status} />
          <MetaField label="Created" value={work.created_at} />
          <MetaField label="Updated" value={work.updated_at} />
          {work.merged_into_work_id && (
            <MetaField
              label="Merged Into"
              value={work.merged_into_work_id}
              mono
            />
          )}
        </div>
      </DisclosurePanel>

      <div className="mt-4 flex justify-end">
        <DisclosureButton className="text-muted hover:text-foreground focus-ring cursor-pointer rounded text-xs transition-colors">
          <span className="data-[open]:hidden">Show details</span>
          <span className="hidden data-[open]:inline">Hide details</span>
        </DisclosureButton>
      </div>
    </>
  );

  return (
    <Disclosure defaultOpen={defaultExpanded}>
      {selectable ? (
        // Split layout: the card drops its own padding so the divider
        // can span full card height; each column re-applies p-5 to
        // match the original spacing.
        <Card className="p-0">
          <div className="flex items-stretch">
            <div className="min-w-0 flex-1 p-5">{body}</div>
            <div className="border-border-subtle border-l" />
            {/*
              Whole column is a click target for the checkbox. The
              target === currentTarget guard means a click that lands
              directly on the Checkbox lets its own onChange handle it
              — this wrapper only fires for clicks in the empty space
              around it, so there's no double-toggle.
            */}
            <div
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  selectable.onChange();
                }
              }}
              className="hover:bg-surface-alt/30 flex cursor-pointer items-center justify-center px-3 transition-colors"
            >
              <Checkbox
                checked={selectable.checked}
                onChange={selectable.onChange}
              />
            </div>
          </div>
        </Card>
      ) : (
        <Card>{body}</Card>
      )}
    </Disclosure>
  );
}

// WorkArtwork renders the work's artwork thumbnail, falling back to a
// neutral placeholder when no artwork is set yet. Matches TrackCard's
// leading-thumbnail pattern (size-16 rounded).
function WorkArtwork({ url, title }: { url: string; title: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt={title}
        className="size-16 shrink-0 rounded-lg object-cover"
      />
    );
  }
  return (
    <div className="bg-surface-alt text-muted flex size-16 shrink-0 items-center justify-center rounded-lg">
      <MusicalNoteIcon className="size-7" />
    </div>
  );
}

function MetaField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const empty = !value;
  return (
    <div className="min-w-0">
      <SectionLabel size="sm">{label}</SectionLabel>
      <p
        className={`truncate text-sm ${empty ? "text-faint italic" : "text-foreground"} ${mono ? "font-mono text-xs" : ""}`}
      >
        {empty ? "\u2014" : value}
      </p>
    </div>
  );
}
