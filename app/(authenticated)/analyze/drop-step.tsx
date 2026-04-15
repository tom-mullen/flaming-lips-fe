"use client";

import { useRef, useState } from "react";
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import { cn } from "@/app/lib/cn";

export default function DropStep({
  onFilesSelected,
}: {
  onFilesSelected: (files: File[]) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFiles(fileList: FileList) {
    onFilesSelected(Array.from(fileList));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={cn(
        "bg-surface focus-ring cursor-pointer rounded-2xl border-2 border-dashed p-16 text-center transition-colors",
        dragOver
          ? "border-spotify bg-spotify/5"
          : "border-border hover:border-border-focus",
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
      <ArrowUpTrayIcon className="text-dimmed mx-auto mb-3 size-10" />
      <p className="font-semibold text-white">
        Drop files or a zip folder here
      </p>
      <p className="text-muted mt-1 text-sm">or click to browse</p>
      <p className="text-dimmed mt-3 text-xs">
        ZIP files are extracted server-side, including nested folders and zips
      </p>
    </div>
  );
}
