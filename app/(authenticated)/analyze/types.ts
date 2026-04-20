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

// AnalyzeIngestionWarning mirrors the backend IngestionWarning struct
// carried on the ingest_complete event's `warnings` field. Scoped to a
// single (document, field) pair — a document with bad ISRCs and bad UPCs
// will produce two warnings, and a systematic + row-level problem on the
// same field is never both (systematic aborts ingestion).
//   - kind "systematic_invalid": the column failed majority-validation;
//     ingestion aborted for this document. User should fix the payor
//     mapping and re-upload.
//   - kind "row_invalid": individual rows dropped to empty; ingestion
//     proceeded. Informational.
export interface AnalyzeIngestionWarning {
  document_id: string;
  field: "isrc" | "upc";
  kind: "systematic_invalid" | "row_invalid";
  invalid_count: number;
  checked_count?: number;
  samples?: string[];
  message?: string;
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
  royaltyLinesExpectedCount: number;
  royaltyLinesCompleteCount: number;
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
  royaltyLinesExpectedCount: 0,
  royaltyLinesCompleteCount: 0,
  error: null,
};

// Royalty summary wire shape returned by
// GET /batches/{id}/royalties/summary. Monetary fields are strings —
// pgtype.Numeric JSON-marshals as a decimal string to preserve the
// precision NUMERIC(18,6) would lose in JS's native number type.
export interface RoyaltySummaryCell {
  year: number;
  quarter: number;
  total: string;
}

export interface RoyaltyCurrencyTotal {
  currency: string;
  total: string;
}

export interface RoyaltySummary {
  cells: RoyaltySummaryCell[];
  unknown_total: string;
  grand_total_usd: string;
  other_currencies: RoyaltyCurrencyTotal[];
}

export const STEP_LABELS = [
  { key: "drop", label: "Add Files" },
  { key: "assign", label: "Assign Catalog" },
  { key: "importing", label: "Import Documents" },
] as const;
