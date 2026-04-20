"use client";

import { useState } from "react";
import Badge from "@/app/components/ui/badge";
import Button from "@/app/components/ui/button";
import Card from "@/app/components/ui/card";
import Input from "@/app/components/ui/input";
import SectionLabel from "@/app/components/ui/section-label";
import RightsFields from "@/app/components/rights-fields";
import type { RightsFieldValues } from "@/app/components/rights-fields";
import { cn } from "@/app/lib/cn";
import { STATUS_BADGE_VARIANTS } from "@/app/lib/constants";
import { formatBytes, pluralize } from "@/app/lib/utils";
import type { Catalog } from "@/app/lib/types";

export type { RightsFieldValues as RightsDefaults };

interface AssignStepProps {
  files: File[];
  catalogs: Catalog[];
  onRemoveFile: (index: number) => void;
  onBack: () => void;
  onSubmit: (
    catalogId: string,
    newCatalogName: string,
    rights: RightsFieldValues,
  ) => void;
}

export default function AssignStep({
  files,
  catalogs,
  onRemoveFile,
  onBack,
  onSubmit,
}: AssignStepProps) {
  const [selectedCatalog, setSelectedCatalog] = useState("");
  const [newCatalogName, setNewCatalogName] = useState("");
  const [rightsValues, setRightsValues] = useState<RightsFieldValues>({
    type: "copyright",
    territory: "",
    ownership: "",
    startDate: "",
    endDate: "",
    source: "",
  });

  return (
    <section className="space-y-6">
      <Card size="lg" className="space-y-3">
        <SectionLabel className="text-muted-foreground">
          {pluralize(files.length, "file")} to upload
        </SectionLabel>
        {files.map((f, i) => (
          <Card
            key={i}
            variant="muted"
            size="sm"
            className="flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-white">{f.name}</p>
              <p className="text-dimmed text-xs">{formatBytes(f.size)}</p>
            </div>
            {f.name.toLowerCase().endsWith(".zip") && (
              <span className="text-muted shrink-0 text-xs">
                will be extracted
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-dimmed shrink-0 hover:text-red-400"
              onClick={() => onRemoveFile(i)}
            >
              Remove
            </Button>
          </Card>
        ))}
      </Card>

      <Card size="lg" className="space-y-4">
        <h3 className="font-semibold text-white">Assign to catalog</h3>

        {catalogs.length > 0 && (
          <div className="space-y-2">
            <SectionLabel>Existing catalog</SectionLabel>
            <div className="space-y-1">
              {catalogs.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCatalog(cat.id);
                    setNewCatalogName("");
                  }}
                  className={cn(
                    "focus-ring w-full cursor-pointer rounded-lg px-4 py-3 text-left text-sm transition-colors",
                    selectedCatalog === cat.id
                      ? "bg-brand/10 border-brand/30 border text-white"
                      : "bg-surface-alt text-muted-foreground hover:bg-surface-alt/80 border border-transparent hover:text-white",
                  )}
                >
                  {cat.name}
                  <Badge
                    color={STATUS_BADGE_VARIANTS[cat.status]}
                    className="ml-2"
                  >
                    {cat.status}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="bg-border-subtle h-px flex-1" />
          <span className="text-dimmed text-xs">or</span>
          <div className="bg-border-subtle h-px flex-1" />
        </div>

        <div className="space-y-2">
          <SectionLabel>Create new catalog</SectionLabel>
          <Input
            type="text"
            placeholder="New catalog name"
            value={newCatalogName}
            onChange={(e) => {
              setNewCatalogName(e.target.value);
              setSelectedCatalog("");
            }}
            className="w-full"
          />
        </div>

        <div className="border-border-subtle space-y-3 border-t pt-4">
          <SectionLabel>Default rights for extracted songs</SectionLabel>
          <RightsFields values={rightsValues} onChange={setRightsValues} />
        </div>
      </Card>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button
          disabled={!selectedCatalog && !newCatalogName.trim()}
          onClick={() =>
            onSubmit(selectedCatalog, newCatalogName, rightsValues)
          }
        >
          Upload &amp; import
        </Button>
      </div>
    </section>
  );
}
