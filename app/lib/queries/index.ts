export { queries } from "./keys";
export {
  useWorks,
  useWork,
  useCreateWork,
  useUpdateWork,
  useBatchDeleteWorks,
  useEnrichWorks,
} from "./works";
export {
  useCatalogs,
  useCatalog,
  useCreateCatalog,
  useDeleteCatalog,
  useUpdateCatalog,
} from "./catalogs";
export { useAddRight, useRemoveRight, useBatchRemoveRights } from "./rights";
export { useDocuments } from "./documents";
export {
  useRecordingsByWork,
  useCreateRecording,
  useUpdateRecording,
  useDeleteRecording,
} from "./recordings";
export {
  useAliasesByWork,
  useUpsertAlias,
  useDeleteAlias,
} from "./aliases";
export {
  useRelease,
  useCreateRelease,
  useUpdateRelease,
  useDeleteRelease,
} from "./releases";
export { useEnrichTracks, useApplyEnrichment } from "./enrich";
