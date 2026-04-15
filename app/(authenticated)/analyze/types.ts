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

export type Step =
  | "drop"
  | "assign"
  | "uploading"
  | "importing"
  | "enrich"
  | "done";

export interface AnalyzeState {
  step: Step;
  droppedFiles: File[];
  assignedCatalogId: string;
  assignedCatalogName: string;
  documents: AnalyzeDocument[];
  skipped: { filename: string; reason: string }[];
  importDone: boolean;
  uploadProgress: number;
  enriching: boolean;
  enrichIndex: number;
  enrichTotal: number;
  enrichedCount: number;
  error: string | null;
}

export const INITIAL_STATE: AnalyzeState = {
  step: "drop",
  droppedFiles: [],
  assignedCatalogId: "",
  assignedCatalogName: "",
  documents: [],
  skipped: [],
  importDone: false,
  uploadProgress: 0,
  enriching: false,
  enrichIndex: 0,
  enrichTotal: 0,
  enrichedCount: 0,
  error: null,
};

export const STEP_LABELS = [
  { key: "drop", label: "Add Files" },
  { key: "assign", label: "Assign Catalog" },
  { key: "importing", label: "Import Documents" },
  { key: "enrich", label: "Enrich via Spotify" },
] as const;
