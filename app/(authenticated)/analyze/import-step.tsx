import Link from "next/link";
import CatalogLink from "@/app/components/catalog-link";
import SkippedFiles from "@/app/components/skipped-files";
import Badge from "@/app/components/ui/badge";
import Button, { buttonVariants } from "@/app/components/ui/button";
import Card from "@/app/components/ui/card";
import ProgressBar from "@/app/components/ui/progress-bar";
import Spinner from "@/app/components/ui/spinner";
import StatCard from "@/app/components/ui/stat-card";
import {
  DOC_CATEGORIES,
  DOC_CATEGORY_LABELS,
  DOC_BADGE_VARIANTS,
} from "@/app/lib/constants";
import { formatBytes } from "@/app/lib/utils";
import type { AnalyzeDocument, AnalyzeWork } from "./types";

export default function ImportStep({
  documents,
  skipped,
  importDone,
  works,
  parseCompleteCount,
  ingestCompleteCount,
  assignedCatalogId,
  assignedCatalogName,
  onFinish,
  onReset,
}: {
  documents: AnalyzeDocument[];
  skipped: { filename: string; reason: string }[];
  importDone: boolean;
  works: AnalyzeWork[];
  parseCompleteCount: number;
  ingestCompleteCount: number;
  assignedCatalogId: string;
  assignedCatalogName: string;
  onFinish: () => void;
  onReset: () => void;
}) {
  const counts = documents.reduce(
    (acc, d) => {
      acc[d.category] = (acc[d.category] || 0) + 1;
      return acc;
    },
    {} as Partial<Record<string, number>>,
  );

  const total = documents.length;
  const parseAllDone = importDone && total > 0 && parseCompleteCount >= total;
  const ingestAllDone = parseAllDone && ingestCompleteCount >= total;

  return (
    <section className="space-y-8">
      <CatalogLink
        catalogId={assignedCatalogId}
        catalogName={assignedCatalogName}
      />

      {/* Phase 1 — save docs */}
      <PhaseHeading index={1} title="Save documents" done={importDone} />

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
          value={total}
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

      {documents.length <= 5 && documents.length > 0 && (
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

      {/* Phase 2 — parse docs */}
      {importDone && (
        <>
          <PhaseHeading index={2} title="Parse documents" done={parseAllDone} />

          <div className="flex flex-wrap gap-3">
            <StatCard
              label="Documents parsed"
              value={`${parseCompleteCount} / ${total}`}
              large
              className="px-4 py-3"
            />
          </div>

          {!parseAllDone && (
            <Card size="lg" className="space-y-4">
              <div className="flex items-center gap-3">
                <Spinner />
                <h3 className="font-semibold text-white">
                  Parsing documents...
                </h3>
              </div>
              <ProgressBar
                value={parseCompleteCount}
                total={total}
                label={`${parseCompleteCount} of ${total} documents parsed`}
              />
            </Card>
          )}
        </>
      )}

      {/* Phase 3 — extract works */}
      {parseAllDone && (
        <>
          <PhaseHeading index={3} title="Extract works" done={ingestAllDone} />

          <div className="flex flex-wrap gap-3">
            <StatCard
              label="Works"
              value={works.length}
              large
              className="px-4 py-3"
            />
            <StatCard
              label="Documents ingested"
              value={`${ingestCompleteCount} / ${total}`}
              large
              className="px-4 py-3"
            />
          </div>

          {!ingestAllDone && (
            <Card size="lg" className="space-y-4">
              <div className="flex items-center gap-3">
                <Spinner />
                <h3 className="font-semibold text-white">
                  Extracting works from parsed statements...
                </h3>
              </div>
              <ProgressBar
                value={ingestCompleteCount}
                total={total}
                label={`${ingestCompleteCount} of ${total} documents ingested`}
              />
            </Card>
          )}

          {works.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-white">
                Works updated ({works.length})
              </h4>
              <div className="max-h-[480px] space-y-2 overflow-y-auto">
                {works.map((w) => (
                  <Card
                    key={w.work_id}
                    className="space-y-2 rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-white">{w.title}</p>
                        {w.artist && (
                          <p className="text-dimmed truncate text-xs">
                            {w.artist}
                          </p>
                        )}
                      </div>
                      {w.iswc && (
                        <p className="text-dimmed shrink-0 font-mono text-xs">
                          {w.iswc}
                        </p>
                      )}
                    </div>

                    {(w.recordings.length > 0 || w.releases.length > 0) && (
                      <div className="border-surface-raised space-y-3 border-t pt-2 text-xs">
                        {w.recordings.length > 0 && (
                          <div className="space-y-0.5">
                            <p className="text-dimmed uppercase tracking-wide">
                              Recordings ({w.recordings.length})
                            </p>
                            {w.recordings.map((r) => (
                              <div
                                key={r.id}
                                className="flex items-center gap-2 text-white/80"
                              >
                                <span className="truncate">
                                  {r.title || r.id}
                                </span>
                                {r.isrc && (
                                  <span className="text-dimmed shrink-0 font-mono">
                                    {r.isrc}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {w.releases.length > 0 && (
                          <div className="space-y-0.5">
                            <p className="text-dimmed uppercase tracking-wide">
                              Releases ({w.releases.length})
                            </p>
                            {w.releases.map((r) => (
                              <div
                                key={r.id}
                                className="flex items-center gap-2 text-white/80"
                              >
                                <span className="truncate">
                                  {r.title || r.id}
                                </span>
                                {r.upc && (
                                  <span className="text-dimmed shrink-0 font-mono">
                                    {r.upc}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {ingestAllDone ? (
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/catalogs/${assignedCatalogId}#works`}
            className={buttonVariants({ variant: "secondary" })}
          >
            View works
          </Link>
          <Button onClick={onFinish}>Done</Button>
        </div>
      ) : (
        <div>
          <Button variant="secondary" onClick={onReset}>
            Start over
          </Button>
        </div>
      )}
    </section>
  );
}

function PhaseHeading({
  index,
  title,
  done,
}: {
  index: number;
  title: string;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={
          done
            ? "bg-spotify flex size-6 items-center justify-center rounded-full text-xs font-bold text-black"
            : "bg-surface-raised text-muted flex size-6 items-center justify-center rounded-full text-xs font-bold"
        }
      >
        {index}
      </span>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
    </div>
  );
}
