import { useState, useCallback } from "react";
import { apiPost } from "@/app/lib/api";
import { useJobStream } from "./use-job-stream";

export function useEnrichJob(
  onItemEnriched?: (id: string, data: Record<string, unknown>) => void,
  onComplete?: () => void,
) {
  const [enriching, setEnriching] = useState(false);
  const [enrichIndex, setEnrichIndex] = useState(0);
  const [enrichTotal, setEnrichTotal] = useState(0);
  const [enrichedCount, setEnrichedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { connect } = useJobStream({
    onEvent: (data) => {
      const item = data.song as Record<string, unknown> | undefined;
      if (item && onItemEnriched) {
        onItemEnriched(item.id as string, item);
      }
      setEnrichIndex((data.index as number) ?? 0);
      setEnrichTotal((data.total as number) ?? 0);
    },
    onDone: (msg) => {
      setEnriching(false);
      setEnrichedCount(msg.progress ?? 0);
      onComplete?.();
    },
    onError: (msg) => setError(msg),
  });

  const startEnrich = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;

      setEnriching(true);
      setEnrichIndex(0);
      setEnrichTotal(ids.length);
      setEnrichedCount(0);
      setError(null);

      try {
        const job = await apiPost<{ id: string }>("/jobs", {
          type: "enrich_songs",
          params: JSON.stringify({ song_ids: ids }),
        });
        connect(job.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to start enrichment");
        setEnriching(false);
      }
    },
    [connect],
  );

  return {
    enriching,
    enrichIndex,
    enrichTotal,
    enrichedCount,
    error,
    startEnrich,
  };
}
