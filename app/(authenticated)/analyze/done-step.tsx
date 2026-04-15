import Link from "next/link";
import Button, { buttonVariants } from "@/app/components/ui/button";
import Card from "@/app/components/ui/card";
import { pluralize } from "@/app/lib/utils";

interface DoneStepProps {
  assignedCatalogId: string;
  documentCount: number;
  onReset: () => void;
}

export default function DoneStep({
  assignedCatalogId,
  documentCount,
  onReset,
}: DoneStepProps) {
  return (
    <Card size="lg" className="space-y-4 p-10 text-center">
      <h3 className="text-lg font-semibold text-white">Complete</h3>
      <p className="text-muted-foreground text-sm">
        {pluralize(documentCount, "document")} imported
      </p>
      <div className="flex justify-center gap-3">
        <Link
          href={`/catalogs/${assignedCatalogId}`}
          className={buttonVariants({ variant: "secondary" })}
        >
          View catalog
        </Link>
        <Button onClick={onReset}>Upload more</Button>
      </div>
    </Card>
  );
}
