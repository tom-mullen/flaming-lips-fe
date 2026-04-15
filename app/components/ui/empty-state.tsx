import Card from "./card";

interface EmptyStateProps {
  children: React.ReactNode;
}

export default function EmptyState({ children }: EmptyStateProps) {
  return (
    <Card className="rounded-2xl p-10 text-center">
      <p className="text-muted text-sm">{children}</p>
    </Card>
  );
}
