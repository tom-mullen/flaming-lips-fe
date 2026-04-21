import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowDownTrayIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import CatalogLink from "@/app/components/catalog-link";
import FilenameLabel from "@/app/components/filename-label";
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
import { api, apiPost, downloadUrl } from "@/app/lib/api";
import { formatBytes } from "@/app/lib/utils";
import type {
  AnalyzeDocument,
  AnalyzeWork,
  AnalyzeBatchIssue,
  AnalyzeParseResult,
  AnalyzeParseResultIssueWithDocument,
  AnalyzeParsedRowIssueWithDocument,
  RoyaltySummary,
} from "./types";

export default function ImportStep({
  documents,
  importDone,
  works,
  batchIssues,
  parseResultIssues,
  parsedRowIssues,
  parseCompleteMsByDoc,
  parseCompleteCount,
  parseFailedCount,
  ingestCompleteCount,
  ingestFailedCount,
  royaltyLinesExpectedCount,
  royaltyLinesCompleteCount,
  batchId,
  assignedCatalogId,
  assignedCatalogName,
  onFinish,
  onReset,
}: {
  documents: AnalyzeDocument[];
  importDone: boolean;
  works: AnalyzeWork[];
  batchIssues: AnalyzeBatchIssue[];
  parseResultIssues: AnalyzeParseResultIssueWithDocument[];
  parsedRowIssues: AnalyzeParsedRowIssueWithDocument[];
  parseCompleteMsByDoc: Record<string, number>;
  parseCompleteCount: number;
  parseFailedCount: number;
  ingestCompleteCount: number;
  ingestFailedCount: number;
  royaltyLinesExpectedCount: number;
  royaltyLinesCompleteCount: number;
  batchId: string;
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
  // Parse-phase failures (unknown payor, unrecognised file type, etc.)
  // never enqueue an ingest job, so the ingest counter would never reach
  // `total`. Count them as already-resolved for phase 3 progress.
  const ingestResolvedCount = ingestCompleteCount + parseFailedCount;
  const ingestAllDone = parseAllDone && ingestResolvedCount >= total;
  // Phase 4's target is the number of ingest_complete events that chained
  // a royalty_lines job — NOT `total`. Parse / ingest failures skip the
  // chain, so targeting `total` would wedge the bar.
  const royaltyLinesAllDone =
    ingestAllDone && royaltyLinesCompleteCount >= royaltyLinesExpectedCount;

  // Auto-scroll each newly-revealed phase into view as the previous one
  // completes. One ref per phase heading + one for the summary table.
  const parsePhaseRef = useRef<HTMLDivElement>(null);
  const ingestPhaseRef = useRef<HTMLDivElement>(null);
  const royaltyLinesPhaseRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!importDone) return;
    parsePhaseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [importDone]);
  useEffect(() => {
    if (!parseAllDone) return;
    ingestPhaseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [parseAllDone]);
  useEffect(() => {
    if (!ingestAllDone) return;
    royaltyLinesPhaseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [ingestAllDone]);
  useEffect(() => {
    if (!royaltyLinesAllDone) return;
    summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [royaltyLinesAllDone]);

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
        <StatCard label="Total" value={total} large className="px-4 py-3" />
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
                <FilenameLabel filename={doc.filename} className="text-sm text-white" />
              </div>
              <p className="text-dimmed shrink-0 text-xs">
                {formatBytes(doc.size)}
              </p>
            </Card>
          ))}
        </div>
      )}

      {importDone && batchIssues.length > 0 && (
        <BatchIssuesList issues={batchIssues} />
      )}

      {/* Phase 2 — parse docs */}
      {importDone && (
        <>
          <div ref={parsePhaseRef} className="scroll-mt-4">
            <PhaseHeading index={2} title="Parse documents" done={parseAllDone} />
          </div>

          <div className="flex flex-wrap gap-3">
            <StatCard
              label="Parsed"
              value={parseCompleteCount - parseFailedCount}
              large
              className="px-4 py-3"
            />
            <StatCard
              label="Failed"
              value={parseFailedCount}
              large
              className="px-4 py-3"
            />
            <StatCard
              label="Total"
              value={total}
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
          <div ref={ingestPhaseRef} className="scroll-mt-4">
            <PhaseHeading index={3} title="Extract works" done={ingestAllDone} />
          </div>

          <div className="flex flex-wrap gap-3">
            <StatCard
              label="Total Parsed"
              value={parseCompleteCount - parseFailedCount}
              large
              className="px-4 py-3"
            />
            <StatCard
              label="Ingested"
              value={ingestCompleteCount - ingestFailedCount}
              color="text-green-400"
              large
              className="px-4 py-3"
            />
            <StatCard
              label="Failed"
              value={ingestFailedCount}
              color="text-red-400"
              large
              className="px-4 py-3"
            />
            <StatCard
              label="Skipped"
              value={parseFailedCount}
              color="text-amber-400"
              large
              className="px-4 py-3"
            />
            <StatCard
              label="Works Updated"
              value={works.length}
              color="text-green-400"
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
                value={ingestResolvedCount}
                total={total}
                label={`${ingestResolvedCount} of ${total} documents processed`}
              />
            </Card>
          )}

          {ingestAllDone && parseResultIssues.length > 0 && (
            <ParseResultIssuesList
              issues={parseResultIssues}
              documents={documents}
              catalogId={assignedCatalogId}
              parseCompleteMsByDoc={parseCompleteMsByDoc}
            />
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

      {/* Phase 4 — financial analysis */}
      {ingestAllDone && (
        <>
          <div ref={royaltyLinesPhaseRef} className="scroll-mt-4">
            <PhaseHeading
              index={4}
              title="Financial analysis"
              done={royaltyLinesAllDone}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <StatCard
              label="Documents analysed"
              value={`${royaltyLinesCompleteCount} / ${royaltyLinesExpectedCount}`}
              large
              className="px-4 py-3"
            />
          </div>

          {!royaltyLinesAllDone && (
            <Card size="lg" className="space-y-4">
              <div className="flex items-center gap-3">
                <Spinner />
                <h3 className="font-semibold text-white">
                  Parsing monetary values...
                </h3>
              </div>
              <ProgressBar
                value={royaltyLinesCompleteCount}
                total={royaltyLinesExpectedCount}
                label={`${royaltyLinesCompleteCount} of ${royaltyLinesExpectedCount} documents analysed`}
              />
            </Card>
          )}

          {royaltyLinesAllDone && parsedRowIssues.length > 0 && (
            <ParsedRowIssuesList
              issues={parsedRowIssues}
              documents={documents}
              catalogId={assignedCatalogId}
              parseCompleteMsByDoc={parseCompleteMsByDoc}
            />
          )}

          {royaltyLinesAllDone && (
            <div ref={summaryRef} className="scroll-mt-4">
              <RoyaltySummaryTable batchId={batchId} />
            </div>
          )}
        </>
      )}

      {royaltyLinesAllDone ? (
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
            ? "bg-brand flex size-6 items-center justify-center rounded-full text-xs font-bold text-black"
            : "bg-surface-raised text-muted flex size-6 items-center justify-center rounded-full text-xs font-bold"
        }
      >
        {index}
      </span>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
    </div>
  );
}

// BatchIssuesList renders upload-phase issues from `batch_issues`.
// Errors get a red accent (processing failure); skipped get an amber
// accent (informational — file rejected but batch proceeded).
function BatchIssuesList({ issues }: { issues: AnalyzeBatchIssue[] }) {
  const errors = issues.filter((i) => i.kind === "error");
  const skipped = issues.filter((i) => i.kind === "skipped");
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-white">
        Upload issues ({issues.length})
      </h4>
      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((i) => (
            <IssueCard
              key={i.id}
              title={i.filename}
              message={i.message}
              severity="high"
              tag="error"
            />
          ))}
        </div>
      )}
      {skipped.length > 0 && (
        <div className="space-y-2">
          {skipped.map((i) => (
            <IssueCard
              key={i.id}
              title={i.filename}
              message={i.message || "Skipped"}
              severity="low"
              tag="skipped"
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ParseResultIssuesList renders stage-level issues from
// `parse_result_issues`. Systematic column-mapping problems get a red
// accent (ingestion aborted); other fatals also get red.
//
// Dedup: the backend endpoint is the full audit log — a document
// that's been reparsed has issues from every attempt. We filter to
// show only the latest parse_result's issues per document (by max
// issue.created_at as a proxy for parse_result.created_at — they're
// within milliseconds of each other). Historical attempts remain
// visible through the attempt-history panel on each card.
function ParseResultIssuesList({
  issues,
  documents,
  catalogId,
  parseCompleteMsByDoc,
}: {
  issues: AnalyzeParseResultIssueWithDocument[];
  documents: AnalyzeDocument[];
  catalogId: string;
  parseCompleteMsByDoc: Record<string, number>;
}) {
  const docById = new Map(documents.map((d) => [d.id, d]));
  const latest = latestIssuesPerDocument(issues);
  const systematic = latest.filter((i) => i.kind === "systematic_invalid");
  const fatal = latest.filter((i) => i.kind === "fatal");

  const cardPropsFor = (i: AnalyzeParseResultIssueWithDocument) => {
    const doc = docById.get(i.document_id);
    const title = doc?.filename ?? `parse_result ${i.parse_result_id.slice(0, 8)}`;
    const downloadHref =
      doc && catalogId
        ? downloadUrl(`/catalogs/${catalogId}/documents/${doc.id}/download`)
        : undefined;
    const reparseTarget =
      doc && catalogId ? { catalogId, documentId: doc.id } : undefined;
    const attemptHistory =
      doc && catalogId ? (
        <AttemptHistory
          catalogId={catalogId}
          documentId={doc.id}
          refreshKey={parseCompleteMsByDoc[doc.id] ?? 0}
        />
      ) : null;
    return { title, downloadHref, reparseTarget, attemptHistory };
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-white">
        Ingestion issues ({latest.length})
      </h4>
      {systematic.length > 0 && (
        <div className="space-y-2">
          {systematic.map((i) => {
            const { title, downloadHref, reparseTarget, attemptHistory } =
              cardPropsFor(i);
            return (
              <IssueCard
                key={i.id}
                title={title}
                tag={i.field ?? "systematic_invalid"}
                message={i.message}
                severity="high"
                downloadHref={downloadHref}
                reparseTarget={reparseTarget}
                completedAtMs={parseCompleteMsByDoc[i.document_id]}
                details={
                  <>
                    <SystematicInvalidDetails context={i.context} />
                    {attemptHistory}
                  </>
                }
              />
            );
          })}
        </div>
      )}
      {fatal.length > 0 && (
        <div className="space-y-2">
          {fatal.map((i) => {
            const { title, downloadHref, reparseTarget, attemptHistory } =
              cardPropsFor(i);
            return (
              <IssueCard
                key={i.id}
                title={title}
                tag={i.field || "fatal"}
                message={i.message}
                severity="high"
                downloadHref={downloadHref}
                reparseTarget={reparseTarget}
                completedAtMs={parseCompleteMsByDoc[i.document_id]}
                details={
                  <>
                    <FatalDetails context={i.context} />
                    {attemptHistory}
                  </>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// SystematicInvalidDetails renders the structured context attached to
// a systematic_invalid issue (invalid/checked counts + sample bad
// values). Reveals "ISRC column actually contains APPLE, Consumption,
// …" — the fastest way to confirm it's a column-mapping issue vs a
// data-quality issue.
function SystematicInvalidDetails({ context }: { context: unknown }) {
  if (!context || typeof context !== "object") return null;
  const c = context as {
    invalid_count?: number;
    checked_count?: number;
    samples?: string[];
  };
  if (!c.samples || c.samples.length === 0) return null;
  const shown = c.samples.slice(0, 5);
  return (
    <div className="text-dimmed border-surface-raised space-y-0.5 border-t pt-2 text-xs">
      <p className="uppercase tracking-wide">Sample values</p>
      <ul className="space-y-0.5 font-mono text-white/70">
        {shown.map((s, idx) => (
          <li key={idx} className="truncate">
            {s}
          </li>
        ))}
        {c.samples.length > shown.length && (
          <li className="text-dimmed italic">
            +{c.samples.length - shown.length} more
          </li>
        )}
      </ul>
    </div>
  );
}

// FatalDetails renders the structured context attached to a fatal
// issue. Today only "no canonical columns resolved" fatals carry
// context (detected_columns + column_count); other fatals have no
// payload and this renders nothing.
function FatalDetails({ context }: { context: unknown }) {
  if (!context || typeof context !== "object") return null;
  const c = context as {
    detected_columns?: string[];
    column_count?: number;
  };
  if (!c.detected_columns || c.detected_columns.length === 0) return null;
  const shown = c.detected_columns.slice(0, 10);
  const label =
    typeof c.column_count === "number"
      ? `Detected columns (${c.column_count})`
      : "Detected columns";
  return (
    <div className="text-dimmed border-surface-raised space-y-0.5 border-t pt-2 text-xs">
      <p className="uppercase tracking-wide">{label}</p>
      <ul className="space-y-0.5 font-mono text-white/70">
        {shown.map((s, idx) => (
          <li key={idx} className="truncate">
            {s}
          </li>
        ))}
        {c.detected_columns.length > shown.length && (
          <li className="text-dimmed italic">
            +{c.detected_columns.length - shown.length} more
          </li>
        )}
      </ul>
    </div>
  );
}

// ParsedRowIssuesList renders row-level issues from
// `parsed_row_issues`, grouped by document. One card per document with
// a download link in its header; per-row issues listed beneath. All
// amber — by design these are non-fatal row drops during royalty_lines
// processing.
function ParsedRowIssuesList({
  issues,
  documents,
  catalogId,
  parseCompleteMsByDoc,
}: {
  issues: AnalyzeParsedRowIssueWithDocument[];
  documents: AnalyzeDocument[];
  catalogId: string;
  parseCompleteMsByDoc: Record<string, number>;
}) {
  const docById = new Map(documents.map((d) => [d.id, d]));

  // Dedup then group: the batch endpoint returns issues from every
  // historical parse_result, so after a reparse we'd get duplicates.
  // Filter to the latest parse_result per document (max
  // issue.created_at is a close-enough proxy for parse_result.created_at).
  // Group the survivors by document_id.
  const latest = latestRowIssuesPerDocument(issues);
  const byDocument = new Map<string, AnalyzeParsedRowIssueWithDocument[]>();
  for (const i of latest) {
    const bucket = byDocument.get(i.document_id);
    if (bucket) bucket.push(i);
    else byDocument.set(i.document_id, [i]);
  }
  const groups = Array.from(byDocument.entries()).sort(([a], [b]) => {
    const an = docById.get(a)?.filename ?? "";
    const bn = docById.get(b)?.filename ?? "";
    return an.localeCompare(bn);
  });

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-white">
        Row issues ({latest.length})
      </h4>
      <div className="max-h-[480px] space-y-3 overflow-y-auto">
        {groups.map(([docId, docIssues]) => {
          const doc = docById.get(docId);
          const title = doc?.filename ?? `Document ${docId.slice(0, 8) || "unknown"}`;
          return (
            <Card
              key={docId || "unknown"}
              className="space-y-2 rounded-xl border-l-4 border-l-amber-500 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <FilenameLabel
                  filename={title}
                  className="text-sm font-semibold text-white"
                />
                <div className="flex items-center gap-3">
                  <span className="text-dimmed shrink-0 font-mono text-xs uppercase">
                    {docIssues.length} row{docIssues.length === 1 ? "" : "s"}
                  </span>
                  {doc && catalogId && (
                    <ReparseButton
                      catalogId={catalogId}
                      documentId={doc.id}
                      completedAtMs={parseCompleteMsByDoc[doc.id]}
                    />
                  )}
                  {doc && catalogId && (
                    <a
                      href={downloadUrl(`/catalogs/${catalogId}/documents/${doc.id}/download`)}
                      className="text-muted shrink-0 cursor-pointer transition-colors hover:text-white"
                      title="Download"
                    >
                      <ArrowDownTrayIcon className="size-4" />
                    </a>
                  )}
                </div>
              </div>
              <ul className="border-surface-raised space-y-1 border-t pt-2 text-xs">
                {docIssues.map((i) => (
                  <li
                    key={i.id}
                    className="flex items-start gap-3 text-white/80"
                  >
                    <span className="text-dimmed shrink-0 font-mono uppercase">
                      {i.field ?? i.severity}
                    </span>
                    <span className="text-muted-foreground flex-1">
                      {i.message}
                    </span>
                  </li>
                ))}
              </ul>
              {doc && catalogId && (
                <AttemptHistory
                  catalogId={catalogId}
                  documentId={doc.id}
                  refreshKey={parseCompleteMsByDoc[doc.id] ?? 0}
                />
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// IssueCard is the shared card shape across every issue list — keeps
// the visual language consistent. `details` renders below the message
// (for structured context like detected-columns or invalid-value
// samples). `downloadHref` adds a download icon in the header; when a
// catalog+document tuple is provided it also renders a Reparse button
// that re-runs the document through the pipeline.
function IssueCard({
  title,
  tag,
  message,
  severity,
  details,
  downloadHref,
  reparseTarget,
  completedAtMs,
}: {
  title: string;
  tag: string;
  message: string;
  severity: "high" | "low";
  details?: React.ReactNode;
  downloadHref?: string;
  reparseTarget?: { catalogId: string; documentId: string };
  completedAtMs?: number;
}) {
  const border =
    severity === "high"
      ? "border-l-4 border-l-red-500"
      : "border-l-4 border-l-amber-500";
  return (
    <Card className={`space-y-2 rounded-xl px-4 py-3 ${border}`}>
      <div className="flex items-baseline justify-between gap-3">
        <FilenameLabel
          filename={title}
          className="text-sm font-semibold text-white"
        />
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-dimmed font-mono text-xs uppercase">{tag}</span>
          {reparseTarget && (
            <ReparseButton {...reparseTarget} completedAtMs={completedAtMs} />
          )}
          {downloadHref && (
            <a
              href={downloadHref}
              className="text-muted cursor-pointer transition-colors hover:text-white"
              title="Download"
            >
              <ArrowDownTrayIcon className="size-4" />
            </a>
          )}
        </div>
      </div>
      <p className="text-muted-foreground text-xs">{message}</p>
      {details}
    </Card>
  );
}

// ReparseButton POSTs to the document's parse endpoint and then
// waits for the matching parse_complete stream event to flip back to
// a completed state. `completedAtMs` is the timestamp of the latest
// parse_complete event for this document, owned by page.tsx. If an
// event lands after the user's click, we know this reparse finished.
//
// State machine:
//   idle      user hasn't clicked (or previous reparse fully settled)
//   pending   click fired; POST in flight
//   queued    POST accepted; waiting for the stream event
//   completed event landed after click — reparse ran through
//   failed    POST errored; can retry
function ReparseButton({
  catalogId,
  documentId,
  completedAtMs,
}: {
  catalogId: string;
  documentId: string;
  completedAtMs?: number;
}) {
  const [state, setState] = useState<
    "idle" | "pending" | "queued" | "failed"
  >("idle");
  const [clickedAtMs, setClickedAtMs] = useState(0);

  // Derive "completed" from props + state — no setState-in-effect.
  // A new parse_complete for this document landing after our click
  // means the pipeline ran to our reparse.
  const effective: "idle" | "pending" | "queued" | "completed" | "failed" =
    state === "queued" &&
    completedAtMs !== undefined &&
    completedAtMs > clickedAtMs
      ? "completed"
      : state;

  async function onClick() {
    if (effective === "pending" || effective === "queued") return;
    setClickedAtMs(Date.now());
    setState("pending");
    try {
      await apiPost(`/catalogs/${catalogId}/documents/${documentId}/parse`, {});
      setState("queued");
    } catch (e) {
      console.error("reparse failed", e);
      setState("failed");
    }
  }

  const label =
    effective === "pending"
      ? "Queueing..."
      : effective === "queued"
        ? "Queued"
        : effective === "completed"
          ? "Reparsed"
          : effective === "failed"
            ? "Retry"
            : "Reparse";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={effective === "pending" || effective === "queued"}
      className="text-muted flex cursor-pointer items-center gap-1 text-xs uppercase tracking-wide transition-colors hover:text-white disabled:cursor-default disabled:opacity-60"
      title="Re-run this document through the pipeline"
    >
      <ArrowPathIcon className="size-4" />
      {label}
    </button>
  );
}

// latestIssuesPerDocument filters a flat audit-log list down to just
// the issues from each document's latest parse_result. Uses each
// parse_result's max issue.created_at as the timestamp proxy — issues
// are persisted within milliseconds of their parse_result, so this is
// a reliable ordering.
function latestIssuesPerDocument(
  issues: AnalyzeParseResultIssueWithDocument[],
): AnalyzeParseResultIssueWithDocument[] {
  return pickLatestPerDocument(issues);
}

function latestRowIssuesPerDocument(
  issues: AnalyzeParsedRowIssueWithDocument[],
): AnalyzeParsedRowIssueWithDocument[] {
  return pickLatestPerDocument(issues);
}

// pickLatestPerDocument is the shared dedup: bucket issues by
// (document_id, parse_result_id), for each document pick the
// parse_result whose issues have the max created_at, return that
// bucket's issues. Rows without parse_result_id (row issues) fall
// back to document-only grouping → returns all issues for the doc.
function pickLatestPerDocument<
  T extends {
    document_id: string;
    created_at: string;
    parse_result_id?: string;
  },
>(issues: T[]): T[] {
  const byDoc = new Map<string, T[]>();
  for (const i of issues) {
    const bucket = byDoc.get(i.document_id);
    if (bucket) bucket.push(i);
    else byDoc.set(i.document_id, [i]);
  }
  const out: T[] = [];
  for (const docIssues of byDoc.values()) {
    if (!docIssues[0].parse_result_id) {
      out.push(...docIssues);
      continue;
    }
    const byPr = new Map<string, { issues: T[]; maxMs: number }>();
    for (const i of docIssues) {
      const prId = i.parse_result_id!;
      const ms = Date.parse(i.created_at);
      const entry = byPr.get(prId);
      if (entry) {
        entry.issues.push(i);
        if (ms > entry.maxMs) entry.maxMs = ms;
      } else {
        byPr.set(prId, { issues: [i], maxMs: ms });
      }
    }
    let latest: { issues: T[]; maxMs: number } | undefined;
    for (const entry of byPr.values()) {
      if (!latest || entry.maxMs > latest.maxMs) latest = entry;
    }
    if (latest) out.push(...latest.issues);
  }
  return out;
}

// AttemptHistory lists every parse_result for a document so the user
// can confirm a reparse actually ran. Fetches
// GET /catalogs/{id}/documents/{docId}/parse_results once on mount
// and refetches whenever `refreshKey` changes — page.tsx passes the
// document's last parse_complete timestamp, so a fresh attempt
// triggers a refetch.
function AttemptHistory({
  catalogId,
  documentId,
  refreshKey,
}: {
  catalogId: string;
  documentId: string;
  refreshKey: number;
}) {
  const [attempts, setAttempts] = useState<AnalyzeParseResult[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api<AnalyzeParseResult[]>(
          `/catalogs/${catalogId}/documents/${documentId}/parse_results`,
        );
        if (!cancelled) setAttempts(list);
      } catch (e) {
        console.error("failed to load parse_results", documentId, e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [catalogId, documentId, refreshKey]);

  if (!attempts || attempts.length === 0) return null;
  // Most recent first — matches the backend default order.
  const sorted = [...attempts].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );
  return (
    <div className="text-dimmed border-surface-raised space-y-0.5 border-t pt-2 text-xs">
      <p className="uppercase tracking-wide">
        Attempts ({attempts.length})
      </p>
      <ul className="space-y-0.5 font-mono text-white/70">
        {sorted.map((a, idx) => (
          <li key={a.id} className="flex items-center gap-2">
            <span className="shrink-0">{formatAttemptTime(a.created_at)}</span>
            {idx === 0 && (
              <span className="text-dimmed uppercase text-[10px]">latest</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

const attemptTimeFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatAttemptTime(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return attemptTimeFormatter.format(t);
}

// RoyaltySummaryTable fetches the batch summary and pivots the flat
// (year, quarter) rows into a calendar-year × Q1–Q4 grid. Rendered only
// after the royalty-lines phase completes.
function RoyaltySummaryTable({ batchId }: { batchId: string }) {
  const [summary, setSummary] = useState<RoyaltySummary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!batchId) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await api<RoyaltySummary>(
          `/batches/${batchId}/royalties/summary`,
        );
        if (!cancelled) setSummary(s);
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Failed to load summary");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [batchId]);

  if (err) {
    return (
      <Card size="lg" className="border border-red-500/40">
        <p className="text-sm text-red-400">Could not load summary: {err}</p>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card size="lg" className="flex items-center gap-3">
        <Spinner />
        <p className="text-muted-foreground text-sm">Loading totals...</p>
      </Card>
    );
  }

  // Pivot cells into { year: { q1..q4, total } }.
  const byYear = new Map<
    number,
    { q1: number; q2: number; q3: number; q4: number; total: number }
  >();
  for (const c of summary.cells) {
    const row = byYear.get(c.year) ?? { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 };
    const amount = parseFloat(c.total);
    if (c.quarter === 1) row.q1 = amount;
    else if (c.quarter === 2) row.q2 = amount;
    else if (c.quarter === 3) row.q3 = amount;
    else if (c.quarter === 4) row.q4 = amount;
    row.total = row.q1 + row.q2 + row.q3 + row.q4;
    byYear.set(c.year, row);
  }
  const years = Array.from(byYear.keys()).sort((a, b) => b - a);
  const unknown = parseFloat(summary.unknown_total);
  const grandTotal = parseFloat(summary.grand_total_usd);

  const hasAnyData =
    years.length > 0 || unknown !== 0 || summary.other_currencies.length > 0;

  if (!hasAnyData) {
    return (
      <Card size="lg">
        <p className="text-muted-foreground text-sm">
          No monetary values were found in this batch.
        </p>
      </Card>
    );
  }

  // Column totals for the bottom row.
  const colTotals = years.reduce(
    (acc, y) => {
      const r = byYear.get(y)!;
      acc.q1 += r.q1;
      acc.q2 += r.q2;
      acc.q3 += r.q3;
      acc.q4 += r.q4;
      return acc;
    },
    { q1: 0, q2: 0, q3: 0, q4: 0 },
  );

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-white">
        Net royalties (USD) by quarter
      </h4>
      <Card size="lg" className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-surface-raised border-b text-xs uppercase tracking-wide">
              <th className="text-dimmed px-4 py-3 text-left font-semibold">
                FY
              </th>
              <th className="text-dimmed px-4 py-3 text-right font-semibold">
                Q1
              </th>
              <th className="text-dimmed px-4 py-3 text-right font-semibold">
                Q2
              </th>
              <th className="text-dimmed px-4 py-3 text-right font-semibold">
                Q3
              </th>
              <th className="text-dimmed px-4 py-3 text-right font-semibold">
                Q4
              </th>
              <th className="text-dimmed px-4 py-3 text-right font-semibold">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {unknown !== 0 && (
              <tr className="border-surface-raised border-b">
                <td className="text-dimmed px-4 py-2 italic">Unknown</td>
                <td className="text-dimmed px-4 py-2 text-right">—</td>
                <td className="text-dimmed px-4 py-2 text-right">—</td>
                <td className="text-dimmed px-4 py-2 text-right">—</td>
                <td className="text-dimmed px-4 py-2 text-right">—</td>
                <td className="px-4 py-2 text-right font-mono text-white">
                  {formatUSD(unknown)}
                </td>
              </tr>
            )}
            {years.map((year) => {
              const r = byYear.get(year)!;
              return (
                <tr key={year} className="border-surface-raised border-b">
                  <td className="px-4 py-2 text-white">{year}</td>
                  <td className="px-4 py-2 text-right font-mono text-white/80">
                    {r.q1 ? formatUSD(r.q1) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-white/80">
                    {r.q2 ? formatUSD(r.q2) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-white/80">
                    {r.q3 ? formatUSD(r.q3) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-white/80">
                    {r.q4 ? formatUSD(r.q4) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-semibold text-white">
                    {formatUSD(r.total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-surface-alt">
              <td className="px-4 py-3 font-semibold text-white">Total</td>
              <td className="px-4 py-3 text-right font-mono text-white">
                {colTotals.q1 ? formatUSD(colTotals.q1) : "—"}
              </td>
              <td className="px-4 py-3 text-right font-mono text-white">
                {colTotals.q2 ? formatUSD(colTotals.q2) : "—"}
              </td>
              <td className="px-4 py-3 text-right font-mono text-white">
                {colTotals.q3 ? formatUSD(colTotals.q3) : "—"}
              </td>
              <td className="px-4 py-3 text-right font-mono text-white">
                {colTotals.q4 ? formatUSD(colTotals.q4) : "—"}
              </td>
              <td className="bg-brand/10 px-4 py-3 text-right font-mono font-bold text-white">
                {formatUSD(grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </Card>

      {summary.other_currencies.length > 0 && (
        <Card size="lg" className="space-y-1">
          <h5 className="text-xs font-semibold uppercase tracking-wide text-yellow-400">
            Non-USD totals
          </h5>
          <ul className="space-y-0.5 text-xs text-white/80">
            {summary.other_currencies.map((c) => (
              <li key={c.currency} className="flex justify-between font-mono">
                <span>{c.currency}</span>
                <span>{parseFloat(c.total).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatUSD(value: number): string {
  return usdFormatter.format(value);
}
