"use client";

import { useState, useMemo } from "react";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import MultiSelect from "@/app/components/multi-select";
import Alert from "@/app/components/ui/alert";
import Card from "@/app/components/ui/card";
import EmptyState from "@/app/components/ui/empty-state";
import Checkbox from "@/app/components/ui/checkbox";
import Badge from "@/app/components/ui/badge";
import Button from "@/app/components/ui/button";
import Pagination from "@/app/components/ui/pagination";
import { cn } from "@/app/lib/cn";
import {
  DOC_CATEGORIES,
  DOC_CATEGORY_LABELS,
  DOC_BADGE_VARIANTS,
  DOC_CATEGORY_FILTER_COLORS,
} from "@/app/lib/constants";
import { apiPost, API_URL } from "@/app/lib/api";
import { formatBytes, toggleSetItem } from "@/app/lib/utils";
import type { CatalogDocument } from "@/app/lib/types";

const PAGE_SIZE = 50;

interface DocumentsTabProps {
  catalogId: string;
  documents: CatalogDocument[];
  onRefresh: () => void;
}

export default function DocumentsTab({
  catalogId,
  documents,
  onRefresh,
}: DocumentsTabProps) {
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      categoryFilter.length > 0
        ? documents.filter((d) => categoryFilter.includes(d.category))
        : documents,
    [documents, categoryFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const counts = useMemo(
    () =>
      documents.reduce(
        (acc, d) => {
          acc[d.category] = (acc[d.category] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    [documents],
  );

  if (documents.length === 0) {
    return (
      <EmptyState>
        No documents yet. Upload files from the{" "}
        <a href="/analyze" className="text-spotify hover:underline">
          Analyze
        </a>{" "}
        page.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter + summary */}
      <div className="flex flex-wrap items-center gap-3">
        <MultiSelect
          label="All categories"
          options={[...DOC_CATEGORIES]}
          selected={categoryFilter}
          onChange={(v) => {
            setCategoryFilter(v);
            setPage(1);
          }}
          colors={DOC_CATEGORY_FILTER_COLORS}
          labels={DOC_CATEGORY_LABELS}
        />
        <div className="text-muted flex gap-3 text-xs">
          {DOC_CATEGORIES.filter((c) => counts[c]).map((c) => (
            <span key={c}>
              <span className={DOC_CATEGORY_FILTER_COLORS[c]}>{counts[c]}</span>{" "}
              {DOC_CATEGORY_LABELS[c].toLowerCase()}
            </span>
          ))}
          <span>{filtered.length} total</span>
        </div>
      </div>

      {/* Bulk actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setSelected(new Set(filtered.map((d) => d.id)))}
        >
          Select all ({filtered.length})
        </Button>
        {selected.size > 0 && (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelected(new Set())}
            >
              Clear ({selected.size})
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={async () => {
                const ids = [...selected];
                try {
                  await apiPost(`/catalogs/${catalogId}/documents/batch-delete`, { document_ids: ids });
                  setSelected(new Set());
                  onRefresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Delete failed");
                }
              }}
            >
              Delete selected ({selected.size})
            </Button>
          </>
        )}
      </div>

      {/* Document list */}
      <div className="space-y-2">
        {paged.map((doc) => (
          <Card
            key={doc.id}
            className="flex items-center gap-3 rounded-xl px-4 py-3"
          >
            <Checkbox
              checked={selected.has(doc.id)}
              onChange={() =>
                setSelected((prev) => toggleSetItem(prev, doc.id))
              }
            />
            <Badge
              color={DOC_BADGE_VARIANTS[doc.category]}
              className="shrink-0"
            >
              {DOC_CATEGORY_LABELS[doc.category]}
            </Badge>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-white">{doc.filename}</p>
              <div className="text-dimmed flex items-center gap-2 text-xs">
                <span>{doc.created_at}</span>
                {doc.payor && <span className="text-muted">{doc.payor}</span>}
              </div>
            </div>
            <span
              className={cn(
                "w-20 shrink-0 text-right text-xs font-medium",
                doc.status === "processed"
                  ? "text-green-400"
                  : doc.status === "processing"
                    ? "animate-pulse text-blue-400"
                    : "text-amber-400",
              )}
            >
              {doc.status}
            </span>
            <p className="text-dimmed w-16 shrink-0 text-right text-xs">
              {formatBytes(doc.size)}
            </p>
            <a
              href={`${API_URL}/catalogs/${catalogId}/documents/${doc.id}/download`}
              className="text-muted shrink-0 cursor-pointer transition-colors hover:text-white"
              title="Download"
            >
              <ArrowDownTrayIcon className="size-4" />
            </a>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          page={safePage}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}

      {/* Error */}
      {error && <Alert>{error}</Alert>}
    </div>
  );
}
