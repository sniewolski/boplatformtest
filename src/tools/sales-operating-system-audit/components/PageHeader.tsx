import type { ReactNode } from "react";
import { useSosaSaveStatus } from "../data/sosaAnswers";

export function SaveStatusIndicator() {
  const { status, retryAll } = useSosaSaveStatus();
  if (status === "idle") return null;
  if (status === "error") {
    return (
      <span className="text-sm text-ink-muted" role="status" aria-live="polite">
        Couldn't save ·{" "}
        <button
          type="button"
          onClick={retryAll}
          className="text-ink underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Retry
        </button>
      </span>
    );
  }
  return (
    <span className="text-sm text-ink-muted" role="status" aria-live="polite">
      {status === "saving" ? "Saving…" : "Saved"}
    </span>
  );
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl">{title}</h1>
        <SaveStatusIndicator />
      </div>
      {children}
    </header>
  );
}
