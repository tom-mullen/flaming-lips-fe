import CatalogLink from "@/app/components/catalog-link";
import Card from "@/app/components/ui/card";
import ProgressBar from "@/app/components/ui/progress-bar";

export default function EnrichStep({
  assignedCatalogId,
  assignedCatalogName,
  enriching,
  enrichIndex,
  enrichTotal,
}: {
  assignedCatalogId: string;
  assignedCatalogName: string;
  enriching: boolean;
  enrichIndex: number;
  enrichTotal: number;
}) {
  return (
    <section className="space-y-6">
      <CatalogLink
        catalogId={assignedCatalogId}
        catalogName={assignedCatalogName}
      />

      <Card size="lg" className="space-y-4">
        <h3 className="font-semibold text-white">
          Enriching songs via Spotify
        </h3>
        {enriching && (
          <ProgressBar
            value={enrichIndex}
            total={enrichTotal}
            label={`Enriching song ${enrichIndex + (enrichIndex < enrichTotal ? 1 : 0)} of ${enrichTotal}...`}
          />
        )}
      </Card>
    </section>
  );
}
