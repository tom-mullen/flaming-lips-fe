"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import Alert from "@/app/components/ui/alert";
import Badge from "@/app/components/ui/badge";
import Card from "@/app/components/ui/card";
import Skeleton from "@/app/components/ui/skeleton";
import { useCatalog, useDocuments } from "@/app/lib/queries";
import PageLayout from "@/app/components/ui/page-layout";
import { STATUS_BADGE_VARIANTS } from "@/app/lib/constants";
import { pluralize } from "@/app/lib/utils";
import CatalogRightsTab from "./catalog-rights-tab";
import DocumentsTab from "./documents-tab";

export default function CatalogShowPage() {
  const params = useParams<{ id: string }>();

  const {
    data: catalog,
    isLoading,
    error: catalogError,
    refetch: refetchCatalog,
  } = useCatalog(params.id);
  const { data: documentsPage, refetch: refetchDocuments } = useDocuments(
    params.id,
  );
  const documents = documentsPage?.items ?? [];

  const onRefresh = useCallback(() => {
    refetchCatalog();
    refetchDocuments();
  }, [refetchCatalog, refetchDocuments]);

  const catalogWorkIds = new Set(
    (catalog?.rights ?? []).map((r) => r.work_id),
  );

  if (isLoading) {
    return (
      <PageLayout>
        <Card size="lg" className="animate-pulse">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-32" />
        </Card>
      </PageLayout>
    );
  }

  if (catalogError && !catalog) {
    return (
      <PageLayout>
        <Card size="lg" className="text-center">
          <p className="text-sm text-red-400">{catalogError.message}</p>
          <Link
            href="/catalogs"
            className="text-muted hover:text-foreground mt-2 inline-block text-xs"
          >
            &larr; Back to catalogs
          </Link>
        </Card>
      </PageLayout>
    );
  }

  if (!catalog) return null;

  const tabClassName =
    "px-4 py-2.5 text-sm font-medium capitalize transition-colors cursor-pointer -mb-px text-muted hover:text-foreground data-[selected]:text-white data-[selected]:border-b-2 data-[selected]:border-brand focus-ring";

  return (
    <PageLayout>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/catalogs"
            className="text-muted hover:text-foreground text-xs transition-colors"
          >
            &larr; Catalogs
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-white">{catalog.name}</h1>
          <p className="text-dimmed mt-1 font-mono text-xs">{catalog.id}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <Badge color={STATUS_BADGE_VARIANTS[catalog.status]}>
            {catalog.status}
          </Badge>
          <div className="flex items-center gap-2">
            <Badge color="muted">{pluralize(catalog.works_count, "work")}</Badge>
            <Badge color="muted">
              {pluralize(catalog.documents_count, "document")}
            </Badge>
          </div>
          <p className="text-muted text-xs">
            {pluralize(catalog.rights.length, "right")}
          </p>
        </div>
      </div>

      {catalogError && <Alert>{catalogError.message}</Alert>}

      <TabGroup>
        <TabList className="border-border-subtle flex items-center gap-1 border-b">
          <Tab className={tabClassName}>
            Rights
            {catalogWorkIds.size > 0 && (
              <span className="text-dimmed ml-1.5 text-xs">
                {catalogWorkIds.size}
              </span>
            )}
          </Tab>
          <Tab className={tabClassName}>
            Documents
            {documents.length > 0 && (
              <span className="text-dimmed ml-1.5 text-xs">
                {documents.length}
              </span>
            )}
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <CatalogRightsTab
              catalogId={params.id}
              rights={catalog.rights}
              documents={documents}
              onRefresh={onRefresh}
            />
          </TabPanel>
          <TabPanel>
            <DocumentsTab
              catalogId={params.id}
              documents={documents}
              onRefresh={onRefresh}
            />
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </PageLayout>
  );
}
