"use client";

import { useCallback, useState } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import WorkCard from "@/app/components/work-card";
import Button from "@/app/components/ui/button";
import Input from "@/app/components/ui/input";
import Alert from "@/app/components/ui/alert";
import Card from "@/app/components/ui/card";
import EmptyState from "@/app/components/ui/empty-state";
import PageLayout from "@/app/components/ui/page-layout";
import Pagination from "@/app/components/ui/pagination";
import SortButton from "@/app/components/sort-button";
import {
  useWorks,
  useCreateWork,
  useBatchDeleteWorks,
  useEnrichWorks,
  queries,
} from "@/app/lib/queries";
import { useJobStream } from "@/app/lib/hooks/use-job-stream";
import { useQueryClient } from "@tanstack/react-query";
import { compareWorks } from "@/app/lib/sort";
import { pluralize, toggleSetItem } from "@/app/lib/utils";
import { cn } from "@/app/lib/cn";

// Shared base for the split-button halves (matches UpdateButton on the
// enrich page).
const SPLIT_BASE =
  "inline-flex items-center bg-brand text-black font-bold text-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-default hover:bg-brand-hover active:scale-95 focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

// enrichProgress tracks the live counters updated from the WebSocket
// stream. `total` is fixed at submit time; `current` increments once
// per `work_enriched` event. matched/skipped roll up recording counts
// across every event so the end-state banner is informative.
interface EnrichProgress {
  running: boolean;
  current: number;
  total: number;
  matched: number;
  added: number;
  skipped: number;
  notes: string[];
  error: string | null;
}

const initialProgress: EnrichProgress = {
  running: false,
  current: 0,
  total: 0,
  matched: 0,
  added: 0,
  skipped: 0,
  notes: [],
  error: null,
};

const PAGE_SIZE = 50;

