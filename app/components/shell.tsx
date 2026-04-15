"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  TransitionChild,
} from "@headlessui/react";
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  BeakerIcon,
  MusicalNoteIcon,
  FolderIcon,
  DocumentMagnifyingGlassIcon,
  ArrowRightStartOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { signOut } from "next-auth/react";
import AppIcon from "./app-icon";
import { cn } from "@/app/lib/cn";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
  { name: "Catalogs", href: "/catalogs", icon: FolderIcon },
  { name: "Works", href: "/works", icon: MusicalNoteIcon },
  { name: "Enrich", href: "/enrich", icon: BeakerIcon },
  { name: "Analyze", href: "/analyze", icon: DocumentMagnifyingGlassIcon },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  function handleLogout() {
    signOut({ callbackUrl: "/" });
  }

  const sidebarContent = (
    <>
      <div className="flex h-16 shrink-0 items-center gap-2 px-6">
        <AppIcon className="text-white size-8" />
        <span className="font-semibold text-white">Music Rights</span>
      </div>

      <nav className="flex flex-1 flex-col px-3 py-4">
        <ul className="flex flex-1 flex-col gap-1">
          {navigation.map((item) => {
            const current = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    current
                      ? "bg-surface-alt text-white"
                      : "text-muted-foreground hover:bg-surface-alt/50 hover:text-white",
                    "group focus-ring flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  )}
                >
                  <item.icon
                    className={cn(
                      current
                        ? "text-white"
                        : "text-muted group-hover:text-white",
                      "size-5 shrink-0 transition-colors",
                    )}
                  />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={handleLogout}
          className="text-muted-foreground hover:bg-surface-alt/50 focus-ring flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:text-white"
        >
          <ArrowRightStartOnRectangleIcon className="text-muted size-5 shrink-0" />
          Log out
        </button>
      </nav>
    </>
  );

  return (
    <div className="bg-canvas min-h-screen">
      <Dialog
        open={sidebarOpen}
        onClose={setSidebarOpen}
        className="relative z-50 lg:hidden"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-black/60 transition-opacity duration-300 ease-linear data-closed:opacity-0"
        />
        <div className="fixed inset-0 flex">
          <DialogPanel
            transition
            className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full"
          >
            <TransitionChild>
              <div className="absolute top-0 left-full flex w-16 justify-center pt-5 duration-300 ease-in-out data-closed:opacity-0">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="focus-ring -m-2.5 rounded-lg p-2.5"
                >
                  <span className="sr-only">Close sidebar</span>
                  <XMarkIcon className="size-6 text-white" />
                </button>
              </div>
            </TransitionChild>
            <div className="bg-surface ring-border-subtle flex grow flex-col overflow-y-auto ring-1">
              {sidebarContent}
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="border-border-subtle bg-surface flex grow flex-col overflow-y-auto border-r">
          {sidebarContent}
        </div>
      </div>

      <div className="lg:pl-64">
        <div className="border-border-subtle bg-canvas/80 sticky top-0 z-40 flex h-14 items-center gap-4 border-b px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="text-muted-foreground focus-ring -m-2 rounded-lg p-2"
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="text-muted-foreground size-6" />
          </button>
          <div className="flex items-center gap-2">
            <AppIcon className="text-white size-5" />
            <span className="text-sm font-semibold text-white">
              Music Rights
            </span>
          </div>
        </div>
        <main>{children}</main>
      </div>
    </div>
  );
}
