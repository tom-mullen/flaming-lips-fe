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

// AnalyzeBatchIssue mirrors the backend BatchIssue — upload-phase
// problems persisted to `batch_issues` and served by
// GET /batches/{id}/issues. Durable (survives refresh), unlike the
// in-stream `UploadFileEvent { status: "skipped" | "error" }` events
// which fire only while the socket is open.
//   - kind "skipped": file rejected but the batch proceeded (duplicate
//     filename, unrecognised file type, etc.).
//   - kind "error":   processing failure (extraction crashed, DB insert
//     failed, enqueue failed after persistence).
export interface AnalyzeBatchIssue {
  id: string;
  batch_id: string;
  document_id?: string;
  filename: string;
  kind: "skipped" | "error";
  message: string;
  created_at: string;
}

// AnalyzeParseResultIssue mirrors the backend ParseResultIssue —
// stage-level problems on a parse_result, persisted to
// `parse_result_issues`, served by GET /parse_results/{id}/issues.
// Covers Phases 2 (parse) and 3 (ingest).
//   - kind "fatal":              generic stage failure.
//   - kind "systematic_invalid": column-mapping problem (majority of
//     ISRC/UPC values failed validation).
export interface AnalyzeParseResultIssue {
  id: string;
  parse_result_id: string;
  stage_run_id: string;
  severity: "error" | "warning";
  kind: "fatal" | "systematic_invalid";
  field?: string;
  message: string;
  context?: unknown;
  created_at: string;
}

// AnalyzeParsedRowIssue mirrors the backend ParsedRowIssue —
// row-level problems under a parse_result, persisted to
// `parsed_row_issues`, served by
// GET /parse_results/{id}/row_issues. Covers Phase 4 (royalty_lines)
// row-level processing failures.
export interface AnalyzeParsedRowIssue {
  id: string;
  parsed_row_id: string;
  stage_run_id: string;
  severity: "error" | "warning";
  field?: string;
  message: string;
  created_at: string;
}

// AnalyzeParseResult is the wire-format for
// GET /catalogs/{id}/documents/{docId}/parse_results — minimal per-
// attempt metadata used by the attempt-history panel on each issue
// card. Additional fields (column_map, summary) are deliberately
// omitted; the FE only needs timestamps + ids for the history view.
export interface AnalyzeParseResult {
  id: string;
  document_id: string;
  parser: string;
  row_count: number;
  created_at: string;
  updated_at: string;
}

// AnalyzeParseResultIssueWithDocument is the wire-format for the
// batch-scoped stage-issue endpoint
// (GET /batches/{id}/parse_result_issues). Adds `document_id` so the
// FE can render filename / download / reparse in one round-trip,
// without a per-parse_result lookup.
export interface AnalyzeParseResultIssueWithDocument
  extends AnalyzeParseResultIssue {
  document_id: string;
}

// AnalyzeParsedRowIssueWithDocument is the wire-format for the
// batch-scoped row-issue endpoint
// (GET /batches/{id}/parsed_row_issues). Adds `document_id` so the
// FE can group row issues by document directly.
export interface AnalyzeParsedRowIssueWithDocument
  extends AnalyzeParsedRowIssue {
  document_id: string;
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
