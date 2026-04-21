"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Uppy from "@uppy/core";
import Tus from "@uppy/tus";
import { useUppyEvent } from "@uppy/react";
import Alert from "@/app/components/ui/alert";
import PageLayout from "@/app/components/ui/page-layout";
import Spinner from "@/app/components/ui/spinner";
import { useCatalogs } from "@/app/lib/queries";
import { api, apiPost, API_URL, getAccessToken } from "@/app/lib/api";
import { useJobStream } from "@/app/lib/hooks/use-job-stream";
import type {
  Step,
  AnalyzeDocument,
  AnalyzeWork,
  AnalyzeRecordingRef,
  AnalyzeReleaseRef,
  AnalyzeBatchIssue,
  AnalyzeParseResultIssueWithDocument,
  AnalyzeParsedRowIssueWithDocument,
} from "./types";
import { INITIAL_STATE } from "./types";
import { useAnalyzeStore, useAnalyzeStoreHydrated } from "./store";
import StepIndicator from "./step-indicator";
import DropStep from "./drop-step";
import AssignStep, { type RightsDefaults } from "./assign-step";
import UploadStep from "./upload-step";
import ImportStep from "./import-step";
import DoneStep from "./done-step";

// Shapes the batch stream carries. Distinct payloads multiplexed on one
// WebSocket — the routeBatchEvent switch below picks the right handler.
// Skipped / error diagnostics are durable on batch_issues and fetched
// after Phase 1 closes; the in-stream event is only used to track
// `status: "document"` (file arrived) and surface transport errors via
// the Alert banner while the socket is open.
interface UploadFileEvent {
  status: "document" | "skipped" | "error";
  document?: AnalyzeDocument;
  error?: string;
}

interface WorkIngestedEvent {
  type: "work_ingested";
  work_id: string;
  title: string;
  artist: string;
  iswc?: string;
  document_id: string;
  recording?: AnalyzeRecordingRef;
  release?: AnalyzeReleaseRef;
}

