import { createQueryKeyStore } from "@lukemorales/query-key-factory";

export const queries = createQueryKeyStore({
  works: {
    all: null,
    detail: (id: string) => ({ queryKey: [id] }),
  },
  catalogs: {
    all: null,
    detail: (id: string) => ({ queryKey: [id] }),
  },
  documents: {
    byCatalog: (catalogId: string) => ({ queryKey: [catalogId] }),
  },
  recordings: {
    byWork: (workId: string) => ({ queryKey: [workId] }),
  },
  aliases: {
    byWork: (workId: string) => ({ queryKey: [workId] }),
  },
  releases: {
    detail: (id: string) => ({ queryKey: [id] }),
  },
});
