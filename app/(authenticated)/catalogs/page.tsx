"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/app/components/ui/button";
import Input from "@/app/components/ui/input";
import Alert from "@/app/components/ui/alert";
import Card from "@/app/components/ui/card";
import FilterChip from "@/app/components/ui/filter-chip";
import PageLayout from "@/app/components/ui/page-layout";
import Badge from "@/app/components/ui/badge";
import {
  useCatalogs,
  useCreateCatalog,
  useDeleteCatalog,
  useUpdateCatalog,
} from "@/app/lib/queries";
import {
  CATALOG_STATUSES,
  STATUS_COLORS,
  STATUS_BADGE_VARIANTS,
} from "@/app/lib/constants";
import { pluralize } from "@/app/lib/utils";

export default function CatalogsPage() {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data } = useCatalogs();
  const catalogs = data?.items ?? [];
  const createCatalog = useCreateCatalog();
  const deleteCatalog = useDeleteCatalog();
  const updateCatalog = useUpdateCatalog();

  async function handleCreate() {
    if (!newName.trim()) return;
    setError(null);
    try {
      await createCatalog.mutateAsync(newName.trim());
      setNewName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCatalog.mutateAsync(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      await updateCatalog.mutateAsync({ id, status });
      setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status change failed");
    }
  }

  return (
    <PageLayout>
      <Card size="lg">
        <h2 className="mb-4 text-lg font-semibold text-white">Catalogs</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
          className="flex gap-3"
        >
          <Input
            type="text"
            placeholder="New catalog name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={createCatalog.isPending || !newName.trim()}
          >
            Create
          </Button>
        </form>
        {error && <Alert className="mt-4">{error}</Alert>}
      </Card>

      {catalogs.length > 0 && (
        <div className="flex items-center gap-2">
          <FilterChip
            active={statusFilter === null}
            onClick={() => setStatusFilter(null)}
          >
            All
          </FilterChip>
          {CATALOG_STATUSES.map((s) => (
            <FilterChip
              key={s}
              active={statusFilter === s}
              activeClassName={STATUS_COLORS[s]}
              onClick={() => setStatusFilter(statusFilter === s ? null : s)}
            >
              {s}
            </FilterChip>
          ))}
        </div>
      )}

      {catalogs.length > 0 && (
        <section className="space-y-3">
          {catalogs
            .filter((cat) => !statusFilter || cat.status === statusFilter)
            .map((cat) => {
              const isEditing = editingId === cat.id;

              return (
                <Card key={cat.id} className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <Link
                      href={`/catalogs/${cat.id}`}
                      className="flex min-w-0 items-center gap-2 transition-opacity hover:opacity-80"
                    >
                      <p className="truncate text-sm font-semibold text-white">
                        {cat.name}
                      </p>
                      <Badge
                        color={STATUS_BADGE_VARIANTS[cat.status]}
                        className="shrink-0"
                      >
                        {cat.status}
                      </Badge>
                      <Badge color="muted" className="shrink-0">
                        {pluralize(cat.works_count, "work")}
                      </Badge>
                      <Badge color="muted" className="shrink-0">
                        {pluralize(cat.documents_count, "document")}
                      </Badge>
                    </Link>
                    <div className="flex shrink-0 items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(isEditing ? null : cat.id)}
                      >
                        {isEditing ? "Cancel" : "Edit"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-dimmed hover:text-red-400"
                        onClick={() => handleDelete(cat.id)}
                      >
                        Delete
                      </Button>
                      <Link
                        href={`/catalogs/${cat.id}`}
                        className="text-dimmed text-xs"
                      >
                        &rarr;
                      </Link>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted mr-1 text-xs">Status:</span>
                      {CATALOG_STATUSES.map((s) => (
                        <FilterChip
                          key={s}
                          active={cat.status === s}
                          activeClassName={STATUS_COLORS[s]}
                          onClick={() => handleStatusChange(cat.id, s)}
                        >
                          {s}
                        </FilterChip>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
        </section>
      )}
    </PageLayout>
  );
}
