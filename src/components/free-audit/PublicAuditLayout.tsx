import type { ReactNode } from "react";

export function PublicAuditLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-5 py-10 sm:px-8 sm:py-16">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-10">{children}</div>
    </main>
  );
}

export function PublicAuditLoading() {
  return (
    <PublicAuditLayout>
      <div className="min-h-[38rem]" aria-busy="true" aria-live="polite">
        <div className="flex max-w-lg flex-col gap-4">
          <div className="h-4 w-24 animate-pulse rounded-md bg-surface-raised" />
          <div className="h-10 w-3/4 animate-pulse rounded-lg bg-surface-raised" />
          <div className="h-5 w-full animate-pulse rounded-md bg-surface-raised" />
        </div>
        <div className="mt-12 flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-[4.5rem] animate-pulse rounded-xl bg-surface-raised"
            />
          ))}
        </div>
        <span className="sr-only">Loading audit</span>
      </div>
    </PublicAuditLayout>
  );
}