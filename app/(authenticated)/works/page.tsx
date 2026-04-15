"use client";

import { useState } from "react";
import WorkCard from "@/app/components/work-card";
import Button from "@/app/components/ui/button";
import Input from "@/app/components/ui/input";
import Alert from "@/app/components/ui/alert";
import Card from "@/app/components/ui/card";
import Checkbox from "@/app/components/ui/checkbox";
import EmptyState from "@/app/components/ui/empty-state";
import PageLayout from "@/app/components/ui/page-layout";
import SortButton from "@/app/components/sort-button";
import {
  useWorks,
  useCreateWork,
  useBatchDeleteWorks,
} from "@/app/lib/queries";
import { compareWorks } from "@/app/lib/sort";
import { pluralize, toggleSetItem } from "@/app/lib/utils";

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

  const createWork = useCreateWork();
  const batchDelete = useBatchDeleteWorks();

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

  const sorted = [...works].sort(compareWorks(sortField, sortDir));

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
        <div className="space-y-3">
          {sorted.map((work) => (
            <div key={work.id} className="flex items-start gap-3">
              <Checkbox
                checked={selected.has(work.id)}
                onChange={() =>
                  setSelected((prev) => toggleSetItem(prev, work.id))
                }
                className="mt-5"
              />
              <div className="flex-1">
                <WorkCard work={work} />
              </div>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
