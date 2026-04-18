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
interface UploadFileEvent {
  status: "document" | "skipped" | "error";
  document?: AnalyzeDocument;
  skipped?: string;
  reason?: string;
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
  const [skipped, setSkipped] = useState<
    { filename: string; reason: string }[]
  >([]);
  const [works, setWorks] = useState<AnalyzeWork[]>([]);
  const [parseCompleteCount, setParseCompleteCount] = useState(0);
  const [ingestCompleteCount, setIngestCompleteCount] = useState(0);
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
      } else if (event.status === "skipped" && event.skipped) {
        const entry = { filename: event.skipped, reason: event.reason ?? "" };
        setSkipped((prev) =>
          prev.some((s) => s.filename === entry.filename)
            ? prev
            : [...prev, entry],
        );
      } else if (event.status === "error" && event.error) {
        setError(event.error);
      }
      return;
    }

    // Parse and ingest completion events — both carry parse_result_id +
    // status, so we discriminate on the explicit `type` field (added on the
    // backend to stop the FE from double-counting each document).
    if (data.type === "parse_complete") {
      setParseCompleteCount((n) => n + 1);
      return;
    }
    if (data.type === "ingest_complete") {
      setIngestCompleteCount((n) => n + 1);
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
        setSkipped(store.skipped);

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
        // Reconnect from seq=0 — works list and phase counts are rebuilt
        // from the replay, so we don't rely on persisted values being in
        // sync with the server.
        setWorks([]);
        setParseCompleteCount(0);
        setIngestCompleteCount(0);
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
        skipped,
        parseCompleteCount,
        ingestCompleteCount,
      });
    }
  }, [
    step,
    assignedCatalogId,
    assignedCatalogName,
    batchId,
    documents,
    skipped,
    parseCompleteCount,
    ingestCompleteCount,
    saveBookmark,
  ]);

  function resetAll() {
    setStep(INITIAL_STATE.step);
    setDroppedFiles(INITIAL_STATE.droppedFiles);
    setDocuments(INITIAL_STATE.documents);
    setSkipped(INITIAL_STATE.skipped);
    setWorks(INITIAL_STATE.works);
    setParseCompleteCount(INITIAL_STATE.parseCompleteCount);
    setIngestCompleteCount(INITIAL_STATE.ingestCompleteCount);
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
    setSkipped([]);
    setWorks([]);
    setParseCompleteCount(0);
    setIngestCompleteCount(0);
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
          skipped={skipped}
          importDone={importDone}
          works={works}
          parseCompleteCount={parseCompleteCount}
          ingestCompleteCount={ingestCompleteCount}
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
