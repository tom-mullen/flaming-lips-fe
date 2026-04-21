import Badge from "@/app/components/ui/badge";
import Button from "@/app/components/ui/button";
import Card from "@/app/components/ui/card";
import Checkbox from "@/app/components/ui/checkbox";
import { TYPE_BADGE_VARIANTS } from "@/app/lib/constants";
import { downloadUrl } from "@/app/lib/api";
import type { CatalogDocument, RightDisplayFields } from "@/app/lib/types";

interface RightRowProps {
  catalogId: string;
  right: RightDisplayFields;
  documents: CatalogDocument[];
  readOnly?: boolean;
  selected?: boolean;
  onToggle?: () => void;
  onRemove?: () => void;
}

export default function RightRow({
  catalogId,
  right,
  documents,
  readOnly,
  selected,
  onToggle,
  onRemove,
}: RightRowProps) {
  const sourceDoc = right.document_id
    ? documents.find((d) => d.id === right.document_id)
    : null;

  return (
    <Card variant="muted" size="sm" className="flex items-center gap-3 text-sm">
      {!readOnly && onToggle && (
        <Checkbox checked={selected ?? false} onChange={onToggle} />
      )}
      <Badge color={TYPE_BADGE_VARIANTS[right.type]}>{right.type}</Badge>
      {right.territory && (
        <span className="text-muted-foreground text-xs">{right.territory}</span>
      )}
      {right.ownership > 0 && (
        <span className="text-muted-foreground text-xs">
          {right.ownership}%
        </span>
      )}
      {right.start_date && (
        <span className="text-muted text-xs">
          {right.start_date}
          {right.end_date && ` – ${right.end_date}`}
        </span>
      )}
      {right.source && (
        <span className="text-dimmed text-xs">{right.source}</span>
      )}
      {sourceDoc && (
        <a
          href={downloadUrl(`/catalogs/${catalogId}/documents/${sourceDoc.id}/download`)}
          className="text-brand max-w-40 shrink-0 truncate text-xs hover:underline"
          title={sourceDoc.filename}
        >
          Download source
        </a>
      )}
      {!readOnly && onRemove && (
        <Button
          variant="ghost"
          size="sm"
          className="text-dimmed ml-auto hover:text-red-400"
          onClick={onRemove}
        >
          Remove
        </Button>
      )}
    </Card>
  );
}
