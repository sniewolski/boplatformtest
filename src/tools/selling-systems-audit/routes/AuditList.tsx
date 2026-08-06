import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Pencil } from "lucide-react";
import { useSession } from "@/core/auth/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useAudits,
  useAuditProgress,
  useCreateAudit,
  useRenameAudit,
} from "../data/useAudits";

/**
 * Level-1 screen: the owner's audits, one per service. Progress = how many of
 * the six stepped sections have been submitted for that audit (Content Review
 * is deliberately excluded).
 *
 * The green progress bar uses component-scoped CSS variables — it is NOT part
 * of the platform token layer, and every action on this screen stays on --red.
 */

const BAR_STYLE: React.CSSProperties = {
  ["--ssa-bar-fill" as string]: "oklch(0.74 0.16 150)",
  ["--ssa-bar-track" as string]: "oklch(0.46 0.05 150)",
};

function ProgressBar({ frac }: { frac: number }) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 h-[4px] overflow-hidden rounded-full"
      style={{ ...BAR_STYLE, backgroundColor: "var(--ssa-bar-track)" }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={6}
      aria-valuenow={Math.round(frac * 6)}
    >
      <div
        className="h-full w-full ssa-progress-fill"
        style={{
          backgroundColor: "var(--ssa-bar-fill)",
          transform: `scaleX(${frac})`,
          transformOrigin: "left",
        }}
      />
    </div>
  );
}

export function AuditList() {
  const { session } = useSession();
  const ownerId = session?.user.id;
  const navigate = useNavigate();

  const { data: audits, isLoading } = useAudits(ownerId);
  const { data: progress } = useAuditProgress(ownerId);
  const create = useCreateAudit(ownerId);
  const rename = useRenameAudit(ownerId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");

  function openCreate() {
    setEditingId(null);
    setName("");
    setDialogOpen(true);
  }

  function openRename(id: string, current: string) {
    setEditingId(id);
    setName(current);
    setDialogOpen(true);
  }

  async function confirm() {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (editingId) {
      await rename.mutateAsync({ id: editingId, name: trimmed });
      setDialogOpen(false);
      return;
    }
    const created = await create.mutateAsync(trimmed);
    setDialogOpen(false);
    void navigate({
      to: "/app/tools/$key/$",
      params: { key: "selling-systems-audit", _splat: created.id },
    });
  }

  const busy = create.isPending || rename.isPending;
  const list = audits ?? [];

  return (
    <div className="app-content py-16 flex flex-col gap-10">
      <style>{`
        .ssa-progress-fill { transition: transform 250ms var(--ease-out); }
        @media (prefers-reduced-motion: reduce) {
          .ssa-progress-fill { transition: none; }
        }
      `}</style>

      <header className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl" style={{ letterSpacing: "-0.02em" }}>
            Selling Systems Audit
          </h1>
          <p className="text-ink-muted text-base max-w-prose">
            Run an audit for each service you offer. Each one finds the gaps in how
            that service is sold, ready for your review with Will Barron.
          </p>
        </div>
        {list.length > 0 && (
          <Button
            onClick={openCreate}
            className="bg-red text-white hover:bg-red/90 active:scale-[0.97] transition-transform"
          >
            New audit
          </Button>
        )}
      </header>

      {isLoading ? (
        <p className="text-ink-muted text-sm">Loading…</p>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center text-center gap-5 py-20">
          <p className="text-ink-muted text-base max-w-prose">
            You haven't started an audit yet. Begin with the service you most want
            to sell more of.
          </p>
          <Button
            onClick={openCreate}
            className="bg-red text-white hover:bg-red/90 active:scale-[0.97] transition-transform"
          >
            Take audit
          </Button>
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          {list.map((audit) => {
            const done = progress?.[audit.id] ?? 0;
            const frac = Math.max(0, Math.min(1, done / 6));
            return (
              <li
                key={audit.id}
                className="group relative rounded-xl bg-[var(--surface-raised)] overflow-hidden transition-[background-color] duration-150 ease-[var(--ease-out)] hover:bg-[var(--white)] focus-within:bg-[var(--white)]"
              >
                <Link
                  to="/app/tools/$key/$"
                  params={{ key: "selling-systems-audit", _splat: audit.id }}
                  className="group flex w-full min-w-0 items-center justify-between gap-6 py-5 px-3"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-ink font-medium text-base truncate">
                      {audit.name}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openRename(audit.id, audit.name);
                      }}
                      aria-label={`Rename ${audit.name}`}
                      className="shrink-0 text-ink-muted hover:text-ink transition-colors p-2"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  </span>
                  <ArrowRight
                    className="size-4 text-ink-muted shrink-0 transition-transform duration-150 ease-[var(--ease-out)] origin-left group-hover:translate-x-[3px] group-focus-within:translate-x-[3px] motion-reduce:translate-x-0"
                    aria-hidden
                  />
                </Link>
                <ProgressBar frac={frac} />
              </li>
            );
          })}
        </ol>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Rename audit" : "What service is this audit for?"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the service this audit covers."
                : "Name the service you're auditing so you can tell your audits apart."}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sales training retainer"
            onKeyDown={(e) => {
              if (e.key === "Enter") void confirm();
            }}
          />
          <DialogFooter>
            <Button
              onClick={() => void confirm()}
              disabled={busy || !name.trim()}
              className="bg-red text-white hover:bg-red/90 active:scale-[0.97] transition-transform"
            >
              {editingId ? "Save" : "Create audit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
