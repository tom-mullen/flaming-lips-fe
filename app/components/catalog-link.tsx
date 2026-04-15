import Link from "next/link";

interface CatalogLinkProps {
  catalogId: string;
  catalogName: string;
}

export default function CatalogLink({
  catalogId,
  catalogName,
}: CatalogLinkProps) {
  if (!catalogName) return null;

  return (
    <div className="flex items-center gap-2">
      <p className="text-muted text-sm">Catalog:</p>
      <Link
        href={`/catalogs/${catalogId}`}
        className="hover:text-spotify text-sm font-semibold text-white transition-colors"
      >
        {catalogName}
      </Link>
    </div>
  );
}
