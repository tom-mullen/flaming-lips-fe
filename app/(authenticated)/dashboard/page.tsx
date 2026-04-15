"use client";

import { useSession } from "next-auth/react";
import StatCard from "@/app/components/ui/stat-card";
import Card from "@/app/components/ui/card";
import Skeleton from "@/app/components/ui/skeleton";
import PageLayout from "@/app/components/ui/page-layout";

export default function DashboardPage() {
  const { data: session, status } = useSession();

  if (status === "loading") return <DashboardSkeleton />;
  if (!session?.user) return null;

  const { user } = session;

  return (
    <PageLayout maxWidth="4xl" className="space-y-0">
      <div className="bg-surface overflow-hidden rounded-2xl">
        <div className="from-spotify/60 to-surface h-24 bg-gradient-to-br" />
        <div className="px-6 pb-6">
          <div className="-mt-12 mb-4">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name}
                className="ring-surface size-24 rounded-full object-cover ring-4"
              />
            ) : (
              <div className="ring-surface bg-surface-raised flex size-24 items-center justify-center rounded-full ring-4">
                <span className="text-muted-foreground text-3xl font-bold">
                  {user.name?.[0]?.toUpperCase() ?? "?"}
                </span>
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{user.name}</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {user.email}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Email" value={user.email} />
        <StatCard label="User ID" value={user.id} mono />
      </div>
    </PageLayout>
  );
}

function DashboardSkeleton() {
  return (
    <PageLayout maxWidth="4xl" className="space-y-0">
      <div className="bg-surface overflow-hidden rounded-2xl">
        <Skeleton className="h-24 rounded-none" />
        <div className="px-6 pb-6">
          <div className="-mt-12 mb-4">
            <Skeleton className="ring-surface size-24 rounded-full ring-4" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-5 w-24" />
          </Card>
        ))}
      </div>
    </PageLayout>
  );
}
