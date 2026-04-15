"use client";

import type Uppy from "@uppy/core";
import { useUppyState } from "@uppy/react";
import Button from "@/app/components/ui/button";
import ProgressBar from "@/app/components/ui/progress-bar";

interface UploadStepProps {
  uppy: InstanceType<typeof Uppy>;
}

export default function UploadStep({ uppy }: UploadStepProps) {
  const totalProgress = useUppyState(uppy, (s) => s.totalProgress);
  const files = useUppyState(uppy, (s) => s.files);
  const isPaused = useUppyState(uppy, (s) => {
    return Object.values(s.files).some(
      (f) => f.progress?.uploadStarted && f.isPaused,
    );
  });

  const fileCount = Object.keys(files).length;
  const completedCount = Object.values(files).filter(
    (f) => f.progress?.uploadComplete,
  ).length;

  const label =
    totalProgress >= 100
      ? "Staging files for extraction..."
      : isPaused
        ? `Paused — ${totalProgress}%`
        : `Uploading ${completedCount}/${fileCount} — ${totalProgress}%`;

  return (
    <section className="space-y-4">
      <ProgressBar
        value={totalProgress}
        total={100}
        size="md"
        pulse={totalProgress >= 100}
        label={label}
      />
      <div className="flex items-center gap-3">
        {isPaused ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => uppy.resumeAll()}
          >
            Resume
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => uppy.pauseAll()}
          >
            Pause
          </Button>
        )}
        <Button
          variant="danger"
          size="sm"
          onClick={() => uppy.cancelAll()}
        >
          Cancel
        </Button>
      </div>
    </section>
  );
}
