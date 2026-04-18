// ─── Shared Enums ───

export type CatalogStatus = "evaluating" | "declined" | "acquired";
export type RightType =
  | "producer"
  | "copyright"
  | "neighbouring"
  | "distribution";
export type DocCategory = "statement" | "contract" | "miscellaneous";
export type WorkStatus = "unresolved" | "resolved" | "merged";
export type WorkSource = "statement" | "enrichment" | "manual";
export type AliasSource =
  | "royalty_statement"
  | "enrichment"
  | "manual"
  | "merge";
export type RecordingEnrichmentStatus =
  | "pending"
  | "enriched"
  | "failed"
  | "skipped";
export type ReleaseType =
  | "album"
  | "single"
  | "ep"
  | "compilation"
  | "unknown";
export type EnrichmentStatus = "success" | "failed" | "no_match" | "timeout";
export type TrackMatchStatus = "matched" | "low_confidence" | "no_match";

// ─── Pagination ───

export interface Page<T> {
  items: T[];
  next_cursor?: string;
}

// ─── Works ───

export interface Work {
  id: string;
  canonical_title: string;
  canonical_artist: string;
  iswc: string;
  canonical_source: WorkSource;
  status: WorkStatus;
  merged_into_work_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Recordings ───

export interface Recording {
  id: string;
  work_id: string;
  isrc: string;
  spotify_track_uuid: string;
  title: string;
  artist: string;
  duration_ms: number;
  popularity: number;
  preview_url: string;
  artwork_url: string;
  first_release_date: string | null;
  enrichment_status: RecordingEnrichmentStatus;
  created_at: string;
  updated_at: string;
}

// ─── Aliases ───

export interface Alias {
  id: string;
  work_id: string;
  alias_title: string;
  alias_artist: string;
  source: AliasSource;
  source_ref_id: string | null;
  observation_count: number;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

// ─── Releases ───

export interface Release {
  id: string;
  upc: string;
  spotify_album_uuid: string;
  title: string;
  release_date: string | null;
  label: string;
  release_type: ReleaseType;
  artwork_url: string;
  created_at: string;
  updated_at: string;
}

export interface RecordingRelease {
  recording_id: string;
  release_id: string;
  disc_number: number;
  track_number: number;
  created_at: string;
  updated_at: string;
}

// ─── Catalogs ───

export interface Catalog {
  id: string;
  name: string;
  status: CatalogStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  documents_count: number;
  works_count: number;
}

// ─── Rights ───

export interface Right {
  id: string;
  catalog_id: string;
  work_id: string;
  document_id: string | null;
  type: RightType;
  territory: string;
  ownership: number;
  start_date: string;
  end_date: string;
  source: string;
  is_template: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Documents ───

export interface CatalogDocument {
  id: string;
  catalog_id: string;
  batch_id: string;
  filename: string;
  original_path: string;
  payor: string;
  category: DocCategory;
  status: string;
  template_right_id: string;
  size: number;
  created_at: string;
}

// ─── Enrichment (manual) — kept for future re-integration ───

export interface TrackIdentifier {
  name: string;
  artist: string;
  isrc: string;
  spotify_id: string;
}

export interface EnrichedTrack {
  spotify_id: string;
  name: string;
  artist: string;
  album: string;
  isrc: string;
  artwork_url: string;
  preview_url: string;
  external_url: string;
  release_date: string;
  popularity: number;
  duration_ms: number;
}

export interface TrackResult {
  input: TrackIdentifier;
  status: TrackMatchStatus;
  confidence: number;
  track: EnrichedTrack | null;
  message?: string;
}

export interface EnrichResponse {
  results: TrackResult[];
  summary: {
    total: number;
    matched: number;
    low_confidence: number;
    no_match: number;
  };
}

// ─── Shared track display fields (used by TrackCard — enrichment artifact) ───

export interface TrackCardIdentifier {
  id?: string;
  type: string;
  value: string;
}

export interface TrackCardEnrichment {
  id: string;
  source: string;
  status: EnrichmentStatus;
  error: string;
  created_at: string;
}

export type TrackCardTrack = {
  name: string;
  artist: string;
  album: string;
  artwork_url: string;
  preview_url: string;
  external_url: string;
  release_date: string;
  popularity: number;
  duration_ms: number;
  spotify_id: string;
  identifiers?: TrackCardIdentifier[];
  enrichments?: TrackCardEnrichment[];
};

// ─── Jobs ───

export interface Job {
  id: string;
  type: string;
  status: string;
  progress: number;
  total: number;
  params: string;
  error: string;
  created_at: string;
  updated_at: string;
}

// ─── Shared right display fields (subset used by RightRow) ───

export interface RightDisplayFields {
  type: RightType;
  territory: string;
  ownership: number;
  start_date: string;
  end_date: string;
  source: string;
  document_id?: string | null;
}

// ─── Catalog Detail (with rights) ───

export interface CatalogWithRights extends Catalog {
  rights: Right[];
}