export default function AnalyzePage() {
  const store = useAnalyzeStore();

  const [step, setStep] = useState<Step>("drop");
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [assignedCatalogId, setAssignedCatalogId] = useState("");
  const [assignedCatalogName, setAssignedCatalogName] = useState("");
  const [batchId, setBatchId] = useState("");
  const [documents, setDocuments] = useState<AnalyzeDocument[]>([]);
  const [works, setWorks] = useState<AnalyzeWork[]>([]);

  // Durable issues fetched from batch-scoped endpoints — one fetch per
  // phase that produces them, fired when the corresponding phase
  // closes (and on restore). Each list carries `document_id` on every
  // item so the FE doesn't need a separate lookup cache.
  const [batchIssues, setBatchIssues] = useState<AnalyzeBatchIssue[]>([]);
  const [parseResultIssues, setParseResultIssues] = useState<
    AnalyzeParseResultIssueWithDocument[]
  >([]);
  const [parsedRowIssues, setParsedRowIssues] = useState<
    AnalyzeParsedRowIssueWithDocument[]
  >([]);

  // parseCompleteMsByDoc records the unix-ms of the latest
  // parse_complete event per document. Powers the reparse UX:
  //   - ReparseButton flips "Queued" → "Reparsed" when its doc's
  //     timestamp advances past the click time.
  //   - AttemptHistory refetches /parse_results when the timestamp
  //     advances (new attempt just landed).
  // Map mutations only happen on parse_complete events, so steady
  // state after the initial batch is zero writes until a reparse.
  const [parseCompleteMsByDoc, setParseCompleteMsByDoc] = useState<
    Record<string, number>
  >({});

  const [parseCompleteCount, setParseCompleteCount] = useState(0);
  const [parseFailedCount, setParseFailedCount] = useState(0);
  const [ingestCompleteCount, setIngestCompleteCount] = useState(0);
  // ingestFailedCount is the subset of ingest_complete events that
  // reported status !== "complete". We track it separately so the Phase
  // 3 stat cards can show true "ingested" (success count) distinct from
  // "failed" — the original single `ingestCompleteCount` conflated both
  // and made the "N of M ingested" label misleading when ingestion
  // resolved to failure on most documents.
  const [ingestFailedCount, setIngestFailedCount] = useState(0);
  // royaltyLinesExpectedCount is the denominator Phase 4 targets. Only
  // ingest_complete events that chained a follow-on (royalty_lines_job_id
  // set) will ever produce a royalty_lines_complete, so total-style
  // denominators wedge the progress bar when identity ingestion fails
  // for some docs.
  const [royaltyLinesExpectedCount, setRoyaltyLinesExpectedCount] =
    useState(0);
  const [royaltyLinesCompleteCount, setRoyaltyLinesCompleteCount] = useState(0);
  const [importDone, setImportDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);

  const [restored, setRestored] = useState(false);
  const hydrated = useAnalyzeStoreHydrated();

  const { data: catalogsPage } = useCatalogs();
  const catalogs = catalogsPage?.items ?? [];

  // Uppy instance — lazy-init via useState so the instance is created once
  // and stable across renders without touching refs during render.
  const [uppy] = useState<InstanceType<typeof Uppy>>(
    () => new Uppy({ autoProceed: false }),
  );

  useEffect(() => {
    return () => {
      uppy.cancelAll();
    };
  }, [uppy]);

  useUppyEvent(
    uppy,
    "error",
    useCallback((error: Error) => {
      setError(error.message || "Upload failed");
    }, []),
  );

  // Only rewind to "assign" if an upload was actually in flight. The cleanup
  // effect above calls uppy.cancelAll() on unmount (fired twice under React
  // StrictMode on initial mount), which would otherwise kick us off "drop".
  useUppyEvent(
    uppy,
    "cancel-all",
    useCallback(() => {
      setStep((cur) => (cur === "uploading" ? "assign" : cur));
    }, []),
  );

  // ── Batch event stream ──
  //
  // One WebSocket carries events from every stage of the upload → parse →
  // ingest chain. Routing is by shape (existing events) or explicit
  // discriminator (new events introduced with the batch stream):
  //   - { status: "document" | "skipped" | "error" } → UploadFileEvent
  //   - { type: "upload_complete" }                   → extraction phase done
  //   - { type: "work_ingested" }                     → one work appeared
  //   - { type: "parse_complete",  parse_result_id, status, ... }
  //   - { type: "ingest_complete", parse_result_id, status, ... }
  const batchCtxRef = useRef<{
    catalogId: string;
    catalogName: string;
    batchId: string;
  } | null>(null);

  const routeBatchEvent = useCallback((data: Record<string, unknown>) => {
    // Explicit discriminator first — upload_complete and work_ingested are
    // the two events introduced with the batch stream.
    if (data.type === "upload_complete") {
      setImportDone(true);
      return;
    }
    if (data.type === "work_ingested") {
      const w = data as unknown as WorkIngestedEvent;
      setWorks((prev) => {
        const existing = prev.find((x) => x.work_id === w.work_id);
        if (!existing) {
          return [
            ...prev,
            {
              work_id: w.work_id,
              title: w.title,
              artist: w.artist,
              iswc: w.iswc,
              document_id: w.document_id,
              recordings: w.recording ? [w.recording] : [],
              releases: w.release ? [w.release] : [],
            },
          ];
        }
        // Merge the row's attachments into the existing work card.
        // Dedupe by id so repeated rows for the same recording/release
        // don't stack.
        const recordings =
          w.recording &&
          !existing.recordings.some((r) => r.id === w.recording!.id)
            ? [...existing.recordings, w.recording]
            : existing.recordings;
        const releases =
          w.release && !existing.releases.some((r) => r.id === w.release!.id)
            ? [...existing.releases, w.release]
            : existing.releases;
        if (recordings === existing.recordings && releases === existing.releases) {
          return prev;
        }
        return prev.map((x) =>
          x.work_id === w.work_id ? { ...x, recordings, releases } : x,
        );
      });
      return;
    }

    // Upload worker events — retained shape from the pre-batch-stream era.
    // Skipped / error detail rides on batch_issues now (durable); the live
    // event only tracks documents arriving. Errors also surface via the
    // Alert banner until the phase closes and the durable list renders.
    if (
      data.status === "document" ||
      data.status === "skipped" ||
      data.status === "error"
    ) {
      const event = data as unknown as UploadFileEvent;
      if (event.status === "document" && event.document) {
        const doc = event.document;
        setDocuments((prev) =>
          prev.some((d) => d.id === doc.id) ? prev : [...prev, doc],
        );
      } else if (event.status === "error" && event.error) {
        setError(event.error);
      }
      return;
    }

    // Parse / ingest / royalty_lines completion events — counters
    // only. Issue detail is fetched wholesale from the batch-scoped
    // endpoints once each phase closes.
    if (data.type === "parse_complete") {
      setParseCompleteCount((n) => n + 1);
      // Parse failures never enqueue an ingest job, so phase 3 needs
      // to count them separately — without this, a failed-parse doc
      // would leave the ingest progress wedged at N-1 of N.
      if (data.status && data.status !== "complete") {
        setParseFailedCount((n) => n + 1);
      }
      // Record the parse-complete timestamp per document so the
      // reparse button can flip once the new attempt lands, and the
      // attempt-history panel knows to refetch.
      const docId =
        typeof data.document_id === "string" ? data.document_id : "";
      if (docId) {
        setParseCompleteMsByDoc((prev) => ({ ...prev, [docId]: Date.now() }));
      }
      return;
    }
    if (data.type === "ingest_complete") {
      setIngestCompleteCount((n) => n + 1);
      if (data.status && data.status !== "complete") {
        setIngestFailedCount((n) => n + 1);
      }
      // Only successful ingestions chain a royalty-lines job. Track
      // the expectation on the FE so Phase 4 knows when it's done
      // without needing a fixed total.
      if (typeof data.royalty_lines_job_id === "string") {
        setRoyaltyLinesExpectedCount((n) => n + 1);
      }
      return;
    }
    if (data.type === "royalty_lines_complete") {
      setRoyaltyLinesCompleteCount((n) => n + 1);
      return;
    }
    // Other envelopes fall through silently — still visible in network tab.
  }, []);

  const { connect: connectBatch, close: closeBatch } = useJobStream({
    onEvent: routeBatchEvent,
    // Batch stream never sends `done` — the server can't know when the
    // client considers the batch finished (see handlers.StreamBatch).
    onDone: useCallback(() => {}, []),
    onError: useCallback((msg: string) => setError(msg), []),
  });

  // ── Determine if restore is needed ──
  const hasResumableBookmark =
    !!store.batchId &&
    store.step !== "drop" &&
    !store.isStale() &&
    store.step !== "assign" &&
    store.step !== "uploading";

  if (hydrated && !hasResumableBookmark && restoring && !restored) {
    if (store.batchId) store.clear();
    setRestoring(false);
    setRestored(true);
  }

  // ── Restore from session bookmark ──
  //
  // setState calls inside the effect are the whole point — we're rehydrating
  // React state from the async-hydrated zustand store. Splitting into
  // derived state / lazy initializers would require hoisting the store read
  // into useState initializers, which run before zustand has hydrated.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!hydrated || restored || !hasResumableBookmark) return;

    setRestored(true);
    (async () => {
      try {
        // Verify the batch still exists server-side before committing to
        // the restore — guards against bookmarks that point at batches
        // whose rows were deleted (e.g. after a dev DB reset).
        const jobs = await api<unknown[]>(`/batches/${store.batchId}/jobs`);
        if (!Array.isArray(jobs) || jobs.length === 0) {
          store.clear();
          setRestoring(false);
          return;
        }

        setAssignedCatalogId(store.catalogId);
        setAssignedCatalogName(store.catalogName);
        setBatchId(store.batchId);
        setDocuments(store.documents);

        // Legacy sessions persisted `step: "ingesting"` before the step
        // collapsed into "importing"; treat it as importing + importDone.
        const savedStep = store.step as string;
        if (savedStep === "importing" || savedStep === "ingesting") {
          setStep("importing");
          setImportDone(savedStep === "ingesting");
        } else if (savedStep === "done") {
          setStep("done");
          setImportDone(true);
          setParseCompleteCount(store.parseCompleteCount);
          setIngestCompleteCount(store.ingestCompleteCount);
          setRoyaltyLinesExpectedCount(store.royaltyLinesExpectedCount);
          setRoyaltyLinesCompleteCount(store.royaltyLinesCompleteCount);
          setRestoring(false);
          return;
        } else {
          setStep("done");
          setRestoring(false);
          return;
        }

        batchCtxRef.current = {
          catalogId: store.catalogId,
          catalogName: store.catalogName,
          batchId: store.batchId,
        };
        // Reconnect from seq=0 — works list, phase counts, and issue
        // tracking are rebuilt from the replay, so we don't rely on
        // persisted values being in sync with the server.
        setWorks([]);
        setBatchIssues([]);
        setParseResultIssues([]);
        setParsedRowIssues([]);
        setParseCompleteMsByDoc({});
        setParseCompleteCount(0);
        setParseFailedCount(0);
        setIngestCompleteCount(0);
        setIngestFailedCount(0);
        setRoyaltyLinesExpectedCount(0);
        setRoyaltyLinesCompleteCount(0);
        connectBatch(`/batches/${store.batchId}/stream`);
        setRestoring(false);
      } catch (e) {
        console.error("Failed to restore analyze session", e);
        store.clear();
        setRestoring(false);
      }
    })();
  }, [hydrated, restored, hasResumableBookmark, store, connectBatch]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── Persist progress whenever it changes during an active session ──
  //
  // IMPORTANT: depend on `save` (a stable function selector), not `store`.
  // `useAnalyzeStore()` subscribes to the full state and returns a new
  // reference on every store change — putting it in deps here caused an
  // infinite loop (save → store update → new ref → effect re-fires).
  const saveBookmark = useAnalyzeStore((s) => s.save);
  useEffect(() => {
    if (step === "importing" || (step === "done" && batchId)) {
      saveBookmark({
        step,
        catalogId: assignedCatalogId,
        catalogName: assignedCatalogName,
        batchId,
        documents,
        parseCompleteCount,
        ingestCompleteCount,
        royaltyLinesExpectedCount,
        royaltyLinesCompleteCount,
      });
    }
  }, [
    step,
    assignedCatalogId,
    assignedCatalogName,
    batchId,
    documents,
    parseCompleteCount,
    ingestCompleteCount,
    royaltyLinesExpectedCount,
    royaltyLinesCompleteCount,
    saveBookmark,
  ]);

  // ── Durable issue fetchers ──
  //
  // Each phase that produces issues has one batch-scoped endpoint. We
  // fetch once the corresponding phase closes (and on restore when
  // the persisted step is past that phase). The backend joins through
  // parse_results / parsed_rows so every issue carries its own
  // document_id — the FE groups on that field directly.

  // Phase 1 batch_issues — fire when importDone flips true.
  useEffect(() => {
    if (!importDone || !batchId) return;
    let cancelled = false;
    (async () => {
      try {
        const issues = await api<AnalyzeBatchIssue[]>(`/batches/${batchId}/issues`);
        if (!cancelled) setBatchIssues(issues);
      } catch (e) {
        console.error("failed to load batch issues", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [importDone, batchId]);

  const ingestResolvedTotal = ingestCompleteCount + parseFailedCount;
  const parseAllDone =
    importDone && documents.length > 0 && parseCompleteCount >= documents.length;
  const ingestAllDone = parseAllDone && ingestResolvedTotal >= documents.length;

  // Phase 2+3 stage issues — fire once after ingest closes, then
  // refire whenever a new parse_complete lands (a reparse just
  // finished). parseCompleteMsByDoc ticks on every parse_complete, so
  // using it as an effect dep re-runs the fetch after each reparse.
  // The ingestAllDone gate keeps initial-load event bursts from
  // hammering this endpoint — only reparse-era events reach here.
  useEffect(() => {
    if (!ingestAllDone || !batchId) return;
    let cancelled = false;
    (async () => {
      try {
        const issues = await api<AnalyzeParseResultIssueWithDocument[]>(
          `/batches/${batchId}/parse_result_issues`,
        );
        if (!cancelled) setParseResultIssues(issues);
      } catch (e) {
        console.error("failed to load parse_result_issues", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ingestAllDone, batchId, parseCompleteMsByDoc]);

  // Phase 4 row issues — fire once after royalty-lines closes, then
  // refire on reparse (same signal as the stage-issue fetcher).
  const royaltyLinesAllDone =
    ingestAllDone && royaltyLinesCompleteCount >= royaltyLinesExpectedCount;

  useEffect(() => {
    if (!royaltyLinesAllDone || !batchId) return;
    let cancelled = false;
    (async () => {
      try {
        const issues = await api<AnalyzeParsedRowIssueWithDocument[]>(
          `/batches/${batchId}/parsed_row_issues`,
        );
        if (!cancelled) setParsedRowIssues(issues);
      } catch (e) {
        console.error("failed to load parsed_row_issues", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [royaltyLinesAllDone, batchId, parseCompleteMsByDoc]);

  function resetAll() {
    setStep(INITIAL_STATE.step);
    setDroppedFiles(INITIAL_STATE.droppedFiles);
    setDocuments(INITIAL_STATE.documents);
    setWorks(INITIAL_STATE.works);
    setBatchIssues([]);
    setParseResultIssues([]);
    setParsedRowIssues([]);
    setParseCompleteMsByDoc({});
    setParseCompleteCount(INITIAL_STATE.parseCompleteCount);
    setParseFailedCount(0);
    setIngestCompleteCount(INITIAL_STATE.ingestCompleteCount);
    setIngestFailedCount(0);
    setRoyaltyLinesExpectedCount(0);
    setRoyaltyLinesCompleteCount(INITIAL_STATE.royaltyLinesCompleteCount);
    setImportDone(INITIAL_STATE.importDone);
    setAssignedCatalogId("");
    setAssignedCatalogName("");
    setBatchId("");
    setError(null);
    closeBatch();
    uppy.cancelAll();
    store.clear();
  }

  async function handleUpload(
    catalogId: string,
    newCatalogName: string,
    rights: RightsDefaults,
  ) {
    setError(null);
    let resolvedCatalogId = catalogId;

    if (!resolvedCatalogId && newCatalogName.trim()) {
      try {
        const cat = await apiPost<{ id: string }>("/catalogs", {
          name: newCatalogName.trim(),
        });
        resolvedCatalogId = cat.id;
      } catch {
        setError("Failed to create catalog");
        return;
      }
    }

    if (!resolvedCatalogId) {
      setError("Select or create a catalog");
      return;
    }

    const catName =
      newCatalogName.trim() ||
      catalogs.find((c) => c.id === resolvedCatalogId)?.name ||
      "";
    setAssignedCatalogName(catName);
    setAssignedCatalogId(resolvedCatalogId);

    let initBatchId: string;
    try {
      const initData = await apiPost<{ batch_id: string; job_id: string }>(
        "/uploads/init",
        {
          catalog_id: resolvedCatalogId,
          expected_files: droppedFiles.length,
          right_type: rights.type,
          right_territory: rights.territory,
          right_ownership: rights.ownership ? parseFloat(rights.ownership) : 0,
          right_start_date: rights.startDate,
          right_end_date: rights.endDate,
          right_source: rights.source,
        },
      );
      initBatchId = initData.batch_id;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to init upload");
      return;
    }

    setBatchId(initBatchId);

    // Configure Uppy tus plugin with batch metadata
    const token = getAccessToken();
    const tusEndpoint = `${API_URL}/uploads/tus`;

    const existingTus = uppy.getPlugin("Tus");
    if (existingTus) uppy.removePlugin(existingTus);

    uppy.use(Tus, {
      endpoint: tusEndpoint,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      chunkSize: 50 * 1024 * 1024,
      limit: 10,
      retryDelays: [0, 1000, 3000, 5000],
      allowedMetaFields: ["batch_id", "job_id", "filename"],
    });

    uppy.cancelAll();
    for (const file of droppedFiles) {
      uppy.addFile({
        name: file.name,
        type: file.type || "application/octet-stream",
        data: file,
        meta: {
          batch_id: initBatchId,
          // job_id kept on tus metadata for compatibility with the tus
          // handler — the upload worker still updates its tracking job.
          job_id: initBatchId,
          filename: file.name,
        },
      });
    }

    setStep("uploading");
    setDocuments([]);
    setWorks([]);
    setBatchIssues([]);
    setParseResultIssues([]);
    setParsedRowIssues([]);
    setParseCompleteMsByDoc({});
    setParseCompleteCount(0);
    setParseFailedCount(0);
    setIngestCompleteCount(0);
    setIngestFailedCount(0);
    setRoyaltyLinesExpectedCount(0);
    setRoyaltyLinesCompleteCount(0);
    setImportDone(false);

    batchCtxRef.current = {
      catalogId: resolvedCatalogId,
      catalogName: catName,
      batchId: initBatchId,
    };
    // Open the batch stream now — earliest events (document extraction)
    // can arrive before Uppy finishes, and replay from seq=0 catches
    // anything emitted while the socket was still connecting.
    connectBatch(`/batches/${initBatchId}/stream`);

    try {
      const result = await uppy.upload();
      if (result && result.failed && result.failed.length > 0) {
        const failedNames = result.failed.map((f) => f.name).join(", ");
        setError(`Some files failed to upload: ${failedNames}`);
      }
      setStep("importing");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setStep("assign");
      closeBatch();
    }
  }

  if (restoring) {
    return (
      <PageLayout maxWidth="4xl">
        <div className="flex items-center justify-center gap-3 py-20">
          <Spinner />
          <span className="text-muted-foreground text-sm">
            Resuming session...
          </span>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="4xl">
      <h2 className="text-lg font-semibold text-white">Analyze Documents</h2>

      <StepIndicator current={step} />

      {error && <Alert>{error}</Alert>}

      {step === "drop" && (
        <DropStep
          onFilesSelected={(files) => {
            setDroppedFiles(files);
            setStep("assign");
          }}
        />
      )}

      {step === "assign" && (
        <AssignStep
          files={droppedFiles}
          catalogs={catalogs}
          onRemoveFile={(i) => {
            setDroppedFiles((prev) => {
              const next = prev.filter((_, idx) => idx !== i);
              if (next.length === 0) setStep("drop");
              return next;
            });
          }}
          onBack={() => {
            setStep("drop");
            setDroppedFiles([]);
          }}
          onSubmit={handleUpload}
        />
      )}

      {step === "uploading" && <UploadStep uppy={uppy} />}

      {step === "importing" && (
        <ImportStep
          documents={documents}
          importDone={importDone}
          works={works}
          batchIssues={batchIssues}
          parseResultIssues={parseResultIssues}
          parsedRowIssues={parsedRowIssues}
          parseCompleteMsByDoc={parseCompleteMsByDoc}
          parseCompleteCount={parseCompleteCount}
          parseFailedCount={parseFailedCount}
          ingestCompleteCount={ingestCompleteCount}
          ingestFailedCount={ingestFailedCount}
          royaltyLinesExpectedCount={royaltyLinesExpectedCount}
          royaltyLinesCompleteCount={royaltyLinesCompleteCount}
          batchId={batchId}
          assignedCatalogId={assignedCatalogId}
          assignedCatalogName={assignedCatalogName}
          onFinish={() => setStep("done")}
          onReset={resetAll}
        />
      )}

      {step === "done" && (
        <DoneStep
          assignedCatalogId={assignedCatalogId}
          documentCount={documents.length}
          onReset={resetAll}
        />
      )}
    </PageLayout>
  );
}
