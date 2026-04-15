"use client";

import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogBackdrop,
} from "@headlessui/react";
import Button from "./ui/button";

const WARN_AT = 58 * 60 * 1000;
const EXPIRE_AT = 60 * 60 * 1000;
const COUNTDOWN = EXPIRE_AT - WARN_AT;

function ExpiryTimer({ bearerToken }: { bearerToken: string }) {
  const [open, setOpen] = useState(false);
  const [remaining, setRemaining] = useState(COUNTDOWN);
  const { update } = useSession();
  const tokenTimestamp = useRef(0);

  useEffect(() => {
    tokenTimestamp.current = Date.now();
    let cleanupInterval: ReturnType<typeof setInterval> | undefined;

    const warnTimer = setTimeout(() => {
      setOpen(true);
      const deadline = tokenTimestamp.current + EXPIRE_AT;

      cleanupInterval = setInterval(() => {
        const left = deadline - Date.now();
        if (left <= 0) {
          clearInterval(cleanupInterval);
          signOut({ redirectTo: "/" });
        } else {
          setRemaining(left);
        }
      }, 1000);
    }, WARN_AT);

    return () => {
      clearTimeout(warnTimer);
      if (cleanupInterval) clearInterval(cleanupInterval);
    };
  }, [bearerToken]);

  const seconds = Math.max(0, Math.ceil(remaining / 1000));
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <Dialog open={open} onClose={() => {}} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/60" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="bg-surface border-border w-full max-w-sm rounded-2xl border p-6">
          <DialogTitle className="text-lg font-semibold text-white">
            Session expiring
          </DialogTitle>
          <p className="text-muted-foreground mt-2 text-sm">
            Your session will expire in{" "}
            <span className="font-mono text-white">
              {minutes}:{secs.toString().padStart(2, "0")}
            </span>
            . Would you like to continue?
          </p>
          <div className="mt-5 flex gap-3">
            <Button onClick={() => update()}>Extend session</Button>
            <Button
              variant="secondary"
              onClick={() => signOut({ redirectTo: "/" })}
            >
              Log out
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

export default function SessionExpiryDialog() {
  const { data: session } = useSession();

  if (!session?.bearerToken) return null;

  // Key on bearerToken so state resets when the token changes (session extended)
  return (
    <ExpiryTimer
      key={session.bearerToken}
      bearerToken={session.bearerToken}
    />
  );
}
