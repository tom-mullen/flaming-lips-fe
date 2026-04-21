"use client";

import { useState, useMemo } from "react";
import WorkCard from "@/app/components/work-card";
import SortButton from "@/app/components/sort-button";
import Button from "@/app/components/ui/button";
import Alert from "@/app/components/ui/alert";
import EmptyState from "@/app/components/ui/empty-state";
import SectionLabel from "@/app/components/ui/section-label";
import RightRow from "./right-row";
import AddRightForm, { type RightFormData } from "./add-right-form";
import {
  useWorks,
  useAddRight,
  useRemoveRight,
  useBatchRemoveRights,
} from "@/app/lib/queries";
import { compareWorkEntries } from "@/app/lib/sort";
import { toggleSetItem, groupBy } from "@/app/lib/utils";
import type { Right, CatalogDocument } from "@/app/lib/types";

interface CatalogRightsTabProps {
  catalogId: string;
  rights: Right[];
  documents: CatalogDocument[];
  onRefresh: () => void;
}

export default function CatalogRightsTab({
  catalogId,
  rights,
  documents,
  onRefresh,
}: CatalogRightsTabProps) {
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [sortField, setSortField] = useState("title");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedRights, setSelectedRights] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const addRight = useAddRight(catalogId);
  const removeRight = useRemoveRight(catalogId);
  const batchRemoveRights = useBatchRemoveRights(catalogId);

  const { data: worksPage } = useWorks();
  // Memoise the fallback so downstream useMemos depending on `works`
  // don't see a new array reference every render.
  const works = useMemo(() => worksPage?.items ?? [], [worksPage?.items]);
  const workMap = useMemo(
    () => new Map(works.map((w) => [w.id, w])),
    [works],
  );

  const rightsByWork = useMemo(
    () => groupBy(rights, (r) => r.work_id),
    [rights],
  );

  const catalogWorkIds = useMemo(
    () => new Set(rightsByWork.keys()),
    [rightsByWork],
  );

  const availableWorks = useMemo(
    () => works.filter((w) => !catalogWorkIds.has(w.id)),
    [works, catalogWorkIds],
  );

  const allRightIds = useMemo(() => rights.map((r) => r.id), [rights]);

  async function handleAddRight(workId: string, data: RightFormData) {
    setError(null);
    try {
      await addRight.mutateAsync({ work_id: workId, ...data });
      setAddingFor(null);
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add right");
    }
  }

  async function handleRemoveRight(rightId: string) {
    try {
      await removeRight.mutateAsync(rightId);
      setSelectedRights((prev) => {
        const n = new Set(prev);
        n.delete(rightId);
        return n;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove right");
    }
  }

  async function handleBatchRemoveRights() {
    const ids = [...selectedRights];
    if (ids.length === 0) return;
    try {
      await batchRemoveRights.mutateAsync(ids);
      setSelectedRights(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove rights");
    }
  }

  return (
    <>
      {error && <Alert>{error}</Alert>}

      {catalogWorkIds.size > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <SectionLabel>Works in catalog</SectionLabel>
            <div className="flex items-center gap-1">
              <SortButton
                label="Title"
                field="title"
                current={sortField}
                dir={sortDir}
                onSort={(f, d) => {
                  setSortField(f);
                  setSortDir(d);
                }}
              />
              <SortButton
                label="Artist"
                field="artist"
                current={sortField}
                dir={sortDir}
                onSort={(f, d) => {
                  setSortField(f);
                  setSortDir(d);
                }}
              />
            </div>
          </div>

          {/* Rights bulk actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedRights(new Set(allRightIds))}
            >
              Select all rights ({allRightIds.length})
            </Button>
            {selectedRights.size > 0 && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedRights(new Set())}
                >
                  Clear ({selectedRights.size})
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleBatchRemoveRights}
                >
                  Delete selected ({selectedRights.size})
                </Button>
              </>
            )}
          </div>

          {[...rightsByWork.entries()]
            .sort(compareWorkEntries(sortField, sortDir, workMap))
            .map(([workId, workRights]) => {
              const work = workMap.get(workId);
              return (
                <div key={workId} className="space-y-2">
                  {work ? (
                    <WorkCard
                      work={work}
                      action={
                        <Button
                          variant="white"
                          size="sm"
                          onClick={() =>
                            setAddingFor(addingFor === workId ? null : workId)
                          }
                        >
                          + Add right
                        </Button>
                      }
                    />
                  ) : (
                    <div className="bg-surface-alt rounded-xl px-4 py-3 text-sm">
                      <span className="text-muted font-mono text-xs">
                        {workId}
                      </span>
                      <Button
                        variant="white"
                        size="sm"
                        className="ml-auto"
                        onClick={() =>
                          setAddingFor(addingFor === workId ? null : workId)
                        }
                      >
                        + Add right
                      </Button>
                    </div>
                  )}

                  <div className="ml-5 space-y-1">
                    {workRights.map((r) => (
                      <RightRow
                        key={r.id}
                        catalogId={catalogId}
                        right={r}
                        documents={documents}
                        selected={selectedRights.has(r.id)}
                        onToggle={() =>
                          setSelectedRights((prev) => toggleSetItem(prev, r.id))
                        }
                        onRemove={() => handleRemoveRight(r.id)}
                      />
                    ))}
                  </div>

                  {addingFor === workId && (
                    <AddRightForm
                      onSubmit={(data) => handleAddRight(workId, data)}
                      onCancel={() => setAddingFor(null)}
                    />
                  )}
                </div>
              );
            })}
        </section>
      )}

      {/* Add works to catalog */}
      {availableWorks.length > 0 && (
        <section className="space-y-3">
          <SectionLabel>Add from your works</SectionLabel>
          {availableWorks.map((work) => (
            <div key={work.id} className="space-y-2">
              <WorkCard
                work={work}
                action={
                  <Button
                    variant="white"
                    size="sm"
                    onClick={() =>
                      setAddingFor(addingFor === work.id ? null : work.id)
                    }
                  >
                    + Add right
                  </Button>
                }
              />
              {addingFor === work.id && (
                <AddRightForm
                  onSubmit={(data) => handleAddRight(work.id, data)}
                  onCancel={() => setAddingFor(null)}
                />
              )}
            </div>
          ))}
        </section>
      )}

      {catalogWorkIds.size === 0 && availableWorks.length === 0 && (
        <EmptyState>
          No works available. Create works first, then add rights here.
        </EmptyState>
      )}
    </>
  );
}
