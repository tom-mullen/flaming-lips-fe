"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import Uppy from "@uppy/core";
import Tus from "@uppy/tus";
import { useUppyEvent } from "@uppy/react";
import Alert from "@/app/components/ui/alert";
import PageLayout from "@/app/components/ui/page-layout";
import Spinner from "@/app/components/ui/spinner";
import { useCatalogs } from "@/app/lib/queries";
import { api, apiPost, API_URL, getAccessToken, wsUrl } from "@/app/lib/api";
import type { Job } from "@/app/lib/types";
import { useJobStream } from "@/app/lib/hooks/use-job-stream";
import type { Step, AnalyzeDocument } from "./types";
import { INITIAL_STATE } from "./types";
import { useAnalyzeStore, useAnalyzeStoreHydrated } from "./store";
import StepIndicator from "./step-indicator";
import DropStep from "./drop-step";
import AssignStep, { type RightsDefaults } from "./assign-step";
import UploadStep from "./upload-step";
import ImportStep from "./import-step";
import EnrichStep from "./enrich-step";
import DoneStep from "./done-step";

export default function AnalyzePage() {
  const store = useAnalyzeStore();

  const [step, setStep] = useState<Step>("drop");
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [assignedCatalogId, setAssignedCatalogId] = useState("");
  const [assignedCatalogName, setAssignedCatalogName] = useState("");
  const [documents, setDocuments] = useState<AnalyzeDocument[]>([]);
  const [skipped, setSkipped] = useState<
    { filename: string; reason: string }[]
  >([]);
  const [importDone, setImportDone] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [enrichIndex, setEnrichIndex] = useState(0);
  const [enrichTotal, setEnrichTotal] = useState(0);
  const [enrichedCount, setEnrichedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);

  const [restored, setRestored] = useState(false);
  const hydrated = useAnalyzeStoreHydrated();

  const { data: catalogsPage } = useCatalogs();
  const catalogs = catalogsPage?.items ?? [];

  // ── Uppy instance (stable across renders) ──
  const uppyRef = useRef<InstanceType<typeof Uppy> | null>(null);
  if (!uppyRef.current) {
    uppyRef.current = new Uppy({
      autoProceed: false,
    });
  }
  const uppy = uppyRef.current;

  // Clean up Uppy on unmount
  useEffect(() => {
    return () => {
      uppyRef.current?.cancelAll();
    };
  }, []);

  // ── Uppy events ──
  useUppyEvent(uppy, "complete", useCallback(() => {
    // All tus uploads done — extraction is handled via WebSocket
  }, []));

  useUppyEvent(uppy, "error", useCallback((error: Error) => {
    setError(error.message || "Upload failed");
  }, []));

  useUppyEvent(uppy, "cancel-all", useCallback(() => {
    setStep("assign");
  }, []));

  // ── Enrich job stream (enrichment artifact — kept for future re-integration) ──
  const { connect: connectEnrich } = useJobStream({
    onEvent: useCallback((data: Record<string, unknown>) => {
      const enrichData = data as {
        index?: number;
        total?: number;
      };
      setEnrichIndex((enrichData.index as number) ?? 0);
      setEnrichTotal((enrichData.total as number) ?? 0);
    }, []),
    onDone: useCallback((msg: { done: boolean; progress?: number }) => {
      setEnriching(false);
      setEnrichedCount(msg.progress ?? 0);
      setStep("done");
    }, []),
    onError: useCallback((msg: string) => setError(msg), []),
  });

  // ── Determine if restore is needed ──
  const hasResumableBookmark =
    !!store.catalogId &&
    store.step !== "drop" &&
    !store.isStale() &&
    store.step !== "assign" &&
    store.step !== "uploading";

  if (hydrated && !hasResumableBookmark && restoring && !restored) {
    if (store.catalogId) store.clear();
    setRestoring(false);
    setRestored(true);
  }

  // ── Restore from session bookmark ──
  useEffect(() => {
    if (!hydrated || restored || !hasResumableBookmark) return;

    (async () => {
      setRestored(true);
      try {
        setAssignedCatalogId(store.catalogId);
        setAssignedCatalogName(store.catalogName);
        setDocuments(store.documents);
        setSkipped(store.skipped);
        setImportDone(true);

        if (store.step === "importing") {
          setStep("importing");
          setRestoring(false);
          return;
        }

        if (store.step === "done") {
          setEnrichedCount(store.enrichedCount);
          setStep("done");
          setRestoring(false);
          return;
        }

        // Enrich step — check job status and reconnect
        if (store.step === "enrich" && store.enrichJobId) {
          const job = await api<Job>(`/jobs/${store.enrichJobId}`);
          if (job.status === "running" || job.status === "pending") {
            setStep("enrich");
            setEnriching(true);
            setEnrichIndex(job.progress);
            setEnrichTotal(job.total);
            connectEnrich(store.enrichJobId);
          } else {
            setStep("done");
          }
          setRestoring(false);
          return;
        }

        setStep("done");
        setRestoring(false);
      } catch (e) {
        console.error("Failed to restore analyze session", e);
        store.clear();
        setRestoring(false);
      }
    })();
  }, [hydrated, restored, hasResumableBookmark, store, connectEnrich]);

  function resetAll() {
    setStep(INITIAL_STATE.step);
    setDroppedFiles(INITIAL_STATE.droppedFiles);
    setDocuments(INITIAL_STATE.documents);
    setSkipped(INITIAL_STATE.skipped);
    setImportDone(INITIAL_STATE.importDone);
    setEnriching(INITIAL_STATE.enriching);
    setEnrichIndex(INITIAL_STATE.enrichIndex);
    setEnrichTotal(INITIAL_STATE.enrichTotal);
    setEnrichedCount(INITIAL_STATE.enrichedCount);
    setAssignedCatalogId("");
    setAssignedCatalogName("");
    setError(null);
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

    // Create catalog if needed
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

    // Init batch
    let batchId: string;
    try {
      const initData = await apiPost<{ batch_id: string }>("/uploads/init", {
        catalog_id: resolvedCatalogId,
        right_type: rights.type,
        right_territory: rights.territory,
        right_ownership: rights.ownership ? parseFloat(rights.ownership) : 0,
        right_start_date: rights.startDate,
        right_end_date: rights.endDate,
        right_source: rights.source,
      });
      batchId = initData.batch_id;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to init upload");
      return;
    }

    // Configure Uppy tus plugin with batch metadata
    const token = getAccessToken();
    const tusEndpoint = `${API_URL}/uploads/tus`;

    // Remove old tus plugin if re-uploading
    const existingTus = uppy.getPlugin("Tus");
    if (existingTus) uppy.removePlugin(existingTus);

    uppy.use(Tus, {
      endpoint: tusEndpoint,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      chunkSize: 20 * 1024 * 1024,
      retryDelays: [0, 1000, 3000, 5000],
      allowedMetaFields: ["batch_id", "filename"],
    });

    // Add files to Uppy with batch metadata
    uppy.cancelAll();
    for (const file of droppedFiles) {
      uppy.addFile({
        name: file.name,
        type: file.type || "application/octet-stream",
        data: file,
        meta: {
          batch_id: batchId,
          filename: file.name,
        },
      });
    }

    setStep("uploading");
    setDocuments([]);
    setSkipped([]);
    setImportDone(false);

    // Connect WebSocket for import results while uploading
    const importedDocs: AnalyzeDocument[] = [];
    const skippedFiles: { filename: string; reason: string }[] = [];
    const ws = new WebSocket(wsUrl(`/uploads/stream/${batchId}`));

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.done) {
        setImportDone(true);
        store.save({
          step: "importing",
          catalogId: resolvedCatalogId,
          catalogName: catName,
          batchId,
          documents: importedDocs,
          skipped: skippedFiles,
        });
        ws.close();
      } else if (msg.document) {
        importedDocs.push(msg.document);
        setDocuments((prev) => [...prev, msg.document]);
      } else if (msg.skipped) {
        skippedFiles.push({ filename: msg.skipped, reason: msg.reason });
        setSkipped((prev) => [
          ...prev,
          { filename: msg.skipped, reason: msg.reason },
        ]);
      } else if (msg.error) {
        setError(msg.error);
      }
    };
    ws.onerror = () => {
      setError("WebSocket connection failed");
      setImportDone(true);
    };
    ws.onclose = () => setImportDone(true);

    // Start Uppy upload
    try {
      const result = await uppy.upload();
      if (result && result.failed && result.failed.length > 0) {
        const failedNames = result.failed.map((f) => f.name).join(", ");
        setError(`Some files failed to upload: ${failedNames}`);
      }
      // Move to importing step once upload finishes
      setStep("importing");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setStep("assign");
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
          assignedCatalogId={assignedCatalogId}
          assignedCatalogName={assignedCatalogName}
          onFinish={resetAll}
        />
      )}

      {step === "enrich" && (
        <EnrichStep
          assignedCatalogId={assignedCatalogId}
          assignedCatalogName={assignedCatalogName}
          enriching={enriching}
          enrichIndex={enrichIndex}
          enrichTotal={enrichTotal}
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
