"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useEffect, type ReactNode } from "react";
import { setAccessToken } from "@/app/lib/api";
import SessionExpiryDialog from "./session-expiry-dialog";

function TokenSync({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session?.bearerToken) {
      setAccessToken(session.bearerToken);
    } else {
      setAccessToken(null);
    }
  }, [session, status]);

  if (status === "loading") {
    return null;
  }

  return (
    <>
      <SessionExpiryDialog />
      {children}
    </>
  );
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <TokenSync>{children}</TokenSync>
    </SessionProvider>
  );
}
