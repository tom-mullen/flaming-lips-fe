import Link from "next/link";
import CatalogLink from "@/app/components/catalog-link";
import SkippedFiles from "@/app/components/skipped-files";
import Badge from "@/app/components/ui/badge";
import Button, { buttonVariants } from "@/app/components/ui/button";
import Card from "@/app/components/ui/card";
import StatCard from "@/app/components/ui/stat-card";
import Spinner from "@/app/components/ui/spinner";
import {
  DOC_CATEGORIES,
  DOC_CATEGORY_LABELS,
  DOC_BADGE_VARIANTS,
} from "@/app/lib/constants";
import { formatBytes } from "@/app/lib/utils";
import type { AnalyzeDocument } from "./types";

export default function ImportStep({
  documents,
  skipped,
  importDone,
  assignedCatalogId,
  assignedCatalogName,
  onFinish,
}: {
  documents: AnalyzeDocument[];
  skipped: { filename: string; reason: string }[];
  importDone: boolean;
  assignedCatalogId: string;
  assignedCatalogName: string;
  onFinish: () => void;
}) {
  const counts = documents.reduce(
    (acc, d) => {
      acc[d.category] = (acc[d.category] || 0) + 1;
      return acc;
    },
    {} as Partial<Record<string, number>>,
  );

  return (
    <section className="space-y-6">
      <CatalogLink
        catalogId={assignedCatalogId}
        catalogName={assignedCatalogName}
      />

      <div className="flex flex-wrap gap-3">
        {DOC_CATEGORIES.map((cat) => (
          <StatCard
            key={cat}
            label={DOC_CATEGORY_LABELS[cat]}
            value={counts[cat] || 0}
            large
            className="px-4 py-3"
          />
        ))}
        <StatCard
          label="Total"
          value={documents.length}
          large
          className="px-4 py-3"
        />
      </div>

      {!importDone && (
        <div className="flex items-center gap-3">
          <Spinner />
          <p className="text-muted-foreground text-sm">
            Extracting and classifying documents...
          </p>
        </div>
      )}

      {documents.length <= 5 && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card
              key={doc.id}
              className="flex items-center gap-3 rounded-xl px-4 py-3"
            >
              <Badge
                color={DOC_BADGE_VARIANTS[doc.category]}
                className="shrink-0"
              >
                {DOC_CATEGORY_LABELS[doc.category]}
              </Badge>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white">{doc.filename}</p>
              </div>
              <p className="text-dimmed shrink-0 text-xs">
                {formatBytes(doc.size)}
              </p>
            </Card>
          ))}
        </div>
      )}

      {skipped.length > 0 && <SkippedFiles skipped={skipped} />}

      {importDone && (
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/catalogs/${assignedCatalogId}#documents`}
            className={buttonVariants({ variant: "secondary" })}
          >
            View documents
          </Link>
          <Button onClick={onFinish}>Done</Button>
        </div>
      )}
    </section>
  );
}
