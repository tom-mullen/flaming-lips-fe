import Spinner from "@/app/components/ui/spinner";

export default function AuthenticatedLoading() {
  return (
    <div className="flex items-center justify-center py-32">
      <Spinner className="size-6" />
    </div>
  );
}
