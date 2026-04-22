"use client";

import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import { cn } from "@/app/lib/cn";
import Card from "./ui/card";
import SectionLabel from "./ui/section-label";
import type { TrackCardTrack, EnrichmentStatus } from "@/app/lib/types";

function formatDuration(ms: number) {
  const mins = Math.floor(ms / 60000);
  const secs = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
  return `${mins}:${secs}`;
}

// formatReleaseDate strips the time element off an ISO8601 timestamp.
// Spotify returns dates with varying precision (year-only, year-month,
// year-month-day) which the backend normalises to midnight UTC; we only
// care about the date part in the UI. Empty input passes through so the
// MetaField em-dash fallback still shows.
function formatReleaseDate(value: string): string {
  if (!value) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface TrackCardProps {
  track: TrackCardTrack;
  defaultExpanded?: boolean;
  action?: React.ReactNode;
}

export default function TrackCard({
  track,
  defaultExpanded = false,
  action,
}: TrackCardProps) {
  return (
    <Disclosure defaultOpen={defaultExpanded}>
      <Card>
        {/* Header: artwork + info + action */}
        <div className="flex items-start gap-4">
          {track.artwork_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={track.artwork_url}
              alt={track.name}
              className="size-16 shrink-0 rounded-lg object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-white">{track.name}</p>
            <p className="text-muted-foreground truncate text-sm">
              {track.artist}
            </p>
            <p className="text-muted truncate text-sm">{track.album}</p>
            {track.identifiers && track.identifiers.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {track.identifiers.map((ident) => (
                  <span
                    key={ident.id || `${ident.type}-${ident.value}`}
                    className="bg-surface-alt text-2xs text-muted-foreground inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono"
                  >
                    <span className="text-dimmed uppercase">{ident.type}</span>
                    {ident.value}
                  </span>
                ))}
              </div>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>

        {/* Collapsible metadata */}
        <DisclosurePanel>
          <div className="border-border-subtle mt-4 grid grid-cols-2 gap-x-6 gap-y-2 border-t pt-4 sm:grid-cols-3 lg:grid-cols-4">
            <MetaField label="Spotify ID" value={track.spotify_id} mono />
            {track.identifiers?.map((ident, i) => (
              <MetaField
                key={ident.id ?? `${ident.type}-${i}`}
                label={ident.type.toUpperCase()}
                value={ident.value}
                mono
              />
            ))}
            <MetaField
              label="Release Date"
              value={formatReleaseDate(track.release_date)}
            />
            <MetaField
              label="Duration"
              value={formatDuration(track.duration_ms)}
            />
            <MetaField label="Popularity" value={String(track.popularity)} />
            <MetaField label="Album" value={track.album} />
            <MetaField
              label="Artwork URL"
              value={track.artwork_url}
              mono
              link
            />
            <MetaField
              label="Preview URL"
              value={track.preview_url}
              mono
              link
            />
            <MetaField
              label="External URL"
              value={track.external_url}
              mono
              link
            />
          </div>

          {/* Enrichment history */}
          {track.enrichments && track.enrichments.length > 0 && (
            <div className="border-border-subtle mt-3 border-t pt-3">
              <SectionLabel size="sm" className="mb-2">
                Enrichment history
              </SectionLabel>
              <div className="space-y-1">
                {track.enrichments.map((e) => {
                  const statusColors: Record<EnrichmentStatus, string> = {
                    success: "text-green-400",
                    failed: "text-red-400",
                    no_match: "text-amber-400",
                    timeout: "text-red-400",
                  };
                  return (
                    <div key={e.id} className="flex items-center gap-2 text-xs">
                      <span className="text-muted">{e.source}</span>
                      <span
                        className={
                          statusColors[e.status] ?? "text-muted-foreground"
                        }
                      >
                        {e.status}
                      </span>
                      {e.error && (
                        <span className="text-dimmed truncate">{e.error}</span>
                      )}
                      <span className="text-faint ml-auto shrink-0">
                        {e.created_at}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DisclosurePanel>

        {/* Toggle */}
        <div className="mt-4 flex justify-end">
          <DisclosureButton className="text-muted hover:text-foreground focus-ring cursor-pointer rounded text-xs transition-colors">
            <span className="data-[open]:hidden">Show metadata</span>
            <span className="hidden data-[open]:inline">Hide metadata</span>
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
  link,
}: {
  label: string;
  value: string;
  mono?: boolean;
  link?: boolean;
}) {
  const empty = !value;
  return (
    <div className="min-w-0">
      <SectionLabel size="sm">{label}</SectionLabel>
      {link && !empty ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "text-brand block truncate text-sm hover:underline",
            mono && "font-mono text-xs",
          )}
        >
          {value}
        </a>
      ) : (
        <p
          className={cn(
            "truncate text-sm",
            empty ? "text-faint italic" : "text-foreground",
            mono && "font-mono text-xs",
          )}
        >
          {empty ? "—" : value}
        </p>
      )}
    </div>
  );
}
