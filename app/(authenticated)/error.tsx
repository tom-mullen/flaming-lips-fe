"use client";

import { buttonVariants } from "@/app/components/ui/button";

export default function AuthenticatedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center px-8 py-32">
      <div className="bg-surface w-full max-w-md space-y-4 rounded-2xl p-8 text-center">
        <h2 className="text-lg font-semibold text-white">
          Something went wrong
        </h2>
        <p className="text-muted-foreground text-sm">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          type="button"
          onClick={reset}
          className={buttonVariants({ variant: "primary", size: "md" })}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