export default function WorksPage() {
  const { data } = useWorks();
  const works = data?.items ?? [];

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newArtist, setNewArtist] = useState("");
  const [sortField, setSortField] = useState("title");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [enrich, setEnrich] = useState<EnrichProgress>(initialProgress);

  const qc = useQueryClient();
  const createWork = useCreateWork();
  const batchDelete = useBatchDeleteWorks();
  const enrichWorks = useEnrichWorks();

  const { connect } = useJobStream({
    onEvent: useCallback((data: Record<string, unknown>) => {
      if (data.type !== "work_enriched") return;
      const matched = (data.recordings_matched as number | undefined) ?? 0;
      const added = (data.recordings_added as number | undefined) ?? 0;
      const skipped = (data.recordings_skipped as number | undefined) ?? 0;
      const notes = (data.notes as string[] | undefined) ?? [];
      setEnrich((p) => ({
        ...p,
        current: p.current + 1,
        matched: p.matched + matched,
        added: p.added + added,
        skipped: p.skipped + skipped,
        notes: notes.length > 0 ? [...p.notes, ...notes] : p.notes,
      }));
    }, []),
    onDone: useCallback(() => {
      setEnrich((p) => ({ ...p, running: false }));
      qc.invalidateQueries({ queryKey: queries.works._def });
      qc.invalidateQueries({ queryKey: queries.recordings._def });
      setSelected(new Set());
    }, [qc]),
    onError: useCallback((msg: string) => {
      setEnrich((p) => ({ ...p, error: msg, running: false }));
    }, []),
  });

  async function handleCreate() {
    if (!newTitle.trim() || !newArtist.trim()) return;
    setError(null);
    try {
      await createWork.mutateAsync({
        canonical_title: newTitle.trim(),
        canonical_artist: newArtist.trim(),
      });
      setNewTitle("");
      setNewArtist("");
      setCreating(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    }
  }

  async function handleDeleteSelected() {
    setError(null);
    try {
      await batchDelete.mutateAsync([...selected]);
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function handleEnrichSelected(overwrite: boolean) {
    const ids = [...selected];
    if (ids.length === 0) return;
    setError(null);
    setEnrich({
      running: true,
      current: 0,
      total: ids.length,
      matched: 0,
      added: 0,
      skipped: 0,
      notes: [],
      error: null,
    });
    try {
      const job = await enrichWorks.mutateAsync({ work_ids: ids, overwrite });
      connect(`/jobs/${job.id}/stream`);
    } catch (e) {
      setEnrich(initialProgress);
      setError(e instanceof Error ? e.message : "Failed to start enrichment");
    }
  }

  const sorted = [...works].sort(compareWorks(sortField, sortDir));
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const enrichLabel = enrich.running
    ? `Enriching… (${enrich.current}/${enrich.total})`
    : `Enrich selected (${selected.size})`;

  return (
    <PageLayout className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          Works
          {works.length > 0 && (
            <span className="text-muted ml-2 text-sm font-normal">
              {pluralize(works.length, "work")}
            </span>
          )}
        </h2>
        <Button onClick={() => setCreating(!creating)}>
          {creating ? "Cancel" : "+ New work"}
        </Button>
      </div>

      {creating && (
        <Card size="lg" className="space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
            className="flex flex-wrap gap-3"
          >
            <Input
              type="text"
              placeholder="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1"
            />
            <Input
              type="text"
              placeholder="Artist"
              value={newArtist}
              onChange={(e) => setNewArtist(e.target.value)}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={createWork.isPending || !newTitle.trim() || !newArtist.trim()}
            >
              Create
            </Button>
          </form>
        </Card>
      )}

      {error && <Alert>{error}</Alert>}

      {enrich.error && <Alert>{enrich.error}</Alert>}

      {(enrich.running || enrich.current > 0) && (
        <Card>
          <p className="text-sm text-white">
            {enrich.running
              ? `Enriching ${enrich.current} of ${enrich.total} works…`
              : `Enrichment complete — ${enrich.current} of ${enrich.total} works processed.`}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Recordings matched: {enrich.matched} · added: {enrich.added} ·
            skipped: {enrich.skipped}
          </p>
          {enrich.notes.length > 0 && (
            <ul className="text-muted-foreground mt-3 space-y-1 border-t border-border-subtle pt-3 text-xs">
              {enrich.notes.map((note, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden="true">•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {works.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
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
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelected(new Set(works.map((w) => w.id)))}
            >
              Select all ({works.length})
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
                <div className="inline-flex">
                  <button
                    type="button"
                    disabled={enrich.running}
                    onClick={() => handleEnrichSelected(false)}
                    className={cn(
                      SPLIT_BASE,
                      "rounded-l-lg border-r border-black/20 px-3 py-1.5 text-xs",
                    )}
                  >
                    {enrichLabel}
                  </button>
                  <Menu>
                    <MenuButton
                      disabled={enrich.running}
                      aria-label="More enrich options"
                      className={cn(
                        SPLIT_BASE,
                        "rounded-r-lg px-1.5 py-1.5",
                      )}
                    >
                      <ChevronDownIcon className="size-4" />
                    </MenuButton>
                    <MenuItems
                      anchor="bottom end"
                      className="bg-surface-raised border-border z-10 mt-1 min-w-[14rem] rounded-lg border py-1 shadow-lg focus:outline-none"
                    >
                      <MenuItem>
                        <button
                          type="button"
                          onClick={() => handleEnrichSelected(false)}
                          className="text-foreground data-focus:bg-surface-alt block w-full cursor-pointer px-3 py-1.5 text-left text-xs"
                        >
                          Enrich (fill blanks only)
                        </button>
                      </MenuItem>
                      <MenuItem>
                        <button
                          type="button"
                          onClick={() => handleEnrichSelected(true)}
                          className="text-foreground data-focus:bg-surface-alt block w-full cursor-pointer px-3 py-1.5 text-left text-xs"
                        >
                          Enrich and overwrite
                        </button>
                      </MenuItem>
                    </MenuItems>
                  </Menu>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDeleteSelected}
                >
                  Delete selected ({selected.size})
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {works.length === 0 ? (
        <EmptyState>
          No works yet. Create a work manually or import documents from the
          Analyze page.
        </EmptyState>
      ) : (
        <>
          <div className="space-y-3">
            {paged.map((work) => (
              <WorkCard
                key={work.id}
                work={work}
                selectable={{
                  checked: selected.has(work.id),
                  onChange: () =>
                    setSelected((prev) => toggleSetItem(prev, work.id)),
                }}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination
              page={safePage}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </PageLayout>
  );
}
