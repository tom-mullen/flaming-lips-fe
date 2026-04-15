"use client";

import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import Badge from "./ui/badge";
import Card from "./ui/card";
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
}

export default function WorkCard({
  work,
  defaultExpanded = false,
  action,
}: WorkCardProps) {
  return (
    <Disclosure defaultOpen={defaultExpanded}>
      <Card>
        <div className="flex items-start gap-4">
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
      </Card>
    </Disclosure>
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
