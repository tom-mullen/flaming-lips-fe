"use client";

import { useState } from "react";
import Button from "@/app/components/ui/button";
import { useCreateWork } from "@/app/lib/queries";
import type { EnrichedTrack } from "@/app/lib/types";

interface AddButtonProps {
  track: EnrichedTrack;
}

export default function AddButton({ track }: AddButtonProps) {
  const [added, setAdded] = useState(false);
  const createWork = useCreateWork();

  return (
    <Button
      variant={added ? "ghost" : "white"}
      size="sm"
      disabled={added || createWork.isPending}
      className={
        added ? "bg-surface-raised text-muted-foreground cursor-default" : ""
      }
      onClick={async () => {
        try {
          await createWork.mutateAsync({
            canonical_title: track.name,
            canonical_artist: track.artist,
          });
          setAdded(true);
        } catch {
          // mutation error state handled by React Query
        }
      }}
    >
      {createWork.isPending ? "Adding..." : added ? "Added" : "+ Add as work"}
    </Button>
  );
}
