import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import CatalogLink from "@/app/components/catalog-link";
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
import { api } from "@/app/lib/api";
import { formatBytes } from "@/app/lib/utils";
import type {
  AnalyzeDocument,
  AnalyzeWork,
  AnalyzeBatchIssue,
  AnalyzeParseResultIssue,
  AnalyzeParsedRowIssue,
  RoyaltySummary,
} from "./types";

// ParseResultRef maps a parse_result_id back to the document it belongs
// to (plus per-stage issue counts). The page owns the mapping; this
// component only reads it to resolve filenames for fetched issues.
type ParseResultRef = {
  document_id: string;
  stage_issues: number;
  row_issues: number;
};

export default function ImportStep({
  documents,
  importDone,
  works,
  batchIssues,
  parseResultIssues,
  parsedRowIssues,
  parseResultRefs,
  parseCompleteCount,
  parseFailedCount,
  ingestCompleteCount,
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
  parseResultIssues: AnalyzeParseResultIssue[];
  parsedRowIssues: AnalyzeParsedRowIssue[];
  parseResultRefs: Record<string, ParseResultRef>;
  parseCompleteCount: number;
  parseFailedCount: number;
  ingestCompleteCount: number;
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
                <p className="truncate text-sm text-white">{doc.filename}</p>
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
          <div ref={ingestPhaseRef} className="scroll-mt-4">
            <PhaseHeading index={3} title="Extract works" done={ingestAllDone} />
          </div>

          <div className="flex flex-wrap gap-3">
            <StatCard
              label="Works"
              value={works.length}
              large
              className="px-4 py-3"
            />
            <StatCard
              label="Documents ingested"
              value={
                parseFailedCount > 0
                  ? `${ingestCompleteCount} / ${total} (${parseFailedCount} skipped)`
                  : `${ingestCompleteCount} / ${total}`
              }
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
                label={
                  parseFailedCount > 0
                    ? `${ingestCompleteCount} of ${total} ingested, ${parseFailedCount} skipped (parse failed)`
                    : `${ingestCompleteCount} of ${total} documents ingested`
                }
              />
            </Card>
          )}

          {ingestAllDone && parseResultIssues.length > 0 && (
            <ParseResultIssuesList
              issues={parseResultIssues}
              documents={documents}
              parseResultRefs={parseResultRefs}
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
            <ParsedRowIssuesList issues={parsedRowIssues} />
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
// accent (ingestion aborted); other fatals get amber.
function ParseResultIssuesList({
  issues,
  documents,
  parseResultRefs,
}: {
  issues: AnalyzeParseResultIssue[];
  documents: AnalyzeDocument[];
  parseResultRefs: Record<string, ParseResultRef>;
}) {
  const docById = new Map(documents.map((d) => [d.id, d]));
  const systematic = issues.filter((i) => i.kind === "systematic_invalid");
  const fatal = issues.filter((i) => i.kind === "fatal");

  const filenameFor = (parseResultId: string): string | undefined => {
    const ref = parseResultRefs[parseResultId];
    if (!ref) return undefined;
    return docById.get(ref.document_id)?.filename;
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-white">
        Ingestion issues ({issues.length})
      </h4>
      {systematic.length > 0 && (
        <div className="space-y-2">
          {systematic.map((i) => (
            <IssueCard
              key={i.id}
              title={
                filenameFor(i.parse_result_id) ??
                `parse_result ${i.parse_result_id.slice(0, 8)}`
              }
              tag={i.field ?? "systematic_invalid"}
              message={i.message}
              severity="high"
            />
          ))}
        </div>
      )}
      {fatal.length > 0 && (
        <div className="space-y-2">
          {fatal.map((i) => (
            <IssueCard
              key={i.id}
              title={
                filenameFor(i.parse_result_id) ??
                `parse_result ${i.parse_result_id.slice(0, 8)}`
              }
              tag={i.field ?? "fatal"}
              message={i.message}
              severity="high"
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ParsedRowIssuesList renders row-level issues from
// `parsed_row_issues`. All amber — by design these are non-fatal row
// drops during royalty_lines processing.
function ParsedRowIssuesList({ issues }: { issues: AnalyzeParsedRowIssue[] }) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-white">
        Row issues ({issues.length})
      </h4>
      <div className="max-h-[360px] space-y-2 overflow-y-auto">
        {issues.map((i) => (
          <IssueCard
            key={i.id}
            title={`Row ${i.parsed_row_id.slice(0, 8)}`}
            tag={i.field ?? i.severity}
            message={i.message}
            severity="low"
          />
        ))}
      </div>
    </div>
  );
}

// IssueCard is the shared card shape for all three issue lists — keeps
// the visual language consistent across phases.
function IssueCard({
  title,
  tag,
  message,
  severity,
}: {
  title: string;
  tag: string;
  message: string;
  severity: "high" | "low";
}) {
  const border =
    severity === "high"
      ? "border-l-4 border-l-red-500"
      : "border-l-4 border-l-amber-500";
  return (
    <Card className={`space-y-2 rounded-xl px-4 py-3 ${border}`}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-sm font-semibold text-white">{title}</p>
        <span className="text-dimmed shrink-0 font-mono text-xs uppercase">
          {tag}
        </span>
      </div>
      <p className="text-muted-foreground text-xs">{message}</p>
    </Card>
  );
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
