"use client";

import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
} from "@tanstack/react-query";
import { signIn } from "next-auth/react";
import { useState, type ReactNode } from "react";
import { ApiError } from "@/app/lib/api";

function handleGlobalError(error: Error) {
  if (error instanceof ApiError && error.status === 401) {
    signIn(undefined, { callbackUrl: window.location.pathname });
  }
}

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failureCount, error) => {
              if (error instanceof ApiError && error.status === 401)
                return false;
              return failureCount < 1;
            },
          },
        },
        queryCache: new QueryCache({
          onError: handleGlobalError,
        }),
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
