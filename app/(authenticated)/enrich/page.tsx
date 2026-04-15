"use client";

import { useState } from "react";
import { MinusCircleIcon } from "@heroicons/react/20/solid";
import Button from "@/app/components/ui/button";
import Card from "@/app/components/ui/card";
import Input from "@/app/components/ui/input";
import Alert from "@/app/components/ui/alert";
import StatCard from "@/app/components/ui/stat-card";
import SectionLabel from "@/app/components/ui/section-label";
import PageLayout from "@/app/components/ui/page-layout";
import { useEnrichTracks } from "@/app/lib/queries";
import { useEnrichStore } from "./store";
import ResultCard from "./result-card";
import type { TrackIdentifier } from "@/app/lib/types";

const emptyRow = (): TrackIdentifier => ({
  name: "",
  artist: "",
  isrc: "",
  spotify_id: "",
});

export default function EnrichPage() {
  const [rows, setRows] = useState<TrackIdentifier[]>([emptyRow()]);
  const [error, setError] = useState<string | null>(null);

  const { current, history, setCurrent, pushToHistory } = useEnrichStore();
  const enrichTracks = useEnrichTracks();

  function updateRow(
    index: number,
    field: keyof TrackIdentifier,
    value: string,
  ) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    );
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(index: number) {
    setRows((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index),
    );
  }

  async function submit() {
    setError(null);

    if (current) {
      pushToHistory(current);
    }

    setCurrent(null);

    const tracks = rows
      .map((r) => {
        const t: Record<string, string> = {};
        if (r.spotify_id) t.spotify_id = r.spotify_id;
        if (r.isrc) t.isrc = r.isrc;
        if (r.name) t.name = r.name;
        if (r.artist) t.artist = r.artist;
        return t;
      })
      .filter((t) => Object.keys(t).length > 0);

    if (tracks.length === 0) {
      setError("Add at least one track with some identifiers filled in.");
      return;
    }

    try {
      const data = await enrichTracks.mutateAsync(tracks);
      setCurrent(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    }
  }

  return (
    <PageLayout>
      <Card size="lg">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Track Identifiers
        </h2>
        <p className="text-muted-foreground mb-6 text-sm">
          Fill in any combination of fields per row. Priority: Spotify ID &gt;
          ISRC &gt; Name + Artist.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          data-1p-ignore
          data-lpignore="true"
        >
          <div className="space-y-3">
            {rows.map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-center gap-2"
              >
                <Input
                  type="text"
                  placeholder="Track name"
                  value={row.name}
                  onChange={(e) => updateRow(i, "name", e.target.value)}
                />
                <Input
                  type="text"
                  placeholder="Artist"
                  value={row.artist}
                  onChange={(e) => updateRow(i, "artist", e.target.value)}
                />
                <Input
                  type="text"
                  placeholder="ISRC"
                  value={row.isrc}
                  onChange={(e) => updateRow(i, "isrc", e.target.value)}
                />
                <Input
                  type="text"
                  placeholder="Spotify ID"
                  value={row.spotify_id}
                  onChange={(e) => updateRow(i, "spotify_id", e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  disabled={rows.length === 1}
                  className="text-muted disabled:hover:text-muted focus-ring rounded p-1 transition-colors hover:text-red-400 disabled:opacity-50"
                  aria-label="Remove row"
                >
                  <MinusCircleIcon className="size-5" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-3">
            <Button variant="secondary" onClick={addRow}>
              + Add row
            </Button>
            <Button type="submit" disabled={enrichTracks.isPending}>
              {enrichTracks.isPending ? "Enriching..." : "Enrich"}
            </Button>
          </div>

          {error && <Alert className="mt-4">{error}</Alert>}
        </form>
      </Card>

      {current && (
        <section className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total" value={current.summary.total} large />
            <StatCard
              label="Matched"
              value={current.summary.matched}
              color="text-green-400"
              large
            />
            <StatCard
              label="Low Confidence"
              value={current.summary.low_confidence}
              color="text-yellow-400"
              large
            />
            <StatCard
              label="No Match"
              value={current.summary.no_match}
              color="text-red-400"
              large
            />
          </div>
          <div className="space-y-3">
            {current.results.map((r, i) => (
              <ResultCard key={i} result={r} defaultExpanded />
            ))}
          </div>
        </section>
      )}

      {history.length > 0 && (
        <section className="space-y-4">
          <SectionLabel>Previous searches</SectionLabel>
          <div className="space-y-3">
            {history.flatMap((resp, ri) =>
              resp.results.map((r, i) => (
                <ResultCard
                  key={`${ri}-${i}`}
                  result={r}
                  defaultExpanded={false}
                />
              )),
            )}
          </div>
        </section>
      )}
    </PageLayout>
  );
}
