import type { CatalogStatus, RightType, DocCategory } from "./types";

export const CATALOG_STATUSES: readonly CatalogStatus[] = [
  "evaluating",
  "declined",
  "acquired",
];

export const STATUS_COLORS: Record<CatalogStatus, string> = {
  evaluating: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  declined: "bg-red-500/15 text-red-400 border-red-500/30",
  acquired: "bg-green-500/15 text-green-400 border-green-500/30",
};

export const TYPE_COLORS: Record<RightType, string> = {
  producer: "text-blue-400",
  copyright: "text-purple-400",
  neighbouring: "text-amber-400",
  distribution: "text-teal-400",
};

// Badge CVA variant mappings — use with <Badge color={...}>
export const STATUS_BADGE_VARIANTS: Record<CatalogStatus, "amber" | "red" | "green"> =
  {
    evaluating: "amber",
    declined: "red",
    acquired: "green",
  };

export const TYPE_BADGE_VARIANTS: Record<
  RightType,
  "blue" | "purple" | "amber" | "teal"
> = {
  producer: "blue",
  copyright: "purple",
  neighbouring: "amber",
  distribution: "teal",
};

export const DOC_BADGE_VARIANTS: Record<DocCategory, "green" | "blue" | "muted"> = {
  statement: "green",
  contract: "blue",
  miscellaneous: "muted",
};

export const RIGHT_TYPES: readonly RightType[] = [
  "producer",
  "copyright",
  "neighbouring",
  "distribution",
];

export const RIGHT_TYPE_LABELS: Record<RightType, string> = {
  producer: "Producer",
  copyright: "Copyright",
  neighbouring: "Neighbouring",
  distribution: "Distribution",
};

export const DOC_CATEGORIES: readonly DocCategory[] = [
  "statement",
  "contract",
  "miscellaneous",
];

export const DOC_CATEGORY_LABELS: Record<DocCategory, string> = {
  statement: "Royalty Statement",
  contract: "Contract",
  miscellaneous: "Miscellaneous",
};

export const DOC_CATEGORY_FILTER_COLORS: Record<DocCategory, string> = {
  statement: "text-green-400",
  contract: "text-blue-400",
  miscellaneous: "text-zinc-300",
};
