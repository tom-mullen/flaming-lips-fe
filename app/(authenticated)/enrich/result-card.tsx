"use client";

import TrackCard from "@/app/components/track-card";
import Badge from "@/app/components/ui/badge";
import Card from "@/app/components/ui/card";
import AddButton from "./add-button";
import type { TrackResult, TrackMatchStatus, TrackCardTrack } from "@/app/lib/types";

function enrichedTrackToCardTrack(track: TrackResult["track"] & {}): TrackCardTrack {
  return {
    ...track,
    identifiers: track.isrc
      ? [{ type: "isrc", value: track.isrc }]
      : [],
  };
}

interface ResultCardProps {
  result: TrackResult;
  defaultExpanded: boolean;
}

export default function ResultCard({ result, defaultExpanded }: ResultCardProps) {
  const statusBadgeColors: Record<TrackMatchStatus, "green" | "amber" | "red"> = {
    matched: "green",
    low_confidence: "amber",
    no_match: "red",
  };

  const { name, artist, isrc, spotify_id } = result.input;
  let inputLabel: string;
  if (spotify_id) {
    inputLabel = `Search: '${spotify_id}'`;
  } else if (isrc) {
    inputLabel = `Search: '${isrc}'`;
  } else if (name || artist) {
    const parts = [name, artist].filter(Boolean).map((s) => `'${s}'`);
    inputLabel = `Search: ${parts.join(" + ")}`;
  } else {
    inputLabel = "Search: (empty)";
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-muted truncate font-mono text-xs">{inputLabel}</p>
        {result.confidence > 0 && (
          <span className="text-muted-foreground shrink-0 font-mono text-xs">
            {(result.confidence * 100).toFixed(0)}%
          </span>
        )}
        <Badge color={statusBadgeColors[result.status]} className="shrink-0">
          {result.status.replace("_", " ")}
        </Badge>
      </div>

      {result.track ? (
        <TrackCard
          track={enrichedTrackToCardTrack(result.track)}
          defaultExpanded={defaultExpanded}
          action={<AddButton track={result.track} />}
        />
      ) : (
        result.message && (
          <Card>
            <p className="text-muted text-sm">{result.message}</p>
          </Card>
        )
      )}
    </div>
  );
}
