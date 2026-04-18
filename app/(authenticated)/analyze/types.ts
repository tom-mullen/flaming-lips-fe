import type { DocCategory } from "@/app/lib/types";

export interface AnalyzeDocument {
  id: string;
  catalog_id: string;
  batch_id: string;
  filename: string;
  category: DocCategory;
  status: string;
  size: number;
  created_at: string;
}

export interface AnalyzeRecordingRef {
  id: string;
  isrc?: string;
  title?: string;
  artist?: string;
}

export interface AnalyzeReleaseRef {
  id: string;
  upc?: string;
  title?: string;
}

// AnalyzeWork is the coalesced per-work view rendered under the imported
// docs summary. Backend emits one IngestWorkEvent per row (no dedupe) so
// the same work can arrive multiple times with different recording/release
// refs; the FE merges them into recordings/releases arrays keyed by id.
export interface AnalyzeWork {
  work_id: string;
  title: string;
  artist: string;
  iswc?: string;
  document_id: string;
  recordings: AnalyzeRecordingRef[];
  releases: AnalyzeReleaseRef[];
}

export type Step =
  | "drop"
  | "assign"
  | "uploading"
  | "importing"
  | "done";

export interface AnalyzeState {
  step: Step;
  droppedFiles: File[];
  assignedCatalogId: string;
  assignedCatalogName: string;
  documents: AnalyzeDocument[];
  skipped: { filename: string; reason: string }[];
  works: AnalyzeWork[];
  importDone: boolean;
  uploadProgress: number;
  parseCompleteCount: number;
  ingestCompleteCount: number;
  error: string | null;
}

export const INITIAL_STATE: AnalyzeState = {
  step: "drop",
  droppedFiles: [],
  assignedCatalogId: "",
  assignedCatalogName: "",
  documents: [],
  skipped: [],
  works: [],
  importDone: false,
  uploadProgress: 0,
  parseCompleteCount: 0,
  ingestCompleteCount: 0,
  error: null,
};

export const STEP_LABELS = [
  { key: "drop", label: "Add Files" },
  { key: "assign", label: "Assign Catalog" },
  { key: "importing", label: "Import Documents" },
] as const;
